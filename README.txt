:root {
  --bg: #edf3fb;
  --card: rgba(255,255,255,0.82);
  --line: #d7e1ef;
  --text: #16304f;
  --muted: #5f7693;
  --brand: #1c4da1;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: linear-gradient(180deg, #f3f7fc 0%, var(--bg) 100%);
  color: var(--text);
}
.shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}
.card {
  background: var(--card);
  border: 1px solid rgba(255,255,255,0.7);
  box-shadow: 0 12px 36px rgba(11, 34, 66, 0.08);
  border-radius: 24px;
  backdrop-filter: blur(12px);
}
.hero {
  padding: 32px;
  margin-bottom: 24px;
}
.eyebrow {
  color: var(--brand);
  font-weight: 700;
  margin-bottom: 10px;
}
.hero h1 {
  margin: 0 0 12px;
  font-size: 42px;
  line-height: 1.1;
}
.hero p {
  margin: 0;
  color: var(--muted);
  font-size: 19px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.form-card, .preview-card {
  padding: 24px;
}
.label {
  display: block;
  font-size: 18px;
  margin-bottom: 12px;
  font-weight: 700;
}
input[type=file] {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255,255,255,0.95);
}
.actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}
button {
  border: 0;
  border-radius: 16px;
  padding: 14px 22px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}
button.primary {
  background: var(--brand);
  color: white;
}
button.secondary {
  background: white;
  color: var(--text);
  border: 1px solid var(--line);
}
.status {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f7fbff;
  border: 1px solid var(--line);
  color: var(--muted);
}
pre {
  min-height: 360px;
  max-height: 560px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #0f1724;
  color: #dce9ff;
  border-radius: 16px;
  padding: 16px;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .hero h1 { font-size: 32px; }
}
