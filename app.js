(() => {
  "use strict";

  const BUILD = "20260322-investo-v2-chatgpt-natural";
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
    messages: [],
    lastIntent: "general"
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

  function scrollToBottom(smooth = true){
    els.messages.scrollTo({
      top: els.messages.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    });
  }

  function addMessage(role, html, meta, options = {}){
    const wrap = document.createElement("div");
    wrap.className = "msg msg--" + role + (options.animate ? " is-entering" : "");
    wrap.innerHTML = `
      <div class="msg__meta">${escapeHtml(meta || (role === "user" ? agentName : "INVESTO"))} · ${escapeHtml(nowClock())}</div>
      <div class="bubble">${html}</div>
    `;
    els.messages.appendChild(wrap);
    scrollToBottom(!options.instant);
    if(options.animate){
      requestAnimationFrame(() => wrap.classList.remove("is-entering"));
    }
    return wrap;
  }

  function setTyping(on, text = ""){
    els.typing.hidden = !on;
    if(!els.typing.hidden){
      const label = els.typing.querySelector(".typingLabel");
      if(label) label.textContent = text || "INVESTO חושב...";
      scrollToBottom(false);
    }
  }

  function parseAge(text){
    const match = String(text).match(/(?:גיל|בן|בת)\s*[:\-]?\s*(\d{1,2})/);
    if(match) return Number(match[1]);
    const raw = String(text).match(/\b(\d{1,2})\b/);
    if(raw) return Number(raw[1]);
    return null;
  }

  function detectIntent(text){
    const t = safe(text).toLowerCase();
    const hasHebrew = /[א-ת]/.test(t);
    if(!hasHebrew){
      return { domain:"general", subtype:"general", confidence:.3 };
    }

    const discountHits = [
      "הנחה", "הנחות", "חברה", "מוצר", "גיל", "פוליסה", "מסלול", "אחוז"
    ].filter(k => t.includes(k)).length;

    const medicalHits = [
      "תרופה", "תרופות", "תופעות לוואי", "מינון", "כאב", "לחץ דם",
      "סוכרת", "כולסטרול", "רפוא", "מחלה", "אבחנה", "אקמול", "פרצטמול"
    ].filter(k => t.includes(k)).length;

    if(discountHits >= medicalHits && discountHits >= 2){
      return { domain:"discount", subtype:"pricing", confidence:.92 };
    }
    if(medicalHits > discountHits && medicalHits >= 1){
      return { domain:"medical", subtype:"medical_info", confidence:.88 };
    }
    return { domain:"general", subtype:"general", confidence:.45 };
  }

  function getThinkingLabel(intent){
    if(intent.domain === "discount") return "INVESTO בודק הנחות ומסלולים...";
    if(intent.domain === "medical") return "INVESTO מנתח מידע רפואי כללי...";
    return "INVESTO חושב על תשובה מדויקת...";
  }

  function normalizeHebrew(text){
    return safe(text).toLowerCase().replace(/["'׳״.,/\\\-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function findRuleMentions(text, rules){
    const normalized = normalizeHebrew(text);
    const companies = [...new Set(rules.map(r => safe(r.company)).filter(Boolean))];
    const products = [...new Set(rules.map(r => safe(r.product)).filter(Boolean))];
    const company = companies.find(name => normalized.includes(normalizeHebrew(name))) || "";
    const product = products.find(name => normalized.includes(normalizeHebrew(name))) || "";
    return { company, product };
  }

  function scoreDiscountRule(rule, query){
    let score = 0;
    if(query.company && safe(rule.company) === query.company) score += 6;
    if(query.product && safe(rule.product) === query.product) score += 8;
    if(Number.isFinite(query.age) && query.age >= Number(rule.ageFrom) && query.age <= Number(rule.ageTo)) score += 10;
    if(!query.age) score += 1;
    score += Math.max(0, Number(rule.discountPercent) || 0) / 10;
    score += Math.max(0, Number(rule.discountYears) || 0) / 20;
    return score;
  }

  function renderBullets(items){
    const valid = (items || []).filter(Boolean);
    if(!valid.length) return "";
    return `<ul class="answerList">${valid.map((item) => `<li>${nl2br(item)}</li>`).join("")}</ul>`;
  }

  function findDiscountAnswer(text){
    const rules = Array.isArray(window.INVESTO_DISCOUNT_RULES) ? window.INVESTO_DISCOUNT_RULES : [];
    const age = parseAge(text);
    const mentions = findRuleMentions(text, rules);

    const matches = rules
      .filter((r) => {
        const companyOk = mentions.company ? safe(r.company) === mentions.company : true;
        const productOk = mentions.product ? safe(r.product) === mentions.product : true;
        const ageOk = Number.isFinite(age) ? age >= Number(r.ageFrom) && age <= Number(r.ageTo) : true;
        return companyOk && productOk && ageOk;
      })
      .map((rule) => ({ ...rule, __score: scoreDiscountRule(rule, { ...mentions, age }) }))
      .sort((a, b) => b.__score - a.__score);

    if(!matches.length){
      return {
        title: "עדיין חסר לי פרט כדי לענות מדויק על ההנחה",
        tone: "warn",
        intro: "אני יכול לבדוק את ההנחה בצורה הרבה יותר חכמה, אבל כרגע חסר לי לפחות אחד מהפרטים המרכזיים.",
        summary: "כדי להחזיר תשובה חזקה כמו נציג בכיר, כדאי לכתוב חברה, מוצר וגיל לקוח.",
        bullets: [
          "דוגמה טובה: איזו הנחה אפשר לתת בהראל למוצר בריאות פרימיום בגיל 42?",
          "אפשר גם לשאול: מה ההנחה בפניקס סיעוד פרטי גיל 50?",
          "כרגע המנוע מחובר לדוגמאות חוקים בלבד, ובהמשך נחבר את טבלת ההנחות המלאה שלך."
        ],
        sections: [
          { label: "מה אני צריך ממך", text: "חברה, מוצר וגיל לקוח." }
        ],
        cta: "שלח לי שאלה מלאה יותר ואני אוציא לך תשובה הרבה יותר חדה."
      };
    }

    const top = matches[0];
    const alternatives = matches.slice(1, 3);
    const ageText = Number.isFinite(age) ? `ללקוח בגיל ${age}` : `לטווח הגילאים ${top.ageFrom}–${top.ageTo}`;

    return {
      title: "מצאתי עבורך תשובת הנחה רלוונטית",
      tone: "ok",
      intro: `בדקתי את הנתונים, ונראה שב${safe(top.company)} עבור ${safe(top.product)} יש כרגע התאמה טובה ${ageText}.`,
      summary: `האפשרות הבולטת ביותר כרגע היא הנחה של ${top.discountPercent}% למשך ${top.discountYears} שנים.`,
      bullets: [
        `חברה: ${top.company}`,
        `מוצר: ${top.product}`,
        `הנחה אפשרית: ${top.discountPercent}%`,
        `משך הנחה: ${top.discountYears} שנים`,
        `סוג הנחה: ${top.discountType}`,
        `תנאים: ${top.conditions || "ללא תנאים מיוחדים שהוזנו"}`
      ],
      sections: [
        { label: "הערה מקצועית", text: top.notes || "לא הוזנה הערה נוספת." },
        ...(alternatives.length ? [{
          label: "אפשרויות נוספות שמצאתי",
          text: alternatives.map((item) => `${item.company} · ${item.product} · ${item.discountPercent}% ל-${item.discountYears} שנים`).join("\n")
        }] : [])
      ],
      cta: "אם תרצה, אני יכול גם לבדוק לך ניסוח תשובה קצר לנציג או להשוות בין כמה חברות."
    };
  }

  function findMedicalAnswer(text){
    const t = safe(text).toLowerCase();

    if(t.includes("אקמול") || t.includes("paracetamol") || t.includes("פרצטמול")){
      return {
        title: "הנה הסבר ברור על אקמול / פרצטמול",
        tone: "warn",
        intro: "אקמול הוא שם נפוץ לתרופה שמבוססת על פרצטמול, ובדרך כלל משתמשים בה להקלה על כאב ולהורדת חום.",
        summary: "זאת תרופה שכיחה מאוד, אבל עדיין חשוב להשתמש בה נכון ולא לעבור את המינון המומלץ.",
        bullets: [
          "משמשת בדרך כלל להקלה על כאב ולהורדת חום",
          "חשוב לא לעבור את המינון שמופיע בעלון או בהנחיית רופא/רוקח",
          "צריך זהירות אם נוטלים עוד תרופות במקביל",
          "במצבים של מחלת כבד, הריון או שילוב עם תרופות אחרות — עדיף להתייעץ"
        ],
        sections: [
          { label: "הבהרה חשובה", text: "זה מידע כללי בלבד, ולא תחליף להנחיה רפואית או רוקחית אישית." }
        ],
        cta: "אם תרצה, אני יכול להסביר גם על תופעות לוואי נפוצות או על ההבדל בין אקמול לתרופות אחרות."
      };
    }

    if(t.includes("לחץ דם")){
      return {
        title: "הנה הסבר פשוט על לחץ דם",
        tone: "warn",
        intro: "לחץ דם הוא הכוח שהדם מפעיל על דפנות כלי הדם בזמן שהוא זורם בגוף.",
        summary: "כשהערכים לא מאוזנים לאורך זמן, זה עלול להיות קשור לסיכון לבבי וכלי דם ולכן חשוב לעקוב.",
        bullets: [
          "מעקב חשוב במיוחד אם יש ערכים גבוהים חוזרים",
          "כאבי ראש חריגים, סחרחורת, כאב בחזה או קוצר נשימה דורשים בדיקה רפואית",
          "המידע כאן כללי בלבד ואינו מהווה אבחון"
        ],
        sections: [
          { label: "מתי צריך לפנות לרופא", text: "אם יש מדידות חריגות חוזרות או תסמינים שמרגישים לא רגילים — צריך בדיקה רפואית מסודרת." }
        ],
        cta: "אם תרצה, אני יכול להסביר גם מה ההבדל בין לחץ דם גבוה ללחץ דם נמוך."
      };
    }

    return {
      title: "אני יכול לעזור גם בשאלות רפואיות כלליות",
      tone: "warn",
      intro: "כרגע זיהיתי שמדובר בנושא רפואי, אבל השאלה עדיין כללית מדי כדי שאחזיר תשובה חדה ואיכותית.",
      summary: "כדי לתת תשובה טובה יותר, כדאי לכתוב שם של תרופה, מצב רפואי או סימפטום ספציפי.",
      bullets: [
        "דוגמה: מה זו תרופת אקמול?",
        "דוגמה: מה חשוב לדעת על לחץ דם גבוה?",
        "דוגמה: מהן תופעות הלוואי הנפוצות של פרצטמול?"
      ],
      sections: [
        { label: "הבהרה חשובה", text: "INVESTO נותן מידע כללי בלבד ואינו מחליף רופא, רוקח או אבחון רפואי אישי." }
      ],
      cta: "שלח לי שאלה רפואית מדויקת יותר ואני אענה בשפה פשוטה וברורה."
    };
  }

  function findGeneralAnswer(){
    return {
      title: `שלום ${agentName}, אני כאן כדי לעזור`,
      tone: "ok",
      intro: "אפשר לשאול אותי שאלות בצורה חופשית, ואני אנסה להחזיר תשובה טבעית, ברורה ומסודרת.",
      summary: "אני הכי חזק כרגע בשני עולמות: הנחות לפי חברה, מוצר וגיל, ומידע רפואי כללי על תרופות ונושאים רפואיים נפוצים.",
      bullets: [
        "שאלות על הנחות: הראל / הפניקס / מנורה / מוצר / גיל",
        "שאלות רפואיות כלליות: תרופות, שימושים, תופעות לוואי נפוצות, הסבר בסיסי",
        "אפשר גם לנסח חופשי ולא חייבים לכתוב בצורה טכנית"
      ],
      sections: [
        { label: "דוגמאות מהירות", text: "איזו הנחה אפשר לתת בהראל בריאות פרימיום גיל 42?\nמה זו תרופת אקמול?\nמה חשוב לדעת על לחץ דם גבוה?" }
      ],
      cta: "כתוב לי את השאלה שלך כמו שאתה מדבר רגיל, ואני אסתדר."
    };
  }

  function getToneLabel(tone){
    if(tone === "ok") return "תשובה זמינה";
    if(tone === "warn") return "מידע כללי בלבד";
    if(tone === "danger") return "דורש זהירות";
    return "תשובה";
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
        ${card.intro ? `<div class="answerCard__intro">${nl2br(card.intro)}</div>` : ""}
        ${card.summary ? `<div class="answerCard__summary">${nl2br(card.summary)}</div>` : ""}
        ${renderBullets(card.bullets)}
        ${sectionsHtml}
        ${card.cta ? `<div class="answerCard__cta">${nl2br(card.cta)}</div>` : ""}
      </div>
    `;
  }

  async function answerUser(text){
    const intent = detectIntent(text);
    state.lastIntent = intent.domain;
    if(intent.domain === "discount") return findDiscountAnswer(text);
    if(intent.domain === "medical") return findMedicalAnswer(text);
    return findGeneralAnswer(text);
  }

  async function simulateThinking(text){
    const intent = detectIntent(text);
    setTyping(true, getThinkingLabel(intent));
    const delay = intent.domain === "discount" ? 700 : intent.domain === "medical" ? 900 : 600;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async function sendCurrent(){
    const text = safe(els.input.value);
    if(!text) return;

    addMessage("user", nl2br(text), agentName, { animate:true });
    els.input.value = "";
    autoResize();

    try {
      await simulateThinking(text);
      const card = await answerUser(text);
      addMessage("bot", cardToHtml(card), "INVESTO", { animate:true });
    } catch(err){
      addMessage(
        "bot",
        cardToHtml({
          title: "משהו נעצר בדרך",
          tone: "danger",
          intro: "ניסיתי להשלים את הבקשה, אבל כרגע הייתה תקלה זמנית.",
          summary: "אפשר לשלוח שוב את אותה שאלה, ובדרך כלל זה נפתר מיד.",
          sections: [
            { label: "מה אפשר לעשות עכשיו", text: "נסה לשלוח שוב בעוד רגע." }
          ]
        }),
        "INVESTO",
        { animate:true }
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
        intro: "אני כאן כדי לענות בשפה טבעית וברורה, כמו שיחה חכמה ולא כמו טופס יבש.",
        summary: "אפשר לשאול אותי על הנחות לפי חברה, מוצר וגיל, וגם על מידע רפואי כללי ותרופות נפוצות.",
        bullets: [
          "אני מסביר בצורה אנושית וברורה",
          "אני מפרט כשצריך ולא זורק תשובה קצרה מדי",
          "אם חסר מידע, אני אגיד בדיוק מה צריך כדי לענות טוב יותר"
        ],
        sections: [
          { label: "נסה למשל", text: "איזו הנחה אפשר לתת בהראל בריאות פרימיום גיל 42?\nמה זו תרופת אקמול?\nמה חשוב לדעת על לחץ דם גבוה?" }
        ],
        cta: "יאללה, שלח שאלה ואני נכנס לזה."
      }),
      "INVESTO",
      { instant:true }
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