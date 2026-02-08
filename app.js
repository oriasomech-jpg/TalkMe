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
    connected: false,
    server: { url: '' },
    agentName: 'אוריה (דמו)',
    teamAgents: ['אוריה (דמו)','סתיו','דוד'],
    customers: [
      { id:'c1', assignedAgent:'אוריה (דמו)', fullName:'דניאל כהן', tz:'123456789', phone:'050-1234567', email:'daniel@mail.com', status:'פעיל', segment:'פרימיום' },
      { id:'c2', assignedAgent:'סתיו', fullName:'נועה לוי', tz:'987654321', phone:'052-7654321', email:'noa@mail.com', status:'חדש', segment:'ליד' },
      { id:'c3', assignedAgent:'דוד', fullName:'יוסי מזרחי', tz:'314159265', phone:'054-5551234', email:'yossi@mail.com', status:'פעיל', segment:'סטנדרט' },
    ],
    proposals: []
  };
  // Questionnaire mapping (DEFAULT: Medical form for each insured)
    const questionnaires = {
    'DEFAULT|MEDICAL': {
      title: 'שאלון רפואי (לכל מבוטח)',
      steps: [
        { id:'general', title:'פרטים כלליים', questions:[
          qYesNo('smoking', 'האם המבוטח מעשן?', {details:true, detailsLabel:'פירוט (כמה/כמה זמן)'}),
          qYesNo('meds', 'האם המבוטח נוטל תרופות קבועות?', {details:true, detailsLabel:'פירוט תרופות'}),
          qYesNo('hosp5', 'האם היו אשפוזים/ניתוחים ב־5 השנים האחרונות?', {details:true, detailsLabel:'פירוט'})
        ]},
        { id:'medical', title:'מצב רפואי', questions:[
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
          qYesNo('substances', 'אלכוהול / סמים / עישון — אלכוהול, סמים, היסטוריה משפחתית (ממא/אבא אחים אחיות - מחלות תורשתיות), אחוזי נכות, תהליך בירור רפואי או בדיקות אבחנתיות שטרם הסתיימו סופית', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
          qYesNo('hosp_meds', 'אשפוזים / ניתוחים / טיפול תרופתי קבוע — אשפוזים או ניתוחים ב-5 שנים האחרונות, טיפול תרופתי באופן קבוע', {details:true, detailsLabel:'פירוט (אבחנה/מועד/טיפול)'}),
        ]},
        { id:'decl', title:'הצהרות', questions:[
          qYesNo('truth', 'אני מאשר/ת שכל הפרטים שמולאו נכונים ומלאים.'),
          qText('notes', 'הערות כלליות')
        ]},
        { id:'sum', title:'סיכום', questions:[] }
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
  const statusSelect = $('#statusSelect');

  const wizardMain = $('#wizardMain');
  const stepperEl = $('#stepper');
  const insuredTabsEl = $('#insuredTabs');
  const nextStepBtn = $('#nextStepBtn');
  const prevStepBtn = $('#prevStepBtn');
  const savePill = $('#savePill');
  const sumOld = $('#sumOld');
  const sumNew = $('#sumNew');
  const sumTotal = $('#sumTotal');
  const compHost = $('#compHost');

  const toastHost = $('#toastHost');

  // ---------- Routing ----------
  let route = 'customers';
  let tab = 'table';

  function setRoute(r){
    route = r;
    $$('.navItem').forEach(b => b.classList.toggle('active', b.dataset.route === r));
    render();
  }

  $$('.navItem').forEach(b => b.addEventListener('click', () => setRoute(b.dataset.route)));

  // ---------- Render ----------
  function render(){
    agentNameEl.textContent = 'נציג: ' + state.agentName;

    if(route === 'customers'){
      pageTitleEl.textContent = 'לקוחות';
      crumbEl.textContent = 'Overview';
      renderKpisCustomers();
      renderTabs(['table','segments'], { table:'רשימה', segments:'סגמנטים' });
      renderCustomersTable(state.customers);
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
      renderProposalsTable(state.proposals);
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
                <td><button class="btn btnSoft" data-open-proposal="${c.id}">צור הצעה</button></td>
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
            `).join('') : `<tr><td colspan="5" style="color:rgba(18,19,25,.55)">אין הצעות עדיין.</td></tr>`}
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
    const found = state.customers.filter(c =>
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

  const WIZ_STEPS = [
    { key:'customer', label:'פרטי לקוח' },
    { key:'old', label:'פוליסות קיימות' },
    { key:'new', label:'רכישות חדשות' },
    { key:'medical', label:'שאלון רפואי' },
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
          { id:'main', label:'מבוטח ראשי', type:'main' },
          { id:'spouse', label:'בן/בת זוג', type:'spouse' },
          { id:'child_1', label:'ילד 1', type:'child' }
        ],
        childCounter: 1,
        activeInsuredId: 'main',
        medical: {
          // medical[insuredId][company|product] = answers
        }
      };
      state.proposals.unshift(proposal);
    }

    wiz = {
      proposal,
      stepIndex: 0,
      medicalStepIndex: 0
    };

    $('#wizardTitle').textContent = proposal.customerName ? `הצעה – ${proposal.customerName}` : 'הצעה חדשה';
    $('#wizardSub').textContent = 'מסך מלא • לבן/קרם/זהב חלש • שאלון דינמי לפי חברה+מוצר';
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
    renderStepper();
    renderWizard();
    updateSums();
    toast('הצעה פתוחה', 'אפשר להתחיל למלא');
  }

  function closeWizard(){
    wizardOverlay.classList.add('hidden');
    wizardOverlay.setAttribute('aria-hidden', 'true');
    wiz = null;
  }

  function gotoStep(i){
    if(!wiz) return;
    if(i < 0) i = 0;
    if(i >= WIZ_STEPS.length) i = WIZ_STEPS.length - 1;
    wiz.stepIndex = i;
    // reset medical substep when leaving/entering
    renderStepper();
    renderWizard();
    updateSums();
  }

  function renderStepper(){
    stepperEl.innerHTML = WIZ_STEPS.map((s, idx) => (
      `<div class="step ${idx===wiz.stepIndex?'active':''}">${escapeHtml(s.label)}</div>`
    )).join('');
  }

  function buildInsuredTabs(){
    // Tabs: main + spouse + dynamic children
    insuredTabsEl.innerHTML = wiz.proposal.insuredList.map(x => {
      const isChild = x.type === 'child';
      const active = x.id===wiz.proposal.activeInsuredId ? 'active' : '';
      const removeBtn = isChild ? `<span class="xBtn" data-del-child="${escapeAttr(x.id)}" title="הסר ילד">×</span>` : '';
      return `<button class="insuredTab ${active}" data-insured="${escapeAttr(x.id)}">${escapeHtml(x.label)}${removeBtn}</button>`;
    }).join('') + `
      <button class="insuredTab" id="addChildBtn" title="הוסף ילד">＋ ילד</button>
    `;

    // Switch insured
    $$('[data-insured]', insuredTabsEl).forEach(b => b.addEventListener('click', (e) => {
      // if clicked the remove x, ignore (handled below)
      if(e && e.target && e.target.closest && e.target.closest('[data-del-child]')) return;
      const id = b.getAttribute('data-insured');
      wiz.proposal.activeInsuredId = id;
      buildInsuredTabs();
      if(WIZ_STEPS[wiz.stepIndex].key === 'medical'){
        wiz.medicalStepIndex = 0;
        renderWizard();
      }
    }));

    // Add child
    const addBtn = document.getElementById('addChildBtn');
    if(addBtn){
      addBtn.addEventListener('click', () => {
        wiz.proposal.childCounter = (wiz.proposal.childCounter || 1) + 1;
        const n = wiz.proposal.childCounter;
        const childId = `child_${n}`;
        wiz.proposal.insuredList.push({ id: childId, label: `ילד ${n}`, type:'child' });
        wiz.proposal.activeInsuredId = childId;
        toast('נוסף', `נוסף ילד ${n}`);
        buildInsuredTabs();
        // If we're in new policies step, rerender so select list includes the new child
        if(WIZ_STEPS[wiz.stepIndex].key === 'new') renderWizard();
        if(WIZ_STEPS[wiz.stepIndex].key === 'medical'){ wiz.medicalStepIndex = 0; renderWizard(); }
      });
    }

    // Remove child
    $$('[data-del-child]', insuredTabsEl).forEach(x => x.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const childId = x.getAttribute('data-del-child');
      // keep at least one child? allow removing all children
      wiz.proposal.insuredList = wiz.proposal.insuredList.filter(i => i.id !== childId);
      // delete any policies/medical answers tied to this child
      wiz.proposal.newPolicies = wiz.proposal.newPolicies.filter(p => p.insuredId !== childId);
      if(wiz.proposal.medical && wiz.proposal.medical[childId]) delete wiz.proposal.medical[childId];

      if(wiz.proposal.activeInsuredId === childId){
        wiz.proposal.activeInsuredId = 'main';
      }
      toast('הוסר', 'הילד הוסר');
      buildInsuredTabs();
      updateSums();
      renderWizard();
    }));
  }

  function renderWizard(){
    if(!wiz) return;
    const stepKey = WIZ_STEPS[wiz.stepIndex].key;
    savePill.textContent = wiz.proposal.status;
    if(statusSelect) statusSelect.value = wiz.proposal.status || 'טיוטה';
    if(compHost){
      const comp = computeCompletion(wiz.proposal);
      compHost.innerHTML = renderCompletionBadges(comp);
    }

    if(stepKey === 'customer') renderCustomerStep();
    if(stepKey === 'old') renderOldPoliciesStep();
    if(stepKey === 'new') renderNewPoliciesStep();
    if(stepKey === 'medical') renderMedicalStep();
    if(stepKey === 'summary') renderSummaryStep();
  }

  function renderCustomerStep(){
    const p = wiz.proposal;

    // Backward compatibility: if old fullName exists, try split once
    if(!p.customer.firstName && !p.customer.lastName && p.customer.fullName){
      const parts = String(p.customer.fullName).trim().split(/\s+/);
      p.customer.firstName = parts.shift() || '';
      p.customer.lastName = parts.join(' ') || '';
    }

    wizardMain.innerHTML = `
      <div class="sectionTitle">פרטי לקוח</div>

      <div class="grid3">
        ${field('שם פרטי', 'customer_firstName', p.customer.firstName || '')}
        ${field('שם משפחה', 'customer_lastName', p.customer.lastName || '')}
        ${selectField('מין', 'customer_gender', ['זכר','נקבה','אחר'])}
      </div>

      <div class="grid3" style="margin-top:10px">
        ${dateField('תאריך לידה', 'customer_birthDate', p.customer.birthDate || '')}
        ${field('נייד', 'customer_mobile', p.customer.mobile || p.customer.phone || '')}
        ${field('מייל', 'customer_email', p.customer.email || '')}
      </div>

      <div class="grid3" style="margin-top:10px">
        ${field('ת.ז', 'customer_tz', p.customer.tz || '')}
        ${selectField('קופת חולים', 'customer_hmo', ['כללית','מכבי','מאוחדת','לאומית','אחר'])}
        ${selectField('שב״ן', 'customer_shaban', ['אין','כסף','זהב','פלטינום'])}
      </div>

      <div class="hr"></div>
      <div class="sectionTitle">נתונים רפואיים בסיסיים</div>

      <div class="grid3">
        ${numField('גובה (ס״מ)', 'customer_heightCm', p.customer.heightCm || '')}
        ${numField('משקל (ק״ג)', 'customer_weightKg', p.customer.weightKg || '')}
        ${selectField('מעשן?', 'customer_smoker', ['לא','כן'])}
      </div>

      <div class="grid3" style="margin-top:10px" id="smokeRow" style="display:none">
        <div class="field">
          <label for="customer_smokePerDay">כמות ליום</label>
          <input id="customer_smokePerDay" type="number" inputmode="decimal" placeholder="0" value="${escapeHtml(p.customer.smokePerDay || '')}" />
        </div>
        <div></div>
        <div></div>
      </div>

      <div class="hr"></div>
      <div class="sectionTitle">נוסף</div>

      <div class="grid2">
        ${field('עיסוק', 'customer_occupation', p.customer.occupation || '')}
        ${dateField('הנפקת ת.ז', 'customer_tzIssueDate', p.customer.tzIssueDate || '')}
      </div>

      <div class="hr"></div>
      <div class="sectionTitle">הערות</div>
      <textarea id="customer_notes" placeholder="סיכום שיחה / הערות...">${escapeHtml(p.customer.notes||'')}</textarea>
    `;

    // Set selected values for selects
    setSelectValue('customer_gender', p.customer.gender || '');
    setSelectValue('customer_hmo', p.customer.hmo || '');
    setSelectValue('customer_shaban', p.customer.shaban || '');
    setSelectValue('customer_smoker', (p.customer.smoker === true || p.customer.smoker === 'כן') ? 'כן' : (p.customer.smoker === 'לא' ? 'לא' : (p.customer.smoker ? 'כן' : 'לא')));

    // Bind
    bindInput('customer_firstName', v => { p.customer.firstName = v; syncDisplayName(p); });
    bindInput('customer_lastName', v => { p.customer.lastName = v; syncDisplayName(p); });

    bindSelect('customer_gender', v => p.customer.gender = v);
    bindDate('customer_birthDate', v => p.customer.birthDate = v);

    bindInput('customer_mobile', v => { p.customer.mobile = v; p.customer.phone = v; });
    bindInput('customer_email', v => p.customer.email = v);
    bindInput('customer_tz', v => p.customer.tz = v);

    bindSelect('customer_hmo', v => p.customer.hmo = v);
    bindSelect('customer_shaban', v => p.customer.shaban = v);

    bindInput('customer_heightCm', v => p.customer.heightCm = v);
    bindInput('customer_weightKg', v => p.customer.weightKg = v);

    bindSelect('customer_smoker', v => {
      p.customer.smoker = v;
      toggleSmokeRow(v === 'כן');
      if(v !== 'כן'){ p.customer.smokePerDay = ''; const el = document.getElementById('customer_smokePerDay'); if(el) el.value = ''; }
    });
    bindInput('customer_smokePerDay', v => p.customer.smokePerDay = v);

    bindInput('customer_occupation', v => p.customer.occupation = v);
    bindDate('customer_tzIssueDate', v => p.customer.tzIssueDate = v);
    bindTextarea('customer_notes', v => p.customer.notes = v);

    // Show/hide smoking quantity row initially
    toggleSmokeRow((p.customer.smoker === true || p.customer.smoker === 'כן'));

    // Keep wizard title in sync
    syncDisplayName(p);
  }

  function renderOldPoliciesStep(){
    const p = wiz.proposal;
    wizardMain.innerHTML = `
      <div class="sectionTitle">פוליסות קיימות</div>
      <div class="grid3">
        ${selectField('חברה', 'old_company', ['הראל','כלל','מנורה','הפניקס','מגדל','הכשרה'])}
        ${selectField('סוג ביטוח', 'old_product', ['בריאות','חיים','ריסק','תאונות אישיות','דירה','רכב'])}
        ${numField('פרמיה חודשית', 'old_premium', '')}
      </div>
      <div style="height:10px"></div>
      <button class="btn btnPrimary" id="addOldBtn">+ הוסף פוליסה קיימת</button>

      <div class="hr"></div>
      <div class="tableWrap">
        <table>
          <thead><tr><th>חברה</th><th>מוצר</th><th>פרמיה</th><th></th></tr></thead>
          <tbody>
            ${p.oldPolicies.length ? p.oldPolicies.map((x,idx) => `
              <tr>
                <td>${escapeHtml(x.company)}</td>
                <td>${escapeHtml(x.product)}</td>
                <td>${money(x.premium)}</td>
                <td><button class="btn btnSoft" data-del-old="${idx}">מחיקה</button></td>
              </tr>
            `).join('') : `<tr><td colspan="4" style="color:rgba(18,19,25,.55)">אין פוליסות קיימות עדיין.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    $('#addOldBtn').addEventListener('click', () => {
      const company = $('#old_company').value;
      const product = $('#old_product').value;
      const premium = parseFloat($('#old_premium').value || '0') || 0;
      if(!company || !product){ toast('שגיאה', 'בחר חברה וסוג ביטוח'); return; }
      p.oldPolicies.push({ company, product, premium });
      toast('נוסף', 'פוליסה קיימת נוספה');
      renderOldPoliciesStep();
      updateSums();
    });

    $$('[data-del-old]').forEach(b => b.addEventListener('click', () => {
      const idx = parseInt(b.getAttribute('data-del-old'),10);
      p.oldPolicies.splice(idx,1);
      renderOldPoliciesStep();
      updateSums();
    }));
  }

  function renderNewPoliciesStep(){
    const p = wiz.proposal;
    wizardMain.innerHTML = `
      <div class="sectionTitle">רכישות חדשות</div>
      <div class="grid2">
        ${selectField('מבוטח', 'new_insured', p.insuredList.map(i => i.id+'|'+i.label))}
        ${selectField('חברה', 'new_company', ['הראל','כלל','מנורה','הפניקס','מגדל','הכשרה'])}
      </div>
      <div class="grid2" style="margin-top:10px">
        ${selectField('מוצר', 'new_product', ['בריאות','חיים','ריסק','תאונות אישיות','דירה','רכב'])}
        ${numField('פרמיה חודשית', 'new_premium', '')}
      </div>
      <div style="height:10px"></div>
      <button class="btn btnPrimary" id="addNewBtn">+ הוסף רכישה</button>

      <div class="hr"></div>
      <div class="tableWrap">
        <table>
          <thead><tr><th>מבוטח</th><th>חברה</th><th>מוצר</th><th>פרמיה</th><th></th></tr></thead>
          <tbody>
            ${p.newPolicies.length ? p.newPolicies.map((x,idx) => `
              <tr>
                <td>${escapeHtml(labelInsured(x.insuredId))}</td>
                <td>${escapeHtml(x.company)}</td>
                <td>${escapeHtml(x.product)}</td>
                <td>${money(x.premium)}</td>
                <td><button class="btn btnSoft" data-del-new="${idx}">מחיקה</button></td>
              </tr>
            `).join('') : `<tr><td colspan="5" style="color:rgba(18,19,25,.55)">אין רכישות חדשות עדיין.</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="sideHint" style="margin-top:10px">🧠 השאלון הרפואי ייבנה אוטומטית לפי חברה+מוצר לכל מבוטח.</div>
    `;

    $('#addNewBtn').addEventListener('click', () => {
      const insuredRaw = $('#new_insured').value;
      const insuredId = (insuredRaw||'').split('|')[0] || 'main';
      const company = $('#new_company').value;
      const product = $('#new_product').value;
      const premium = parseFloat($('#new_premium').value || '0') || 0;
      if(!insuredId || !company || !product){ toast('שגיאה', 'מלא מבוטח/חברה/מוצר'); return; }
      p.newPolicies.push({ insuredId, company, product, premium });
      toast('נוסף', 'רכישה חדשה נוספה');
      renderNewPoliciesStep();
      updateSums();
    });

    $$('[data-del-new]').forEach(b => b.addEventListener('click', () => {
      const idx = parseInt(b.getAttribute('data-del-new'),10);
      p.newPolicies.splice(idx,1);
      renderNewPoliciesStep();
      updateSums();
    }));
  }

  function renderMedicalStep(){
    const p = wiz.proposal;
    const insuredId = p.activeInsuredId;

    // Show questionnaire only if this insured has at least one new policy
    const hasAny = p.newPolicies.some(x => x.insuredId === insuredId);
    if(!hasAny){
      wizardMain.innerHTML = `
        <div class="sectionTitle">שאלון רפואי</div>
        <div class="sideHint">אין רכישות חדשות למבוטח הזה, לכן אין שאלון.</div>
      `;
      return;
    }

    const chosenKey = 'DEFAULT|MEDICAL';
    const qn = questionnaires[chosenKey];
    if(!qn){
      wizardMain.innerHTML = `
        <div class="sectionTitle">שאלון רפואי</div>
        <div class="sideHint">לא נמצא שאלון ברירת מחדל. בדוק את app.js.</div>
      `;
      return;
    }

    // answers bucket: per insured
    p.medical[insuredId] = p.medical[insuredId] || {};
    p.medical[insuredId][chosenKey] = p.medical[insuredId][chosenKey] || {};
    const answers = p.medical[insuredId][chosenKey];

    // sub-stepper inside medical
    const mSteps = qn.steps;
    const mIdx = clamp(wiz.medicalStepIndex, 0, mSteps.length-1);
    wiz.medicalStepIndex = mIdx;

    const subStepper = `
      <div class="stepper" style="margin-bottom:12px">
        ${mSteps.map((s,idx) => `<div class="step ${idx===mIdx?'active':''}">${escapeHtml(s.title)}</div>`).join('')}
      </div>
    `;

    const step = mSteps[mIdx];

    // Display context (company/product list) for this insured
    const combos = Array.from(new Set(
      p.newPolicies.filter(x => x.insuredId === insuredId).map(x => `${x.company} • ${x.product}`)
    ));

    wizardMain.innerHTML = `
      <div class="sectionTitle">שאלון רפואי – ${escapeHtml(labelInsured(insuredId))}</div>
      <div class="sideHint" style="margin-top:-6px">לפי רכישות: <b>${escapeHtml(combos.join(' | '))}</b></div>
      ${subStepper}
      <div id="medicalForm"></div>
      <div class="hr"></div>
      <div class="grid2">
        <button class="btn btnSoft" id="prevMedicalBtn">חזרה (במסך)</button>
        <button class="btn btnPrimary" id="nextMedicalBtn">המשך (במסך)</button>
      </div>
    `;

    const form = $('#medicalForm');

    if(step.id === 'sum'){
      const summaryLines = Object.entries(answers).map(([k,v]) => `<li><b>${escapeHtml(k)}</b>: ${escapeHtml(String(v))}</li>`).join('');
      form.innerHTML = `
        <div class="sideHint">סיכום תשובות (דמו):</div>
        <ul style="margin:8px 18px">${summaryLines || '<li>אין תשובות עדיין.</li>'}</ul>
      `;
    } else {
      form.innerHTML = step.questions.map(q => renderQuestion(q, answers)).join('');
      step.questions.forEach(q => bindQuestion(q, answers));
    }

    $('#prevMedicalBtn').addEventListener('click', () => {
      wiz.medicalStepIndex = clamp(wiz.medicalStepIndex - 1, 0, mSteps.length-1);
      renderMedicalStep();
    });
    $('#nextMedicalBtn').addEventListener('click', () => {
      wiz.medicalStepIndex = clamp(wiz.medicalStepIndex + 1, 0, mSteps.length-1);
      renderMedicalStep();
    });
  }


  function renderSummaryStep(){
    const p = wiz.proposal;
    wizardMain.innerHTML = `
      <div class="sectionTitle">סיכום הצעה</div>
      <div class="sideCard" style="box-shadow:none">
        <div><b>לקוח:</b> ${escapeHtml(p.customer.fullName || '—')}</div>
        <div><b>ת״ז:</b> ${escapeHtml(p.customer.tz || '—')}</div>
        <div><b>טלפון:</b> ${escapeHtml(p.customer.phone || '—')}</div>
        <div style="margin-top:8px;color:rgba(18,19,25,.55);font-size:12px">בשלב הבא נוסיף הפקת PDF.</div>
      </div>

      <div class="hr"></div>
      <div class="sectionTitle">פוליסות קיימות</div>
      ${renderSmallList(p.oldPolicies.map(x => `${x.company} • ${x.product} • ${money(x.premium)}`))}

      <div class="hr"></div>
      <div class="sectionTitle">רכישות חדשות</div>
      ${renderSmallList(p.newPolicies.map(x => `${labelInsured(x.insuredId)} • ${x.company} • ${x.product} • ${money(x.premium)}`))}

      <div class="hr"></div>
      <div class="sectionTitle">שאלונים</div>
      ${renderMedicalSummary(p)}

      <div class="hr"></div>
      <div class="grid2" style="margin-top:10px">
        <button class="btn btnSoft" id="pdfBtn">הדפס / הורד PDF</button>
        <button class="btn btnPrimary" id="markDoneBtn">סמן כנסגר</button>
      </div>
    `;

    $('#pdfBtn').addEventListener('click', () => { p.pdfGenerated = true; openPrintView(p); markDraft(); renderWizard(); render(); });

    $('#markDoneBtn').addEventListener('click', () => {
      p.status = 'נסגר';
      if(GOOGLE_SCRIPT_URL){
        syncUpProposal(p).then(()=>toast('סנכרון', 'ההצעה נשמרה לשיטס')).catch(()=>toast('סנכרון', 'שגיאה בסנכרון'));
      }
      toast('עודכן', 'ההצעה סומנה כנסגרה');
      savePill.textContent = p.status;
      render();
    });
  }

  function renderMedicalSummary(p){
    const blocks = [];
    for(const insured of p.insuredList){
      const m = p.medical[insured.id];
      if(!m){ continue; }
      const keys = Object.keys(m);
      if(!keys.length) continue;
      blocks.push(`<div class="sideHint"><b>${escapeHtml(insured.label)}:</b> ${keys.map(k => escapeHtml(k==='DEFAULT|MEDICAL' ? 'שאלון רפואי (ברירת מחדל)' : k.replace('|',' • '))).join(', ')}</div>`);
    }
    return blocks.length ? blocks.join('') : `<div class="sideHint">אין תשובות עדיין.</div>`;
  }


  // ---------- PDF (Client-side print to PDF) ----------
  function openPrintView(proposal){
    const w = window.open('', '_blank');
    if(!w){ toast('חסום', 'הדפדפן חסם חלון קופץ'); return; }
    const p = proposal;
    const oldLines = p.oldPolicies.map(x => `<tr><td>${escapeHtml(x.company)}</td><td>${escapeHtml(x.product)}</td><td>${money(x.premium)}</td></tr>`).join('');
    const newLines = p.newPolicies.map(x => `<tr><td>${escapeHtml(labelInsured(x.insuredId))}</td><td>${escapeHtml(x.company)}</td><td>${escapeHtml(x.product)}</td><td>${money(x.premium)}</td></tr>`).join('');
    const html = `
      <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8"/>
        <title>סיכום הצעה - ${escapeHtml(p.customer.fullName||'')}</title>
        <style>
          body{font-family:Arial, sans-serif; margin:24px; color:#121319}
          h1{margin:0 0 6px}
          .sub{color:#666; margin-bottom:16px}
          table{width:100%; border-collapse:collapse; margin:10px 0 18px}
          th,td{border:1px solid #ddd; padding:8px; text-align:right; font-size:13px}
          th{background:#f7f6f2}
          .box{border:1px solid #ddd; padding:10px; border-radius:10px; margin:10px 0}
          .muted{color:#666; font-size:12px}
        </style>
      </head>
      <body>
        <h1>סיכום הצעה</h1>
        <div class="sub">GEMEL INVEST • ${new Date(p.createdAt).toLocaleString('he-IL')}</div>

        <div class="box">
          <b>לקוח:</b> ${escapeHtml(p.customer.fullName||'—')}<br/>
          <b>ת״ז:</b> ${escapeHtml(p.customer.tz||'—')}<br/>
          <b>טלפון:</b> ${escapeHtml(p.customer.phone||'—')}<br/>
          <b>אימייל:</b> ${escapeHtml(p.customer.email||'—')}
        </div>

        <h3>פוליסות קיימות</h3>
        <table>
          <thead><tr><th>חברה</th><th>מוצר</th><th>פרמיה</th></tr></thead>
          <tbody>${oldLines || '<tr><td colspan="3">אין</td></tr>'}</tbody>
        </table>

        <h3>רכישות חדשות</h3>
        <table>
          <thead><tr><th>מבוטח</th><th>חברה</th><th>מוצר</th><th>פרמיה</th></tr></thead>
          <tbody>${newLines || '<tr><td colspan="4">אין</td></tr>'}</tbody>
        </table>

        <div class="muted">כדי להוריד כ־PDF: הדפס → Save as PDF</div>

        <script>window.print();</script>
      </body></html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }


  // ---------- Completion (What is missing) ----------
  function computeCompletion(p){
    const cust = p.customer || {};
    const okCustomer = !!(cust.firstName && cust.lastName && cust.tz && (cust.mobile||cust.phone) && cust.birthDate && cust.gender);
    const okOld = Array.isArray(p.oldPolicies) && p.oldPolicies.length > 0;
    const okNew = Array.isArray(p.newPolicies) && p.newPolicies.length > 0;
    // Medical: require at least one answered field for each insured
    const insuredList = Array.isArray(p.insuredList) ? p.insuredList : [];
    let okMedical = true;
    if(insuredList.length){
      for(const ins of insuredList){
        const bucket = p.medical && p.medical[ins.id] && (p.medical[ins.id]['DEFAULT|MEDICAL'] || p.medical[ins.id][Object.keys(p.medical[ins.id])[0]]);
        const hasAny = bucket && Object.keys(bucket).length > 0;
        if(!hasAny){ okMedical = false; break; }
      }
    } else {
      okMedical = false;
    }
    const okDocs = !!p.docsUploaded; // placeholder until Documents module is added
    const okPdf = !!p.pdfGenerated;
    const items = [
      { key:'customer', label:'פרטי לקוח', ok: okCustomer },
      { key:'old', label:'פוליסות', ok: okOld },
      { key:'new', label:'רכישות', ok: okNew },
      { key:'medical', label:'שאלון', ok: okMedical },
      { key:'docs', label:'מסמכים', ok: okDocs },
      { key:'pdf', label:'PDF', ok: okPdf },
    ];
    const done = items.filter(i => i.ok).length;
    const total = items.length;
    let level = 'bad';
    if(done === total) level = 'ok';
    else if(done >= Math.ceil(total/2)) level = 'mid';
    return { items, done, total, level };
  }

  function proposalProgressCell(p){
    const comp = computeCompletion(p);
    return `<div class="compRow"><span class="compBadge ${comp.level}"><span class="compDot"></span>${comp.done}/${comp.total}</span></div>`;
  }

  function customerProgressCell(customerId){
    const rel = state.proposals.filter(p => p.customerId === customerId || (p.customer && p.customer.id === customerId));
    if(!rel.length) return '<span style="color:rgba(18,19,25,.55);font-size:12px">—</span>';
    const p = rel[0];
    const comp = computeCompletion(p);
    // compact: show done/total + 3 key badges
    const keyMap = ['customer','medical','pdf'];
    const chips = comp.items.filter(i => keyMap.includes(i.key)).map(i => {
      const cls = i.ok ? 'ok' : 'bad';
      return `<span class="compBadge ${cls}" title="${escapeAttr(i.label + ': ' + (i.ok?'הושלם':'חסר'))}"><span class="compDot"></span>${escapeHtml(i.label)}</span>`;
    }).join('');
    return `<div class="compRow"><span class="compBadge ${comp.level}"><span class="compDot"></span>${comp.done}/${comp.total}</span>${chips}</div>`;
  }

  function renderCompletionBadges(comp){
    return `<div class="compRow">` + comp.items.map(i => {
      const cls = i.ok ? 'ok' : 'bad';
      return `<span class="compBadge ${cls}" title="${escapeAttr(i.label + ': ' + (i.ok?'הושלם':'חסר'))}"><span class="compDot"></span>${escapeHtml(i.label)}</span>`;
    }).join('') + `</div>`;
  }

  // ---------- Helpers ----------
  function renderSmallList(items){
    if(!items.length) return `<div class="sideHint">אין פריטים.</div>`;
    return `<ul style="margin:8px 18px">${items.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  }

  function field(label, id, value){
    return `
      <div class="field">
        <label for="${id}">${escapeHtml(label)}</label>
        <input id="${id}" value="${escapeHtml(value||'')}" />
      </div>
    `;
  }

  function numField(label, id, value){
    return `
      <div class="field">
        <label for="${id}">${escapeHtml(label)}</label>
        <input id="${id}" type="number" inputmode="decimal" placeholder="0" value="${escapeHtml(value||'')}" />
      </div>
    `;
  }

  function selectField(label, id, options){
    const opts = options.map(o => {
      const [val, text] = String(o).includes('|') ? String(o).split('|') : [o,o];
      return `<option value="${escapeAttr(val)}">${escapeHtml(text)}</option>`;
    }).join('');
    return `
      <div class="field">
        <label for="${id}">${escapeHtml(label)}</label>
        <select id="${id}">${opts}</select>
      </div>
    `;
  }


  function dateField(label, id, value){
    return `
      <div class="field">
        <label for="${id}">${escapeHtml(label)}</label>
        <input id="${id}" type="date" value="${escapeAttr(value||'')}" />
      </div>
    `;
  }

  function setSelectValue(id, value){
    const el = document.getElementById(id);
    if(!el) return;
    if(value && Array.from(el.options).some(o => o.value === value)){
      el.value = value;
    }
  }

  function bindSelect(id, onChange){
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('change', () => {
      onChange(el.value);
      markDraft();
      updateSums();
    });
  }

  function bindDate(id, onChange){
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('change', () => {
      onChange(el.value);
      markDraft();
    });
  }

  function toggleSmokeRow(show){
    const row = document.getElementById('smokeRow');
    if(!row) return;
    row.style.display = show ? 'grid' : 'none';
  }

  function syncDisplayName(p){
    const fn = (p.customer.firstName || '').trim();
    const ln = (p.customer.lastName || '').trim();
    const full = (fn + ' ' + ln).trim();
    p.customer.fullName = full;
    p.customerName = full;
    const titleEl = document.getElementById('wizardTitle');
    if(titleEl) titleEl.textContent = full ? `הצעה – ${full}` : 'הצעה חדשה';
  }

  function bindInput(id, onChange){
    const el = $('#'+id);
    el.addEventListener('input', () => {
      onChange(el.value);
      markDraft();
    });
  }
  function bindTextarea(id, onChange){
    const el = $('#'+id);
    el.addEventListener('input', () => {
      onChange(el.value);
      markDraft();
    });
  }

  function markDraft(){
    if(!wiz) return;
    wiz.proposal.status = 'טיוטה';
    savePill.textContent = 'טיוטה';
    updateSums();
  }

  function updateSums(){
    if(!wiz) return;
    const p = wiz.proposal;
    const oldSum = p.oldPolicies.reduce((a,x)=>a+(+x.premium||0),0);
    const newSum = p.newPolicies.reduce((a,x)=>a+(+x.premium||0),0);
    sumOld.textContent = money(oldSum);
    sumNew.textContent = money(newSum);
    sumTotal.textContent = money(oldSum + newSum);
  }

  function labelInsured(id){
    const it = (wiz && wiz.proposal.insuredList.find(x => x.id === id)) || state.proposals[0]?.insuredList?.find(x=>x.id===id);
    if(it) return it.label;
    if(id==='main') return 'מבוטח ראשי';
    if(id==='spouse') return 'בן/בת זוג';
    if(id==='child') return 'ילד';
    return 'מבוטח';
  }

  function chip(text, kind){
    const cls = kind || (text === 'פעיל' ? 'ok' : 'warn');
    return `<span class="chip ${cls}">${escapeHtml(text)}</span>`;
  }

  function money(n){
    const v = (Math.round((Number(n)||0)*100)/100).toFixed(0);
    return v.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₪';
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
    if(c && c.ok && Array.isArray(c.customers)){
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
  render();

  // Auto-connect + initial sync
  (async () => {
    state.server.url = GOOGLE_SCRIPT_URL || '';
    if(AUTO_CONNECT && GOOGLE_SCRIPT_URL){
      const ping = await apiPing();
      state.connected = !!ping.ok;
      if(state.connected){
        toast('מחובר', 'מחובר לשרת Google Sheets');
        await syncDown();
      }else{
        toast('לא מחובר', 'לא הצלחנו להתחבר לשרת (עובד בדמו)');
      }
      render();
    }
  })();

})();


  // ---- Silent Fields Sync ----
  function syncInternalStatus(p){
    if(['נסגר','בוטל'].includes(p.status)) p.internalStatus = 'נסגר';
    else if(p.status === 'ממתין למסמכים') p.internalStatus = 'ממתין להצעה';
    else p.internalStatus = 'פתוח';
  }
