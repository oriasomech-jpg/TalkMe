(() => {
  "use strict";

  const BUILD = "20260322-investo-v1";
  const qs = new URLSearchParams(window.location.search);
  const agentName = safe(qs.get("agentName")) || "נציג";
  const agentRole = safe(qs.get("agentRole")) || "agent";
  const els = {
    messages: document.getElementById("messages"),
    input: document.getElementById("chatInput"),
    send: document.getElementById("btnSend"),
    reset: document.getElementById("btnReset"),
    typing: document.getElementById("typingRow")
  };

  const state = {
    messages: []
  };

  function safe(v){ return String(v ?? "").trim(); }

  function nowClock(){
    try {
      return new Intl.DateTimeFormat("he-IL", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date());
    } catch(_e){
      return new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    }
  }

  function escapeHtml(str){
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[m]));
  }

  function nl2br(str){
    return escapeHtml(str).replace(/\n/g, "<br>");
  }

  function autoResize(){
    els.input.style.height = "56px";
    els.input.style.height = Math.min(180, els.input.scrollHeight) + "px";
  }

  function addMessage(role, html, meta){
    const wrap = document.createElement("div");
    wrap.className = "msg msg--" + role;
    wrap.innerHTML = `
      <div class="msg__meta">${escapeHtml(meta || (role === "user" ? agentName : "INVESTO"))} · ${escapeHtml(nowClock())}</div>
      <div class="bubble">${html}</div>
    `;
    els.messages.appendChild(wrap);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function setTyping(on){
    els.typing.hidden = !on;
    if(on){
      els.messages.scrollTop = els.messages.scrollHeight;
    }
  }

  function parseAge(text){
    const match = String(text).match(/(?:גיל|בן|בת)\s*[:\-]?\s*(\d{1,2})/);
    if(match) return Number(match[1]);
    const raw = String(text).match(/\b(\d{1,2})\b/);
    if(raw) return Number(raw[1]);
    return null;
  }

  function detectDomain(text){
    const t = text.toLowerCase();
    if(/[א-ת]/.test(t)){
      if(
        t.includes("הנחה") || t.includes("הנחות") ||
        t.includes("חברה") || t.includes("מוצר") || t.includes("גיל")
      ) return "discount";
      if(
        t.includes("תרופה") || t.includes("תרופות") ||
        t.includes("תופעות לוואי") || t.includes("מינון") ||
        t.includes("כאב") || t.includes("לחץ דם") ||
        t.includes("סוכרת") || t.includes("כולסטרול") ||
        t.includes("רפוא")
      ) return "medical";
    }
    return "general";
  }

  function findDiscountAnswer(text){
    const rules = Array.isArray(window.INVESTO_DISCOUNT_RULES) ? window.INVESTO_DISCOUNT_RULES : [];
    const normalized = safe(text).toLowerCase();
    const age = parseAge(text);

    const company = rules.find((r) => normalized.includes(String(r.company).toLowerCase()))?.company || "";
    const product = rules.find((r) => normalized.includes(String(r.product).toLowerCase()))?.product || "";

    const matches = rules.filter((r) => {
      const companyOk = company ? String(r.company) === company : true;
      const productOk = product ? String(r.product) === product : true;
      const ageOk = Number.isFinite(age) ? age >= Number(r.ageFrom) && age <= Number(r.ageTo) : true;
      return companyOk && productOk && ageOk;
    });

    if(!matches.length){
      return {
        title: "לא נמצאה התאמה מלאה בהנחות",
        tone: "warn",
        sections: [
          {
            label: "מה חסר כדי לענות מדויק",
            text: "כדי לענות מדויק כדאי לציין חברה, מוצר וגיל לקוח."
          },
          {
            label: "דוגמה לשאלה טובה",
            text: "איזו הנחה אפשר לתת בהראל למוצר בריאות פרימיום בגיל 42?"
          },
          {
            label: "הערה",
            text: "כרגע מחוברות רק דוגמאות חוקים. בשלב הבא נחבר את טבלת ההנחות המלאה שלך."
          }
        ]
      };
    }

    const top = matches[0];
    return {
      title: "נמצאה התאמת הנחה",
      tone: "ok",
      sections: [
        { label: "חברה", text: top.company },
        { label: "מוצר", text: top.product },
        { label: "טווח גיל", text: `${top.ageFrom}–${top.ageTo}` },
        { label: "הנחה אפשרית", text: `${top.discountPercent}%` },
        { label: "משך הנחה", text: `${top.discountYears} שנים` },
        { label: "סוג הנחה", text: top.discountType },
        { label: "תנאים", text: top.conditions },
        { label: "הערה", text: top.notes }
      ]
    };
  }

  function findMedicalAnswer(text){
    const t = safe(text).toLowerCase();

    if(t.includes("אקמול") || t.includes("paracetamol") || t.includes("פרצטמול")){
      return {
        title: "פרצטמול / אקמול — מידע כללי",
        tone: "warn",
        sections: [
          { label: "למה מיועד", text: "משמש בדרך כלל להקלה על כאב ולהורדת חום." },
          { label: "דברים שחשוב לדעת", text: "לא לעבור על המינון הרשום בעלון התרופה או בהנחיית רופא/רוקח. זה חשוב במיוחד אם נוטלים כמה תרופות במקביל." },
          { label: "מתי צריך זהירות", text: "אם יש מחלת כבד, צריכת אלכוהול קבועה, הריון, או שימוש בתרופות נוספות — חשוב להתייעץ עם רופא או רוקח." },
          { label: "הבהרה", text: "זהו מידע כללי בלבד ואינו תחליף לייעוץ רפואי אישי." }
        ]
      };
    }

    if(t.includes("לחץ דם")){
      return {
        title: "לחץ דם — מידע כללי",
        tone: "warn",
        sections: [
          { label: "מה זה", text: "לחץ דם הוא הכוח שמפעיל הדם על דפנות כלי הדם בזמן זרימתו בגוף." },
          { label: "למה חשוב לעקוב", text: "ערכים לא מאוזנים לאורך זמן עלולים להיות קשורים לסיכון לבבי וכלי דם." },
          { label: "מתי לפנות לבדיקה", text: "אם יש ערכים גבוהים חוזרים, כאב ראש חריג, סחרחורת, כאב בחזה או קוצר נשימה — צריך פנייה רפואית מסודרת." },
          { label: "הבהרה", text: "המידע כאן כללי ואינו אבחון או טיפול." }
        ]
      };
    }

    return {
      title: "תשובה רפואית כללית",
      tone: "warn",
      sections: [
        { label: "מה אפשר לקבל כאן", text: "אני יכול לספק מידע כללי על מצב רפואי, תרופה, שימושים נפוצים, תופעות לוואי נפוצות ואזהרות בסיסיות." },
        { label: "מה צריך ממך", text: "כתוב שם תרופה או נושא רפואי מדויק יותר, למשל: מה זו תרופת אקמול, או מה חשוב לדעת על לחץ דם גבוה." },
        { label: "הבהרה חשובה", text: "INVESTO לא מחליף רופא או רוקח ולא נותן אבחנה רפואית אישית." }
      ]
    };
  }

  function findGeneralAnswer(){
    return {
      title: "איך אפשר לעזור",
      tone: "ok",
      sections: [
        { label: "שאלות על הנחות", text: "אפשר לשאול על הנחות לפי חברה, מוצר וגיל." },
        { label: "שאלות רפואיות כלליות", text: "אפשר לשאול על תרופות, שימושים נפוצים, תופעות לוואי נפוצות ומידע כללי." },
        { label: "דוגמאות", text: "איזו הנחה אפשר לתת בהראל בריאות פרימיום גיל 42?\nמה זו תרופת אקמול?\nמה חשוב לדעת על לחץ דם גבוה?" }
      ]
    };
  }

  function cardToHtml(card){
    const toneClass = card.tone ? `answerCard__tone answerCard__tone--${card.tone}` : "answerCard__tone";
    const sectionsHtml = (card.sections || []).map((section) => `
      <div class="answerCard__section">
        <div class="answerCard__label">${escapeHtml(section.label || "")}</div>
        <div>${nl2br(section.text || "")}</div>
      </div>
    `).join("");

    return `
      <div class="answerCard">
        <div class="answerCard__title">${escapeHtml(card.title || "תשובה")}</div>
        <div class="${toneClass}">${escapeHtml(getToneLabel(card.tone))}</div>
        ${sectionsHtml}
      </div>
    `;
  }

  function getToneLabel(tone){
    if(tone === "ok") return "תשובה זמינה";
    if(tone === "warn") return "מידע כללי בלבד";
    if(tone === "danger") return "דורש זהירות";
    return "תשובה";
  }

  async function answerUser(text){
    const domain = detectDomain(text);
    if(domain === "discount") return findDiscountAnswer(text);
    if(domain === "medical") return findMedicalAnswer(text);
    return findGeneralAnswer(text);
  }

  async function sendCurrent(){
    const text = safe(els.input.value);
    if(!text) return;

    addMessage("user", nl2br(text), agentName);
    els.input.value = "";
    autoResize();
    setTyping(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const card = await answerUser(text);
      addMessage("bot", cardToHtml(card), "INVESTO");
    } catch(err){
      addMessage(
        "bot",
        cardToHtml({
          title: "אירעה שגיאה",
          tone: "danger",
          sections: [
            { label: "פרטים", text: "לא הצלחתי להשלים את הבקשה כרגע. נסה שוב בעוד רגע." }
          ]
        }),
        "INVESTO"
      );
      console.error("INVESTO_ERROR", err);
    } finally {
      setTyping(false);
      els.input.focus();
    }
  }

  function resetConversation(){
    els.messages.innerHTML = "";
    addMessage(
      "bot",
      cardToHtml({
        title: `שלום ${agentName}, אני INVESTO העוזר החכם`,
        tone: "ok",
        sections: [
          { label: "איך אפשר לעזור", text: "אני יכול לענות על מידע רפואי כללי, שאלות על תרופות, וגם על הנחות לפי חברה, מוצר וגיל." },
          { label: "דוגמאות מהירות", text: "מה זו תרופת אקמול?\nאיזו הנחה אפשר לתת בהראל בריאות פרימיום גיל 42?" },
          { label: "הבהרה", text: "מידע רפואי כאן הוא כללי בלבד. לפני שימוש אמיתי מומלץ לחבר מקור נתונים רפואי מאומת וטבלת הנחות מלאה." }
        ]
      }),
      "INVESTO"
    );
  }

  els.send.addEventListener("click", sendCurrent);
  els.reset.addEventListener("click", resetConversation);

  els.input.addEventListener("input", autoResize);
  els.input.addEventListener("keydown", (ev) => {
    if(ev.key === "Enter" && !ev.shiftKey){
      ev.preventDefault();
      sendCurrent();
    }
  });

  resetConversation();
  autoResize();

  console.log("INVESTO_BUILD", BUILD, { agentName, agentRole });
})();
