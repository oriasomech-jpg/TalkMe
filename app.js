(() => {
  'use strict';

  // =========================
  // CONFIG (Phase 1 - Offline)
  // =========================
  // NOTE: This is a client-side gate (GitHub Pages). It's for basic access control, not server security.
  const ACCESS_PASSWORD = '1234';

  // You can keep the logo external (from main CRM repo) to avoid duplicating assets.
  // If you later add an /assets folder in this repo, change to a relative path.
  const LOGO_URL = 'https://leadupleadup.github.io/LeadUp/assets/logo-login-clean.svg';

  // Data source strategy (Phase 1):
  // 1) If embedded in CRM: request customers via postMessage (parent can reply later).
  // 2) Fallback to demo customers in this repo (so UI works now).
  const USE_DEMO_FALLBACK = true;

  const DEMO_CUSTOMERS = [
    { id:'c1', fullName:'דניאל כהן', tz:'123456789', phone:'050-1234567', email:'daniel@mail.com', assignedAgent:'אוריה (דמו)', status:'פעיל', segment:'פרימיום' },
    { id:'c2', fullName:'נועה לוי', tz:'987654321', phone:'052-7654321', email:'noa@mail.com', assignedAgent:'סתיו', status:'חדש', segment:'ליד' },
    { id:'c3', fullName:'יוסי מזרחי', tz:'314159265', phone:'054-5551234', email:'yossi@mail.com', assignedAgent:'דוד', status:'פעיל', segment:'סטנדרט' },
  ];

  // =========================
  // DOM
  // =========================
  const gate = document.getElementById('gate');
  const app  = document.getElementById('app');
  const pw   = document.getElementById('pw');
  const btn  = document.getElementById('enterBtn');
  const err  = document.getElementById('err');

  const brandLogo = document.getElementById('brandLogo');
  const topLogo   = document.getElementById('topLogo');

  const qEl = document.getElementById('q');
  const clearBtn = document.getElementById('clearBtn');
  const resultsEl = document.getElementById('results');
  const emptyEl = document.getElementById('empty');
  const metaText = document.getElementById('metaText');
  const showAllChk = document.getElementById('showAllChk');

  const detailsSub = document.getElementById('detailsSub');
  const detailsBody = document.getElementById('detailsBody');
  const statusPill = document.getElementById('statusPill');
  const subline = document.getElementById('subline');

  // Fullscreen overlay (safe + scoped)
  const tmOverlay = document.getElementById('tmOverlay');
  const tmOverlayBody = document.getElementById('tmOverlayBody');
  const tmOverlaySub = document.getElementById('tmOverlaySub');
  const tmCloseOverlay = document.getElementById('tmCloseOverlay');

  // =========================
  // State
  // =========================
  let customers = [];
  let filtered = [];
  let activeId = null;

  // =========================
  // Helpers
  // =========================
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function showError(msg){
    if(!err) return;
    err.textContent = msg || 'שגיאה';
    err.style.display = msg ? 'block' : 'none';
  }
  // =========================
  // Fullscreen overlay helpers (scoped)
  // =========================
  let _prevBodyOverflow = null;

  function openOverlay(title){
    if(!tmOverlay) return;
    tmOverlay.setAttribute('aria-hidden','false');
    if(tmOverlaySub) tmOverlaySub.textContent = title || 'שיקוף שיחה';
    if(_prevBodyOverflow === null){
      _prevBodyOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeOverlay(){
    if(!tmOverlay) return;
    tmOverlay.setAttribute('aria-hidden','true');
    if(tmOverlayBody) tmOverlayBody.innerHTML = '';
    if(_prevBodyOverflow !== null){
      document.body.style.overflow = _prevBodyOverflow;
      _prevBodyOverflow = null;
    }
  }

  function renderDetailsHTML(c){
    if(!c){
      return `
        <div class="hintBox">
          <div class="hintTitle">מוכן להמשך</div>
          <div class="hintText">אחרי חיבור הנתונים — נציג כאן את כל פרטי השיקוף.</div>
        </div>`;
    }

    return `
      <div class="kv"><div class="k">שם</div><div class="v">${esc(c.fullName||'—')}</div></div>
      <div class="kv"><div class="k">ת״ז</div><div class="v">${esc(c.tz||'—')}</div></div>
      <div class="kv"><div class="k">טלפון</div><div class="v">${esc(c.phone||'—')}</div></div>
      <div class="kv"><div class="k">אימייל</div><div class="v">${esc(c.email||'—')}</div></div>
      <div class="kv"><div class="k">סטטוס</div><div class="v">${esc(c.status||'—')}</div></div>
      <div class="kv"><div class="k">סגמנט</div><div class="v">${esc(c.segment||'—')}</div></div>
      <div class="kv"><div class="k">נציג</div><div class="v">${esc(c.assignedAgent||'—')}</div></div>
      <div class="hintBox" style="margin-top:12px">
        <div class="hintTitle">המשך</div>
        <div class="hintText">כאן נוסיף את שלבי "שיקוף שיחה" + שליפת נתונים מלאה מהמערכת.</div>
      </div>
    `;
  }


  function setStatus(text){
    statusPill.textContent = text;
  }

  function unlock(){
    gate.style.display = 'none';
    app.style.display = '';
    showError('');
    initAfterLogin();
  }

  function normalizePhone(p){
    return String(p||'').replace(/\D+/g,'');
  }

  function matches(c, q){
    if(!q) return true;
    const s = q.toLowerCase();
    const name = String(c.fullName||'').toLowerCase();
    const tz = String(c.tz||'').toLowerCase();
    const phone = normalizePhone(c.phone).toLowerCase();
    const qPhone = normalizePhone(s);
    return name.includes(s) || tz.includes(s) || (qPhone && phone.includes(qPhone));
  }

  function renderMeta(){
    const total = customers.length;
    const shown = filtered.length;
    if(!total){
      metaText.textContent = 'אין נתונים כרגע (מחר נחבר לסינכרון).';
      return;
    }
    metaText.textContent = `נמצאו ${shown} מתוך ${total} לקוחות`;
  }

  function renderResults(){
    resultsEl.innerHTML = '';
    if(!filtered.length){
      emptyEl.style.display = '';
      renderMeta();
      return;
    }
    emptyEl.style.display = 'none';

    const frag = document.createDocumentFragment();
    filtered.slice(0, 200).forEach(c => {
      const div = document.createElement('div');
      div.className = 'result' + (c.id === activeId ? ' active' : '');
      div.setAttribute('role','listitem');
      div.dataset.id = c.id;
      div.innerHTML = `
        <div class="rMain">
          <div class="rName">${esc(c.fullName || '—')}</div>
          <div class="rSub">${esc((c.tz||'') ? ('ת״ז: ' + c.tz) : '')}${c.phone ? ' • ' + esc(c.phone) : ''}</div>
        </div>
        <div class="rRight">
          <span class="tag">${esc(c.status || '—')}</span>
        </div>
      `;
      div.addEventListener('click', () => selectCustomer(c.id));
      frag.appendChild(div);
    });
    resultsEl.appendChild(frag);
    renderMeta();
  }


  function renderDetails(c){
    if(!c){
      detailsSub.textContent = 'בחר לקוח מהרשימה';
      detailsBody.innerHTML = renderDetailsHTML(null);
      return;
    }

    detailsSub.textContent = c.fullName || '—';
    detailsBody.innerHTML = renderDetailsHTML(c);
  }



  function selectCustomer(id){
    activeId = id;
    const c = customers.find(x => x.id === id) || null;

    renderDetails(c);

    // Open fullscreen mirror view (inside TalkMe, not relying on app scroll)
    if(c){
      openOverlay(c.fullName || 'שיקוף שיחה');
      if(tmOverlayBody) tmOverlayBody.innerHTML = renderDetailsHTML(c);
    }

    // re-render selection highlight without re-building everything heavily
    [...resultsEl.querySelectorAll('.result')].forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }


  function applyFilter(){
    const q = String(qEl.value||'').trim();
    filtered = customers.filter(c => matches(c, q));
    renderResults();
  }

  function setCustomers(list){
    customers = Array.isArray(list) ? list.slice() : [];
    // In talk mirror we want to show all customers (even for reps) – that's intended behavior.
    applyFilter();
    if(customers.length){
      setStatus('Live');
      subline.textContent = 'חיפוש לקוחות — כולל כל הלקוחות (גם לנציגים)';
    }else{
      setStatus('Offline');
    }
  }

  // =========================
  // Data loading (stub)
  // =========================
  function requestCustomersFromParent(){
    try{
      if(window.parent && window.parent !== window){
        window.parent.postMessage({ type:'TALKME_REQUEST_CUSTOMERS' }, '*');
        return true;
      }
    }catch(_){}
    return false;
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if(!data || typeof data !== 'object') return;

    if(data.type === 'TALKME_CUSTOMERS' && Array.isArray(data.customers)){
      setCustomers(data.customers);
    }
  });

  // =========================
  // Boot
  // =========================
  function initAfterLogin(){
    // Logo
    if(brandLogo) brandLogo.src = LOGO_URL;
    if(topLogo) topLogo.src = LOGO_URL;

    // Overlay close handlers (scoped)
    if(tmCloseOverlay){
      tmCloseOverlay.addEventListener('click', closeOverlay);
    }
    if(tmOverlay){
      tmOverlay.addEventListener('click', (e) => {
        if(e.target && (e.target.classList.contains('tmOverlayBg') || e.target === tmOverlay)){
          closeOverlay();
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && tmOverlay && tmOverlay.getAttribute('aria-hidden') === 'false'){
        closeOverlay();
      }
    });

    // Wire search
    qEl.addEventListener('input', applyFilter);
    clearBtn.addEventListener('click', () => { qEl.value=''; applyFilter(); qEl.focus(); });

    // showAll checkbox is kept for future permission toggles; currently always all customers
    showAllChk.addEventListener('change', () => {
      // reserved for future
      applyFilter();
    });

    setStatus('Offline');
    metaText.textContent = 'ממתין לחיבור לנתונים…';

    const requested = requestCustomersFromParent();
    if(!requested && USE_DEMO_FALLBACK){
      setCustomers(DEMO_CUSTOMERS);
      setStatus('Demo');
      metaText.textContent = 'דמו פעיל (אין חיבור נתונים עדיין)';
    }
  }

  function tryEnter(){
    const v = String(pw.value || '').trim();
    if(!v) return showError('חסרה סיסמה');
    if(v !== ACCESS_PASSWORD){
      pw.value = '';
      pw.focus();
      return showError('סיסמה שגויה');
    }
    unlock();
  }

  btn.addEventListener('click', tryEnter);
  pw.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      tryEnter();
    }
  });

})();