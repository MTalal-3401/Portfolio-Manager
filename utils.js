export function fmtMoney(n){
  const x = Number(n ?? 0);
  return x.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}
export function fmtInt(n){
  const x = Number(n ?? 0);
  return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
export function parseNumber(s){
  if (s === null || s === undefined) return null;
  if (typeof s === "number") return s;
  const cleaned = String(s).replace(/,/g,"").trim();
  if (!cleaned) return null;
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : null;
}
export function parseDateDMY(s){
  // Supports dd-mm-yy or dd-mm-yyyy
  const t = String(s).trim();
  const m = t.match(/^(\d{2})-(\d{2})-(\d{2,4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yy = Number(m[3]);
  if (yy < 100) yy = 2000 + yy;
  const iso = `${yy.toString().padStart(4,'0')}-${mm.toString().padStart(2,'0')}-${dd.toString().padStart(2,'0')}`;
  return iso;
}
export function parseDateSlash(s){
  // Supports dd/mm/yyyy
  const t = String(s).trim();
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]); const mm = Number(m[2]); const yy = Number(m[3]);
  return `${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
}
export async function sha256Hex(input){
  const enc = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
export function qs(name){
  return new URLSearchParams(location.search).get(name);
}
export function setText(id, txt){
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
export function setHTML(id, html){
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
export function show(id){ const el=document.getElementById(id); if(el) el.classList.remove("hidden"); }
export function hide(id){ const el=document.getElementById(id); if(el) el.classList.add("hidden"); }
