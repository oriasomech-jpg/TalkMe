GEMEL INVEST CRM (UI v2) — Cream + Gold (Weak)

מה יש כאן:
- index.html / app.css / app.js : מערכת דמו עם מסכים + אשף הצעה + שאלון רפואי דינמי + סיכום + הדפס/Save as PDF.
- apps_script.gs : תבנית שרת Google Sheets (Apps Script Web App).

להפעלה מקומית:
1) פתח index.html בדפדפן (או העלה ל-GitHub Pages).

חיבור ל-Google Sheets:
1) צור Google Sheet חדש.
2) Apps Script -> הדבק apps_script.gs
3) עדכן SPREADSHEET_ID
4) Deploy -> Web app -> Anyone
5) קח את ה- /exec URL והדבק ב-app.js בתוך GOOGLE_SCRIPT_URL (למעלה בקובץ).
6) רענן דף — המערכת תנסה להתחבר ולמשוך נתונים.

PDF:
במסך סיכום יש כפתור "הדפס / הורד PDF" — בדפדפן בחר Save as PDF.
