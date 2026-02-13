
/* ===== Forgot password: suppress any toast/alerts and show ONLY the modal ===== */
(function(){
  function _openForgotOnly(){
    var m = document.getElementById('forgotModal');
    if(m){ m.style.display = 'flex'; }
  }
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t && t.id === 'forgotPasswordLink'){
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      _openForgotOnly();
      return false;
    }
  }, true);
})();

/* GEMEL INVEST • Demo CRM (No backend) */
(() => {
  'use strict';
  // ---------- CONFIG (Google Sheets via Apps Script Web App) ----------
  // 1) Publish your Apps Script as Web App (Anyone with the link).
  // 2) Paste the /exec URL here. Example:
  // const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/XXXX/exec';
  const GOOGLE_SCRIPT_URL = ''; // <-- set me (leave empty to stay in demo mode)

  // If true, the app will try to auto-connect on load (ping).
  const AUTO_CONNECT = true;

  // ---------- Server helpers ----------
  async function apiCall(action, payload){
    if(!GOOGLE_SCRIPT_URL) return { ok:false, demo:true, error:'NO_URL' };
    const url = GOOGLE_SCRIPT_URL + '?action=' + encodeURIComponent(action);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ payload })
    });
    const data = await res.json().catch(() => null);
    if(!data) return { ok:false, error:'BAD_JSON' };
    return data;
  }

  async function apiPing(){
    if(!GOOGLE_SCRIPT_URL) return { ok:false, demo:true };
    try{
      const url = GOOGLE_SCRIPT_URL + '?action=ping';
      const res = await fetch(url, { method:'GET' });
      const data = await res.json().catch(() => null);
      return data || { ok:false };
    }catch(e){
      return { ok:false, error:String(e) };
    }
  }


  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ---------- Demo data ----------
  const state = {
    currentUser: null,
    connected: false,
    server: { url: '' },
    agentName: 'אוריה (דמו)',
    teamAgents: ['אוריה (דמו)','סתיו','דוד'],
    customers: [
      { id:'c1', assignedAgent:'אוריה (דמו)', fullName:'דניאל כהן', tz:'123456789', phone:'050-1234567', email:'daniel@mail.com', status:'פעיל', segment:'פרימיום' },
      { id:'c2', assignedAgent:'סתיו', fullName:'נועה לוי', tz:'987654321', phone:'052-7654321', email:'noa@mail.com', status:'חדש', segment:'ליד' },
      { id:'c3', assignedAgent:'דוד', fullName:'יוסי מזרחי', tz:'314159265', phone:'054-5551234', email:'yossi@mail.com', status:'פעיל', segment:'סטנדרט' },
    ],
    proposals: [],
    processes: []
  };

  // ---------- Processes (Tasks) ----------
  const PROCESS_TYPES = ['הצעה חדשה','שיקוף','גביה'];
  const PROCESSES_LS_KEY = 'gemel_processes_v1';

  function loadProcesses_(){
    try{
      const raw = localStorage.getItem(PROCESSES_LS_KEY);
      const arr = raw ? JSON.parse(raw) : null;
      if(Array.isArray(arr)) state.processes = arr;
    }catch(_){}
  }
  function saveProcesses_(){
    try{
      localStorage.setItem(PROCESSES_LS_KEY, JSON.stringify(state.processes || []));
    }catch(_){}
  }
  function uid_(){
    return 'pr_' + Math.random().toString(36).slice(2,10) + '_' + Date.now().toString(36);
  }
  function toLocalDateTimeValue_(iso){
    if(!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2,'0');
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fromLocalDateTimeValue_(val){
    // val like "2026-02-09T14:30"
    if(!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }
  function dueStatus_(iso){
    if(!iso) return { cls:'', text:'—' };
    const now = Date.now();
    const t = new Date(iso).getTime();
    if(isNaN(t)) return { cls:'', text:'—' };
    const diffMin = Math.floor((t - now) / 60000);
    if(diffMin < 0) return { cls:'bad', text:'חורג' };
    if(diffMin <= 60) return { cls:'warn', text:'מגיע בקרוב' };
    return { cls:'', text:'מתוזמן' };
  }
  function fmtDue_(iso){
    if(!iso) return '—';
    const d = new Date(iso);
    if(isNaN(d.getTime())) return '—';
    return d.toLocaleString('he-IL');
  }

  function openProcessModal_(customerId){
    const c = state.customers.find(x => x.id === customerId);
    if(!c) return;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,.35)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `
      <div style="width:min(720px,92vw);background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:18px 18px 14px;direction:rtl;font-family:inherit">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
          <div>
            <div style="font-weight:900;font-size:16px">צור תהליך</div>
            <div style="font-size:12px;color:rgba(18,19,25,.55)">${escapeHtml(c.fullName||'')} • ${escapeHtml(c.phone||'')}</div>
          </div>
          <button class="btn btnSoft" data-x>סגור</button>
        </div>

        <div style="display:grid;grid-template-columns: 1fr 1fr;gap:10px">
          <div>
            <div style="font-size:12px;color:rgba(18,19,25,.65);margin-bottom:6px">בחירת תהליך</div>
            <select id="procType" class="input" style="width:100%">
              ${PROCESS_TYPES.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join('')}
            </select>
          </div>
          <div>
            <div style="font-size:12px;color:rgba(18,19,25,.65);margin-bottom:6px">תאריך ושעה</div>
            <input id="procDue" class="input" style="width:100%" type="datetime-local" value="${toLocalDateTimeValue_(new Date(Date.now()+30*60000).toISOString())}">
          </div>
          <div style="grid-column:1 / -1">
            <div style="font-size:12px;color:rgba(18,19,25,.65);margin-bottom:6px">הערה (אופציונלי)</div>
            <input id="procNote" class="input" style="width:100%" type="text" placeholder="לדוגמה: לשלוח הצעה מעודכנת / לבדוק מסמכים">
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">
          <button class="btn btnSoft" data-cancel>ביטול</button>
          <button class="btn" data-save>שמור תהליך</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => {
      if(e.target === overlay) close();
    });
    overlay.querySelector('[data-x]')?.addEventListener('click', close);
    overlay.querySelector('[data-cancel]')?.addEventListener('click', close);

    overlay.querySelector('[data-save]')?.addEventListener('click', () => {
      const type = String(overlay.querySelector('#procType')?.value || '').trim();
      const dueVal = String(overlay.querySelector('#procDue')?.value || '').trim();
      const note = String(overlay.querySelector('#procNote')?.value || '').trim();
      const dueAt = fromLocalDateTimeValue_(dueVal);

      if(!type){
        toast('חסר', 'בחר סוג תהליך');
        return;
      }
      if(!dueAt){
        toast('חסר', 'בחר תאריך ושעה');
        return;
      }

      const proc = {
        id: uid_(),
        customerId: c.id,
        customerName: c.fullName || '',
        type,
        note,
        dueAt,
        assignedTo: state.agentName || '',
        status: 'open',
        createdAt: new Date().toISOString()
      };
      state.processes.unshift(proc);
      saveProcesses_();
      close();
      toast('נשמר', 'תהליך נוסף ל"התהליכים שלי"');
      render();
    });
  }

  function renderDueProcessesForAgent_(agent){
    const now = Date.now();
    const list = (state.processes||[])
      .filter(p => (p.status||'open') === 'open' && (p.assignedTo||'') === agent && p.dueAt)
      .slice()
      .sort((a,b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

    const dueNow = list.filter(p => new Date(p.dueAt).getTime() <= now);
    const upcoming = list.filter(p => new Date(p.dueAt).getTime() > now).slice(0,6);
    const top = dueNow.length ? dueNow : upcoming;

    if(!top.length){
      return `<div class="sideHint">אין תהליכים מתוזמנים כרגע.</div>`;
    }

    return `
      <div class="panel" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
          <div style="font-weight:900">תהליכים שמגיעים עכשיו</div>
          <div style="font-size:12px;color:rgba(18,19,25,.55)">${escapeHtml(agent||'')}</div>
        </div>
        <div class="tableWrap" style="box-shadow:none;padding:0;background:transparent;border:none">
          <table class="table">
            <thead>
              <tr>
                <th>לקוח</th>
                <th>תהליך</th>
                <th>מועד</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${top.map(p => {
                const st = dueStatus_(p.dueAt);
                return `
                  <tr>
                    <td><b>${escapeHtml(p.customerName||'')}</b><div style="font-size:12px;color:rgba(18,19,25,.55)">${escapeHtml((state.customers.find(c=>c.id===p.customerId)||{}).phone||'')}</div></td>
                    <td>${escapeHtml(p.type||'')}</td>
                    <td>${escapeHtml(fmtDue_(p.dueAt))}${p.note?`<div style="font-size:12px;color:rgba(18,19,25,.55)">${escapeHtml(p.note)}</div>`:''}</td>
                    <td>${chip(st.text, st.cls||'')}</td>
                    <td style="text-align:left;white-space:nowrap">
                      <button class="btn btnSoft" data-proc-open="${escapeAttr(p.customerId)}">פתח</button>
                      <button class="btn btnTiny" data-proc-done="${escapeAttr(p.id)}">בוצע</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function wireProcessButtons_(){
    $$('[data-proc-open]').forEach(b => b.addEventListener('click', () => openWizard({ customerId: b.dataset.procOpen })));
    $$('[data-proc-done]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.procDone;
      const p = (state.processes||[]).find(x => x.id === id);
      if(!p) return;
      p.status = 'done';
      p.doneAt = new Date().toISOString();
      saveProcesses_();
      toast('עודכן', 'סומן כבוצע');
      render();
    }));
  }

  // ---------- AUTH (Local demo users; can be moved to Google Sheets later) ----------
  const USERS = [
    { username:'admin', password:'3316', role:'admin', displayName:'מנהל מערכת' },
    { username:'agent1', password:'1111', role:'agent', displayName:'אוריה (דמו)' },
    { username:'agent2', password:'2222', role:'agent', displayName:'סתיו' },
    { username:'agent3', password:'3333', role:'agent', displayName:'דוד' },
  ];

  function getSessionUser_(){
    try{
      const raw = sessionStorage.getItem('gemel_user');
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  }
  function setSessionUser_(u){
    sessionStorage.setItem('gemel_user', JSON.stringify(u));
  }
  function clearSessionUser_(){
    sessionStorage.removeItem('gemel_user');
  }
  function isAdmin_(){ return !!(state.currentUser && state.currentUser.role === 'admin'); }

  function applyPermissions_(){
    // update badge name
    const badgeNameEl = document.getElementById('agentName');
    if(badgeNameEl){
      badgeNameEl.textContent = 'נציג: ' + (state.agentName || 'אורח');
    }
    // hide settings for agents
    const settingsBtn = document.querySelector('.navItem[data-route="settings"]');
    if(settingsBtn){
      settingsBtn.style.display = isAdmin_() ? '' : 'none';
    }
  }
  function visibleCustomers_(){
    if(isAdmin_()) return state.customers;
    const me = state.agentName;
    const filtered = (state.customers || []).filter(c => (c.assignedAgent || '') === me);
    // Fallback: if nothing is assigned to this agent (or data missing), show all so the system never looks "empty"
    return (filtered.length ? filtered : (state.customers || []));
  }
  function visibleProposals_(){
    if(isAdmin_()) return state.proposals;
    const me = state.agentName;
    return state.proposals.filter(p => (p.assignedAgent || p.agentName || '') === me);
  }



  // Questionnaire mapping (DEFAULT: Medical form for each insured)
    const questionnaires = {
    'DEFAULT|MEDICAL': {
      title: 'שאלון רפואי מלא (לכל מבוטח)',
      steps: [
        { id:'full', title:'שאלון רפואי מלא', questions:[
          qYesNo('smoking', 'האם המבוטח מעשן?', {details:true, detailsLabel:'פירוט (כמה/כמה זמן)'}),

          qYesNo('sys_neuro', 'מערכת העצבים והמוח — טרשת נפוצה, תסמונת דאון, אוטיזם, גושה, ניווון שרירים, אפילפסיה, פרקינסון, שיתוק, קשב וריכוז, בעיות התפתחות (תינוק אם נולד פג)', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('sys_cardio', 'מערכת הלב וכלי דם — לב, כלי דם, אירוע מוחי, יתר לחץ דם, מחלות דם ובעיות קרישה', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('mental', 'בעיה / הפרעה ו/או מחלה נפשית מאובחנת וניסיונות התאבדות', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('metabolic', 'מערכת מטבולית — סוכרת כולל הריון, שומנים, כולסטרול, בלוטת מגן/מוח/יתר-תרת הכליה', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('cancer', 'מחלה ממאירה — גידולים לרבות גידול שפיר, סרטני וטרום סרטני', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('digestive', 'מערכת העיכול — קיבה, מעיים, קרוהן, קוליטיס, כיס המרה, טחול, לבלב, פי הטבעת, כבד, צהבת', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('resp', 'מערכת ריאות ודרכי נשימה — לרבות אסטמה, ברונכיטיס, COPD, זום נשימה, סיסטיק פיברוזיס, שחפת, אלרגיות', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('rheuma', 'מחלות ראומטולוגיות — רקומות חיבור ודלקות פרקים, גאוט, לופוס/זאבת, פיברומיאלגיה, קדחת ים תיכונית', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('ortho', 'אורטופדיה ומערכת השלד — עמוד שדרה, שרירים, מפרקים, מחלות פרקים, בעיות ברכיים, שבר, פריקה, פגיעה', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('bones', 'גידים / אוסטאופורוזיס — אוסטאופורוזיס/אוסטיאופניה, מחלת פרקים ניוונית', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('eyes', 'מערכת עיניים וראייה — ליקויי ראייה מעל מספר 8 בעדשות, הפרדת רשתית, גלאוקומה, קטרקט, אובאיטיס, קרטוקונוס', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('ent', 'מערכת אף אוזן גרון — פגיעה בשמיעה, דלקות אוזניים, מנייר, טיניטון, פוליפים, שקדים, פגיעה במיתרי הקול', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('skin_sex', 'עור ומין — מחלות עור ואלרגיה, פסוריאזיס, מפמפיגוס, צלקות, נגע ו/או גידול בעור, פפילומה, קונדילומה', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('std_hiv', 'מחלות מין ואיידס — נשא HIV ומחלות זיהומיות שאובחנו בשנה האחרונה ודורשות טיפול רציף של חודשים לפחות', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('women', 'לנשים — בעיות גינקולוגיות ושדיים, הגדלה/הקטנה, גוש בשד, דימומים, רחם שרירני, ציסטות שחלתיות, האם כעת בהריון', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('men', 'לגברים — בעיות ערמונית, פרוסטטה ואשכים', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('substances', 'אלכוהול / סמים / היסטוריה משפחתית — אלכוהול, סמים, היסטוריה משפחתית (ממא/אבא אחים אחיות - מחלות תורשתיות), אחוזי נכות, תהליך בירור רפואי או בדיקות אבחנתיות שטרם הסתיימו סופית', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('hosp_meds', 'אשפוזים / ניתוחים / טיפול תרופתי קבוע — אשפוזים או ניתוחים ב-5 שנים האחרונות, טיפול תרופתי באופן קבוע', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),

          qYesNo('truth', 'אני מאשר/ת שכל הפרטים שמולאו נכונים ומלאים.'),
          qText('notes', 'הערות כלליות')
        ]}
      ]
    }
  };


  function qYesNo(id, label, opt={}){
    return { type:'yesno', id, label, details: !!opt.details, detailsLabel: opt.detailsLabel || 'פירוט' };
  }
  function qText(id, label){
    return { type:'text', id, label };
  }

  // ---------- UI references ----------
  const agentNameEl = $('#agentName');
  const loginOverlay = $('#loginOverlay');
  const loginForm = $('#loginForm');
  const loginUser = $('#loginUser');
  const loginPass = $('#loginPass');
  const loginError = $('#loginError');
  const loginBtn = $('#loginBtn');
  const pwToggle = $('#pwToggle');
  const forgotLink = $('#forgotLink');
  const logoutBtn = $('#logoutBtn');
  const kpisEl = $('#kpis');
  const tabsEl = $('#tabs');
  const viewEl = $('#view');
  const pageTitleEl = $('#pageTitle');
  const crumbEl = $('#crumb');
  const globalSearch = $('#globalSearch');
  const searchBtn = $('#searchBtn');
  const newProposalBtn = $('#newProposalBtn');

  // Wizard
  const wizardOverlay = $('#wizardOverlay');
  const wizardCloseBtn = $('#wizardCloseBtn');
  const statusSelect = $('#statusSelect');

  const wizardMain = $('#wizardMain');
  const stepperEl = $('#stepper');
  const insuredTabsEl = $('#insuredTabs');
  const insuredIndicatorEl = $('#insuredIndicator');
  const nextStepBtn = $('#nextStepBtn');
  const prevStepBtn = $('#prevStepBtn');
  const savePill = $('#savePill');
  const sumOld = $('#sumOld');
  const sumNew = $('#sumNew');
  const sumTotal = $('#sumTotal');
  const compHost = $('#compHost');

  const toastHost = $('#toastHost');

  // ---------- Login UI ----------
  function showLogin_(){
    document.body.classList.add('isLoggedOut');
    if(loginOverlay) loginOverlay.classList.remove('hidden');
    if(loginError) { loginError.textContent = ''; loginError.classList.add('hidden'); }
    if(loginUser) loginUser.focus();
    applyPermissions_();
  }
  function hideLogin_(){
    document.body.classList.remove('isLoggedOut');
    if(loginOverlay) loginOverlay.classList.add('hidden');
    applyPermissions_();
  }

  function tryLogin_(username, password){
    const u = USERS.find(x => x.username === username && x.password === password);
    if(!u) return { ok:false, msg:'שם משתמש או סיסמה שגויים' };
    const safe = { username:u.username, role:u.role, displayName:u.displayName };
    state.currentUser = safe;
    state.agentName = u.displayName;
    setSessionUser_(safe);
    hideLogin_();
    // After login, always route to customers
    setRoute('customers');
    return { ok:true };
  }

  function doLogout_(){
    clearSessionUser_();
    state.currentUser = null;
    state.agentName = 'אורח';
    showLogin_();
  }

  if(logoutBtn){
    logoutBtn.addEventListener('click', doLogout_);
  }

  if(loginForm){
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if(loginError) loginError.classList.add('hidden');

      const username = String(loginUser?.value || '').trim();
      const password = String(loginPass?.value || '').trim();

      const btn = loginBtn || loginForm.querySelector('button[type="submit"]');
      const setLoading = (on) => {
        if(!btn) return;
        btn.classList.toggle('loading', !!on);
        btn.disabled = !!on;
        const t = btn.querySelector('.btnText');
        if(t) t.textContent = on ? 'נכנס…' : 'כניסה';
      };

      setLoading(true);

      // Small delay for premium feel (prevents "stuck" feeling on fast checks)
      setTimeout(() => {
        const res = tryLogin_(username, password);
        setLoading(false);

        if(!res.ok){
          if(loginError){
            loginError.textContent = res.msg || 'שגיאה בהתחברות';
            loginError.classList.remove('hidden');
          }
        }
      }, 260);
    });
  }




  if(pwToggle){
    pwToggle.addEventListener('click', () => {
      if(!loginPass) return;
      const isPw = loginPass.getAttribute('type') === 'password';
      loginPass.setAttribute('type', isPw ? 'text' : 'password');
      pwToggle.textContent = isPw ? '🙈' : '👁';
      pwToggle.setAttribute('aria-label', isPw ? 'הסתר סיסמה' : 'הצג סיסמה');
      loginPass.focus();
    });
  }

  if(forgotLink){
    forgotLink.addEventListener('click', () => {
      alert('לשחזור סיסמה יש לפנות למנהל המערכת: 050-5588809');
    });
  }


  // ---------- Routing ----------
  let route = 'customers';
  let tab = 'table';

  function setRoute(r){
    route = r;
    $$('.navItem').forEach(b => b.classList.toggle('active', b.dataset.route === r));
    render();
  }

  $$('.navItem').forEach(b => b.addEventListener('click', () => setRoute(b.dataset.route)));

  // ---------- Boot: restore session or require login ----------
  (function bootAuth_(){
    const u = getSessionUser_();
    if(u){
      state.currentUser = u;
      state.agentName = u.displayName || state.agentName;
      hideLogin_();
    }else{
      showLogin_();
    }
  })();


  // ---------- Render ----------
  function render(){
    agentNameEl.textContent = 'נציג: ' + state.agentName;

    // Tabs bar: default visible, but hide on Customers (no need for רשימה/סגמנטים right now)
    if(tabsEl){
      tabsEl.style.display = '';
    }

    if(route === 'customers'){
      pageTitleEl.textContent = 'לקוחות';
      crumbEl.textContent = 'Overview';
      renderKpisCustomers();
      tab = 'table';
      if(tabsEl){ tabsEl.innerHTML = ''; tabsEl.style.display = 'none'; }
      renderCustomersTable(visibleCustomers_());
    }
    if(route === 'my'){
      pageTitleEl.textContent = 'התהליכים שלי';
      crumbEl.textContent = 'Assigned';
      renderKpisMy();
      renderTabs(['table'], { table:'משויכים אליי' });
      renderMyProcesses();
    }
    if(route === 'proposals'){
      pageTitleEl.textContent = 'הצעות';
      crumbEl.textContent = 'Overview';
      renderKpisProposals();
      renderTabs(['table'], { table:'רשימה' });
      renderProposalsTable(visibleProposals_());
    }
    if(route === 'settings'){
      pageTitleEl.textContent = 'הגדרות';
      crumbEl.textContent = 'System';
      renderKpisSettings();
      renderTabs(['general'], { general:'כללי' });
      renderSettings();
    }
  }

  function renderTabs(keys, labels){
    tabsEl.innerHTML = keys.map(k => (
      `<button class="tab ${k===tab?'active':''}" data-tab="${k}">${labels[k]||k}</button>`
    )).join('');
    $$('.tab', tabsEl).forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      render();
    }));
  }

  function kpiCard(label, value, hint){
    return `<div class="kpi"><div class="kpiLabel">${escapeHtml(label)}</div><div class="kpiValue">${escapeHtml(String(value))}</div><div class="kpiHint">${escapeHtml(hint||'')}</div></div>`;
  }

  function renderKpisCustomers(){
    const total = state.customers.length;
    const active = state.customers.filter(c => c.status === 'פעיל').length;
    const leads = state.customers.filter(c => c.segment === 'ליד').length;
    kpisEl.innerHTML = [
      kpiCard('סה״כ לקוחות', total, 'כל הרשומות במערכת'),
      kpiCard('פעילים', active, 'לקוחות בטיפול/פעילים'),
      kpiCard('לידים', leads, 'שייכים לסגמנט ליד'),
    ].join('');
  }

  function renderKpisProposals(){
    const total = state.proposals.length;
    const open = state.proposals.filter(p => p.status === 'טיוטה' || p.status === 'נפתח').length;
    const done = state.proposals.filter(p => p.status === 'נסגר').length;
    kpisEl.innerHTML = [
      kpiCard('סה״כ הצעות', total, 'כולל טיוטות'),
      kpiCard('פתוחות', open, 'בטיפול'),
      kpiCard('נסגרו', done, 'הסתיימו'),
    ].join('');
  }

  
  function renderKpisMy(){
    const agent = state.agentName;
    const assignedCustomers = state.customers.filter(c => (c.assignedAgent||'') === agent);
    const openProposals = state.proposals.filter(p => (p.assignedAgent||agent) === agent && !['נסגר','בוטל'].includes(p.status||''));
    kpisEl.innerHTML = [
      kpiCard('משויכים אליי', assignedCustomers.length, 'לקוחות'),
      kpiCard('תיקים פתוחים', openProposals.length, 'הצעות פעילות'),
      kpiCard('דורש טיפול', openProposals.filter(p => computeCompletion(p).level!=='ok').length, 'חסרים/לא הושלם'),
    ].join('');
  }

  function latestProposalForCustomer(customerId){
    const rel = state.proposals.filter(p => p.customerId === customerId);
    rel.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    return rel[0] || null;
  }

  function renderMyProcesses(){
    const agent = state.agentName;
    const rows = state.customers
      .filter(c => (c.assignedAgent||'') === agent)
      .map(c => {
        const lp = latestProposalForCustomer(c.id);
        const status = lp ? (lp.status||'') : '—';
        const comp = lp ? computeCompletion(lp) : null;
        const prog = lp ? proposalProgressCell(lp) : '<span style="color:rgba(18,19,25,.55);font-size:12px">אין תיק עדיין</span>';
        const openCls = (lp && !['נסגר','בוטל'].includes(status)) ? '' : 'style="opacity:.65"';
        return { c, lp, status, prog, openCls };
      });

    // Sort: open first, then by createdAt desc
    rows.sort((a,b) => {
      const ao = a.lp && !['נסגר','בוטל'].includes(a.status);
      const bo = b.lp && !['נסגר','בוטל'].includes(b.status);
      if(ao !== bo) return bo - ao;
      return ((b.lp&&b.lp.createdAt)||'').localeCompare((a.lp&&a.lp.createdAt)||'');
    });

    viewEl.innerHTML = `
      ${renderDueProcessesForAgent_(agent)}
      <div class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>לקוח</th>
              <th>נציג מטפל</th>
              <th>סטטוס תיק</th>
              <th>התקדמות</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr ${r.openCls}>
                <td>
                  <div style="font-weight:900">${escapeHtml(r.c.fullName||'')}</div>
                  <div style="font-size:12px;color:rgba(18,19,25,.55)">${escapeHtml(r.c.phone||'')}</div>
                </td>
                <td>${escapeHtml(r.c.assignedAgent||'')}</td>
                <td>${escapeHtml(r.status)}</td>
                <td>${r.prog}</td>
                <td style="text-align:left">
                  ${r.lp ? `<button class="btn btnSoft" data-open-prop="${escapeAttr(r.lp.id)}">פתח תיק</button>` : `<button class="btn btnSoft" data-new-prop="${escapeAttr(r.c.id)}">צור תיק</button>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${rows.length ? '' : `<div class="sideHint">אין לקוחות משויכים אליך עדיין.</div>`}
    `;

    $$('[data-open-prop]').forEach(b => b.addEventListener('click', () => openWizard({ proposalId: b.dataset.openProp })));
    $$('[data-new-prop]').forEach(b => b.addEventListener('click', () => openWizard({ customerId: b.dataset.newProp })));
    wireProcessButtons_();
  }

function renderKpisSettings(){
    kpisEl.innerHTML = [
      kpiCard('מצב', 'דמו', 'ללא שרת'),
      kpiCard('ערכת צבע', 'Cream + Gold', 'זהב חלש'),
      kpiCard('תצוגה', 'CRM', 'Sidebar + Table'),
    ].join('');
  }

  function renderCustomersTable(rows){
    viewEl.innerHTML = `
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>לקוח</th>
              <th>ת״ז</th>
              <th>טלפון</th>
              <th>סטטוס</th>
              <th>נציג מטפל</th>
              <th>סגמנט</th>
              <th>התקדמות</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(c => `
              <tr>
                <td><b>${escapeHtml(c.fullName)}</b><div style="color:rgba(18,19,25,.55);font-size:12px">${escapeHtml(c.email)}</div></td>
                <td>${escapeHtml(c.tz)}</td>
                <td>${escapeHtml(c.phone)}</td>
                <td>${chip(c.status)}</td>
                <td>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                    <span style="font-weight:900">${escapeHtml(c.assignedAgent||'—')}</span>
                    <button class="btn btnTiny" data-assign="${escapeAttr(c.id)}">שייך</button>
                  </div>
                </td>
                <td>${escapeHtml(c.segment)}</td>
                <td>${customerProgressCell(c.id)}</td>
                <td style="text-align:left;white-space:nowrap">
                      <button class="btn btnSoft" data-open-proposal="${c.id}">צור הצעה</button>
                      <button class="btn btnTiny" data-new-process="${c.id}">צור תהליך</button>
                    </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    $$('[data-open-proposal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-open-proposal');
        openWizard({ customerId: cid });
      });
    });

    $$('[data-new-process]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const cid = btn.getAttribute('data-new-process');
        openProcessModal_(cid);
      });
    });

    // Assign customer to agent (any user can do it)
    $$('[data-assign]').forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const id = b.dataset.assign;
      const c = state.customers.find(x => x.id === id);
      if(!c) return;
      const current = c.assignedAgent || '';
      const suggested = state.teamAgents && state.teamAgents.length ? state.teamAgents.join(', ') : '';
      const name = prompt('שם הנציג לשיוך (אפשר לבחור/להקליד).\nקיימים: ' + suggested, current || state.agentName);
      if(name === null) return;
      c.assignedAgent = String(name).trim();
      toast('עודכן', 'הלקוח שויך ל־' + c.assignedAgent);
      render();
    }));
  }

  function renderProposalsTable(rows){
    viewEl.innerHTML = `
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>כותרת</th>
              <th>לקוח</th>
              <th>סטטוס</th>
              <th>תאריך</th>
              <th>התקדמות</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(p => `
              <tr>
                <td><b>${escapeHtml(p.title)}</b></td>
                <td>${escapeHtml(p.customerName || '—')}</td>
                <td>${chip(p.status, p.status==='נסגר'?'ok':'warn')}</td>
                <td>${escapeHtml(new Date(p.createdAt).toLocaleString('he-IL'))}</td>
                <td>${proposalProgressCell(p)}</td>
                <td><button class="btn btnSoft" data-resume="${p.id}">המשך</button></td>
              </tr>
            `).join('') : `<tr><td colspan="6" style="color:rgba(18,19,25,.55)">אין הצעות עדיין.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    $$('[data-resume]').forEach(btn => btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-resume');
      const proposal = state.proposals.find(p => p.id === pid);
      if(proposal) openWizard({ proposalId: pid });
    }));
  }

  function renderSettings(){
    viewEl.innerHTML = `
      <div class="grid2">
        <div class="sideCard">
          <div class="sideTitle">חיבור לשרת (Google Sheets)</div>
          <div class="field">
            <label>Web App URL</label>
            <input id="serverUrlInput" placeholder="https://script.google.com/macros/s/XXXX/exec" value="${escapeHtml(state.server.url || '')}"/>
          </div>
          <div style="height:10px"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btnPrimary" id="connectBtn">בדוק חיבור</button>
            <button class="btn btnSoft" id="pullBtn">משוך נתונים</button>
          </div>
          <div class="sideHint" id="connHint">${state.connected ? '✅ מחובר' : '⚠️ לא מחובר (דמו)'}</div>
        </div>

        <div class="sideCard">
          <div class="sideTitle">שם נציג (דמו)</div>
          <div class="field">
            <label>שם נציג</label>
            <input id="agentInput" value="${escapeHtml(state.agentName)}"/>
          </div>
          <div style="height:10px"></div>
          <button class="btn btnPrimary" id="saveAgentBtn">שמור</button>
        </div>

        <div class="sideCard">
          <div class="sideTitle">הערות</div>
          <div class="sideHint">המערכת כרגע דמו. חיבור לגוגל שיטס נוסיף אחרי שננעל UI.</div>
        </div>
      </div>
    `;
    $('#saveAgentBtn').addEventListener('click', () => {
      const v = $('#agentInput').value.trim() || 'אורח';
      state.agentName = v;
      toast('נשמר', 'שם הנציג עודכן');
      render();
    });

    // Server connect / pull
    const serverUrlInput = $('#serverUrlInput');
    $('#connectBtn').addEventListener('click', async () => {
      const url = (serverUrlInput.value || '').trim();
      state.server.url = url;
      // NOTE: dynamic URL only used for UI; apiCall uses GOOGLE_SCRIPT_URL constant.
      // If you want dynamic URL, set GOOGLE_SCRIPT_URL in code (recommended).
      const ping = await apiPing();
      state.connected = !!ping.ok;
      $('#connHint').textContent = state.connected ? '✅ מחובר' : '⚠️ לא מחובר (דמו)';
      toast(state.connected ? 'מחובר' : 'לא מחובר', state.connected ? 'השרת ענה בהצלחה' : 'בדוק URL/הרשאות');
    });
    $('#pullBtn').addEventListener('click', async () => {
      if(!GOOGLE_SCRIPT_URL){ toast('דמו', 'הדבק URL בקוד (GOOGLE_SCRIPT_URL) כדי לסנכרן'); return; }
      await syncDown();
      toast('עודכן', 'משכנו נתונים מהשרת');
      render();
    });

  }

  // ---------- Search ----------
  function performSearch(){
    const q = (globalSearch.value||'').trim().toLowerCase();
    if(!q){
      toast('חיפוש', 'הכנס שם / ת״ז / טלפון');
      return;
    }
    const found = visibleCustomers_().filter(c =>
      (c.fullName||'').toLowerCase().includes(q) ||
      (c.tz||'').toLowerCase().includes(q) ||
      (c.phone||'').toLowerCase().includes(q)
    );
    if(route !== 'customers') setRoute('customers');
    renderCustomersTable(found);
    toast('תוצאות חיפוש', `${found.length} תוצאה/ות`);
  }
  searchBtn.addEventListener('click', performSearch);
  globalSearch.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); performSearch(); }
  });

  // ---------- Wizard (proposal flow) ----------
  const INTERNAL_STATUS = ['פתוח','ממתין להצעה','נסגר'];
  const STATUS_OPTIONS = ['טיוטה','בתהליך','ממתין למסמכים','ממתין לחיתום','נסגר','בוטל'];

  const OLD_POLICY_SWITCH_REASONS = [
    { key:'order', label:'סדר בתיק הביטוחי' },
    { key:'reduce_costs', label:'הוזלת עלויות/מיקסום זכויות' },
    { key:'understand_rights', label:'להבין זכויות' },
    { key:'excess_gap', label:'להבין אם קיים עודף/חוסר' },
    { key:'risk_fit', label:'התאמת סיכונים' },
    { key:'consolidate', label:'ריכוז תיק' },
    { key:'har_habituh', label:'בדיקה מול אתר הר הביטח' },
  ];



  const WIZ_STEPS = [
    { key:'customer', label:'פרטי לקוח' },
    { key:'old', label:'פוליסות קיימות' },
    { key:'new', label:'פוליסות חדשות' },
    { key:'medical', label:'שאלון רפואי' },
    { key:'payer', label:'פרטי משלם' },
    { key:'summary', label:'סיכום' }
  ];

  let wiz = null;

  newProposalBtn.addEventListener('click', () => openWizard({}));

  wizardCloseBtn.addEventListener('click', closeWizard);
  wizardOverlay.addEventListener('click', (e) => {
    if(e.target === wizardOverlay) closeWizard();
  });

  nextStepBtn.addEventListener('click', () => gotoStep(wiz.stepIndex + 1));
  prevStepBtn.addEventListener('click', () => gotoStep(wiz.stepIndex - 1));

  function openWizard({ customerId=null, proposalId=null }){
    const now = new Date();
    let proposal = null;

    if(proposalId){
      proposal = state.proposals.find(p => p.id === proposalId) || null;
    }

    if(!proposal){
      const customer = customerId ? state.customers.find(c => c.id === customerId) : null;
      if(customer && !customer.assignedAgent){ customer.assignedAgent = state.agentName; }
      proposal = {
        id: 'p_' + Math.random().toString(16).slice(2),
        createdAt: new Date().toISOString(),
        status: 'טיוטה',
        internalStatus: 'פתוח',
        title: 'הצעה',
        pdfGenerated: false,
        assignedAgent: (customer && customer.assignedAgent) ? customer.assignedAgent : state.agentName,
        customerId: customer ? customer.id : null,
        customerName: customer ? customer.fullName : '',
        customer: customer ? { ...customer } : { fullName:'', tz:'', phone:'', email:'' },

        oldPolicies: [],
        newPolicies: [],

        insuredList: [
          { id:'main', label:'מבוטח ראשי', type:'main' }
        ],
        childCounter: 0,
        activeInsuredId: 'main',
        medical: {
          // medical[insuredId][company|product] = answers
        }
      };
      state.proposals.unshift(proposal);
    }

    // Normalize insureds + policies (backward compatibility)
    proposal.insuredList = (Array.isArray(proposal.insuredList) && proposal.insuredList.length)
      ? proposal.insuredList
      : [{ id:'main', label:'מבוטח ראשי', type:'main' }];
    if(!proposal.insuredList.some(i => i.id === 'main')){
      proposal.insuredList.unshift({ id:'main', label:'מבוטח ראשי', type:'main' });
    }
    proposal.childCounter = Number(proposal.childCounter || proposal.insuredList.filter(i => i.type === 'child').length) || 0;
    proposal.activeInsuredId = proposal.activeInsuredId || 'main';
    proposal.oldPolicies = (Array.isArray(proposal.oldPolicies) ? proposal.oldPolicies : []).map(x => ({ ...x, insuredId: (x && x.insuredId) ? x.insuredId : 'main' }));
    proposal.newPolicies = (Array.isArray(proposal.newPolicies) ? proposal.newPolicies : []).map(x => ({ ...x, insuredId: (x && x.insuredId) ? x.insuredId : 'main' }));


    wiz = {
      proposal,
      stepIndex: 0,
      medicalStepIndex: 0
    };

    $('#wizardTitle').textContent = proposal.customerName ? `הצעה – ${proposal.customerName}` : 'הצעה חדשה';
    const _ws = $('#wizardSub'); if(_ws) _ws.textContent = '';
    // Status dropdown
    if(statusSelect){
      statusSelect.innerHTML = STATUS_OPTIONS.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('');
      statusSelect.value = proposal.status || 'טיוטה';
      statusSelect.onchange = () => {
        proposal.status = statusSelect.value;
        syncInternalStatus(proposal);
        savePill.textContent = proposal.status;
        toast('עודכן', 'סטטוס עודכן');
        render();
      };
    }

    wizardOverlay.classList.remove('hidden');
    wizardOverlay.setAttribute('aria-hidden', 'false');

    buildInsuredTabs();
    updateInsuredIndicator();
    renderStepper();
    renderWizard();
    updateSums();
}

  function closeWizard(){
    wizardOverlay.classList.add('hidden');
    wizardOverlay.setAttribute('aria-hidden', 'true');
    wiz = null;
  }

  
  function isVisible(el){
    if(!el) return false;
    // offsetParent null for display:none; also handle hidden attribute
    if(el.hidden) return false;
    const style = window.getComputedStyle(el);
    if(style.display==='none' || style.visibility==='hidden' || style.opacity==='0') return false;
    return true;
  }

  function clearReqErrors(){
    wizardMain.querySelectorAll('.reqError').forEach(x => x.classList.remove('reqError'));
  }

  function validateCurrentStep(){
    clearReqErrors();

    // Validate all visible inputs/selects/textareas in the wizard (current step)
    const controls = Array.from(wizardMain.querySelectorAll('input, select, textarea'))
      .filter(el => {
        if(!isVisible(el)) return false;
        const type = (el.getAttribute('type')||'').toLowerCase();
        if(type==='button' || type==='submit' || type==='hidden') return false;
        if(el.disabled) return false;
        // Ignore non-form controls
        if(el.id==='searchInput') return false;
        return true;
      });

    // Radio groups: require one checked per group
    const radios = controls.filter(el => (el.type||'').toLowerCase()==='radio');
    const radioNames = Array.from(new Set(radios.map(r => r.name).filter(Boolean)));
    for(const name of radioNames){
      const group = radios.filter(r => r.name===name);
      if(group.length && !group.some(r => r.checked)){
        group.forEach(r => r.classList.add('reqError'));
        toast('חסר מידע', 'יש להשלים את כל השדות לפני מעבר לשלב הבא');
        group[0].scrollIntoView({behavior:'smooth', block:'center'});
        return false;
      }
    }

    // Other controls: require value
    for(const el of controls){
      const type = (el.getAttribute('type')||'').toLowerCase();
      if(type==='radio') continue;
      // For checkboxes: must be checked
      if(type==='checkbox'){
        if(!el.checked){
          el.classList.add('reqError');
          toast('חסר מידע', 'יש להשלים את כל השדות לפני מעבר לשלב הבא');
          el.scrollIntoView({behavior:'smooth', block:'center'});
          return false;
        }
        continue;
      }
      const v = (el.value ?? '').toString().trim();
      if(v === ''){
        el.classList.add('reqError');
        toast('חסר מידע', 'יש להשלים את כל השדות לפני מעבר לשלב הבא');
        el.scrollIntoView({behavior:'smooth', block:'center'});
        try{ el.focus(); }catch(e){}
        return false;
      }
    }

    // Extra rule: if payment method is card, require card number input filled (transient)
    if(wiz && WIZ_STEPS[wiz.stepIndex] && WIZ_STEPS[wiz.stepIndex].key==='payer'){
      const method = wiz.proposal?.payer?.method || 'card';
      if(method==='card'){
        const numEl = document.getElementById('payer_card_number');
        const expEl = document.getElementById('payer_card_exp');
        if(numEl && numEl.value.trim()===''){
          numEl.classList.add('reqError');
          toast('חסר מידע', 'יש למלא מספר כרטיס ותוקף');
          numEl.scrollIntoView({behavior:'smooth', block:'center'});
          numEl.focus();
          return false;
        }
        if(expEl && expEl.value.trim()===''){
          expEl.classList.add('reqError');
          toast('חסר מידע', 'יש למלא מספר כרטיס ותוקף');
          expEl.scrollIntoView({behavior:'smooth', block:'center'});
          expEl.focus();
          return false;
        }
      }
    }

    return true;
  }

function gotoStep(i){
    if(!wiz) return;
    const goingForward = (i > wiz.stepIndex);
    // (Temporarily disabled) required-fields gate will be re-enabled later
    // if(goingForward){
    //   if(!validateCurrentStep()) return;
    // }
    if(i < 0) i = 0;
    if(i >= WIZ_STEPS.length) i = WIZ_STEPS.length - 1;
    wiz.stepIndex = i;
    // reset medical substep when leaving/entering
    renderStepper();
    renderWizard();
    updateSums();
  }

  function renderStepper(){
    const insuredId = (wiz && wiz.proposal && wiz.proposal.activeInsuredId) ? wiz.proposal.activeInsuredId : 'main';
    const insuredLabel = labelInsured(insuredId);
    stepperEl.innerHTML = WIZ_STEPS.map((s, idx) => {
      // Show which insured is active across insured-specific steps to prevent agent mistakes
      const insuredSteps = ['customer','old','new','medical'];
      const showInsured = insuredSteps.includes(s.key);
      const lbl = showInsured ? `${s.label} – ${insuredLabel}` : s.label;
      return `<div class="step ${idx===wiz.stepIndex?'active':''}">${escapeHtml(lbl)}</div>`;
    }).join('');
  }

  function getActiveInsured(){
    return (wiz && wiz.proposal && wiz.proposal.insuredList)
      ? wiz.proposal.insuredList.find(x => x.id===wiz.proposal.activeInsuredId)
      : null;
  }

  function updateInsuredIndicator(){
    const a = getActiveInsured();
    if(!insuredIndicatorEl) return;
    if(!a){ insuredIndicatorEl.textContent = ''; return; }

    insuredIndicatorEl.innerHTML = `
      <div class="insuredChip" role="status" aria-label="מבוטח פעיל">
        <span class="insuredChipIco" aria-hidden="true">👤</span>
        <span class="insuredChipLbl">מבוטח פעיל:</span>
        <span class="insuredChipVal">${escapeHtml(a.label)}</span>
      </div>
    `;
  }

function openPolicyDiscountsModal(policy, onSave){
  const current = policy && policy.discount ? policy.discount : { tier:'', types:[], note:'' };
  const TIERS = ['','5%','10%','15%','20%','25%','30%','45%','60%','70%'];
  const TYPES = [
    'הנחת סוכן',
    'אחר'
  ];

  const overlay = document.createElement('div');
  overlay.style.position='fixed';
  overlay.style.inset='0';
  overlay.style.background='rgba(0,0,0,0.18)';
  overlay.style.zIndex='10050';
  overlay.style.display='flex';
  overlay.style.alignItems='center';
  overlay.style.justifyContent='center';
  overlay.style.padding='18px';

  const esc = (s)=>escapeHtml(String(s||''));
  overlay.innerHTML = `
    <div class="giModal">
      <div class="giModalHead">
        <div class="giModalTitle">הנחות לפוליסה</div>
        <button class="btn btnSoft" type="button" data-x>סגור</button>
      </div>

      <div class="field">
        <label>הנחה מדורגת (אחוז)</label>
        <select id="discTier">
          ${TIERS.map(t => `<option value="${esc(t)}" ${String(current.tier||'')===String(t)?'selected':''}>${t?esc(t):'ללא'}</option>`).join('')}
        </select>
      </div>

      <div class="field" style="margin-top:10px">
        <label>סוגי הנחה</label>
        <div class="giCheckPills">
          ${TYPES.map(t => {
            const checked = (current.types||[]).includes(t);
            return `
              <label class="giCheckPill">
                <input type="checkbox" value="${esc(t)}" ${checked?'checked':''} style="width:16px;height:16px"/>
                <span>${esc(t)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="field" style="margin-top:10px">
        <label>פירוט (אופציונלי)</label>
        <textarea id="discNote" placeholder="כתוב במילים מה ההנחה שניתנה...">${esc(current.note||'')}</textarea>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-start;margin-top:12px;flex-wrap:wrap">
        <button class="btn btnPrimary" type="button" data-save>שמירה</button>
        <button class="btn btnSoft" type="button" data-clear>ניקוי הנחות</button>
      </div>
    </div>
  `;

  const close = () => { overlay.remove(); };
  overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
  overlay.querySelector('[data-x]').addEventListener('click', close);

  overlay.querySelector('[data-clear]').addEventListener('click', () => {
    onSave(null);
    close();
  });

  overlay.querySelector('[data-save]').addEventListener('click', () => {
    const tier = overlay.querySelector('#discTier').value || '';
    const types = Array.from(overlay.querySelectorAll('input[type="checkbox"]'))
      .filter(x => x.checked).map(x => x.value);
    const note = overlay.querySelector('#discNote').value || '';
    const payload = (tier || types.length || note.trim()) ? { tier, types, note } : null;
    onSave(payload);
    close();
  });

  document.body.appendChild(overlay);
}

function openPolicyCoveragesModal(policy, onSave){
  const current = policy && policy.coveragesText ? String(policy.coveragesText) : '';
  const overlay = document.createElement('div');
  overlay.style.position='fixed';
  overlay.style.inset='0';
  overlay.style.background='rgba(0,0,0,0.18)';
  overlay.style.zIndex='10050';
  overlay.style.display='flex';
  overlay.style.alignItems='center';
  overlay.style.justifyContent='center';
  overlay.style.padding='18px';

  const esc = (s)=>escapeHtml(String(s||''));
  overlay.innerHTML = `
    <div style="width:min(620px,95vw);background:rgba(255,255,255,0.98);border-radius:18px;box-shadow:0 22px 70px rgba(0,0,0,0.28);padding:14px;direction:rtl;font-family:inherit">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div style="font-weight:900">בחירת כיסויים</div>
        <button class="btn btnSoft" type="button" data-x>סגור</button>
      </div>

      <div class="field">
        <label>רשום את הכיסויים שנבחרו (אפשר להפריד בפסיקים/שורות)</label>
        <textarea id="covText" rows="6" placeholder="לדוגמה: ניתוחים בישראל, תרופות, השתלות..." style="width:100%">${esc(current)}</textarea>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">
        <button class="btn btnSoft" type="button" data-cancel>ביטול</button>
        <button class="btn btnPrimary" type="button" data-save>שמור</button>
      </div>
    </div>
  `;

  const close = () => { overlay.remove(); };
  overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
  overlay.querySelector('[data-x]').addEventListener('click', close);
  overlay.querySelector('[data-cancel]').addEventListener('click', () => { close(); onSave && onSave(null); });
  overlay.querySelector('[data-save]').addEventListener('click', () => {
    const val = overlay.querySelector('#covText').value || '';
    close();
    onSave && onSave(val);
  });

  document.body.appendChild(overlay);
}

function openPolicyLienModal(current, onSave){
  const data = current || {};
  // Backwards compatibility: if no kind provided, infer
  const inferredKind = data.kind || (data.hp || data.businessName || data.businessAddress ? 'other' : 'bank');
  const overlay = document.createElement('div');
  overlay.style.position='fixed';
  overlay.style.inset='0';
  overlay.style.background='rgba(0,0,0,0.18)';
  overlay.style.zIndex='10050';
  overlay.style.display='flex';
  overlay.style.alignItems='center';
  overlay.style.justifyContent='center';
  overlay.style.padding='18px';

  const esc = (s)=>escapeHtml(String(s||''));
  overlay.innerHTML = `
    <div style="width:min(680px,95vw);background:rgba(255,255,255,0.98);border-radius:18px;box-shadow:0 22px 70px rgba(0,0,0,0.28);padding:14px;direction:rtl;font-family:inherit">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div style="font-weight:900">שיעבוד פוליסה</div>
        <button class="btn btnSoft" type="button" data-x>סגור</button>
      </div>

      <div class="sideHint" style="margin-top:-4px;margin-bottom:10px">בחר סוג משעבד:</div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn btnSoft" type="button" data-kind="bank">בנק</button>
        <button class="btn btnSoft" type="button" data-kind="other">אחר</button>
      </div>

      <div id="lienBank" style="display:none">
        <div class="grid2">
          <div class="field">
            <label>שם הבנק המשעבד</label>
            <input id="l_bankName" value="${esc(data.bankName||'')}" placeholder="לדוגמה: לאומי" />
          </div>
          <div class="field">
            <label>מספר בנק</label>
            <input id="l_bankNumber" value="${esc(data.bankNumber||'')}" placeholder="לדוגמה: 10" />
          </div>
          <div class="field">
            <label>מספר סניף</label>
            <input id="l_branchNumber" value="${esc(data.branchNumber||data.branch||'')}" placeholder="לדוגמה: 123" />
          </div>
          <div class="field">
            <label>כתובת סניף</label>
            <input id="l_branchAddress" value="${esc(data.branchAddress||'')}" placeholder="כתובת מלאה" />
          </div>
          <div class="field" style="grid-column:1/-1">
            <label>בנק משעבד (אם שונה)</label>
            <input id="l_lienHolder" value="${esc(data.lienHolder||'')}" placeholder="אופציונלי" />
          </div>
          <div class="field">
            <label>לכמה שנים</label>
            <input id="l_years_bank" type="number" min="0" step="1" value="${esc(data.years||'')}" placeholder="למשל 20" />
          </div>
        </div>
      </div>

      <div id="lienOther" style="display:none">
        <div class="grid2">
          <div class="field">
            <label>ח.פ.</label>
            <input id="l_hp" value="${esc(data.hp||'')}" placeholder="לדוגמה: 512345678" />
          </div>
          <div class="field">
            <label>שם העסק המשעבד</label>
            <input id="l_businessName" value="${esc(data.businessName||'')}" placeholder="שם העסק" />
          </div>
          <div class="field" style="grid-column:1/-1">
            <label>כתובת</label>
            <input id="l_businessAddress" value="${esc(data.businessAddress||'')}" placeholder="כתובת מלאה" />
          </div>
          <div class="field">
            <label>לכמה שנים</label>
            <input id="l_years_other" type="number" min="0" step="1" value="${esc(data.years||'')}" placeholder="למשל 20" />
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">
        <button class="btn btnSoft" type="button" data-cancel>ביטול</button>
        <button class="btn btnPrimary" type="button" data-save>שמור</button>
      </div>
    </div>
  `;

  const close = () => { overlay.remove(); };
  overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
  overlay.querySelector('[data-x]').addEventListener('click', close);
  overlay.querySelector('[data-cancel]').addEventListener('click', () => { close(); onSave && onSave(null); });

  let kind = inferredKind;

  const bankBox = overlay.querySelector('#lienBank');
  const otherBox = overlay.querySelector('#lienOther');
  const kindBtns = overlay.querySelectorAll('[data-kind]');
  const syncKind = () => {
    kindBtns.forEach(b => {
      const k = b.getAttribute('data-kind');
      if(k === kind){ b.classList.add('active'); b.style.borderColor='rgba(210, 170, 80, 0.85)'; b.style.boxShadow='0 10px 24px rgba(210,170,80,0.14)'; } else { b.classList.remove('active'); b.style.borderColor=''; b.style.boxShadow=''; }
    });
    bankBox.style.display = (kind === 'bank') ? 'block' : 'none';
    otherBox.style.display = (kind === 'other') ? 'block' : 'none';
  };
  kindBtns.forEach(b => b.addEventListener('click', () => {
    kind = b.getAttribute('data-kind');
    syncKind();
  }));
  syncKind();

  overlay.querySelector('[data-save]').addEventListener('click', () => {
    let out = null;

    if(kind === 'bank'){
      out = {
        kind: 'bank',
        bankName: (overlay.querySelector('#l_bankName').value || '').trim(),
        bankNumber: (overlay.querySelector('#l_bankNumber').value || '').trim(),
        branchNumber: (overlay.querySelector('#l_branchNumber').value || '').trim(),
        branchAddress: (overlay.querySelector('#l_branchAddress').value || '').trim(),
        lienHolder: (overlay.querySelector('#l_lienHolder').value || '').trim(),
        years: (overlay.querySelector('#l_years_bank').value || '').trim(),
      };
    }else{
      out = {
        kind: 'other',
        hp: (overlay.querySelector('#l_hp').value || '').trim(),
        businessName: (overlay.querySelector('#l_businessName').value || '').trim(),
        businessAddress: (overlay.querySelector('#l_businessAddress').value || '').trim(),
        years: (overlay.querySelector('#l_years_other').value || '').trim(),
      };
    }

    const hasAny = out && Object.entries(out).some(([k,v]) => k !== 'kind' && String(v||'').trim());
    close();
    onSave && onSave(hasAny ? out : null);
  });

  document.body.appendChild(overlay);
}

function debounce(fn, wait){
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function toast(title, msg){
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<b>${escapeHtml(title)}</b><span>${escapeHtml(msg)}</span>`;
    toastHost.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }

  // Medical questions
  function renderQuestion(q, answers){
    if(q.type === 'yesno'){
      const val = answers[q.id];
      const detKey = q.id + '_details';
      const detVal = answers[detKey] || '';
      const showDetails = q.details && val === 'כן';
      return `
        <div class="sideCard" style="box-shadow:none;border-radius:14px;margin-bottom:10px">
          <div class="field">
            <label>${escapeHtml(q.label)}</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btnSoft" type="button" data-yn="${q.id}" data-val="כן" style="padding:8px 12px;${val==='כן'?'border-color:rgba(214,178,94,.35);box-shadow:0 0 0 3px var(--goldSoft)':''}">כן</button>
              <button class="btn btnSoft" type="button" data-yn="${q.id}" data-val="לא" style="padding:8px 12px;${val==='לא'?'border-color:rgba(214,178,94,.35);box-shadow:0 0 0 3px var(--goldSoft)':''}">לא</button>
            </div>
          </div>
          ${q.details ? `
            <div class="field" style="margin-top:10px;${showDetails?'':'display:none'}" data-details-wrap="${q.id}">
              <label>${escapeHtml(q.detailsLabel || 'פירוט')}</label>
              <input id="det_${escapeAttr(q.id)}" value="${escapeHtml(detVal)}" placeholder="כתוב פירוט..."/>
            </div>
          `:''}
        </div>
      `;
    }
    if(q.type === 'text'){
      const val = answers[q.id] || '';
      return `
        <div class="field" style="margin-bottom:10px">
          <label>${escapeHtml(q.label)}</label>
          <textarea id="txt_${escapeAttr(q.id)}" placeholder="כתוב...">${escapeHtml(val)}</textarea>
        </div>
      `;
    }
    return '';
  }

  function bindQuestion(q, answers){
    if(q.type === 'yesno'){
      $$(`[data-yn="${cssEscape(q.id)}"]`).forEach(btn => {
        btn.addEventListener('click', () => {
          const v = btn.getAttribute('data-val');
          answers[q.id] = v;
          if(q.details){
            const wrap = $(`[data-details-wrap="${cssEscape(q.id)}"]`);
            if(wrap) wrap.style.display = (v === 'כן') ? '' : 'none';
          }
          markDraft();
          renderMedicalStep(); // rerender to update button highlight
        });
      });
      if(q.details){
        const det = $(`#det_${cssEscape(q.id)}`);
        if(det){
          det.addEventListener('input', () => {
            answers[q.id + '_details'] = det.value;
            markDraft();
          });
        }
      }
    }
    if(q.type === 'text'){
      const el = $(`#txt_${cssEscape(q.id)}`);
      if(el){
        el.addEventListener('input', () => {
          answers[q.id] = el.value;
          markDraft();
        });
      }
    }
  }

  // minimal css escape for querySelector
  function cssEscape(s){
    return String(s).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
  }


  // ---------- Sync (Sheets) ----------
  async function syncDown(){
    // Pull customers + proposals from server (if available)
    const c = await apiCall('listCustomers', {});
    if(c && c.ok && Array.isArray(c.customers) && c.customers.length){
      state.customers = c.customers;
    }
    const p = await apiCall('listProposals', {});
    if(p && p.ok && Array.isArray(p.proposals)){
      state.proposals = p.proposals;
    }
  }

  async function syncUpCustomer(customer){
    const r = await apiCall('upsertCustomer', { customer });
    if(r && r.ok && r.customer){
      // Update local
      const idx = state.customers.findIndex(x => x.id === r.customer.id);
      if(idx >= 0) state.customers[idx] = r.customer;
      else state.customers.unshift(r.customer);
    }
    return r;
  }

  async function syncUpProposal(proposal){
    const r = await apiCall('upsertProposal', { proposal });
    if(r && r.ok && r.proposal){
      const idx = state.proposals.findIndex(x => x.id === r.proposal.id);
      if(idx >= 0) state.proposals[idx] = r.proposal;
      else state.proposals.unshift(r.proposal);
    }
    return r;
  }

  // Init
  loadProcesses_();
  render();

  // Auto-connect + initial sync
  (async () => {
    state.server.url = GOOGLE_SCRIPT_URL || '';
    if(AUTO_CONNECT && GOOGLE_SCRIPT_URL){
      try{
        const ping = await apiPing();
        state.connected = !!(ping && ping.ok);
        if(state.connected){
          toast('מחובר', 'מחובר לשרת Google Sheets');
          await syncDown();
        }else{
          toast('לא מחובר', 'לא הצלחנו להתחבר לשרת (עובד בדמו)');
        }
      }catch(err){
        console.error('Auto-connect failed:', err);
        state.connected = false;
        // Stay usable in demo/local mode
      }
      render();
    }
  })();

})();
function openForgotModal(){
  var m = document.getElementById('forgotModal');
  if(m){ m.style.display = 'flex'; }
}
function closeForgotModal(){
  var m = document.getElementById('forgotModal');
  if(m){ m.style.display = 'none'; }
}
document.addEventListener('click', function(e){
  if(e.target && e.target.id === 'forgotPasswordLink'){
    e.preventDefault();
    openForgotModal();
  }
});
