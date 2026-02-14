/**
 * GEMEL INVEST • Apps Script Web App (Sheets backend)
 * 1) Create a Google Sheet.
 * 2) Extensions -> Apps Script. Paste this file.
 * 3) Set SPREADSHEET_ID below.
 * 4) Deploy -> New deployment -> Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5) Copy the /exec URL and paste into app.js (GOOGLE_SCRIPT_URL).
 */
const SPREADSHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';

// Sheet tabs
const SHEET_CUSTOMERS = 'Customers';
const SHEET_PROPOSALS = 'Proposals';
const SHEET_USERS = 'Users';

// Sessions stored in Script Properties (token -> JSON)
const SESSIONS_PROP = 'GEMEL_SESSIONS_V1';
const SESSION_TTL_HOURS = 24 * 7; // 7 days


function doGet(e){
  const action = (e && e.parameter && e.parameter.action) || '';
  if(action === 'ping') return json({ ok:true, ts: new Date().toISOString() });
  return json({ ok:false, error:'Unknown GET action' });
}

function doPost(e){
  const action = (e && e.parameter && e.parameter.action) || '';
  let body = {};
  try{
    body = JSON.parse(e.postData.contents || '{}');
  }catch(err){
    body = {};
  }
  const payload = body.payload || {};

  try{
    // --- Auth ---
    if(action === 'authLogin') return json(authLogin_(payload));
    if(action === 'authSession') return json(authSession_(payload));

    // --- Protected actions (require valid session) ---
    const user = requireUser_(payload);

    if(action === 'listCustomers') return json({ ok:true, customers: listCustomers_(user) });
    if(action === 'upsertCustomer') return json({ ok:true, customer: upsertCustomer_(payload.customer, user) });

    if(action === 'listProposals') return json({ ok:true, proposals: listProposals_(user) });
    if(action === 'upsertProposal') return json({ ok:true, proposal: upsertProposal_(payload.proposal, user) });

    return json({ ok:false, error:'Unknown POST action' });
  }catch(err){
    return json({ ok:false, error:String(err) });
  }
}

function getSheet_(name, headers){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }

  // Ensure headers exist / migrate missing columns
  const curLastCol = sh.getLastColumn();
  const cur = sh.getRange(1,1,1,Math.max(curLastCol, headers.length)).getValues()[0] || [];
  const curHeaders = cur.map(x => String(x||'').trim());
  let changed = false;

  headers.forEach((h, idx) => {
    const want = String(h||'').trim();
    if(curHeaders[idx] !== want){
      // If cell empty, set it. If different & non-empty, we keep existing but append missing at end.
      if(!curHeaders[idx]){
        sh.getRange(1, idx+1).setValue(want);
        curHeaders[idx] = want;
        changed = true;
      }
    }
  });

  // Append any headers not found anywhere
  headers.forEach(h => {
    const want = String(h||'').trim();
    if(want && curHeaders.indexOf(want) === -1){
      const nextCol = sh.getLastColumn() + 1;
      sh.getRange(1, nextCol).setValue(want);
      curHeaders.push(want);
      changed = true;
    }
  });

  if(changed){
    sh.setFrozenRows(1);
  }
  return sh;
}


function listCustomers_(user){
  const headers = ['id','assignedAgent','fullName','tz','phone','email','status','segment','updatedAt'];
  const sh = getSheet_(SHEET_CUSTOMERS, headers);
  const values = sh.getDataRange().getValues();
  if(values.length <= 1) return [];
  const rows = values.slice(1);
  const out = rows.map(r => ({
    id: r[0] || '',
    assignedAgent: r[1] || '',
    fullName: r[2] || '',
    tz: r[3] || '',
    phone: r[4] || '',
    email: r[5] || '',
    status: r[6] || 'פעיל',
    segment: r[7] || 'פרימיום',
    updatedAt: r[8] || ''
  })).filter(x => x.id);

  // Permission filter: admin sees all, others only assigned to their display name
  if(user && user.role !== 'admin'){
    const me = String(user.displayName||'').trim();
    return out.filter(x => String(x.assignedAgent||'').trim() === me);
  }
  return out;
}

function upsertCustomer_(c, user){
  // Permissions: non-admin can only create/update records assigned to themselves
  if(user && user.role !== 'admin'){
    const me = String(user.displayName||'').trim();
    if(!me) throw new Error('UNAUTHORIZED:NO_DISPLAY_NAME');
    if(!c) throw new Error('BAD_REQUEST');
    const curAss = String(c.assignedAgent||'').trim();
    if(curAss && curAss !== me) throw new Error('FORBIDDEN');
    c.assignedAgent = me;
  }

  if(!c || !c.id) throw new Error('customer.id required');
  const headers = ['id','assignedAgent','fullName','tz','phone','email','status','segment','updatedAt'];
  const sh = getSheet_(SHEET_CUSTOMERS, headers);
  const data = sh.getDataRange().getValues();
  const now = new Date().toISOString();
  const row = [c.id, c.assignedAgent||'', c.fullName||'', c.tz||'', c.phone||'', c.email||'', c.status||'פעיל', c.segment||'פרימיום', now];

  // find
  let idx = -1;
  for(let i=1;i<data.length;i++){
    if(String(data[i][0]) === String(c.id)){ idx = i+1; break; }
  }
  if(idx === -1){
    sh.appendRow(row);
  }else{
    sh.getRange(idx,1,1,row.length).setValues([row]);
  }
  return Object.assign({}, c, { updatedAt: now });
}

function listProposals_(user){
  const headers = ['id','assignedAgent','createdAt','status','customerId','customerName','payloadJson','updatedAt'];
  const sh = getSheet_(SHEET_PROPOSALS, headers);
  const values = sh.getDataRange().getValues();
  if(values.length <= 1) return [];
  const rows = values.slice(1);
  const out = rows.map(r => {
    const payload = safeJsonParse_(r[6]);
    return Object.assign({
      id: r[0] || '',
      assignedAgent: r[1] || '',
      createdAt: r[2] || '',
      status: r[3] || 'טיוטה',
      customerId: r[4] || '',
      customerName: r[5] || '',
      updatedAt: r[7] || ''
    }, payload);
  }).filter(x => x.id);


  // Permission filter: admin sees all, others only assigned to their display name
  if(user && user.role !== 'admin'){
    const me = String(user.displayName||'').trim();
    return out.filter(x => String(x.assignedAgent||'').trim() === me);
  }
  return out;
}

function upsertProposal_(p, user){
  // Permissions: non-admin can only create/update records assigned to themselves
  if(user && user.role !== 'admin'){
    const me = String(user.displayName||'').trim();
    if(!me) throw new Error('UNAUTHORIZED:NO_DISPLAY_NAME');
    if(!p) throw new Error('BAD_REQUEST');
    const curAss = String(p.assignedAgent||'').trim();
    if(curAss && curAss !== me) throw new Error('FORBIDDEN');
    p.assignedAgent = me;
  }

  if(!p || !p.id) throw new Error('proposal.id required');
  const headers = ['id','assignedAgent','createdAt','status','customerId','customerName','payloadJson','updatedAt'];
  const sh = getSheet_(SHEET_PROPOSALS, headers);
  const data = sh.getDataRange().getValues();
  const now = new Date().toISOString();

  const payload = Object.assign({}, p);
  // remove duplicated columns (already stored separately)
  delete payload.id; delete payload.createdAt; delete payload.status; delete payload.customerId; delete payload.customerName; delete payload.updatedAt;

  const row = [p.id, p.assignedAgent||'', p.createdAt||now, p.status||'טיוטה', p.customerId||'', p.customerName||'', JSON.stringify(payload), now];

  let idx = -1;
  for(let i=1;i<data.length;i++){
    if(String(data[i][0]) === String(p.id)){ idx = i+1; break; }
  }
  if(idx === -1){
    sh.appendRow(row);
  }else{
    sh.getRange(idx,1,1,row.length).setValues([row]);
  }
  return Object.assign({}, p, { updatedAt: now });
}


/* ===================== AUTH + USERS ===================== */

function ensureSheet_(name, headers){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
  }
  if(headers && headers.length){
    const rng = sh.getRange(1,1,1,headers.length);
    const vals = rng.getValues()[0];
    const empty = vals.every(v => !v);
    if(empty){
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function usersHeaders_(){
  return ['username','passwordHash','role','displayName','active','createdAt','updatedAt'];
}

function getSalt_(){
  const props = PropertiesService.getScriptProperties();
  let salt = props.getProperty('GEMEL_SALT_V1');
  if(!salt){
    salt = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('GEMEL_SALT_V1', salt);
  }
  return salt;
}

function hashPassword_(pw){
  const salt = getSalt_();
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + String(pw||''));
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function seedUsersIfEmpty_(){
  const sh = ensureSheet_(SHEET_USERS, usersHeaders_());
  const last = sh.getLastRow();
  if(last <= 1){
    const now = new Date().toISOString();
    const seed = [
      ['admin', hashPassword_('3316'), 'admin', 'מנהל מערכת', true, now, now],
      ['agent1', hashPassword_('1111'), 'agent', 'אוריה (דמו)', true, now, now],
      ['agent2', hashPassword_('2222'), 'agent', 'סתיו', true, now, now],
      ['agent3', hashPassword_('3333'), 'agent', 'דוד', true, now, now],
    ];
    sh.getRange(2,1,seed.length,seed[0].length).setValues(seed);
  }
  return sh;
}

function readUsers_(){
  const sh = seedUsersIfEmpty_();
  const data = sh.getDataRange().getValues();
  const header = data[0] || [];
  const out = [];
  for(let i=1;i<data.length;i++){
    const row = data[i];
    if(!row || !row.length) continue;
    const obj = {};
    header.forEach((h,idx) => obj[String(h||'').trim()] = row[idx]);
    if(obj.username){
      out.push({
        username: String(obj.username||'').trim(),
        passwordHash: String(obj.passwordHash||''),
        role: String(obj.role||'agent'),
        displayName: String(obj.displayName||obj.username||''),
        active: (obj.active !== false && String(obj.active).toLowerCase() !== 'false'),
        createdAt: obj.createdAt || '',
        updatedAt: obj.updatedAt || ''
      });
    }
  }
  return out;
}

function sessionsLoad_(){
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(SESSIONS_PROP);
  if(!raw) return {};
  try{ return JSON.parse(raw) || {}; }catch(e){ return {}; }
}
function sessionsSave_(obj){
  PropertiesService.getScriptProperties().setProperty(SESSIONS_PROP, JSON.stringify(obj || {}));
}
function sessionsPrune_(obj){
  const now = Date.now();
  const ttlMs = SESSION_TTL_HOURS * 3600 * 1000;
  Object.keys(obj||{}).forEach(t => {
    const rec = obj[t];
    if(!rec || !rec.ts || (now - rec.ts) > ttlMs) delete obj[t];
  });
  return obj;
}
function newToken_(){
  return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
}

function authLogin_(payload){
  const username = String(payload.username||'').trim();
  const password = String(payload.password||'');
  if(!username || !password) return { ok:false, error:'MISSING' };

  const users = readUsers_();
  const u = users.find(x => x.username === username);
  if(!u || u.active === false) return { ok:false, error:'INVALID' };

  const h = hashPassword_(password);
  if(h !== u.passwordHash) return { ok:false, error:'INVALID' };

  // Create session
  let sessions = sessionsLoad_();
  sessions = sessionsPrune_(sessions);
  const token = newToken_();
  sessions[token] = { username: u.username, ts: Date.now() };
  sessionsSave_(sessions);

  const safeUser = { username: u.username, role: u.role, displayName: u.displayName };
  return { ok:true, token, user: safeUser };
}

function authSession_(payload){
  const token = String(payload.token || (payload.auth && payload.auth.token) || '').trim();
  if(!token) return { ok:false, error:'NO_TOKEN' };
  let sessions = sessionsLoad_();
  sessions = sessionsPrune_(sessions);
  const rec = sessions[token];
  if(!rec || !rec.username){
    sessionsSave_(sessions);
    return { ok:false, error:'INVALID_SESSION' };
  }
  const users = readUsers_();
  const u = users.find(x => x.username === rec.username);
  if(!u || u.active === false){
    delete sessions[token];
    sessionsSave_(sessions);
    return { ok:false, error:'INVALID_USER' };
  }
  sessionsSave_(sessions);
  return { ok:true, token, user: { username:u.username, role:u.role, displayName:u.displayName } };
}

function requireUser_(payload){
  // Accept token from payload.token or payload.auth.token (preferred)
  const token = String((payload && payload.token) || (payload && payload.auth && payload.auth.token) || '').trim();
  if(!token) throw new Error('UNAUTHORIZED:NO_TOKEN');

  let sessions = sessionsLoad_();
  sessions = sessionsPrune_(sessions);
  const rec = sessions[token];
  if(!rec || !rec.username){
    sessionsSave_(sessions);
    throw new Error('UNAUTHORIZED:INVALID_SESSION');
  }
  const users = readUsers_();
  const u = users.find(x => x.username === rec.username);
  if(!u || u.active === false){
    delete sessions[token];
    sessionsSave_(sessions);
    throw new Error('UNAUTHORIZED:INVALID_USER');
  }
  sessionsSave_(sessions);
  return { username:u.username, role:u.role, displayName:u.displayName };
}

/* ===================== END AUTH + USERS ===================== */


function safeJsonParse_(s){
  try{ return s ? JSON.parse(s) : {}; }catch(e){ return {}; }
}

function json(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
