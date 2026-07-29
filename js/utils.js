/**
 * utils.js — Shared utilities for EduVerify 2.0
 * Toast · Theme · DOM helpers · Format · Session · Download
 */

window.EV = (function () {

  /* ── Theme Manager ─────────────────────────────────────────────── */
  const ThemeManager = {
    init() {
      const saved = localStorage.getItem('ev-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
      const btn = document.getElementById('themeToggle');
      if (btn) btn.addEventListener('click', () => this.toggle());
    },
    toggle() {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ev-theme', next);
    }
  };

  /* ── Toast ─────────────────────────────────────────────────────── */
  let toastContainer = null;
  const getToastContainer = () => {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'ev-toasts';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  };

  const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const Toast = {
    show(msg, type = 'info', duration = 4000) {
      const container = getToastContainer();
      const el = document.createElement('div');
      el.className = `ev-toast toast-${type}`;
      el.innerHTML = `<span>${ICONS[type]}</span><span>${msg}</span>`;
      container.appendChild(el);
      setTimeout(() => {
        el.classList.add('hiding');
        el.addEventListener('animationend', () => el.remove());
      }, duration);
    },
    success: (msg) => Toast.show(msg, 'success'),
    error:   (msg) => Toast.show(msg, 'error', 5000),
    warning: (msg) => Toast.show(msg, 'warning'),
    info:    (msg) => Toast.show(msg, 'info'),
  };

  /* ── Loader ────────────────────────────────────────────────────── */
  let loaderEl = null;
  const Loader = {
    show(text = 'Processing…') {
      if (!loaderEl) {
        loaderEl = document.createElement('div');
        loaderEl.className = 'ev-loader-overlay';
        loaderEl.innerHTML = `
          <div class="ev-loader-spinner"></div>
          <div class="ev-loader-text" id="loaderText">${text}</div>`;
        document.body.appendChild(loaderEl);
      } else {
        loaderEl.style.display = 'flex';
        const t = loaderEl.querySelector('#loaderText');
        if (t) t.textContent = text;
      }
    },
    updateMessage(text) {
      const t = document.getElementById('loaderText');
      if (t) t.textContent = text;
    },
    hide() {
      if (loaderEl) loaderEl.style.display = 'none';
    }
  };

  /* ── DOM Helpers ───────────────────────────────────────────────── */
  const Dom = {
    show: (el) => { if (typeof el === 'string') el = document.getElementById(el); if (el) el.classList.remove('hidden'); },
    hide: (el) => { if (typeof el === 'string') el = document.getElementById(el); if (el) el.classList.add('hidden'); },
    setText: (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; },
    setHTML: (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; },
    get: (id) => document.getElementById(id),
    on: (id, event, fn) => { const el = typeof id === 'string' ? document.getElementById(id) : id; if (el) el.addEventListener(event, fn); },
  };

  /* ── Format ────────────────────────────────────────────────────── */
  const Format = {
    number: (n) => (n ?? 0).toLocaleString(),
    fileSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    },
    time: () => new Date().toLocaleTimeString(),
  };

  /* ── Session Storage ───────────────────────────────────────────── */
  const Session = {
    set(key, val) { try { sessionStorage.setItem(`ev_${key}`, JSON.stringify(val)); } catch(e) {} },
    get(key) { try { const v = sessionStorage.getItem(`ev_${key}`); return v ? JSON.parse(v) : null; } catch(e) { return null; } },
    remove(key) { sessionStorage.removeItem(`ev_${key}`); },
    clear() { Object.keys(sessionStorage).filter(k => k.startsWith('ev_')).forEach(k => sessionStorage.removeItem(k)); },
  };

  /* ── Navigation ────────────────────────────────────────────────── */
  const Nav = {
    go(path) {
      // Handle both file:// and http:// environments
      const base = window.location.pathname.replace(/\/[^\/]*$/, '/').replace(/\/[^\/]*\.html$/, '/');
      if (window.location.protocol === 'file:') {
        const dir = window.location.href.replace(/\/[^\/]*$/, '/');
        window.location.href = dir + path.replace(/^\//, '');
      } else {
        window.location.href = path;
      }
    }
  };

  /* ── Excel Download (SheetJS) ──────────────────────────────────── */
  const Download = {
    xlsx(data, filename) {
      if (typeof XLSX === 'undefined') { Toast.error('SheetJS not loaded.'); return; }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      // Auto column widths
      const colWidths = data[0].map((_, ci) => ({
        wch: Math.max(...data.map(row => String(row[ci] ?? '').length)) + 2
      }));
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, filename);
    },
    csv(data, filename) {
      const csv = data.map(row => row.map(cell => {
        const s = String(cell ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    },
    json(data, filename) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* ── File Reader (SheetJS) ─────────────────────────────────────── */
  const ExcelReader = {
    read(file) {
      return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') { reject(new Error('SheetJS not loaded')); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array', cellDates: false });
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            // Parse as array of objects
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
            resolve({ rows, sheetName, wb });
          } catch (err) {
            reject(new Error('Failed to parse Excel file: ' + err.message));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    },
    /** Normalize a raw row: lowercase keys, trim values, add _rowIndex */
    normalizeRows(rawRows) {
      return rawRows
        .filter(row => Object.values(row).some(v => String(v ?? '').trim() !== ''))
        .map((row, idx) => {
          const normalized = { _rowIndex: idx + 2 }; // +2: 1-based + header row
          Object.entries(row).forEach(([k, v]) => {
            const normKey = k.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            normalized[normKey] = String(v ?? '').trim();
          });
          return normalized;
        });
    }
  };

  return { ThemeManager, Toast, Loader, Dom, Format, Session, Nav, Download, ExcelReader };

})();
