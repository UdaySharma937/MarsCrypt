"""
MarsCrypt - hide AES-256 encrypted messages inside images (LSB steganography).

Designed for Vercel's free serverless tier:
  * Nothing is ever written to disk - every image lives in an in-memory BytesIO.
  * Nothing is stored - the password and message exist only for one request.

Security design
---------------
  * Key derivation : PBKDF2-HMAC-SHA256, 600,000 iterations, random 16-byte salt
  * Encryption     : AES-256-GCM (authenticated; 32-byte key, random 12-byte nonce)
    NOTE: Python's "Fernet" is AES-128-CBC + HMAC, so real AES-256 is used instead.
  * Wrong password / tampered image -> authentication tag fails -> clean error.

Hidden payload layout (bits are written MSB-first into the least significant
bit of every R, G and B value, row by row):

    | "MCR1" (4) | blob length (4, big-endian) | salt (16) | nonce (12) | ciphertext+tag |
"""

from __future__ import annotations

import io
import os
import struct
from pathlib import Path

import numpy as np
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from flask import Flask, jsonify, render_template, request, send_file
from PIL import Image, UnidentifiedImageError

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
BASE_DIR = Path(__file__).resolve().parent.parent

MAGIC = b"MCR1"                      # marks an image as carrying a MarsCrypt payload
HEADER_LEN = len(MAGIC) + 4          # magic + 4-byte blob length
SALT_LEN = 16                        # random PBKDF2 salt (bytes)
NONCE_LEN = 12                       # AES-GCM nonce (bytes)
TAG_LEN = 16                         # AES-GCM authentication tag (bytes)
KDF_ITERATIONS = 600_000             # OWASP 2023 recommendation for PBKDF2-SHA256

MAX_UPLOAD_BYTES = 4 * 1024 * 1024   # Vercel rejects request bodies above ~4.5 MB
MAX_PIXELS = 16_000_000              # protects the function's memory limit
MAX_MESSAGE_BYTES = 20_000           # UTF-8 size of the secret message
MIN_PASSWORD_LEN = 6

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
    static_url_path="/static",
)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
Image.MAX_IMAGE_PIXELS = MAX_PIXELS  # Pillow raises on decompression bombs


class StegoError(ValueError):
    """A problem caused by user input; its message is safe to show to the user."""


# --------------------------------------------------------------------------- #
# Cryptography helpers
# --------------------------------------------------------------------------- #
def _derive_key(password: str, salt: bytes) -> bytes:
    """Derive a 256-bit key from the password with PBKDF2-HMAC-SHA256."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 32 bytes = 256 bits -> AES-256
        salt=salt,
        iterations=KDF_ITERATIONS,
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_message(message: str, password: str) -> bytes:
    """Return salt || nonce || ciphertext+tag for the given message."""
    salt = os.urandom(SALT_LEN)
    nonce = os.urandom(NONCE_LEN)
    ciphertext = AESGCM(_derive_key(password, salt)).encrypt(
        nonce, message.encode("utf-8"), None
    )
    return salt + nonce + ciphertext


def decrypt_message(blob: bytes, password: str) -> str:
    """Reverse of encrypt_message(); raises StegoError on a wrong password."""
    if len(blob) < SALT_LEN + NONCE_LEN + TAG_LEN:
        raise StegoError("No hidden MarsCrypt message found in this image.")
    salt = blob[:SALT_LEN]
    nonce = blob[SALT_LEN:SALT_LEN + NONCE_LEN]
    ciphertext = blob[SALT_LEN + NONCE_LEN:]
    try:
        plain = AESGCM(_derive_key(password, salt)).decrypt(nonce, ciphertext, None)
        return plain.decode("utf-8")
    except (InvalidTag, UnicodeDecodeError):
        raise StegoError("Wrong password, or the image was modified or re-compressed.")


# --------------------------------------------------------------------------- #
# Steganography helpers
# --------------------------------------------------------------------------- #
def _load_rgb(data: bytes) -> np.ndarray:
    """Decode an uploaded image into a (height, width, 3) uint8 RGB array."""
    try:
        img = Image.open(io.BytesIO(data))
        if img.width * img.height > MAX_PIXELS:
            raise StegoError("Image is too large. Please use one under 16 megapixels.")
        img.load()
    except StegoError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        raise StegoError("Unsupported or corrupt image. Please upload a PNG, JPG, BMP or WEBP.")

    # Flatten transparency onto white so every pixel is fully opaque.
    if img.mode in ("RGBA", "LA", "P"):
        rgba = img.convert("RGBA")
        background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        img = Image.alpha_composite(background, rgba)
    return np.array(img.convert("RGB"), dtype=np.uint8)


def embed_payload(image_bytes: bytes, payload: bytes) -> io.BytesIO:
    """Hide `payload` in the LSBs of the image and return the PNG as BytesIO."""
    pixels = _load_rgb(image_bytes)
    flat = pixels.reshape(-1)  # view: modifying `flat` modifies `pixels`

    bits = np.unpackbits(np.frombuffer(payload, dtype=np.uint8))  # MSB first
    if bits.size > flat.size:
        capacity = max((flat.size // 8) - HEADER_LEN - SALT_LEN - NONCE_LEN - TAG_LEN, 0)
        raise StegoError(
            f"Message is too long for this image (about {capacity} characters fit). "
            "Use a larger image or a shorter message."
        )

    flat[: bits.size] = (flat[: bits.size] & 0xFE) | bits  # overwrite the LSBs

    out = io.BytesIO()
    Image.fromarray(pixels, "RGB").save(out, format="PNG", optimize=True)  # PNG = lossless
    out.seek(0)
    return out


def extract_payload(image_bytes: bytes) -> bytes:
    """Read the hidden blob (salt || nonce || ciphertext) from an image."""
    flat = _load_rgb(image_bytes).reshape(-1)
    not_found = StegoError("No hidden MarsCrypt message found in this image.")

    if flat.size < HEADER_LEN * 8:
        raise not_found

    header = np.packbits(flat[: HEADER_LEN * 8] & 1).tobytes()
    if header[: len(MAGIC)] != MAGIC:
        raise not_found

    (length,) = struct.unpack(">I", header[len(MAGIC):])
    if length < SALT_LEN + NONCE_LEN + TAG_LEN or (HEADER_LEN + length) * 8 > flat.size:
        raise not_found

    start, end = HEADER_LEN * 8, (HEADER_LEN + length) * 8
    return np.packbits(flat[start:end] & 1).tobytes()


# --------------------------------------------------------------------------- #
# Request helpers
# --------------------------------------------------------------------------- #
def _read_upload() -> bytes:
    """Return the uploaded image bytes from the multipart form."""
    file = request.files.get("image")
    if file is None or not file.filename:
        raise StegoError("Please choose an image first.")
    data = file.read()
    if not data:
        raise StegoError("The uploaded image is empty.")
    return data


def _read_password() -> str:
    password = request.form.get("password", "")
    if len(password) < MIN_PASSWORD_LEN:
        raise StegoError(f"Password must be at least {MIN_PASSWORD_LEN} characters.")
    return password


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@app.get("/")
def index():
    """Serve the single-page UI."""
    return render_template("index.html")


@app.get("/api/health")
def health():
    """Simple uptime probe."""
    return jsonify(status="ok")


@app.post("/api/encrypt")
def encrypt_route():
    """Image + password + message  ->  stego PNG download."""
    image = _read_upload()
    password = _read_password()
    message = request.form.get("message", "")

    if not message.strip():
        raise StegoError("Please enter a secret message.")
    if len(message.encode("utf-8")) > MAX_MESSAGE_BYTES:
        raise StegoError("Message is too long (20,000 bytes maximum).")

    blob = encrypt_message(message, password)
    payload = MAGIC + struct.pack(">I", len(blob)) + blob
    png = embed_payload(image, payload)

    response = send_file(
        png,
        mimetype="image/png",
        as_attachment=True,
        download_name="marscrypt_stego.png",
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@app.post("/api/decrypt")
def decrypt_route():
    """Stego image + password  ->  decrypted message (JSON)."""
    image = _read_upload()
    password = _read_password()

    blob = extract_payload(image)
    message = decrypt_message(blob, password)

    response = jsonify(message=message)
    response.headers["Cache-Control"] = "no-store"
    return response


# --------------------------------------------------------------------------- #
# Error handling - always answer with JSON the frontend can display
# --------------------------------------------------------------------------- #
@app.errorhandler(StegoError)
def handle_user_error(err: StegoError):
    return jsonify(error=str(err)), 400


@app.errorhandler(413)
def handle_too_large(_err):
    return jsonify(error="Upload too large. The limit is 4 MB."), 413


@app.errorhandler(404)
def handle_not_found(_err):
    return jsonify(error="Not found."), 404


@app.errorhandler(Exception)
def handle_unexpected(err: Exception):
    # Pass HTTP errors (405 etc.) through untouched; hide details of real bugs.
    from werkzeug.exceptions import HTTPException

    if isinstance(err, HTTPException):
        return jsonify(error=err.description), err.code
    app.logger.exception("Unhandled error")
    return jsonify(error="Something went wrong on the server."), 500


if __name__ == "__main__":
    # Local development: python api/index.py
    app.run(debug=True, port=5000)
