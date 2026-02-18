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

  const uploadPdfBtn = document.getElementById('uploadPdfBtn');
  const pdfInput = document.getElementById('pdfInput');

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

  // =========================
  // State
  // =========================
  let customers = [];
  let filtered = [];
  let activeId = null;
  let currentProfile = null; // profile built from PDF or selected customer (editable)
  let lastPdfName = '';

  // =========================
  // Helpers
  // =========================
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function norm(s){
    return String(s || '')
      .replace(/\u00A0/g,' ')
      .replace(/[\s\t\r]+/g,' ')
      .replace(/\s+\n/g,'\n')
      .trim();
  }

  function setMeta(msg){
    if(metaText) metaText.textContent = msg || '';
  }

  async function ensurePdfJs(){
    if(window.pdfjsLib) return window.pdfjsLib;
    return await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => {
        try{
          // configure worker
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }catch(_){}
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error('PDFJS_LOAD_FAILED'));
      document.head.appendChild(s);
    });
  }

  async function extractTextFromPdf(file){
    const pdfjsLib = await ensurePdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

    let out = '';
    for(let i=1; i<=pdf.numPages; i++){
      const page = await pdf.getPage(i);
      const txt = await page.getTextContent();
      const strings = (txt.items || []).map(it => it.str).filter(Boolean);
      out += strings.join('\n') + '\n';
    }
    return norm(out);
  }

  function pickFirst(re, text){
    const m = re.exec(text);
    return m ? norm(m[1]) : '';
  }

  function uniq(arr){
    const s = new Set();
    (arr||[]).forEach(x => { const v = norm(x); if(v) s.add(v); });
    return [...s];
  }

  function parseYesNoAround(keyword, text){
    // Try to detect nearby "כן"/"לא" tokens around keyword line
    const idx = text.indexOf(keyword);
    if(idx < 0) return '';
    const slice = text.slice(Math.max(0, idx-80), Math.min(text.length, idx+180));
    // prefer explicit pattern like "כן" or "לא" close by
    const yn = /\b(כן|לא)\b/.exec(slice);
    return yn ? yn[1] : '';
  }

  function parseTreatmentReport(text){
    // Very tolerant parsing – we keep it safe and editable.
    const t = text || '';
    const profile = {
      fullName: '',
      tz: '',
      phone: '',
      email: '',
      dob: '',
      maritalStatus: '',
      occupation: '',
      hmo: '',
      shaban: '',
      address: '',
      deliveryPref: '',
      smoking2y: '',
      companies: [],
      preparedBy: ''
    };

    // Common Hebrew labels we saw / expect
    profile.fullName = pickFirst(/(?:שם\s*(?:המבוטח|מלא)?\s*[:\-]?\s*)([^\n]+)/, t) || pickFirst(/(?:שם\s*לקוח\s*[:\-]?\s*)([^\n]+)/, t);
    profile.tz = pickFirst(/(?:ת\"?ז|ת\.ז|תעודת\s*זהות)\s*[:\-]?\s*([0-9]{5,10})/, t);
    profile.phone = pickFirst(/(?:טלפון|נייד)\s*[:\-]?\s*([0-9\-\s]{7,})/, t);
    profile.email = pickFirst(/(?:מייל|אימייל|דוא\"?ל)\s*[:\-]?\s*([^\s\n]+@[^\s\n]+)/, t);
    profile.dob = pickFirst(/(?:תאריך\s*לידה)\s*[:\-]?\s*([0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4})/, t);

    profile.address = pickFirst(/(?:כתובת\s*(?:למשלוח\s*פוליסה|מגורים)?|רחוב)\s*[:\-]?\s*([^\n]+)/, t);
    profile.maritalStatus = pickFirst(/(?:מצב\s*משפחתי)\s*[:\-]?\s*([^\n]+)/, t);
    profile.occupation = pickFirst(/(?:עיסוק|מקצוע)\s*[:\-]?\s*([^\n]+)/, t);
    profile.hmo = pickFirst(/(?:קופת\s*חולים)\s*[:\-]?\s*([^\n]+)/, t);
    profile.shaban = pickFirst(/(?:שב\"?ן|שבן)\s*[:\-]?\s*(כן|לא|קיים|לא\s*קיים)/, t);
    profile.deliveryPref = pickFirst(/(?:דיווחים|דוחות|דיווח)\s*[:\-]?\s*(מייל|בית|דואר|אימייל)/, t);

    // Prepared by (agent who made the proposal)
    profile.preparedBy = pickFirst(/(?:הוכן\s*ע\"?י|הוכן\s*על\s*ידי|נציג\s*מטפל)\s*[:\-]?\s*([^\n]+)/, t);

    // Companies (very rough): collect known insurers if appear
    const known = ['הראל','הפניקס','כלל','מגדל','מנורה','AIG','איילון','ביטוח ישיר','הכשרה'];
    const hits = known.filter(k => t.includes(k));
    profile.companies = uniq(hits);

    // Smoking – look for keyword and a yes/no nearby
    profile.smoking2y = parseYesNoAround('מעשן', t) || parseYesNoAround('עישנת', t);

    return profile;
  }

  function makeEditableProfileFromCustomer(c){
    return {
      fullName: c?.fullName || '',
      tz: c?.tz || '',
      phone: c?.phone || '',
      email: c?.email || '',
      dob: c?.dob || '',
      maritalStatus: c?.maritalStatus || '',
      occupation: c?.occupation || '',
      hmo: c?.hmo || '',
      shaban: c?.shaban || '',
      address: c?.address || '',
      deliveryPref: c?.deliveryPref || '',
      smoking2y: c?.smoking2y || '',
      companies: Array.isArray(c?.companies) ? c.companies.slice() : [],
      preparedBy: c?.preparedBy || ''
    };
  }

  function setProfile(p, sourceLabel){
    currentProfile = makeEditableProfileFromCustomer(p || {});
    if(sourceLabel){
      currentProfile._sourceLabel = sourceLabel;
    }
    renderDetails({ __profile: true });
  }

  function setYN(elYes, elNo, v){
    const onYes = (v === 'כן');
    const onNo  = (v === 'לא');
    elYes.classList.toggle('on', onYes);
    elNo.classList.toggle('on', onNo);
  }

  function renderStage1(){
    const p = currentProfile || makeEditableProfileFromCustomer({});
    const companiesText = (p.companies && p.companies.length) ? p.companies.join(', ') : '—';

    return `
      <div class="stage">
        <div class="stageTitle">
          <span>שלב 1 — זיהוי לקוח</span>
          <span class="tag">${esc(p._sourceLabel || 'נתונים')}</span>
        </div>
        <div class="stageSub">
          שלום, אני מדבר/ת עם <b>${esc(p.fullName || '—')}</b>?<br/>
          מדבר/ת <b>${esc('אוריה')}</b> ואני נציג/ת מכירות מטעם סוכנות <b>${esc('גרגורי')}</b> משווק הביטוחים של חברת <b>${esc(companiesText)}</b>.<br/>
          אני יוצר/ת איתך קשר בהמשך לפנייתך ולשיחתך עם <b>${esc(p.preparedBy || '—')}</b> במטרה להציע לך לרכוש ביטוח.
          חשוב לי להדגיש שזאת שיחת מכירה מוקלטת, האם אפשר להמשיך בשיחה?
        </div>

        <div class="ynRow" style="margin-top:10px">
          <button class="ynBtn" type="button" id="consentYes">כן</button>
          <button class="ynBtn" type="button" id="consentNo">לא</button>
          <span class="meta" id="consentMeta" style="margin-right:auto">לא סומן</span>
        </div>

        <div class="afterConsentLine" id="afterConsentLine" style="display:none">ברשותך אשאל אותך מספר שאלות.</div>

        <div class="stageDetailsWrap" id="stage1DetailsWrap" style="display:none">
        <div class="formGrid">
          <div class="field full">
            <span class="lbl">מה שמך המלא?</span>
            <input class="input inputSm" id="f_fullName" value="${esc(p.fullName)}" placeholder="שם מלא" />
          </div>
          <div class="field">
            <span class="lbl">מספר תעודת זהות</span>
            <input class="input inputSm" id="f_tz" value="${esc(p.tz)}" placeholder="ת״ז" />
          </div>
          <div class="field">
            <span class="lbl">תאריך לידה</span>
            <input class="input inputSm" id="f_dob" value="${esc(p.dob)}" placeholder="dd/mm/yyyy" />
          </div>
<div class="field">
            <span class="lbl">מייל</span>
            <input class="input inputSm" id="f_email" value="${esc(p.email)}" placeholder="example@mail.com" />
          </div>
          <div class="field">
            <span class="lbl">מצב משפחתי</span>
            <input class="input inputSm" id="f_marital" value="${esc(p.maritalStatus)}" placeholder="רווק/נשוי/..." />
          </div>
          <div class="field">
            <span class="lbl">במה אתה עוסק היום?</span>
            <input class="input inputSm" id="f_occ" value="${esc(p.occupation)}" placeholder="עיסוק" />
          </div>
          <div class="field">
            <span class="lbl">איזה קופת חולים אתה מבוטח?</span>
            <input class="input inputSm" id="f_hmo" value="${esc(p.hmo)}" placeholder="כללית/מכבי/..." />
          </div>
          <div class="field">
            <span class="lbl">האם קיים לך שב״ן?</span>
            <input class="input inputSm" id="f_shaban" value="${esc(p.shaban)}" placeholder="כן/לא/קיים" />
          </div>
          <div class="field full">
            <span class="lbl">מה הכתובת למשלוח הפוליסה?</span>
            <input class="input inputSm" id="f_addr" value="${esc(p.address)}" placeholder="כתובת" />
          </div>
          <div class="field">
            <span class="lbl">איך תרצה לקבל דיווחים?</span>
            <input class="input inputSm" id="f_del" value="${esc(p.deliveryPref)}" placeholder="למייל/לבית" />
          </div>

          <div class="field full">
            <div class="lbl">האם אתה מעשן או עישנת בשנתיים האחרונות?</div>
            <div class="ynRow">
              <button class="ynBtn" type="button" id="smokeYes">כן</button>
              <button class="ynBtn" type="button" id="smokeNo">לא</button>
              <span class="meta" id="smokeMeta" style="margin-right:auto">${esc(p.smoking2y ? ('נשלף: ' + p.smoking2y) : 'לא נמצא במסמך')}</span>
            </div>
            <div class="note">(יש לשאול את הלקוח במפורט: מוצרי טבק, סיגריות, וייפ, סיגריות אלקטרוניות, קנאביס.)</div>
          </div>
        </div>
        </div>

        <div class="nextBar">
          <button class="btn btnPrimary" type="button" id="nextToStage2">הבא — שלב 2 (מסך התאמה)</button>
        </div>

        <div class="modalOverlay" id="stage2Modal" style="display:none" role="dialog" aria-modal="true" aria-label="שלב 2">
          <div class="modalCard">
            <div class="modalHead">
              <div class="modalTitle">שלב 2 — מסך התאמה</div>
              <button class="btn btnSoft btnSmall" type="button" id="stage2Close">סגור</button>
            </div>
            <div class="modalBody">
              <div class="hintBox" style="margin:0">
                <div class="hintTitle">שלד לשלב הבא</div>
                <div class="hintText">כאן נבנה את מסך ההתאמה (שלב 2). כרגע זה חלון בדוגמה כדי לוודא מעבר שלבים עובד.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="smallWarn">
          ניתן לתקן כל שדה לפי מה שהלקוח אומר. הערכים שנמשכו מהדוח הם נקודת פתיחה בלבד.
        </div>
      </div>
    `;
  }

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
          <span class="tag">${esc(c.status || '—')}</span>
        </div>
      `;
      div.addEventListener('click', () => selectCustomer(c.id));
      frag.appendChild(div);
    });
    resultsEl.appendChild(frag);
    renderMeta();
  }

  
  function bindStage1Events(){
    if(!currentProfile) return;

    // Consent (recorded call permission)
    const cYes = document.getElementById('consentYes');
    const cNo  = document.getElementById('consentNo');
    const cMeta = document.getElementById('consentMeta');

    const afterLine = document.getElementById('afterConsentLine');
        const detailsWrap = document.getElementById('stage1DetailsWrap');
        const nextBtn = document.getElementById('nextToStage2');
        const modal = document.getElementById('stage2Modal');
        const modalClose = document.getElementById('stage2Close');
    
        function syncConsentUI(){
          const ok = (currentProfile.consent === 'כן');
          if(afterLine) afterLine.style.display = ok ? '' : 'none';
          if(detailsWrap) detailsWrap.style.display = ok ? '' : 'none';
          if(nextBtn) nextBtn.disabled = !ok;
        }
    
        // Modal controls (Stage 2 placeholder)
        if(nextBtn){
          nextBtn.addEventListener('click', () => {
            if(nextBtn.disabled) return;
            if(modal) modal.style.display = '';
          });
        }
        if(modalClose){
          modalClose.addEventListener('click', () => {
            if(modal) modal.style.display = 'none';
          });
        }
        if(modal){
          modal.addEventListener('click', (e) => {
            if(e.target === modal) modal.style.display = 'none';
          });
        }
    
    if(cYes && cNo){
      const v = currentProfile.consent || '';
      setYN(cYes, cNo, v);
      cMeta.textContent = v ? ('נבחר: ' + v) : 'לא סומן';
      syncConsentUI();

      cYes.addEventListener('click', () => {
        currentProfile.consent = 'כן';
        setYN(cYes, cNo, 'כן');
        cMeta.textContent = 'נבחר: כן';
        syncConsentUI();
      });
      cNo.addEventListener('click', () => {
        currentProfile.consent = 'לא';
        setYN(cYes, cNo, 'לא');
        cMeta.textContent = 'נבחר: לא';
        syncConsentUI();
      });
    }

    // Smoking yes/no
    const sYes = document.getElementById('smokeYes');
    const sNo  = document.getElementById('smokeNo');
    const sMeta = document.getElementById('smokeMeta');
    if(sYes && sNo){
      const v = currentProfile.smoking2y || '';
      setYN(sYes, sNo, v);
      sYes.addEventListener('click', () => {
        currentProfile.smoking2y = 'כן';
        setYN(sYes, sNo, 'כן');
        if(sMeta) sMeta.textContent = 'נבחר: כן';
      });
      sNo.addEventListener('click', () => {
        currentProfile.smoking2y = 'לא';
        setYN(sYes, sNo, 'לא');
        if(sMeta) sMeta.textContent = 'נבחר: לא';
      });
    }

    // Inputs
    const map = [
      ['f_fullName','fullName'],
      ['f_tz','tz'],
      ['f_dob','dob'],
      ['f_email','email'],
      ['f_marital','maritalStatus'],
      ['f_occ','occupation'],
      ['f_hmo','hmo'],
      ['f_shaban','shaban'],
      ['f_addr','address'],
      ['f_del','deliveryPref'],
    ];
    map.forEach(([id,key]) => {
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener('input', () => { currentProfile[key] = el.value; });
    });
  }

  function renderDetails(c){
    if(!c && !currentProfile){
      detailsSub.textContent = 'בחר לקוח מהרשימה';
      detailsBody.innerHTML = `
        <div class="hintBox">
          <div class="hintTitle">מוכן להמשך</div>
          <div class="hintText">אחרי חיבור הנתונים — נציג כאן את כל פרטי השיקוף. אפשר גם להעלות "דוח טיפולי" כגלגל הצלה.</div>
        </div>`;
      return;
    }

    // If a customer passed, turn into editable profile (without overriding ongoing edits unless selection changed)
    if(c && !c.__profile){
      currentProfile = makeEditableProfileFromCustomer(c);
      currentProfile._sourceLabel = 'CRM';
    }

    const p = currentProfile || makeEditableProfileFromCustomer({});
    detailsSub.textContent = p.fullName || '—';
    detailsBody.innerHTML = renderStage1();

    // bind after DOM updates
    setTimeout(bindStage1Events, 0);
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

    // PDF Upload (secondary, doesn't affect live sync)
    if(uploadPdfBtn && pdfInput){
      uploadPdfBtn.addEventListener('click', () => pdfInput.click());
      pdfInput.addEventListener('change', async () => {
        const file = pdfInput.files && pdfInput.files[0];
        if(!file) return;
        lastPdfName = file.name || '';
        showError('');
        setStatus('Offline');
        setMeta('טוען דוח טיפולי…');
        try{
          const text = await extractTextFromPdf(file);
          if(!text){
            setMeta('לא הצלחתי לקרוא טקסט מהדוח. נסה דוח אחר או ייצוא מחדש.');
            return;
          }
          const profile = parseTreatmentReport(text);
          profile._sourceLabel = 'דוח טיפולי' + (lastPdfName ? (': ' + lastPdfName) : '');
          setProfile(profile, profile._sourceLabel);
          setStatus('PDF');
          setMeta('נטען דוח טיפולי (אפשר לתקן כל שדה).');
          // clear input so same file can be uploaded again
          pdfInput.value = '';
        }catch(e){
          console.error(e);
          setMeta('שגיאה בטעינת הדוח. ודא שזה PDF תקין.');
        }
      });
    }

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