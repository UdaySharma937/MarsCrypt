# 🔐 MarsCrypt

Hide **AES-256 encrypted** messages inside ordinary images using **LSB steganography**.
A Flask app built for **Vercel's free serverless tier**: no database, no disk, everything runs in memory.

## Features

- **Encrypt & Hide**: upload an image, add a password and a secret message, then download a new stego PNG.
- **Extract & Decrypt**: upload a stego PNG, enter the password and read the message.
- Dark, responsive single page with a blurred popup side menu and two cascading sections.
- Nothing is stored. Images and passwords live only for the duration of one request.

## Security design

| Step | Implementation |
|------|----------------|
| Key derivation | PBKDF2-HMAC-SHA256, 600,000 iterations, random 16-byte salt |
| Encryption | AES-256-GCM (32-byte key, random 12-byte nonce, authenticated) |
| Hiding | 1 bit per R/G/B value (least significant bit), MSB-first, saved as lossless PNG |

> **Why not Fernet?** Python's `Fernet` is AES-**128**-CBC + HMAC-SHA256. To honour the AES-**256**
> requirement, MarsCrypt uses AES-256-GCM from the same `cryptography` library. It also authenticates the data.

Hidden payload layout:

```
| "MCR1" (4) | blob length (4, big-endian) | salt (16) | nonce (12) | ciphertext + tag |
```

A wrong password or a modified image fails authentication and returns a clear error.

## Project structure

```
api/index.py          Flask app (Vercel serverless function)
templates/index.html  Single-page UI
static/style.css      Dark responsive theme
requirements.txt      Python dependencies
vercel.json           Routing + build config
.vercelignore         Keeps unrelated files out of the deployment
```

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python api/index.py              # http://localhost:5000
```

## Deploy to Vercel

1. **Push to GitHub.** Create a repo containing the files above and push it.
2. **Import the project.** Go to <https://vercel.com/new>, pick the repo and click **Import**.
3. **Framework preset.** Leave it as **Other**. `vercel.json` already tells Vercel to build `api/index.py` with `@vercel/python`.
4. **Deploy.** Click **Deploy**. No environment variables are needed.

Or use the CLI:

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production deployment
```

## Limits (Vercel free tier)

- Request body is capped at about 4.5 MB, so uploads are limited to **4 MB**.
- Images up to **16 megapixels**. Larger ones are rejected to protect function memory.
- Function time is limited. PBKDF2 at 600k rounds takes well under a second.
- Capacity is about `width × height × 3 / 8` bytes. For example, a 1000×1000 image holds about 375 KB.

## Tips

- Always share the generated **PNG as a file**. Messengers and social apps often re-compress images, which destroys the hidden bits.
- Use a strong passphrase. The encryption is only as strong as your password.
- Transparent areas are flattened onto white before hiding.

## API

| Method | Route | Body (multipart) | Response |
|--------|-------|------------------|----------|
| POST | `/api/encrypt` | `image`, `password`, `message` | `image/png` download |
| POST | `/api/decrypt` | `image`, `password` | `{ "message": "..." }` |
| GET | `/api/health` | none | `{ "status": "ok" }` |

Errors are returned as `{ "error": "..." }`.

## Author

Made by [UdaySharma937](https://github.com/UdaySharma937).
