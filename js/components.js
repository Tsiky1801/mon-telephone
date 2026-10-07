/* Composants UI réutilisables de la PWA (toast, modal, icônes, DOM). */
"use strict";

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/>',
  folder: '<path d="M3 6c0-1.1.9-2 2-2h4l2 2h8c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V6Z"/>',
  camera: '<path d="M9 3h6l1.5 2H20a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h3.5L9 3Z"/><circle cx="12" cy="13" r="3.5"/>',
  tools: '<circle cx="5" cy="12" r="2.5"/><circle cx="12" cy="5" r="2.5"/><circle cx="12" cy="19" r="2.5"/><circle cx="19" cy="12" r="2.5"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>',
  pin: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  clipboard: '<rect x="6" y="4" width="12" height="18" rx="2"/><path d="M9 4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v1H9V4Z"/><path d="M9 11h6M9 15h4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>',
  download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="m5 18 5-5 3 3 4-4 3 3"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="m5 12 5 5 9-11"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
  zap: '<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.3-1.1.9-1.1 1.7"/><path d="M12 17h.01"/>',
  trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11"/><path d="M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11"/>',
};

function icon(name, cls) {
  return '<svg class="' + (cls || "w-5 h-5") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
}

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null) continue;
    if (typeof c === "string" && /^\s*</.test(c)) {
      node.insertAdjacentHTML("beforeend", c);
    } else {
      node.append(c.nodeType ? c : document.createTextNode(c));
    }
  }
  return node;
}

const toastEls = [];
function showToast(message, type) {
  let wrap = document.querySelector("#toast-wrap");
  if (!wrap) {
    wrap = el("div", { id: "toast-wrap", class: "fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none" });
    document.body.append(wrap);
  }
  while (toastEls.length >= 3) toastEls.shift().remove();
  const styles = {
    ok: "border-teal-500/50 text-teal-50",
    err: "border-rose-500/50 text-rose-50",
    info: "border-indigo-400/50 text-indigo-50",
  }[type || "ok"] || "bg-slate-800 text-white";
  const toast = el("div", { class: "toast pointer-events-auto bg-slate-900/95 backdrop-blur border " + styles + " rounded-xl px-4 py-2.5 text-sm shadow-lg max-w-full break-words" }, message);
  wrap.append(toast);
  toastEls.push(toast);
  setTimeout(() => { toast.classList.add("opacity-0", "transition-opacity"); setTimeout(() => toast.remove(), 300); }, 3200);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("hidden");
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("hidden");
}

function fmtSize(n) {
  if (n < 1024) return n + " o";
  if (n < 1048576) return (n / 1024).toFixed(1) + " Ko";
  return (n / 1048576).toFixed(1) + " Mo";
}

function fmtDate(ms) {
  const d = new Date(ms);
  const p = (x) => String(x).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function fmtDateFr(ms) {
  const d = new Date(ms);
  const p = (x) => String(x).padStart(2, "0");
  return d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

window.PhoneUI = { ICONS, icon, el, showToast, openModal, closeModal, fmtSize, fmtDate, fmtDateFr };