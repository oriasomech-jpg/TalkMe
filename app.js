// ------------------------------
// State (מוכן בהמשך ל-Sheets/PDF)
// ------------------------------
const state = {
  insureds: [], // [{id, role, data:{...}}]
  existingPolicies: [], // [{id, insuredId, ...}]
  newPolicies: [] // [{id, insuredId, ...}]
};

const STEPS = [
  { title: "פרטי מבוטחים", sub: "הגדרת מבוטח ראשי/משני/ילדים בצורה מופרדת לחלוטין" },
  { title: "פוליסות קיימות", sub: "לכל מבוטח רשימת פוליסות קיימות משלו + סטטוס טיפול" },
  { title: "פוליסות חדשות", sub: "הנחות וחישוב אוטומטי לפרמיה אחרי הנחה" },
  { title: "סיכום", sub: "בדיקת state – לוודא שאין ערבוב/דריסות" }
];

let currentStep = 0;
let selectedInsuredId = null;

// ------------------------------
// Helpers
// ------------------------------
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function getInsuredById(id){
  return state.insureds.find(x => x.id === id) || null;
}

function hasMain(){
  return state.insureds.some(x => x.role === "main");
}

function roleLabel(role){
  if(role === "main") return "מבוטח ראשי";
  if(role === "secondary") return "מבוטח משני";
  return "ילד";
}

function safeNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ------------------------------
// Step navigation
// ------------------------------
const stepEls = Array.from(document.querySelectorAll(".step"));
const navBtns = Array.from(document.querySelectorAll(".navBtn"));

const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");
const stepper = document.getElementById("stepper");

function renderStepper(){
  stepper.innerHTML = "";
  STEPS.forEach((s, i) => {
    const chip = document.createElement("div");
    chip.className = "chip" + (i === currentStep ? " active" : "");
    chip.textContent = `${i+1}. ${s.title}`;
    stepper.appendChild(chip);
  });
}

function renderSteps(){
  stepEls.forEach(el => el.classList.remove("active"));
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.add("active");

  navBtns.forEach(b => b.classList.remove("active"));
  document.querySelector(`.navBtn[data-step="${currentStep}"]`).classList.add("active");

  pageTitle.textContent = STEPS[currentStep].title;
  pageSub.textContent = STEPS[currentStep].sub;

  if(currentStep === 0){
    renderInsuredTabs();
    renderInsuredEditor();
  } else if(currentStep === 1){
    renderExistingPolicies();
  } else if(currentStep === 2){
    renderNewPolicies();
  } else if(currentStep === 3){
    document.getElementById("summary").textContent = JSON.stringify(state, null, 2);
  }

  renderStepper();
}

document.getElementById("next").addEventListener("click", () => {
  if(currentStep < stepEls.length - 1){
    currentStep++;
    renderSteps();
  }
});

document.getElementById("prev").addEventListener("click", () => {
  if(currentStep > 0){
    currentStep--;
    renderSteps();
  }
});

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currentStep = Number(btn.dataset.step);
    renderSteps();
  });
});

// ------------------------------
// Insureds (tabs + editor)
// ------------------------------
const insuredTabs = document.getElementById("insuredTabs");
const insuredEditor = document.getElementById("insuredEditor");

function createEmptyInsuredData(){
  return {
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    phone: "",
    email: "",
    idNumber: "",
    addressStreet: "",
    addressNumber: "",
    addressCity: "",
    addressZip: "",
    heightCm: "",
    weightKg: "",
    hmo: "",      // קופ"ח
    shaban: "",   // שב"ן
    smoker: "לא",
    occupation: "",
    idIssueDate: ""
  };
}

function addInsured(role){
  if(role === "main" && hasMain()){
    const main = state.insureds.find(x => x.role === "main");
    selectedInsuredId = main.id;
    renderInsuredTabs();
    renderInsuredEditor();
    return;
  }

  const newOne = {
    id: uid(),
    role,
    data: createEmptyInsuredData()
  };
  state.insureds.push(newOne);
  selectedInsuredId = newOne.id;
  renderInsuredTabs();
  renderInsuredEditor();
}

document.getElementById("addMain").addEventListener("click", () => addInsured("main"));
document.getElementById("addSecondary").addEventListener("click", () => addInsured("secondary"));
document.getElementById("addChild").addEventListener("click", () => addInsured("child"));

function renderInsuredTabs(){
  insuredTabs.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "tabs";

  if(state.insureds.length === 0){
    insuredTabs.innerHTML = `<div class="emptyState">לחץ על “מבוטח ראשי” כדי להתחיל.</div>`;
    return;
  }

  state.insureds.forEach((ins) => {
    const btn = document.createElement("button");
    btn.className = "tabBtn" + (ins.id === selectedInsuredId ? " active" : "");
    const name = [ins.data.firstName, ins.data.lastName].filter(Boolean).join(" ").trim();
    btn.textContent = `${roleLabel(ins.role)}${ins.role === "child" ? ` #${countChildIndex(ins.id)}` : ""}${name ? ` • ${name}` : ""}`;
    btn.addEventListener("click", () => {
      selectedInsuredId = ins.id;
      renderInsuredTabs();
      renderInsuredEditor();
    });
    wrap.appendChild(btn);
  });

  const tools = document.createElement("div");
  tools.className = "smallRow";
  tools.innerHTML = `<button class="iconBtn" id="removeSelected">מחק מבוטח נבחר</button>`;

  insuredTabs.appendChild(wrap);
  insuredTabs.appendChild(tools);

  document.getElementById("removeSelected").addEventListener("click", () => removeSelectedInsured());
}

function countChildIndex(childId){
  const children = state.insureds.filter(x => x.role === "child").map(x => x.id);
  return children.indexOf(childId) + 1;
}

function removeSelectedInsured(){
  if(!selectedInsuredId) return;
  const ins = getInsuredById(selectedInsuredId);
  if(!ins) return;

  state.insureds = state.insureds.filter(x => x.id !== selectedInsuredId);
  state.existingPolicies = state.existingPolicies.filter(p => p.insuredId !== selectedInsuredId);
  state.newPolicies = state.newPolicies.filter(p => p.insuredId !== selectedInsuredId);

  selectedInsuredId = state.insureds.length ? state.insureds[0].id : null;
  renderInsuredTabs();
  renderInsuredEditor();
}

function renderInsuredEditor(){
  const ins = selectedInsuredId ? getInsuredById(selectedInsuredId) : null;
  if(!ins){
    insuredEditor.className = "emptyState";
    insuredEditor.textContent = "בחר מבוטח כדי להתחיל.";
    return;
  }

  insuredEditor.className = "";
  insuredEditor.innerHTML = `
    <div class="card">
      <div class="cardHead">
        <div class="cardTitle">${roleLabel(ins.role)} ${ins.role === "child" ? `#${countChildIndex(ins.id)}` : ""}</div>
        <div class="badge">ID: ${ins.id.slice(0,8)}</div>
      </div>

      <div class="row">
        ${fieldInput("שם פרטי","firstName", ins.data.firstName)}
        ${fieldInput("שם משפחה","lastName", ins.data.lastName)}
        ${fieldSelect("מין","gender", ins.data.gender, ["","זכר","נקבה"])}
        ${fieldInput("תאריך לידה","birthDate", ins.data.birthDate, "date")}
      </div>

      <div class="row">
        ${fieldInput("נייד","phone", ins.data.phone, "tel")}
        ${fieldInput("אימייל","email", ins.data.email, "email")}
        ${fieldInput("תעודת זהות","idNumber", ins.data.idNumber, "text")}
        ${fieldInput("תאריך הנפקת זהות","idIssueDate", ins.data.idIssueDate, "date")}
      </div>

      <div class="row">
        ${fieldInput("רחוב","addressStreet", ins.data.addressStreet)}
        ${fieldInput("מספר","addressNumber", ins.data.addressNumber)}
        ${fieldInput("עיר","addressCity", ins.data.addressCity)}
        ${fieldInput("מיקוד","addressZip", ins.data.addressZip)}
      </div>

      <div class="row">
        ${fieldInput("גובה (ס״מ)","heightCm", ins.data.heightCm, "number")}
        ${fieldInput("משקל (ק״ג)","weightKg", ins.data.weightKg, "number")}
        ${fieldInput("קופת חולים","hmo", ins.data.hmo)}
        ${fieldInput("שב״ן","shaban", ins.data.shaban)}
      </div>

      <div class="row">
        ${fieldSelect("מעשן?","smoker", ins.data.smoker, ["לא","כן"])}
        ${fieldInput("עיסוק","occupation", ins.data.occupation)}
        <div class="field"></div>
        <div class="field"></div>
      </div>
    </div>
  `;

  insuredEditor.querySelectorAll("[data-key]").forEach(el => {
    const key = el.getAttribute("data-key");
    const upd = () => {
      ins.data[key] = el.value;
      renderInsuredTabs();
    };
    el.addEventListener("input", upd);
    el.addEventListener("change", upd);
  });
}

function fieldInput(label, key, value, type="text"){
  return `
    <div class="field">
      <label>${label}</label>
      <input type="${type}" value="${escapeHtml(value ?? "")}" data-key="${key}">
    </div>
  `;
}
function fieldSelect(label, key, value, options){
  const opts = options.map(opt => {
    const sel = String(opt) === String(value) ? "selected" : "";
    return `<option ${sel}>${escapeHtml(opt)}</option>`;
  }).join("");
  return `
    <div class="field">
      <label>${label}</label>
      <select data-key="${key}">${opts}</select>
    </div>
  `;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ------------------------------
// Existing Policies (per insured)
// ------------------------------
document.getElementById("addExistingPolicy").addEventListener("click", () => {
  if(!selectedInsuredId){
    currentStep = 0;
    renderSteps();
    return;
  }
  state.existingPolicies.push({
    id: uid(),
    insuredId: selectedInsuredId,
    company: "",
    policyName: "",
    policyType: "בריאות",
    premium: "",
    policyNumber: "",
    status: "ללא שינוי",
    partialCancelNotes: ""
  });
  renderExistingPolicies();
});

function renderExistingPolicies(){
  const box = document.getElementById("existingPolicies");
  box.innerHTML = "";

  if(!selectedInsuredId){
    box.innerHTML = `<div class="emptyState">בחר מבוטח בשלב “פרטי מבוטחים” כדי להוסיף פוליסות.</div>`;
    return;
  }

  const ins = getInsuredById(selectedInsuredId);
  const title = document.createElement("div");
  title.className = "card";
  title.innerHTML = `
    <div class="cardHead">
      <div class="cardTitle">מבוטח נבחר: ${roleLabel(ins.role)} ${[ins.data.firstName, ins.data.lastName].filter(Boolean).join(" ")}</div>
      <div class="badge">פוליסות קיימות</div>
    </div>
    <div class="emptyState">הוספה/עריכה מתבצעת רק למבוטח הנבחר.</div>
  `;
  box.appendChild(title);

  const list = state.existingPolicies.filter(p => p.insuredId === selectedInsuredId);
  if(list.length === 0){
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.textContent = "אין פוליסות קיימות למבוטח זה עדיין.";
    box.appendChild(empty);
    return;
  }

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="cardHead">
        <div class="cardTitle">פוליסה קיימת</div>
        <div class="smallRow">
          <span class="badge">${escapeHtml(p.status)}</span>
          <button class="iconBtn" data-del="${p.id}">מחיקה</button>
        </div>
      </div>

      <div class="row">
        ${fieldInput("חברת ביטוח","company", p.company)}
        ${fieldInput("שם פוליסה","policyName", p.policyName)}
        ${fieldSelect("סוג ביטוח","policyType", p.policyType, ["בריאות","ריסק","מחלות קשות","אחר"])}
        ${fieldInput("פרמיה (₪)","premium", p.premium, "number")}
      </div>

      <div class="row">
        ${fieldInput("מספר פוליסה","policyNumber", p.policyNumber)}
        ${fieldSelect("סטטוס טיפול","status", p.status, ["ביטול מלא","ביטול חלקי","מינוי סוכן","ללא שינוי"])}
        <div class="field"></div>
        <div class="field"></div>
      </div>

      <div class="row" data-partial-wrap style="display:${p.status === "ביטול חלקי" ? "grid" : "none"};">
        <div class="field" style="grid-column:1/-1;">
          <label>הערות ביטול חלקי (חובה)</label>
          <textarea data-key="partialCancelNotes">${escapeHtml(p.partialCancelNotes || "")}</textarea>
        </div>
      </div>
    `;

    card.querySelectorAll("[data-key]").forEach(el => {
      const key = el.getAttribute("data-key");
      const handler = () => {
        p[key] = el.value;
        if(key === "status") renderExistingPolicies();
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });

    card.querySelector(`[data-del="${p.id}"]`).addEventListener("click", () => {
      state.existingPolicies = state.existingPolicies.filter(x => x.id !== p.id);
      renderExistingPolicies();
    });

    box.appendChild(card);
  });
}

// ------------------------------
// New Policies (per insured) + discounts
// ------------------------------
document.getElementById("addNewPolicy").addEventListener("click", () => {
  if(!selectedInsuredId){
    currentStep = 0;
    renderSteps();
    return;
  }
  state.newPolicies.push({
    id: uid(),
    insuredId: selectedInsuredId,
    company: "",
    policyType: "בריאות",
    premiumBefore: "",
    discountMode: "ללא",
    discountValue: "",
    premiumAfter: 0
  });
  renderNewPolicies();
});

function calcAfter(p){
  const base = safeNum(p.premiumBefore);
  let after = base;

  if(p.discountMode === "אחוז"){
    const pct = safeNum(p.discountValue);
    after = base - (base * (pct/100));
  } else if(p.discountMode === "סכום"){
    const amount = safeNum(p.discountValue);
    after = base - amount;
  } else if(p.discountMode === "דירוג"){
    const map = { "נמוכה": 5, "בינונית": 10, "גבוהה": 15 };
    const pct = map[String(p.discountValue)] || 0;
    after = base - (base * (pct/100));
  }

  if(after < 0) after = 0;
  p.premiumAfter = Number(after.toFixed(2));
}

function renderNewPolicies(){
  const box = document.getElementById("newPolicies");
  box.innerHTML = "";

  if(!selectedInsuredId){
    box.innerHTML = `<div class="emptyState">בחר מבוטח בשלב “פרטי מבוטחים” כדי להוסיף פוליסות.</div>`;
    return;
  }

  const ins = getInsuredById(selectedInsuredId);
  const head = document.createElement("div");
  head.className = "card";
  head.innerHTML = `
    <div class="cardHead">
      <div class="cardTitle">מבוטח נבחר: ${roleLabel(ins.role)} ${[ins.data.firstName, ins.data.lastName].filter(Boolean).join(" ")}</div>
      <div class="badge">פוליסות חדשות</div>
    </div>
    <div class="emptyState">הוספה/עריכה מתבצעת רק למבוטח הנבחר.</div>
  `;
  box.appendChild(head);

  const list = state.newPolicies.filter(p => p.insuredId === selectedInsuredId);
  if(list.length === 0){
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.textContent = "אין פוליסות חדשות למבוטח זה עדיין.";
    box.appendChild(empty);
    return;
  }

  list.forEach(p => {
    calcAfter(p);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="cardHead">
        <div class="cardTitle">פוליסה חדשה</div>
        <div class="smallRow">
          <span class="badge">אחרי הנחה: ₪ ${p.premiumAfter}</span>
          <button class="iconBtn" data-del="${p.id}">מחיקה</button>
        </div>
      </div>

      <div class="row">
        ${fieldInput("חברת ביטוח","company", p.company)}
        ${fieldSelect("סוג ביטוח","policyType", p.policyType, ["בריאות","מחלות קשות","ריסק","דירה","תוספות","אחר"])}
        ${fieldInput("פרמיה לפני הנחה (₪)","premiumBefore", p.premiumBefore, "number")}
        ${fieldSelect("מצב הנחה","discountMode", p.discountMode, ["ללא","אחוז","סכום","דירוג"])}
      </div>

      <div class="row" data-discount-wrap style="display:${p.discountMode === "ללא" ? "none" : "grid"};">
        <div class="field" style="grid-column:1/3;">
          <label>ערך הנחה</label>
          ${discountValueControl(p)}
        </div>
        <div class="field" style="grid-column:3/5;">
          <label>פרמיה אחרי הנחה</label>
          <input value="₪ ${p.premiumAfter}" disabled>
        </div>
      </div>
    `;

    card.querySelectorAll("[data-key]").forEach(el => {
      const key = el.getAttribute("data-key");
      const handler = () => {
        p[key] = el.value;
        calcAfter(p);
        renderNewPolicies();
      };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });

    card.querySelector(`[data-del="${p.id}"]`).addEventListener("click", () => {
      state.newPolicies = state.newPolicies.filter(x => x.id !== p.id);
      renderNewPolicies();
    });

    box.appendChild(card);
  });
}

function discountValueControl(p){
  if(p.discountMode === "דירוג"){
    const options = ["", "נמוכה", "בינונית", "גבוהה"];
    const opts = options.map(o => `<option ${String(o)===String(p.discountValue)?"selected":""}>${escapeHtml(o)}</option>`).join("");
    return `<select data-key="discountValue">${opts}</select>`;
  }
  const placeholder = p.discountMode === "אחוז" ? "למשל 10" : "למשל 150";
  return `<input type="number" placeholder="${placeholder}" value="${escapeHtml(p.discountValue ?? "")}" data-key="discountValue">`;
}

// ------------------------------
// Reset
// ------------------------------
document.getElementById("resetAll").addEventListener("click", () => {
  state.insureds = [];
  state.existingPolicies = [];
  state.newPolicies = [];
  selectedInsuredId = null;
  currentStep = 0;
  renderSteps();
});

// ------------------------------
// Boot
// ------------------------------
renderSteps();
