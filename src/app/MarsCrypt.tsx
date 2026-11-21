/* MarsCrypt UI — self-contained styles (all classes prefixed with "mc-") */

.mc-root {
  --bg: #0a0710;
  --panel: #141019;
  --panel-2: #1b1524;
  --line: rgba(255, 255, 255, 0.09);
  --text: #f4effb;
  --muted: #a99dbb;
  --ok: #3ddc97;
  --err: #ff6b7a;
  --radius: 20px;

  min-height: 100vh;
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
  background:
    radial-gradient(900px 500px at 12% -5%, rgba(255, 107, 61, 0.16), transparent 60%),
    radial-gradient(800px 500px at 95% 0%, rgba(56, 189, 248, 0.13), transparent 60%),
    var(--bg);
  -webkit-text-size-adjust: 100%;
}
.mc-root *, .mc-root *::before, .mc-root *::after { box-sizing: border-box; }
.mc-root a { color: inherit; }

.mc-sr {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.mc-wrap { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 16px; }

/* ---------- Header ---------- */
.mc-header {
  position: sticky; top: 0; z-index: 30;
  background: rgba(10, 7, 16, 0.72);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}
.mc-header-in { height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.mc-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 800; font-size: 1.15rem; letter-spacing: -0.01em; }
.mc-brand-logo {
  width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, #ff6b3d, #ffb347);
  box-shadow: 0 6px 20px rgba(255, 107, 61, 0.35);
}
.mc-brand b { font-weight: 800; background: linear-gradient(90deg, #ff6b3d, #ffb347); -webkit-background-clip: text; background-clip: text; color: transparent; }
.mc-nav { display: flex; align-items: center; gap: 6px; }
.mc-nav a {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 42px; padding: 0 14px; border-radius: 12px; text-decoration: none;
  color: var(--muted); font-size: 0.95rem; font-weight: 600; transition: background 0.2s, color 0.2s;
}
.mc-nav a:hover { color: var(--text); background: rgba(255, 255, 255, 0.07); }

/* ---------- Hero ---------- */
.mc-hero { text-align: center; padding: 40px 0 22px; }
.mc-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px;
  border: 1px solid var(--line); background: rgba(255, 255, 255, 0.04);
  color: var(--muted); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.02em;
}
.mc-pill i { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 10px var(--ok); }
.mc-hero h1 { margin: 16px 0 10px; font-size: clamp(2rem, 6.5vw, 3.4rem); line-height: 1.08; letter-spacing: -0.03em; }
.mc-grad { background: linear-gradient(90deg, #ff6b3d, #ffb347 45%, #38bdf8); -webkit-background-clip: text; background-clip: text; color: transparent; }
.mc-hero p { margin: 0 auto; max-width: 540px; color: var(--muted); font-size: 1.02rem; }

/* ---------- Mobile tab switch ---------- */
.mc-tabs-bar {
  position: sticky; top: 60px; z-index: 20; padding: 10px 0; display: none;
  background: linear-gradient(var(--bg) 70%, transparent);
}
.mc-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 5px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
}
.mc-tab {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; border: 0; border-radius: 12px; cursor: pointer;
  background: transparent; color: var(--muted); font: inherit; font-weight: 700; font-size: 0.95rem;
  transition: background 0.2s, color 0.2s, transform 0.1s;
}
.mc-tab:active { transform: scale(0.98); }
.mc-tab[aria-selected="true"] { color: #fff; background: linear-gradient(135deg, var(--tc), var(--tc2)); box-shadow: 0 6px 18px var(--ts); }
.mc-tab.enc { --tc: #ff6b3d; --tc2: #ff9a3d; --ts: rgba(255, 107, 61, 0.35); }
.mc-tab.dec { --tc: #0ea5e9; --tc2: #6366f1; --ts: rgba(56, 130, 248, 0.35); }

/* ---------- Two boxes ---------- */
.mc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; padding-bottom: 20px; }

.mc-panel {
  --c: #ff6b3d; --c2: #ffb347; --cs: rgba(255, 107, 61, 0.3);
  position: relative; scroll-margin-top: 130px;
  background: linear-gradient(180deg, var(--panel-2), var(--panel));
  border: 1px solid var(--line); border-radius: var(--radius);
  padding: 22px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.mc-panel::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 3px;
  background: linear-gradient(90deg, var(--c), var(--c2));
}
.mc-panel.dec { --c: #0ea5e9; --c2: #6366f1; --cs: rgba(56, 130, 248, 0.3); }

.mc-panel-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.mc-badge {
  flex: none; width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, var(--c), var(--c2)); box-shadow: 0 8px 22px var(--cs);
}
.mc-panel-head h2 { margin: 0; font-size: 1.25rem; letter-spacing: -0.01em; }
.mc-panel-head p { margin: 2px 0 0; color: var(--muted); font-size: 0.9rem; }

.mc-form { display: flex; flex-direction: column; gap: 16px; }
.mc-label { display: block; margin-bottom: 7px; font-size: 0.85rem; font-weight: 700; color: #d9cfe8; }
.mc-hint { display: block; margin-top: 6px; color: var(--muted); font-size: 0.78rem; text-align: right; }

/* Dropzone */
.mc-drop {
  display: flex; align-items: center; justify-content: center; min-height: 170px; padding: 16px;
  border: 2px dashed rgba(255, 255, 255, 0.18); border-radius: 16px; cursor: pointer; text-align: center;
  background: rgba(255, 255, 255, 0.025); transition: border-color 0.2s, background 0.2s, transform 0.15s;
}
.mc-drop:hover, .mc-drop.drag, .mc-drop:focus-within { border-color: var(--c); background: rgba(255, 255, 255, 0.05); }
.mc-drop.drag { transform: scale(1.01); }
.mc-drop-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--muted); font-size: 0.92rem; }
.mc-drop-empty svg { color: var(--c); }
.mc-drop-empty strong { color: var(--text); }
.mc-drop-empty small { font-size: 0.78rem; opacity: 0.85; }
.mc-preview { display: block; max-width: 100%; max-height: 220px; margin: 0 auto; border-radius: 12px; object-fit: contain; }
.mc-fname { margin-top: 10px; color: var(--muted); font-size: 0.8rem; word-break: break-all; }

/* Inputs */
.mc-input-wrap { position: relative; }
.mc-input, .mc-textarea {
  width: 100%; border-radius: 14px; border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.3); color: var(--text); font: inherit; font-size: 16px; /* 16px stops iOS zoom */
  padding: 13px 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
}
.mc-input { min-height: 50px; padding-right: 74px; }
.mc-textarea { min-height: 130px; resize: vertical; }
.mc-input::placeholder, .mc-textarea::placeholder { color: #6f6580; }
.mc-input:focus, .mc-textarea:focus { border-color: var(--c); box-shadow: 0 0 0 4px var(--cs); }
.mc-toggle {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  min-height: 38px; padding: 0 12px; border: 0; border-radius: 10px; cursor: pointer;
  background: rgba(255, 255, 255, 0.08); color: var(--text); font: inherit; font-size: 0.82rem; font-weight: 700;
}

/* Buttons */
.mc-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; min-height: 52px; padding: 0 20px; border: 0; border-radius: 14px; cursor: pointer;
  font: inherit; font-size: 1rem; font-weight: 700; text-decoration: none; color: #fff;
  transition: transform 0.1s, filter 0.2s, opacity 0.2s;
}
.mc-btn:hover { filter: brightness(1.08); }
.mc-btn:active { transform: scale(0.985); }
.mc-btn:disabled { opacity: 0.7; cursor: progress; }
.mc-btn.primary { background: linear-gradient(135deg, var(--c), var(--c2)); box-shadow: 0 10px 26px var(--cs); }
.mc-btn.ghost { background: rgba(255, 255, 255, 0.07); border: 1px solid var(--line); color: var(--text); }
.mc-spin { display: none; width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid rgba(255, 255, 255, 0.35); border-top-color: #fff; animation: mc-rot 0.7s linear infinite; }
.mc-btn.loading .mc-spin { display: inline-block; }
@keyframes mc-rot { to { transform: rotate(360deg); } }

/* Alerts & results */
.mc-alert { padding: 12px 14px; border-radius: 12px; font-size: 0.9rem; border: 1px solid rgba(255, 107, 122, 0.4); background: rgba(255, 107, 122, 0.1); color: #ffc2c9; }
.mc-result { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 12px; animation: mc-in 0.35s ease; }
@keyframes mc-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.mc-result-title { margin: 0; color: var(--ok); font-weight: 700; }
.mc-result img { max-width: 100%; border-radius: 14px; border: 1px solid var(--line); }
.mc-note { color: var(--muted); font-size: 0.8rem; }
.mc-secret {
  margin: 0; padding: 14px; border-radius: 14px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line);
  font: 0.95rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; word-break: break-word;
  max-height: 320px; overflow: auto;
}

/* ---------- How it works ---------- */
.mc-how { padding: 40px 0 28px; }
.mc-how h2 { margin: 0 0 18px; text-align: center; font-size: 1.5rem; letter-spacing: -0.02em; }
.mc-how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.mc-how-item { padding: 18px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line); }
.mc-how-item h3 { margin: 0 0 6px; font-size: 1rem; }
.mc-how-item p { margin: 0; color: var(--muted); font-size: 0.9rem; }

.mc-footer { padding: 26px 16px 34px; text-align: center; color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--line); }
.mc-footer a { color: var(--text); font-weight: 600; }

/* ---------- Responsive ---------- */
@media (max-width: 859px) {
  .mc-tabs-bar { display: block; }
  .mc-grid { grid-template-columns: 1fr; gap: 0; }
  .mc-panel { display: none; padding: 18px; }
  .mc-panel.active { display: block; animation: mc-in 0.3s ease; }
  .mc-hero { padding: 26px 0 8px; }
  .mc-how-grid { grid-template-columns: 1fr; }
  .mc-nav .mc-nav-text { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .mc-root *, .mc-root *::before, .mc-root *::after { animation: none !important; transition: none !important; }
}
