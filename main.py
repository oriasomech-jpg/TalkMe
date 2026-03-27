const reportPdfInput = document.getElementById('reportPdf');
const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const parseBtn = document.getElementById('parseBtn');
const generateBtn = document.getElementById('generateBtn');

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#b42318' : '#5f7693';
}

function getFile() {
  const file = reportPdfInput.files?.[0];
  if (!file) {
    setStatus('יש לבחור קודם קובץ PDF של הדוח התפעולי.', true);
    throw new Error('No file selected');
  }
  return file;
}

parseBtn.addEventListener('click', async () => {
  try {
    const file = getFile();
    setStatus('מחלץ נתונים מהדוח התפעולי...');
    const formData = new FormData();
    formData.append('report_pdf', file);

    const response = await fetch('/api/parse', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    previewEl.textContent = JSON.stringify(data, null, 2);
    setStatus('החילוץ הצליח. אפשר כעת להפיק את טופס החברה.');
  } catch (error) {
    setStatus(`שגיאה בחילוץ: ${error.message}`, true);
  }
});

generateBtn.addEventListener('click', async () => {
  try {
    const file = getFile();
    setStatus('מייצר טופס חברה ממולא...');
    const formData = new FormData();
    formData.append('report_pdf', file);

    const response = await fetch('/api/generate', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fenix_filled_proposal.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    setStatus('הטופס ירד בהצלחה.');
  } catch (error) {
    setStatus(`שגיאה בהפקת הקובץ: ${error.message}`, true);
  }
});
