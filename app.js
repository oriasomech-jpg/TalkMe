const { PDFDocument, StandardFonts, rgb } = PDFLib;

const els = {
  templatePdfFile: document.getElementById('templatePdfFile'),
  templateInfo: document.getElementById('templateInfo'),
  resetTemplateBtn: document.getElementById('resetTemplateBtn'),
  jsonFile: document.getElementById('jsonFile'),
  jsonInput: document.getElementById('jsonInput'),
  generateBtn: document.getElementById('generateBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  downloadSampleBtn: document.getElementById('downloadSampleBtn'),
  status: document.getElementById('status'),
  jsonShape: document.getElementById('jsonShape'),
};

let uploadedTemplateBytes = null;
let uploadedTemplateName = '';

const FIELD_HELP = {
  requestedStartDate: '01/04/2026',
  agent: {
    name: 'איתמר כהן',
    number: '12345',
    supervisorName: '',
    teamNumber: '',
    salesManager: '',
    proposalNumber: ''
  },
  primaryInsured: {
    fullName: 'אתי שי',
    idNumber: '201399003',
    gender: 'נקבה',
    maritalStatus: 'נשואה',
    birthDate: '17/03/1989',
    healthFund: 'כללית',
    hasSupplementaryInsurance: 'כן',
    occupation: 'עצמאית',
    mobile: '0535570577',
    email: '1703esti@gmail.com',
    deliveryPreference: 'email',
    address: { street: 'רחוב הרצל', houseNumber: '80', city: 'רחובות', zipCode: '' },
    heightCm: '166',
    weightKg: '72'
  },
  secondaryInsured: {
    fullName: 'דוד שי',
    idNumber: '036524593',
    gender: 'זכר',
    maritalStatus: 'נשוי',
    birthDate: '06/01/1985',
    healthFund: 'לאומית',
    hasSupplementaryInsurance: 'כן',
    occupation: 'נהג',
    mobile: '0535570577',
    email: '1703esti@gmail.com',
    deliveryPreference: 'email',
    address: { street: 'רחוב הרצל', houseNumber: '80', city: 'רחובות', zipCode: '' },
    heightCm: '178',
    weightKg: '80'
  },
  healthDeclarations: {
    primary: { q1: 'לא', q2: 'לא', q3: 'לא', q4: 'לא', q9: 'לא', q10: 'לא' },
    secondary: { q1: 'לא', q2: 'לא', q3: 'לא', q4: 'לא', q9: 'לא', q10: 'לא' }
  },
  beneficiaries: [
    { fullName: '', idNumber: '', relationship: '', sharePercent: '' }
  ],
  signatures: {
    page1Candidate1Date: '',
    page1Candidate2Date: '',
    page3AgentSignature: '',
    page3CustomerSignature: ''
  },
  notes: {
    medicalPositiveFindings: ''
  }
};

els.jsonShape.textContent = JSON.stringify(FIELD_HELP, null, 2);
els.jsonInput.value = JSON.stringify(FIELD_HELP, null, 2);
updateTemplateInfo();

els.loadSampleBtn.addEventListener('click', async () => {
  const sample = await fetch('./examples/operational-report.sample.json').then(r => r.json());
  els.jsonInput.value = JSON.stringify(sample, null, 2);
  setStatus('דוגמת נתונים נטענה. עכשיו אפשר להפיק ולהוריד PDF.', 'success');
});

els.downloadSampleBtn.addEventListener('click', async () => {
  const blob = new Blob([JSON.stringify(FIELD_HELP, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'operational-report.sample.json');
});

els.templatePdfFile.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  if (!isPdfFile(file)) {
    event.target.value = '';
    uploadedTemplateBytes = null;
    uploadedTemplateName = '';
    updateTemplateInfo();
    setStatus('בקובץ הטופס המקורי צריך לבחור PDF בלבד.', 'error');
    return;
  }
  uploadedTemplateBytes = await file.arrayBuffer();
  uploadedTemplateName = file.name;
  updateTemplateInfo();
  setStatus(`נטען טופס מקורי: ${file.name}`, 'success');
});

els.resetTemplateBtn.addEventListener('click', () => {
  uploadedTemplateBytes = null;
  uploadedTemplateName = '';
  els.templatePdfFile.value = '';
  updateTemplateInfo();
  setStatus('חזרנו להשתמש בטופס המובנה מהריפו.', 'success');
});

els.jsonFile.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  if (!isJsonFile(file)) {
    event.target.value = '';
    setStatus('בשדה JSON צריך לבחור קובץ ‎.json בלבד. אם יש לך PDF של הדוח — עדיין צריך קודם להמיר אותו ל-JSON.', 'error');
    return;
  }

  const text = await file.text();
  try {
    safeJsonParse(text);
  } catch (error) {
    setStatus(error.message, 'error');
    return;
  }

  els.jsonInput.value = text;
  setStatus(`נטען קובץ JSON: ${file.name}`, 'success');
});

els.generateBtn.addEventListener('click', generatePdf);

function setStatus(message, kind = '') {
  els.status.textContent = message;
  els.status.className = `status ${kind}`.trim();
}

function updateTemplateInfo() {
  els.templateInfo.textContent = uploadedTemplateName
    ? `כרגע: משתמש ב־PDF שהעלית — ${uploadedTemplateName}`
    : 'כרגע: משתמש בטופס המובנה מהריפו — templates/GetPDF.pdf';
}

function safeJsonParse(text) {
  try { return JSON.parse(text); }
  catch (error) { throw new Error('ה־JSON לא תקין. בדוק פסיקים, סוגריים ומרכאות.'); }
}

function isJsonFile(file) {
  const name = String(file?.name || '').toLowerCase();
  return name.endsWith('.json') || file?.type === 'application/json';
}

function isPdfFile(file) {
  const name = String(file?.name || '').toLowerCase();
  return name.endsWith('.pdf') || file?.type === 'application/pdf';
}

async function getTemplateBytes() {
  if (uploadedTemplateBytes) return uploadedTemplateBytes;
  return fetch('./templates/GetPDF.pdf').then((res) => res.arrayBuffer());
}

async function generatePdf() {
  try {
    setStatus('מכין את ה־PDF הממולא להורדה...', '');
    const jsonText = els.jsonInput.value.trim();
    if (!jsonText) throw new Error('אין JSON לנתוני הדוח התפעולי. טען JSON או לחץ על "טען דוגמת נתונים".');
    const data = safeJsonParse(jsonText);

    const existingPdfBytes = await getTemplateBytes();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    if (pages[0]) await fillPage1(pdfDoc, pages[0], data, helvetica, helveticaBold);
    await fillHealthPages(pdfDoc, pages, data, helvetica, helveticaBold);
    addEditableFields(pdfDoc, form, pages, helvetica);

    form.updateFieldAppearances(helvetica);

    const output = await pdfDoc.save();
    const fileName = buildOutputName(data);
    downloadBlob(new Blob([output], { type: 'application/pdf' }), fileName);
    setStatus(`ה־PDF נוצר והורד בהצלחה: ${fileName}`, 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'אירעה שגיאה בהפקת הקובץ.', 'error');
  }
}

function buildOutputName(data) {
  const base = data?.primaryInsured?.fullName?.replace(/\s+/g, '_') || 'proposal';
  return `fenix_proposal_${base}.pdf`;
}

async function fillPage1(pdfDoc, page, data, font, boldFont) {
  const primary = data.primaryInsured || {};
  const secondary = data.secondaryInsured || {};
  const agent = data.agent || {};

  await drawTextSmart(pdfDoc, page, splitName(primary.fullName).firstName, 250, 710, font, 9);
  await drawTextSmart(pdfDoc, page, splitName(primary.fullName).lastName, 182, 710, font, 9);
  await drawTextSmart(pdfDoc, page, primary.idNumber, 132, 710, font, 9);
  drawGenderMark(page, primary.gender, 96, 710, 79, 710);
  drawMaritalMark(page, primary.maritalStatus, { single:[345,688], married:[326,688], divorced:[307,688], widowed:[288,688], commonLaw:[270,688] });
  await drawTextSmart(pdfDoc, page, primary.birthDate, 220, 688, font, 9);
  await drawTextSmart(pdfDoc, page, primary.healthFund, 164, 688, font, 9);
  drawSupplementaryMark(page, primary.hasSupplementaryInsurance, 118, 688, 96, 688);
  await drawTextSmart(pdfDoc, page, primary.occupation, 267, 666, font, 9);
  await drawTextSmart(pdfDoc, page, primary.mobile, 183, 666, font, 9);
  await drawTextSmart(pdfDoc, page, primary.email, 84, 666, font, 8);
  drawDeliveryMark(page, primary.deliveryPreference, { email:[285,646], home:[267,646] });
  await drawTextSmart(pdfDoc, page, primary.address?.street, 236, 626, font, 8);
  await drawTextSmart(pdfDoc, page, primary.address?.houseNumber, 185, 626, font, 8);
  await drawTextSmart(pdfDoc, page, primary.address?.city, 121, 626, font, 8);
  await drawTextSmart(pdfDoc, page, primary.address?.zipCode, 69, 626, font, 8);

  await drawTextSmart(pdfDoc, page, splitName(secondary.fullName).firstName, 250, 604, font, 9);
  await drawTextSmart(pdfDoc, page, splitName(secondary.fullName).lastName, 182, 604, font, 9);
  await drawTextSmart(pdfDoc, page, secondary.idNumber, 132, 604, font, 9);
  drawGenderMark(page, secondary.gender, 96, 604, 79, 604);
  drawMaritalMark(page, secondary.maritalStatus, { single:[345,582], married:[326,582], divorced:[307,582], widowed:[288,582], commonLaw:[270,582] });
  await drawTextSmart(pdfDoc, page, secondary.birthDate, 220, 582, font, 9);
  await drawTextSmart(pdfDoc, page, secondary.healthFund, 164, 582, font, 9);
  drawSupplementaryMark(page, secondary.hasSupplementaryInsurance, 118, 582, 96, 582);
  await drawTextSmart(pdfDoc, page, secondary.occupation, 267, 560, font, 9);
  await drawTextSmart(pdfDoc, page, secondary.mobile, 183, 560, font, 9);
  await drawTextSmart(pdfDoc, page, secondary.email, 84, 560, font, 8);
  drawDeliveryMark(page, secondary.deliveryPreference, { email:[285,540], home:[267,540] });
  await drawTextSmart(pdfDoc, page, secondary.address?.street, 236, 520, font, 8);
  await drawTextSmart(pdfDoc, page, secondary.address?.houseNumber, 185, 520, font, 8);
  await drawTextSmart(pdfDoc, page, secondary.address?.city, 121, 520, font, 8);
  await drawTextSmart(pdfDoc, page, secondary.address?.zipCode, 69, 520, font, 8);

  await drawTextSmart(pdfDoc, page, agent.name, 499, 710, font, 9);
  await drawTextSmart(pdfDoc, page, agent.number, 499, 690, font, 9);
  await drawTextSmart(pdfDoc, page, agent.supervisorName, 499, 670, font, 9);
  await drawTextSmart(pdfDoc, page, agent.teamNumber, 499, 650, font, 9);
  await drawTextSmart(pdfDoc, page, agent.salesManager, 499, 630, font, 9);
  await drawTextSmart(pdfDoc, page, agent.proposalNumber, 499, 610, font, 9);
  await drawTextSmart(pdfDoc, page, data.requestedStartDate, 335, 371, boldFont, 9);
}

async function fillHealthPages(pdfDoc, pages, data, font) {
  const declPrimary = data.healthDeclarations?.primary || {};
  const declSecondary = data.healthDeclarations?.secondary || {};
  const primary = data.primaryInsured || {};
  const secondary = data.secondaryInsured || {};

  if (pages[6]) {
    await drawTextSmart(pdfDoc, pages[6], primary.fullName, 317, 701, font, 9);
    await drawTextSmart(pdfDoc, pages[6], primary.heightCm, 147, 701, font, 9);
    await drawTextSmart(pdfDoc, pages[6], primary.weightKg, 96, 701, font, 9);
    markHealthAnswer(pages[6], 1, declPrimary.q1);
    markHealthAnswer(pages[6], 2, declPrimary.q2);
    markHealthAnswer(pages[6], 3, declPrimary.q3);
    markHealthAnswer(pages[6], 4, declPrimary.q4);
  }

  if (pages[7]) {
    markHealthAnswer(pages[7], 9, declPrimary.q9);
    markHealthAnswer(pages[7], 10, declPrimary.q10);
  }

  if (pages[8]) {
    await drawTextSmart(pdfDoc, pages[8], secondary.fullName, 317, 701, font, 9);
    await drawTextSmart(pdfDoc, pages[8], secondary.heightCm, 147, 701, font, 9);
    await drawTextSmart(pdfDoc, pages[8], secondary.weightKg, 96, 701, font, 9);
    markHealthAnswer(pages[8], 1, declSecondary.q1);
    markHealthAnswer(pages[8], 2, declSecondary.q2);
    markHealthAnswer(pages[8], 3, declSecondary.q3);
    markHealthAnswer(pages[8], 4, declSecondary.q4);
  }

  if (pages[9]) {
    markHealthAnswer(pages[9], 9, declSecondary.q9);
    markHealthAnswer(pages[9], 10, declSecondary.q10);
  }
}

function addEditableFields(pdfDoc, form, pages, font) {
  if (pages[2]) {
    const page = pages[2];
    addTextField(form, page, 'beneficiary_1_name', 354, 520, 170, 18, font, 'Beneficiary name');
    addTextField(form, page, 'beneficiary_1_id', 254, 520, 85, 18, font, 'ID');
    addTextField(form, page, 'beneficiary_1_relationship', 162, 520, 75, 18, font, 'Relationship');
    addTextField(form, page, 'beneficiary_1_share', 72, 520, 70, 18, font, 'Share %');
  }

  if (pages[7]) {
    addTextField(form, pages[7], 'medical_details_primary', 60, 120, 475, 96, font, 'Medical details - primary');
  }
  if (pages[9]) {
    addTextField(form, pages[9], 'medical_details_secondary', 60, 120, 475, 96, font, 'Medical details - secondary');
  }

  if (pages[0]) {
    addTextField(form, pages[0], 'page1_candidate1_signature', 344, 69, 95, 16, font, 'Candidate 1 signature');
    addTextField(form, pages[0], 'page1_candidate2_signature', 204, 69, 95, 16, font, 'Candidate 2 signature');
  }
  if (pages[2]) {
    addTextField(form, pages[2], 'page3_agent_signature', 75, 98, 105, 18, font, 'Agent signature');
    addTextField(form, pages[2], 'page3_customer_signature', 224, 98, 115, 18, font, 'Customer signature');
  }
}

function addTextField(form, page, name, x, y, width, height, font, placeholder = '') {
  const tf = form.createTextField(name);
  tf.setText('');
  tf.enableMultiline();
  tf.setFontSize(10);
  tf.addToPage(page, { x, y, width, height, borderWidth: 0.8, borderColor: rgb(0.82, 0.86, 0.92), textColor: rgb(0.12, 0.19, 0.31), backgroundColor: rgb(1, 1, 1) });
  if (placeholder) {
    page.drawText(placeholder, { x: x + 4, y: y + height - 10, size: 7, font, color: rgb(0.55, 0.63, 0.74) });
  }
}

function markHealthAnswer(page, questionNumber, answer) {
  const map = {
    1: { yes:[548,611], no:[522,611] },
    2: { yes:[548,562], no:[522,562] },
    3: { yes:[548,514], no:[522,514] },
    4: { yes:[548,467], no:[522,467] },
    9: { yes:[548,611], no:[522,611] },
    10:{ yes:[548,562], no:[522,562] }
  };
  const normalized = normalizeYesNo(answer);
  const coords = map[questionNumber]?.[normalized];
  if (!coords) return;
  drawX(page, coords[0], coords[1]);
}

function drawText(page, text, x, y, font, size = 10) {
  if (!text && text !== 0) return;
  page.drawText(String(text), { x, y, size, font, color: rgb(0.08, 0.15, 0.27) });
}

async function drawTextSmart(pdfDoc, page, text, x, y, font, size = 10) {
  if (!text && text !== 0) return;
  const value = String(text);
  if (!/[֐-׿]/.test(value)) {
    drawText(page, value, x, y, font, size);
    return;
  }

  const dataUrl = renderTextImage(value, size);
  const pngImage = await pdfDoc.embedPng(dataUrl);
  const scale = pngImage.scale(1);
  page.drawImage(pngImage, { x, y: y - (scale.height * 0.25), width: scale.width * 0.5, height: scale.height * 0.5 });
}

function renderTextImage(text, size = 10) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = Math.max(18, size * 3);
  ctx.font = `${fontSize}px Arial, 'Noto Sans Hebrew', sans-serif`;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width + 24);
  canvas.height = Math.ceil(fontSize + 18);

  const ctx2 = canvas.getContext('2d');
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  ctx2.font = `${fontSize}px Arial, 'Noto Sans Hebrew', sans-serif`;
  ctx2.fillStyle = '#142744';
  ctx2.textAlign = 'right';
  ctx2.textBaseline = 'top';
  ctx2.direction = 'rtl';
  ctx2.fillText(text, canvas.width - 8, 4);

  return canvas.toDataURL('image/png');
}

function drawX(page, x, y) {
  page.drawLine({ start: { x: x - 4, y: y - 4 }, end: { x: x + 4, y: y + 4 }, thickness: 1.1, color: rgb(0.1, 0.2, 0.38) });
  page.drawLine({ start: { x: x + 4, y: y - 4 }, end: { x: x - 4, y: y + 4 }, thickness: 1.1, color: rgb(0.1, 0.2, 0.38) });
}

function drawGenderMark(page, gender, femaleX, femaleY, maleX, maleY) {
  const value = String(gender || '').trim();
  if (value === 'נקבה') drawX(page, femaleX, femaleY);
  if (value === 'זכר') drawX(page, maleX, maleY);
}

function drawSupplementaryMark(page, value, yesX, yesY, noX, noY) {
  const normalized = normalizeYesNo(value);
  if (normalized === 'yes') drawX(page, yesX, yesY);
  if (normalized === 'no') drawX(page, noX, noY);
}

function drawDeliveryMark(page, value, coords) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('email') || normalized.includes('mail')) drawX(page, coords.email[0], coords.email[1]);
  if (normalized.includes('home') || normalized.includes('בית')) drawX(page, coords.home[0], coords.home[1]);
}

function drawMaritalMark(page, value, map) {
  const normalized = String(value || '').trim();
  if (/רווק|רווקה/.test(normalized)) drawX(page, ...map.single);
  else if (/נשוי|נשואה/.test(normalized)) drawX(page, ...map.married);
  else if (/גרוש|גרושה/.test(normalized)) drawX(page, ...map.divorced);
  else if (/אלמן|אלמנה/.test(normalized)) drawX(page, ...map.widowed);
  else if (/ידוע/.test(normalized)) drawX(page, ...map.commonLaw);
}

function normalizeYesNo(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['כן', 'yes', 'true', '1'].includes(v)) return 'yes';
  if (['לא', 'no', 'false', '0'].includes(v)) return 'no';
  return '';
}

function splitName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.slice(-1).join(' ') };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
