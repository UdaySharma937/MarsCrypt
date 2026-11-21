"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { encryptAndHide, extractAndDecrypt } from "@/lib/stego";

const GITHUB = "https://github.com/UdaySharma937";

/* ---------- Small presentational pieces ---------- */

function UploadIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4m0 0L7 9m5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

/** Drag & drop / click image picker with live preview. */
function Dropzone({
  file,
  onFile,
  hint,
  previewAlt,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  hint: string;
  previewAlt: string;
}) {
  const [drag, setDrag] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <label
      className={"dropzone" + (drag ? " drag" : "")}
      onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
      onDrop={onDrop}
    >
      <input
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/bmp,image/webp"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file && url ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="dz-preview" src={url} alt={previewAlt} />
          <div className="dz-name">{file.name} · {(file.size / 1024).toFixed(0)} KB</div>
        </div>
      ) : (
        <div className="dz-empty">
          <UploadIcon />
          <span><strong>Click to upload</strong> or drag &amp; drop</span>
          <small>{hint}</small>
        </div>
      )}
    </label>
  );
}

function PasswordField({
  id, label, value, onChange, placeholder, autoComplete,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder: string; autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          className="input"
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button className="toggle" type="button" onClick={() => setShow((s) => !s)}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ loading, idle, busy }: { loading: boolean; idle: string; busy: string }) {
  return (
    <button className={"btn primary" + (loading ? " loading" : "")} type="submit" disabled={loading}>
      <span className="spinner" />
      <span className="label">{loading ? busy : idle}</span>
    </button>
  );
}

/* ---------- Main page component ---------- */

export default function MarsCrypt() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Encrypt state
  const [encFile, setEncFile] = useState<File | null>(null);
  const [encPass, setEncPass] = useState("");
  const [encMsg, setEncMsg] = useState("");
  const [encBusy, setEncBusy] = useState(false);
  const [encError, setEncError] = useState("");
  const [encUrl, setEncUrl] = useState<string | null>(null);
  const encResultRef = useRef<HTMLDivElement>(null);

  // Decrypt state
  const [decFile, setDecFile] = useState<File | null>(null);
  const [decPass, setDecPass] = useState("");
  const [decBusy, setDecBusy] = useState(false);
  const [decError, setDecError] = useState("");
  const [decMessage, setDecMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const decResultRef = useRef<HTMLDivElement>(null);

  // Close the menu with Escape and lock page scroll while it is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Free generated object URLs.
  useEffect(() => () => { if (encUrl) URL.revokeObjectURL(encUrl); }, [encUrl]);

  const handleEncrypt = async (e: FormEvent) => {
    e.preventDefault();
    setEncError("");
    setEncUrl(null);
    if (!encFile) return setEncError("Please choose an image first.");
    setEncBusy(true);
    try {
      const blob = await encryptAndHide(encFile, encPass, encMsg);
      setEncUrl(URL.createObjectURL(blob));
      setTimeout(() => encResultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (err) {
      setEncError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setEncBusy(false);
    }
  };

  const handleDecrypt = async (e: FormEvent) => {
    e.preventDefault();
    setDecError("");
    setDecMessage(null);
    if (!decFile) return setDecError("Please choose a stego image first.");
    setDecBusy(true);
    try {
      setDecMessage(await extractAndDecrypt(decFile, decPass));
      setTimeout(() => decResultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (err) {
      setDecError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDecBusy(false);
    }
  };

  const copyMessage = async () => {
    if (decMessage == null) return;
    try {
      await navigator.clipboard.writeText(decMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const close = () => setMenuOpen(false);

  return (
    <>
      {/* Side-by-side layout: Encrypt on the left, Decrypt on the right */}
      <style>{`
        .container.wide { max-width: 1200px; }
        .split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
          width: 100%;
        }
        .split > .card { min-width: 0; margin: 0; }
        @media (max-width: 900px) {
          .split { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          <button
            className="icon-btn"
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <a className="brand" href="#top" aria-label="MarsCrypt home">
            <span className="brand-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <span className="brand-text">Mars<span>Crypt</span></span>
          </a>

          <a className="icon-btn" href={GITHUB} target="_blank" rel="noopener noreferrer" aria-label="UdaySharma937 on GitHub" title="GitHub">
            <GithubIcon />
          </a>
        </div>
      </header>

      {/* Blurred backdrop + popup menu */}
      <div className={"backdrop" + (menuOpen ? " open" : "")} onClick={close} />
      <nav id="menu" className={"menu-popup" + (menuOpen ? " open" : "")} aria-label="Main menu" aria-hidden={!menuOpen}>
        <div className="menu-head">
          <span>Menu</span>
          <button className="menu-close" type="button" aria-label="Close menu" onClick={close}>✕</button>
        </div>
        <a className="menu-link" href="#encrypt" onClick={close}><span className="mi">🔒</span><span>Encrypt &amp; Hide<small>Put a secret inside an image</small></span></a>
        <a className="menu-link" href="#decrypt" onClick={close}><span className="mi">🔓</span><span>Extract &amp; Decrypt<small>Reveal a hidden message</small></span></a>
        <a className="menu-link" href="#how" onClick={close}><span className="mi">🛰️</span><span>How it works<small>Security explained</small></span></a>
        <div className="menu-divider" />
        <a className="menu-link" href={GITHUB} target="_blank" rel="noopener noreferrer" onClick={close}><span className="mi">⭐</span><span>GitHub<small>github.com/UdaySharma937</small></span></a>
      </nav>

      <main>
        <section className="container hero">
          <span className="pill"><i /> AES-256 · PBKDF2 · LSB steganography</span>
          <h1>Hide secrets in <span className="grad">plain sight</span></h1>
          <p>Encrypt a message with your password, then bury it inside an ordinary picture. Nothing is stored on the server.</p>
        </section>

        <div className="container wide">
          <div className="split">
            {/* Left – Encrypt */}
            <section className="card" id="encrypt">
              <div className="card-head">
                <span className="step">01</span>
                <div>
                  <h2>Encrypt &amp; Hide</h2>
                  <p>Upload an image, add a password and your secret message.</p>
                </div>
              </div>

              <form className="form" onSubmit={handleEncrypt} noValidate>
                <div>
                  <span className="field-label">Cover image</span>
                  <Dropzone file={encFile} onFile={setEncFile} hint="PNG, JPG, BMP or WEBP · up to 4 MB" previewAlt="Selected cover image preview" />
                </div>

                <PasswordField id="encPass" label="Password" value={encPass} onChange={setEncPass} placeholder="At least 6 characters" autoComplete="new-password" />

                <div className="field">
                  <label htmlFor="encMsg">Secret message</label>
                  <textarea
                    className="textarea"
                    id="encMsg"
                    value={encMsg}
                    maxLength={5000}
                    onChange={(e) => setEncMsg(e.target.value)}
                    placeholder="Type the message you want to hide…"
                  />
                  <small className="hint">{encMsg.length} / 5000</small>
                </div>

                <SubmitButton loading={encBusy} idle="Encrypt & Hide" busy="Encrypting…" />
                {encError && <div className="alert error" role="alert">{encError}</div>}
              </form>

              {encUrl && (
                <div className="result" ref={encResultRef}>
                  <p className="result-title">✔ Your stego image is ready</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={encUrl} alt="Generated stego image" />
                  <a className="btn ghost" href={encUrl} download="marscrypt_stego.png">⬇ Download PNG</a>
                  <small className="hint" style={{ textAlign: "left" }}>
                    Share it as a file. Messengers that re-compress images will destroy the hidden data.
                  </small>
                </div>
              )}
            </section>

            {/* Right – Decrypt */}
            <section className="card" id="decrypt">
              <div className="card-head">
                <span className="step">02</span>
                <div>
                  <h2>Extract &amp; Decrypt</h2>
                  <p>Upload a stego image and enter the password to reveal the message.</p>
                </div>
              </div>

              <form className="form" onSubmit={handleDecrypt} noValidate>
                <div>
                  <span className="field-label">Stego image</span>
                  <Dropzone file={decFile} onFile={setDecFile} hint="The PNG created by MarsCrypt" previewAlt="Selected stego image preview" />
                </div>

                <PasswordField id="decPass" label="Password" value={decPass} onChange={setDecPass} placeholder="The password used to encrypt" autoComplete="current-password" />

                <SubmitButton loading={decBusy} idle="Extract & Decrypt" busy="Decrypting…" />
                {decError && <div className="alert error" role="alert">{decError}</div>}
              </form>

              {decMessage !== null && (
                <div className="result" ref={decResultRef}>
                  <p className="result-title">✔ Message decrypted</p>
                  <pre className="secret-box">{decMessage}</pre>
                  <button className="btn ghost" type="button" onClick={copyMessage}>{copied ? "Copied ✔" : "Copy message"}</button>
                </div>
              )}
            </section>
          </div>
        </div>

        <section className="container how" id="how">
          <h2>How it works</h2>
          <div className="how-grid">
            <article className="how-item"><h3>1 · Key derivation</h3><p>Your password and a random 16-byte salt go through PBKDF2-SHA256 (600,000 rounds) to make a 256-bit key.</p></article>
            <article className="how-item"><h3>2 · AES-256 encryption</h3><p>The message is sealed with AES-256-GCM, so a wrong password or any tampering is detected.</p></article>
            <article className="how-item"><h3>3 · LSB hiding</h3><p>Ciphertext bits replace the least significant bit of each colour value. The change is invisible to the eye.</p></article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        Built by <a href={GITHUB} target="_blank" rel="noopener noreferrer">Uday Sharma</a> · MarsCrypt · No data is stored
      </footer>
    </>
  );
}
