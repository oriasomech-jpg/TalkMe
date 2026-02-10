const state = {
  insureds: [],
  existingPolicies: [],
  newPolicies: []
};

let currentStep = 0;

const steps = document.querySelectorAll(".step");
const navButtons = document.querySelectorAll(".nav");

function renderSteps() {
  steps.forEach(s => s.classList.remove("active"));
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.add("active");

  navButtons.forEach(b => b.classList.remove("active"));
  document.querySelector(`.nav[data-step="${currentStep}"]`).classList.add("active");

  if (currentStep === 3) {
    document.getElementById("summary").textContent =
      JSON.stringify(state, null, 2);
  }
}

document.getElementById("next").onclick = () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    renderSteps();
  }
};
document.getElementById("prev").onclick = () => {
  if (currentStep > 0) {
    currentStep--;
    renderSteps();
  }
};

navButtons.forEach(btn => {
  btn.onclick = () => {
    currentStep = Number(btn.dataset.step);
    renderSteps();
  };
});

/* מבוטחים */
function addInsured(type) {
  const insured = {
    id: Date.now(),
    type,
    firstName: "",
    lastName: "",
    idNumber: ""
  };
  state.insureds.push(insured);
  renderInsureds();
}

function renderInsureds() {
  const box = document.getElementById("insuredList");
  box.innerHTML = "";
  state.insureds.forEach(i => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${i.type}</strong>
      <input placeholder="שם פרטי" onchange="this._i.firstName=this.value">
      <input placeholder="שם משפחה" onchange="this._i.lastName=this.value">
      <input placeholder="תעודת זהות" onchange="this._i.idNumber=this.value">
    `;
    div.querySelectorAll("input").forEach(inp => inp._i = i);
    box.appendChild(div);
  });
}

document.getElementById("addMain").onclick = () => addInsured("מבוטח ראשי");
document.getElementById("addSecondary").onclick = () => addInsured("מבוטח משני");
document.getElementById("addChild").onclick = () => addInsured("ילד");

/* פוליסות קיימות */
document.getElementById("addExistingPolicy").onclick = () => {
  state.existingPolicies.push({
    company: "",
    policyName: "",
    policyNumber: "",
    status: "ללא שינוי"
  });
  renderExistingPolicies();
};

function renderExistingPolicies() {
  const box = document.getElementById("existingPolicies");
  box.innerHTML = "";
  state.existingPolicies.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <input placeholder="חברה">
      <input placeholder="שם פוליסה">
      <input placeholder="מספר פוליסה">
      <select>
        <option>ללא שינוי</option>
        <option>ביטול מלא</option>
        <option>ביטול חלקי</option>
        <option>מינוי סוכן</option>
      </select>
    `;
    box.appendChild(div);
  });
}

/* פוליסות חדשות */
document.getElementById("addNewPolicy").onclick = () => {
  state.newPolicies.push({
    company: "",
    type: "",
    premium: 0,
    discount: 0
  });
  renderNewPolicies();
};

function renderNewPolicies() {
  const box = document.getElementById("newPolicies");
  box.innerHTML = "";
  state.newPolicies.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <input placeholder="חברה">
      <input placeholder="סוג ביטוח">
      <input type="number" placeholder="פרמיה">
      <input type="number" placeholder="הנחה">
    `;
    box.appendChild(div);
  });
}

renderSteps();
