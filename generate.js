<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fenix Form Engine</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f5f7fb; margin:0; padding:32px; color:#16324f; }
    .card { max-width:980px; margin:0 auto; background:#fff; border-radius:20px; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,.08); }
    textarea { width:100%; min-height:360px; border:1px solid #d8e1ec; border-radius:14px; padding:14px; font-family:monospace; font-size:14px; }
    button { background:#16324f; color:#fff; border:none; border-radius:12px; padding:14px 18px; cursor:pointer; font-size:16px; }
    .row { display:flex; gap:14px; align-items:center; margin-top:14px; }
    .hint { color:#52657a; line-height:1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Fenix Proposal Engine</h1>
    <p class="hint">הדבק כאן JSON של הדוח התפעולי במבנה API, ולחץ על יצירה. המנוע ימלא את מה שקיים וישאיר שדות חסרים כ-Editable.</p>
    <textarea id="json"></textarea>
    <div class="row">
      <button id="generate">צור PDF</button>
      <span id="status"></span>
    </div>
  </div>

  <script>
    const sample = {
      requestedStartDate: '01/04/2026',
      agent: { name: 'איתי סומך', number: '12345' },
      primaryInsured: {
        fullName: 'אסתי שי',
        idNumber: '201399003',
        gender: 'נקבה',
        maritalStatus: 'נשוי',
        birthDate: '17/03/1989',
        healthFund: 'קופת חולים כללית',
        hasSupplementaryInsurance: 'כן',
        occupation: 'נקבה',
        mobile: '0535570577',
        email: '1703esti@gmail.com',
        deliveryPreference: 'email',
        address: { street: 'רחוב', houseNumber: '80', city: 'רחובות' },
        heightCm: '166',
        weightKg: '72'
      },
      secondaryInsured: {
        fullName: 'דוד שי',
        idNumber: '036524593',
        gender: 'זכר',
        maritalStatus: 'נשוי',
        birthDate: '06/01/1985',
        healthFund: 'קופת חולים לאומית',
        hasSupplementaryInsurance: 'כן',
        occupation: 'זכר',
        mobile: '0535570577',
        email: '1703esti@gmail.com',
        deliveryPreference: 'email',
        address: { street: 'רחוב', houseNumber: '80', city: 'רחובות' },
        heightCm: '178',
        weightKg: '80'
      },
      healthDeclarations: {
        primary: { q1: 'לא', q2: 'לא', q3: 'לא', q4: 'לא' },
        secondary: { q1: 'לא', q2: 'לא', q3: 'לא', q4: 'לא' }
      }
    };

    document.getElementById('json').value = JSON.stringify(sample, null, 2);

    document.getElementById('generate').addEventListener('click', async () => {
      const status = document.getElementById('status');
      status.textContent = 'מייצר קובץ...';
      try {
        const payload = { reportData: JSON.parse(document.getElementById('json').value) };
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Generation failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fenix-proposal-filled.pdf';
        a.click();
        URL.revokeObjectURL(url);
        status.textContent = 'מוכן';
      } catch (error) {
        console.error(error);
        status.textContent = 'שגיאה ביצירת PDF';
      }
    });
  </script>
</body>
</html>
