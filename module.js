/* GOFI module (repo #2) */
(() => {
  'use strict';

  // ====== Configuration ======
  // IMPORTANT: set to your main app's origin once known (recommended).
  // Example: "https://gemelinvest2026-wq.github.io"
  // For development, you can keep "*" but you MUST lock it later.
  const PARENT_ORIGIN = "*";

  // Demo goals (only for the ring progress visualization)
  const DAILY_GOAL = 5000;
  const MONTH_GOAL = 80000;

  // ====== State ======
  let ctx = null;       // GOFI_CONTEXT from parent
  let lastStats = null; // GOFI_STATS from parent

  // ====== Helpers ======
  const $ = (id) => document.getElementById(id);

  function formatILS(n) {
    const num = Number(n || 0);
    return '₪' + num.toLocaleString('he-IL');
  }

  function nowStamp() {
    const d = new Date();
    return d.toLocaleString('he-IL', { hour12: false });
  }

  function setProgress(el, value, goal) {
    const v = Math.max(0, Number(value || 0));
    const g = Math.max(1, Number(goal || 1));
    const p = Math.max(0, Math.min(1, v / g));
    el.style.setProperty('--p', String(p));
  }

  function setStatus(note) {
    $('lastUpdateVal').textContent = nowStamp();
    $('noteVal').textContent = note;
  }

  function renderAgentLine() {
    if (!ctx) return;
    const name = ctx.displayName || ctx.agentId || 'נציג';
    $('agentLine').textContent = `נציג: ${name}`;
    $('agentVal').textContent = name;
    $('originVal').textContent = (ctx.parentOrigin || '—');
  }

  function renderStats(stats) {
    const daily = Number(stats?.dailyPremium || 0);
    const monthly = Number(stats?.monthlyPremium || 0);

    $('dailyVal').textContent = formatILS(daily);
    $('monthVal').textContent = formatILS(monthly);

    $('dailyGoal').textContent = formatILS(DAILY_GOAL);

    setProgress($('dailyClock'), daily, DAILY_GOAL);
    setProgress($('monthClock'), monthly, MONTH_GOAL);

    // Optional: breakdown text
    const dailyByProduct = stats?.dailyByProduct || null;
    const monthByProduct = stats?.monthlyByProduct || null;

    $('dailyBreakdown').textContent = formatBreakdown(dailyByProduct, 'אין פירוט מוצרים (עדיין).');
    $('monthBreakdown').textContent = formatBreakdown(monthByProduct, 'אין פירוט מוצרים (עדיין).');

    setStatus('נתונים נטענו בהצלחה מהמערכת הראשית.');
  }

  function formatBreakdown(obj, fallback) {
    if (!obj || typeof obj !== 'object') return fallback;
    const entries = Object.entries(obj).filter(([k,v]) => k && Number(v));
    if (!entries.length) return fallback;
    // Sort descending by amount
    entries.sort((a,b) => Number(b[1]) - Number(a[1]));
    const top = entries.slice(0, 4).map(([k,v]) => `${k}: ${formatILS(v)}`);
    const more = entries.length > 4 ? ` +${entries.length - 4} עוד` : '';
    return 'לפי מוצרים: ' + top.join(' · ') + more;
  }

  function requestStats() {
    if (!ctx?.agentId) {
      setStatus('אין agentId עדיין. מחכה ל־GOFI_CONTEXT…');
      return;
    }
    // Ask parent for the current stats for this agent
    window.parent.postMessage({
      type: 'GOFI_GET_STATS',
      agentId: ctx.agentId,
      // include a nonce/session if you add it later
    }, PARENT_ORIGIN);

    setStatus('נשלחה בקשה לנתונים (GOFI_GET_STATS)…');
  }

  function closeMe() {
    window.parent.postMessage({ type: 'GOFI_CLOSE' }, PARENT_ORIGIN);
  }

  // ====== Event wiring ======
  $('btnClose').addEventListener('click', closeMe);
  $('btnRefresh').addEventListener('click', requestStats);

  // ====== Message handling ======
  window.addEventListener('message', (event) => {
    // If you lock PARENT_ORIGIN to an actual origin, also validate:
    // if (PARENT_ORIGIN !== '*' && event.origin !== PARENT_ORIGIN) return;

    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'GOFI_CONTEXT') {
      ctx = msg;

      // store for diagnostics
      ctx.parentOrigin = event.origin;

      renderAgentLine();
      setStatus('התקבל GOFI_CONTEXT. מבקש נתונים…');
      requestStats();
      return;
    }

    if (msg.type === 'GOFI_STATS') {
      lastStats = msg.stats || msg.payload || msg;
      renderStats(lastStats);
      return;
    }

    if (msg.type === 'GOFI_PING') {
      window.parent.postMessage({ type: 'GOFI_PONG', ts: Date.now() }, PARENT_ORIGIN);
      return;
    }
  });

  // ====== Boot ======
  // Let parent know we're ready (optional)
  window.parent.postMessage({ type: 'GOFI_READY', ts: Date.now() }, PARENT_ORIGIN);

  // Render initial (zeros)
  renderStats({ dailyPremium: 0, monthlyPremium: 0 });
  setStatus('מודול עלה. מחכה ל־GOFI_CONTEXT מהמערכת הראשית…');

})();
