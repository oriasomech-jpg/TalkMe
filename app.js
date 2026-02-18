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

  // Proposals cache (by customerId) received from parent CRM
  const PROPOSALS = new Map();
  let mirrorState = { open:false, step:0, customer:null, proposal:null, draft:null };

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
  // Mirror Wizard (overlay) elements
  const mirrorOverlay = document.getElementById('mirrorOverlay');
  const mirrorBody = document.getElementById('mirrorBody');
  const mirrorStepsEl = document.getElementById('mirrorSteps');
  const mirrorTitleEl = document.getElementById('mirrorTitle');

  const mirrorCloseBtn = document.getElementById('mirrorCloseBtn');
  const mirrorBackBtn  = document.getElementById('mirrorBackBtn');
  const mirrorPrevBtn  = document.getElementById('mirrorPrevBtn');
  const mirrorNextBtn  = document.getElementById('mirrorNextBtn');

  const mirrorConfirmChk  = document.getElementById('mirrorConfirmChk');
  const mirrorConfirmText = document.getElementById('mirrorConfirmText');

  const ovLogo = document.getElementById('ovLogo');


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
          <button class="btnStart" type="button" data-start>התחל שיקוף</button>
          <span class="tag">${esc(c.status || '—')}</span>
        </div>
      `;
      div.addEventListener('click', () => selectCustomer(c.id));
      const sb = div.querySelector('[data-start]');
      if(sb){
        sb.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          startMirror(c.id);
        });
      }
      frag.appendChild(div);
    });
    resultsEl.appendChild(frag);
    renderMeta();
  }

  function renderDetails(c){
    if(!c){
      detailsSub.textContent = 'בחר לקוח מהרשימה';
      detailsBody.innerHTML = `
        <div class="hintBox">
          <div class="hintTitle">מוכן להמשך</div>
          <div class="hintText">אחרי חיבור הנתונים — נציג כאן את כל פרטי השיקוף.</div>
        </div>`;
      return;
    }

    detailsSub.textContent = c.fullName || '—';
    detailsBody.innerHTML = `
      <div class="kv"><div class="k">שם</div><div class="v">${esc(c.fullName||'—')}</div></div>
      <div class="kv"><div class="k">ת״ז</div><div class="v">${esc(c.tz||'—')}</div></div>
      <div class="kv"><div class="k">טלפון</div><div class="v">${esc(c.phone||'—')}</div></div>
      <div class="kv"><div class="k">אימייל</div><div class="v">${esc(c.email||'—')}</div></div>
      <div class="kv"><div class="k">סטטוס</div><div class="v">${esc(c.status||'—')}</div></div>
      <div class="kv"><div class="k">סגמנט</div><div class="v">${esc(c.segment||'—')}</div></div>
      <div class="kv"><div class="k">נציג</div><div class="v">${esc(c.assignedAgent||'—')}</div></div>
      <div class="hintBox" style="margin-top:12px">
        <div class="hintTitle">המשך מחר</div>
        <div class="hintText">
          כאן נוסיף את שלבי "שיקוף שיחה" + שליפת נתונים מלאה מהמערכת / Google Sheets.
        </div>
      </div>
    `;
  }

  function selectCustomer(id){
    activeId = id;
    const c = customers.find(x => x.id === id) || null;
    renderDetails(c);
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

  function requestProposalFromParent(customerId){
    try{
      if(window.parent && window.parent !== window){
        window.parent.postMessage({ type:'TALKME_REQUEST_PROPOSAL', customerId:String(customerId||'') }, '*');
        return true;
      }
    }catch(_){}
    return false;
  }

  window.addEventListener('message'('message', (event) => {
    const data = event.data || {};
    if(!data || typeof data !== 'object') return;

    if(data.type === 'TALKME_CUSTOMERS' && Array.isArray(data.customers)){
      setCustomers(data.customers);
    }

    if(data.type === 'TALKME_PROPOSAL' && data.customerId){
      const cid = String(data.customerId||'').trim();
      PROPOSALS.set(cid, data.proposal || null);
      // if we're waiting on this proposal, render now
      if(mirrorState.open && mirrorState.customer && mirrorState.customer.id === cid){
        mirrorState.proposal = data.proposal || null;
        buildMirrorDraft_();
        renderMirrorOverlay();
      }
    }
  });

  
  function openMirrorOverlay_(){
    if(!mirrorOverlay) return;
    mirrorOverlay.classList.remove('hidden');
    mirrorOverlay.setAttribute('aria-hidden','false');
    mirrorState.open = true;
    // reset confirm per step
    if(mirrorConfirmChk) mirrorConfirmChk.checked = false;
  }
  function closeMirrorOverlay_(){
    if(!mirrorOverlay) return;
    mirrorOverlay.classList.add('hidden');
    mirrorOverlay.setAttribute('aria-hidden','true');
    mirrorState.open = false;
    mirrorState.step = 0;
  
  let _mirrorControlsBound = false;
  function bindMirrorControls_(){
    if(_mirrorControlsBound) return;
    _mirrorControlsBound = true;

    if(mirrorCloseBtn) mirrorCloseBtn.addEventListener('click', () => closeMirrorOverlay_());
    if(mirrorBackBtn)  mirrorBackBtn.addEventListener('click', () => closeMirrorOverlay_());

    if(mirrorPrevBtn) mirrorPrevBtn.addEventListener('click', () => {
      if(!mirrorState || !mirrorState.open) return;
      if(mirrorState.step > 0){
        mirrorState.step--;
        if(mirrorConfirmChk) mirrorConfirmChk.checked = false;
        renderMirrorOverlay();
      }
    });

    if(mirrorNextBtn) mirrorNextBtn.addEventListener('click', () => {
      if(!mirrorState || !mirrorState.open) return;
      const stepsLen = 3;
      if(mirrorState.step >= stepsLen - 1){
        closeMirrorOverlay_();
        return;
      }
      mirrorState.step++;
      if(mirrorConfirmChk) mirrorConfirmChk.checked = false;
      renderMirrorOverlay();
    });
  }

}

  function buildMirrorDraft_(){
    const c = mirrorState.customer || {};
    const p = mirrorState.proposal || {};
    const cust = (p && p.customer && typeof p.customer === 'object') ? p.customer : c;
    mirrorState.draft = mirrorState.draft || {};
    const d = mirrorState.draft;

    // keep editable fields (defaults from proposal/customer)
    d.fullName = d.fullName ?? (cust.fullName || cust.name || c.fullName || '');
    d.tz = d.tz ?? (cust.tz || c.tz || '');
    d.birthDate = d.birthDate ?? (cust.birthDate || cust.dateOfBirth || '');
    d.maritalStatus = d.maritalStatus ?? (cust.maritalStatus || '');
    d.occupation = d.occupation ?? (cust.occupation || '');
    d.hmo = d.hmo ?? (cust.hmo || '');
    d.shaban = d.shaban ?? (cust.shaban || '');
    d.smoker = (d.smoker ?? (cust.smoker || cust.isSmoker || ''));

    d.addressFull = d.addressFull ?? (cust.addressFull || cust.address || '');
    d.email = d.email ?? (cust.email || c.email || '');
    d.phone = d.phone ?? (cust.phone || cust.mobile || c.phone || '');

    d.deliveryPref = d.deliveryPref ?? (cust.deliveryPref || '');
    d.hasChildren = d.hasChildren ?? '';

    // agent & purchased companies
    d.assignedAgent = d.assignedAgent ?? (p.assignedAgent || c.assignedAgent || '');
    const newPolicies = Array.isArray(p.newPolicies) ? p.newPolicies : [];
    const companies = newPolicies.map(x => x.company).filter(Boolean);
    d.newCompanies = Array.from(new Set(companies));
  }

  function startMirror(customerId){
    const c = customers.find(x => x.id === customerId) || null;
    if(!c) return;
    mirrorState = { open:true, step:0, customer:c, proposal:null, draft:null };

    // fill logos
    try{ if(ovLogo) ovLogo.src = LOGO_URL; }catch(_){}
    try{ if(brandLogo) brandLogo.src = LOGO_URL; }catch(_){}
    try{ if(topLogo) topLogo.src = LOGO_URL; }catch(_){}

    openMirrorOverlay_();
    renderMirrorOverlay();

    // request proposal (async via postMessage). If none, we can still work with customer-only draft.
    const cached = PROPOSALS.get(customerId);
    if(cached !== undefined){
      mirrorState.proposal = cached;
      buildMirrorDraft_();
      renderMirrorOverlay();
      return;
    }
    requestProposalFromParent(customerId);
    // optimistic draft
    buildMirrorDraft_();
    renderMirrorOverlay();
  }

  function renderMirrorOverlay(){
    if(!mirrorOverlay || !mirrorBody) return;
    const steps = ['פתיח + אישור', 'פרטי לקוח', 'הר הביטוח + הצעה'];
    mirrorStepsEl.innerHTML = steps.map((s,i) => `<span class="ovStep ${i===mirrorState.step?'active':''}">${esc(String(i+1))}. ${esc(s)}</span>`).join('');
    if(mirrorTitle) mirrorTitle.textContent = (mirrorState.customer && mirrorState.customer.fullName) ? `שיקוף • ${mirrorState.customer.fullName}` : 'שיקוף שיחה';

    // confirm text per step
    if(mirrorConfirmText){
      mirrorConfirmText.textContent =
        mirrorState.step===0 ? 'הלקוח אישר להמשיך בשיחה' :
        mirrorState.step===1 ? 'הלקוח אישר את הפרטים' :
        'הלקוח אישר את הבדיקה והנתונים';
    }

    const d = mirrorState.draft || {};
    const p = mirrorState.proposal || {};
    const oldPolicies = Array.isArray(p.oldPolicies) ? p.oldPolicies : [];
    const newPolicies = Array.isArray(p.newPolicies) ? p.newPolicies : [];

    const companiesTxt = (d.newCompanies && d.newCompanies.length) ? d.newCompanies.join(' / ') : '—';
    const agentTxt = d.assignedAgent || '—';

    const cardOpen = (title) => `<div class="ovCard"><h3>${esc(title)}</h3>`;
    const cardClose = `</div>`;

    if(mirrorState.step === 0){
      mirrorBody.innerHTML = cardOpen('שלב 1 — פתיח + אישור שיחה') + `
        <div class="scriptLine">שלום, אני מדבר/ת עם <b>${esc(d.fullName||'—')}</b>?</div>
        <div class="scriptLine">ואני נציג/ת מכירות מטעם סוכנות <b>גרגורי</b>, משווק ביטוחים של חברת/חברות: <b>${esc(companiesTxt)}</b>.</div>
        <div class="scriptLine">אני יוצר/ת איתך קשר בהמשך לפנייתך ולשיחתך עם <b>${esc(agentTxt)}</b>, במטרה להציע לך לרכוש ביטוח. חשוב לי להדגיש שזוהי שיחת מכירה מוקלטת. האם אפשר להמשיך בשיחה?</div>

        <div class="divider" style="margin:14px 0"></div>
        <div class="hintBox" style="margin:0">
          <div class="hintTitle">עריכת פרטים (במידה והלקוח מתקן)</div>
          <div class="hintText">אפשר לעדכן פה לפני שממשיכים לשלב הבא.</div>
        </div>

        <div class="editGrid">
          <div>
            <div class="lbl">שם מלא</div>
            <input class="input" id="m_fullName" value="${escAttr(d.fullName||'')}" />
          </div>
          <div>
            <div class="lbl">שם נציג שביצע הצעה</div>
            <input class="input" id="m_agent" value="${escAttr(d.assignedAgent||'')}" />
          </div>
        </div>
      ` + cardClose;

      bindMirrorInputs_();
    }

    if(mirrorState.step === 1){
      mirrorBody.innerHTML = cardOpen('שלב 2 — פרטי לקוח') + `
        <div class="scriptLine">ברשותך, אשאל אותך מספר שאלות:</div>
        <div class="scriptLine">מהו שמך המלא? <b>${esc(d.fullName||'—')}</b></div>
        <div class="scriptLine">מה תעודת זהות? <b>${esc(d.tz||'—')}</b></div>
        <div class="scriptLine">תאריך לידה? <b>${esc(d.birthDate||'—')}</b></div>
        <div class="scriptLine">מצב משפחתי? <b>${esc(d.maritalStatus||'—')}</b></div>
        <div class="scriptLine">האם יש ילדים? <b>${esc(d.hasChildren||'')}</b></div>
        <div class="scriptLine">במה אתה עוסק כיום? <b>${esc(d.occupation||'—')}</b></div>
        <div class="scriptLine">באיזו קופת חולים אתה מבוטח? <b>${esc(d.hmo||'—')}</b></div>
        <div class="scriptLine">האם קיים לך שב״ן? <b>${esc(d.shaban||'—')}</b></div>
        <div class="scriptLine">האם אתה מעשן/עישנת בשנתיים האחרונות? <b>${esc(String(d.smoker||'—'))}</b></div>
        <div class="scriptLine">מה הכתובת למשלוח הפוליסה? <b>${esc(d.addressFull||'—')}</b></div>
        <div class="scriptLine">איך תרצה לקבל את הדיבורים? <b>${esc(d.deliveryPref||'—')}</b></div>

        <div class="divider" style="margin:14px 0"></div>
        <div class="hintBox" style="margin:0">
          <div class="hintTitle">עריכת פרטים</div>
          <div class="hintText">אם הלקוח תיקן — מעדכנים כאן.</div>
        </div>

        <div class="editGrid">
          <div><div class="lbl">שם מלא</div><input class="input" id="m_fullName" value="${escAttr(d.fullName||'')}" /></div>
          <div><div class="lbl">ת״ז</div><input class="input" id="m_tz" value="${escAttr(d.tz||'')}" /></div>
          <div><div class="lbl">תאריך לידה</div><input class="input" id="m_birthDate" value="${escAttr(d.birthDate||'')}" /></div>
          <div><div class="lbl">מצב משפחתי</div><input class="input" id="m_marital" value="${escAttr(d.maritalStatus||'')}" /></div>
          <div><div class="lbl">עיסוק</div><input class="input" id="m_occ" value="${escAttr(d.occupation||'')}" /></div>
          <div><div class="lbl">קופת חולים</div><input class="input" id="m_hmo" value="${escAttr(d.hmo||'')}" /></div>
          <div><div class="lbl">שב״ן</div><input class="input" id="m_shaban" value="${escAttr(d.shaban||'')}" /></div>
          <div><div class="lbl">מעשן? (כן/לא)</div><input class="input" id="m_smoker" value="${escAttr(String(d.smoker||''))}" /></div>
          <div><div class="lbl">כתובת</div><input class="input" id="m_addr" value="${escAttr(d.addressFull||'')}" /></div>
          <div><div class="lbl">בחירת מסירה</div>
            <select class="input" id="m_delivery">
              <option value="" ${d.deliveryPref===''?'selected':''}>בחר</option>
              <option value="מייל" ${d.deliveryPref==='מייל'?'selected':''}>מייל</option>
              <option value="כתובת" ${d.deliveryPref==='כתובת'?'selected':''}>כתובת</option>
            </select>
          </div>
          <div><div class="lbl">האם יש ילדים? (כן/לא)</div><input class="input" id="m_children" value="${escAttr(d.hasChildren||'')}" /></div>
        </div>
      ` + cardClose;

      bindMirrorInputs_();
    }

    if(mirrorState.step === 2){
      const oldList = oldPolicies.length ? `
        <div style="margin-top:10px">
          ${oldPolicies.map(op => `<div class="scriptLine"><b>${esc(op.company||'—')}</b> • פרמיה: <b>${esc(String(op.premiumMonthly||op.premium||'—'))}</b> • סטטוס: <b>${esc(op.status||'—')}</b></div>`).join('')}
        </div>` : `<div class="scriptLine">אין ביטוחים קיימים ברשומה.</div>`;

      const newList = newPolicies.length ? `
        <div style="margin-top:10px">
          ${newPolicies.map(np => `<div class="scriptLine"><b>${esc(np.company||'—')}</b> • מוצר: <b>${esc(np.productName||np.product||np.name||'—')}</b> • פרמיה: <b>${esc(String(np.premiumMonthly||np.premium||'—'))}</b></div>`).join('')}
        </div>` : `<div class="scriptLine">אין פוליסות חדשות ברשומה.</div>`;

      mirrorBody.innerHTML = cardOpen('שלב 3 — הר הביטוח + הצעה') + `
        <div class="scriptLine">חשוב לי לעדכן אותך כי בשוק ישנן מספר חברות המשווקות את המוצר. לאחר שקיבלנו את פנייתך — האם אתה מאשר שאתה זה שאישרת לנו להיכנס עבורך לממשק הר הביטוח ולבצע עבורך בדיקה על מנת להתאים עבורך ביטוח העונה לצרכיך?</div>
        <div class="scriptLine"><b>ביטוחים קיימים (הר הביטוח):</b></div>
        ${oldList}
        <div class="scriptLine" style="margin-top:14px"><b>הפוליסה/ות החדשות שהוצעו:</b></div>
        ${newList}
      ` + cardClose;
    }

    // buttons state
    if(mirrorPrevBtn) mirrorPrevBtn.style.visibility = (mirrorState.step===0) ? 'hidden' : 'visible';
    if(mirrorBackBtn) mirrorBackBtn.textContent = (mirrorState.step===0) ? 'חזרה' : 'חזרה לחיפוש';
    if(mirrorNextBtn) mirrorNextBtn.textContent = (mirrorState.step===steps.length-1) ? 'סיום' : 'המשך';

    // require confirm checkbox to proceed
    if(mirrorConfirmChk){
      mirrorConfirmChk.checked = false;
      mirrorNextBtn.disabled = true;
      mirrorConfirmChk.onchange = () => {
        mirrorNextBtn.disabled = !mirrorConfirmChk.checked;
      };
    }
  }

  function bindMirrorInputs_(){
    const d = mirrorState.draft || (mirrorState.draft = {});
    const byId = (id) => document.getElementById(id);

    const bind = (id, key) => {
      const el = byId(id);
      if(!el) return;
      el.addEventListener('input', () => { d[key] = el.value; });
      el.addEventListener('change', () => { d[key] = el.value; });
    };
    bind('m_fullName','fullName');
    bind('m_agent','assignedAgent');
    bind('m_tz','tz');
    bind('m_birthDate','birthDate');
    bind('m_marital','maritalStatus');
    bind('m_occ','occupation');
    bind('m_hmo','hmo');
    bind('m_shaban','shaban');
    bind('m_smoker','smoker');
    bind('m_addr','addressFull');
    bind('m_children','hasChildren');

    const del = byId('m_delivery');
    if(del){
      del.addEventListener('change', () => { d.deliveryPref = del.value; });
    }
  }

// =========================
  // Boot
  // =========================
  function initAfterLogin(){
    // Logo
    if(brandLogo) brandLogo.src = LOGO_URL;
    if(topLogo) topLogo.src = LOGO_URL;

    // Mirror overlay controls
    bindMirrorControls_();

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

    // If embedded, wait a bit for the parent to respond. If nothing arrives, fall back to demo so the screen isn't stuck.
    if(requested){
      setTimeout(() => {
        try{
          if((customers || []).length) return; // already got data
          if(USE_DEMO_FALLBACK){
            setCustomers(DEMO_CUSTOMERS);
            setStatus('Demo');
            metaText.textContent = 'דמו פעיל (אין חיבור נתונים עדיין)';
          }else{
            metaText.textContent = 'אין חיבור נתונים (פתח מתוך המערכת)';
          }
        }catch(_){}
      }, 2500);
    }

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