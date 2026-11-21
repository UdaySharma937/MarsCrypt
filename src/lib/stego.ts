/**
 * Browser implementation of MarsCrypt (WebCrypto + canvas).
 * Mirrors api/index.py exactly, so images are interchangeable between both:
 *
 *   | "MCR1" (4) | blob length (4, BE) | salt (16) | nonce (12) | ciphertext+tag |
 *
 * Bits are written MSB-first into the LSB of every R, G, B value.
 */

const MAGIC = [0x4d, 0x43, 0x52, 0x31]; // "MCR1"
const HEADER_LEN = 8;
const SALT_LEN = 16;
const NONCE_LEN = 12;
const TAG_LEN = 16;
const KDF_ITERATIONS = 600_000;
const MAX_PIXELS = 16_000_000;

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const NOT_FOUND = "No hidden MarsCrypt message found in this image.";

async function deriveKey(password: string, salt: Uint8Array, usage: KeyUsage[]) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 }, // 256-bit key -> AES-256
    false,
    usage,
  );
}

/** Decode an image file into opaque RGBA pixels (transparency flattened onto white). */
async function loadPixels(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Upload too large. The limit is 4 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Unsupported or corrupt image. Please upload a PNG, JPG, BMP or WEBP.");
  }
  if (bitmap.width * bitmap.height > MAX_PIXELS) {
    bitmap.close();
    throw new Error("Image is too large. Please use one under 16 megapixels.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser does not support canvas.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return { canvas, ctx, image: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

/** Index in the RGBA buffer of the n-th colour channel value (alpha skipped). */
const channelIndex = (n: number) => Math.floor(n / 3) * 4 + (n % 3);

/** Encrypt `message` and hide it in `file`; returns a PNG blob. */
export async function encryptAndHide(file: File, password: string, message: string): Promise<Blob> {
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!message.trim()) throw new Error("Please enter a secret message.");
  const msgBytes = new TextEncoder().encode(message);
  if (msgBytes.length > 20_000) throw new Error("Message is too long (20,000 bytes maximum).");

  const { canvas, ctx, image } = await loadPixels(file);

  // 1. Encrypt: salt || nonce || ciphertext+tag
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
  const key = await deriveKey(password, salt, ["encrypt"]);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, msgBytes as BufferSource),
  );
  const blobLen = SALT_LEN + NONCE_LEN + cipher.length;

  const payload = new Uint8Array(HEADER_LEN + blobLen);
  payload.set(MAGIC, 0);
  new DataView(payload.buffer).setUint32(4, blobLen, false);
  payload.set(salt, HEADER_LEN);
  payload.set(nonce, HEADER_LEN + SALT_LEN);
  payload.set(cipher, HEADER_LEN + SALT_LEN + NONCE_LEN);

  // 2. Capacity check
  const totalChannels = image.width * image.height * 3;
  if (payload.length * 8 > totalChannels) {
    const fits = Math.max(Math.floor(totalChannels / 8) - HEADER_LEN - SALT_LEN - NONCE_LEN - TAG_LEN, 0);
    throw new Error(
      `Message is too long for this image (about ${fits} characters fit). Use a larger image or a shorter message.`,
    );
  }

  // 3. Write bits (MSB first) into the least significant bits
  const px = image.data;
  for (let bit = 0; bit < payload.length * 8; bit++) {
    const value = (payload[bit >> 3] >> (7 - (bit & 7))) & 1;
    const i = channelIndex(bit);
    px[i] = (px[i] & 0xfe) | value;
  }
  ctx.putImageData(image, 0, 0);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the PNG."))), "image/png"),
  );
}

/** Read `count` bytes starting at byte `start` from the LSB stream. */
function readBytes(px: Uint8ClampedArray, start: number, count: number) {
  const out = new Uint8Array(count);
  for (let b = 0; b < count; b++) {
    let byte = 0;
    for (let k = 0; k < 8; k++) {
      byte = (byte << 1) | (px[channelIndex((start + b) * 8 + k)] & 1);
    }
    out[b] = byte;
  }
  return out;
}

/** Extract the hidden blob from `file` and decrypt it with `password`. */
export async function extractAndDecrypt(file: File, password: string): Promise<string> {
  if (!password) throw new Error("Please enter the password.");
  const { image } = await loadPixels(file);
  const px = image.data;
  const totalChannels = image.width * image.height * 3;

  if (totalChannels < HEADER_LEN * 8) throw new Error(NOT_FOUND);
  const header = readBytes(px, 0, HEADER_LEN);
  if (MAGIC.some((m, i) => header[i] !== m)) throw new Error(NOT_FOUND);

  const length = new DataView(header.buffer).getUint32(4, false);
  if (length < SALT_LEN + NONCE_LEN + TAG_LEN || (HEADER_LEN + length) * 8 > totalChannels) {
    throw new Error(NOT_FOUND);
  }

  const blob = readBytes(px, HEADER_LEN, length);
  const salt = blob.slice(0, SALT_LEN);
  const nonce = blob.slice(SALT_LEN, SALT_LEN + NONCE_LEN);
  const cipher = blob.slice(SALT_LEN + NONCE_LEN);

  try {
    const key = await deriveKey(password, salt, ["decrypt"]);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce as BufferSource },
      key,
      cipher as BufferSource,
    );
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } catch {
    throw new Error("Wrong password, or the image was modified or re-compressed.");
  }
}
