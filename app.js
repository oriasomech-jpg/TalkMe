(function(){
  'use strict';

  var PREFIXES = ['050','051','052','053','054','055','056','057','058','059'];
  var STORAGE_KEY = 'lead-generator-used-phone-numbers-v1';
  var SEARCH_DURATION_MS = 8000;
  var STATUS_STEPS = [
    'מאתר התאמה...',
    'בונה מספר ליד...',
    'מאמת תקינות...',
    'מוודא ייחודיות...',
    'מכין תוצאה...'
  ];

  var el = {
    stageIdle: document.getElementById('leadStageIdle'),
    stageLoading: document.getElementById('leadStageLoading'),
    stageResult: document.getElementById('leadStageResult'),
    startBtn: document.getElementById('leadStartBtn'),
    copyBtn: document.getElementById('leadCopyBtn'),
    retryBtn: document.getElementById('leadRetryBtn'),
    resultNumber: document.getElementById('leadResultNumber'),
    loadingStatus: document.getElementById('leadLoadingStatus'),
    statusPill: document.getElementById('leadStatusPill'),
    digitsStream: document.getElementById('digitsStream'),
    progressFill: document.getElementById('leadProgressFill'),
    countdown: document.getElementById('leadCountdown')
  };

  var state = {
    currentNumber: '',
    loadingTimer: null,
    statusTimer: null,
    progressTimer: null,
    isLoading: false,
    secondsLeft: 8,
    stepIndex: 0
  };

  function loadUsedNumbers(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveUsedNumbers(numbers){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(numbers));
  }

  function generateCandidate(){
    var prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    var suffix = '';
    while (suffix.length < 7) {
      suffix += String(Math.floor(Math.random() * 10));
    }
    suffix = suffix.slice(0, 7);
    return prefix + suffix;
  }

  function generateUniquePhone(){
    var used = loadUsedNumbers();
    var usedSet = new Set(used);
    var attempts = 0;
    var candidate = generateCandidate();

    while (usedSet.has(candidate) && attempts < 20000) {
      candidate = generateCandidate();
      attempts += 1;
    }

    if (usedSet.has(candidate)) {
      throw new Error('לא נותרו מספרים ייחודיים זמינים במאגר המקומי.');
    }

    used.push(candidate);
    saveUsedNumbers(used);
    return candidate;
  }


  function removeResultNote(){
    var notes = document.querySelectorAll('.result-note');
    notes.forEach(function(note){
      if (note && note.parentNode) note.parentNode.removeChild(note);
    });
  }

  function setStage(stageName){
    el.stageIdle.classList.add('hidden');
    el.stageLoading.classList.add('hidden');
    el.stageResult.classList.add('hidden');

    if (stageName === 'idle') el.stageIdle.classList.remove('hidden');
    if (stageName === 'loading') el.stageLoading.classList.remove('hidden');
    if (stageName === 'result') el.stageResult.classList.remove('hidden');
  }

  function refreshDigits(){
    if (!el.digitsStream) return;
    var spans = el.digitsStream.querySelectorAll('span');
    spans.forEach(function(span, index){
      var value = index === 0 ? '05' : String(Math.floor(Math.random() * 10));
      if (index === 1) value = String(Math.floor(Math.random() * 10));
      span.textContent = value;
    });
  }

  function resetLoadingVisuals(){
    state.secondsLeft = 8;
    state.stepIndex = 0;
    el.loadingStatus.textContent = STATUS_STEPS[0];
    el.countdown.textContent = '8 שניות';
    el.progressFill.style.width = '0%';
    refreshDigits();
  }

  function clearTimers(){
    if (state.loadingTimer) window.clearTimeout(state.loadingTimer);
    if (state.statusTimer) window.clearInterval(state.statusTimer);
    if (state.progressTimer) window.clearInterval(state.progressTimer);
    state.loadingTimer = null;
    state.statusTimer = null;
    state.progressTimer = null;
  }

  function finishLoading(){
    clearTimers();
    state.isLoading = false;
    state.currentNumber = generateUniquePhone();
    el.resultNumber.textContent = state.currentNumber;
    if (el.statusPill) el.statusPill.textContent = 'הליד מוכן';
    if (el.startBtn) el.startBtn.disabled = false;
    removeResultNote();
    setStage('result');
  }

  function startSearch(){
    if (state.isLoading) return;
    state.isLoading = true;
    if (el.startBtn) el.startBtn.disabled = true;

    if (el.statusPill) el.statusPill.textContent = 'המערכת יוצרת ליד';
    setStage('loading');
    resetLoadingVisuals();

    state.statusTimer = window.setInterval(function(){
      state.stepIndex = (state.stepIndex + 1) % STATUS_STEPS.length;
      el.loadingStatus.textContent = STATUS_STEPS[state.stepIndex];
      refreshDigits();
    }, 1400);

    var elapsed = 0;
    state.progressTimer = window.setInterval(function(){
      elapsed += 100;
      var percent = Math.min((elapsed / SEARCH_DURATION_MS) * 100, 100);
      el.progressFill.style.width = percent + '%';

      var secondsLeft = Math.max(0, Math.ceil((SEARCH_DURATION_MS - elapsed) / 1000));
      el.countdown.textContent = secondsLeft + ' שניות';
    }, 100);

    state.loadingTimer = window.setTimeout(finishLoading, SEARCH_DURATION_MS);
  }

  function copyNumber(){
    if (!state.currentNumber) return;
    navigator.clipboard.writeText(state.currentNumber).then(function(){
      var original = el.copyBtn.textContent;
      el.copyBtn.textContent = 'הועתק בהצלחה';
      window.setTimeout(function(){
        el.copyBtn.textContent = original;
      }, 1600);
    }).catch(function(){
      var textArea = document.createElement('textarea');
      textArea.value = state.currentNumber;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(textArea);
      var original = el.copyBtn.textContent;
      el.copyBtn.textContent = 'הועתק בהצלחה';
      window.setTimeout(function(){
        el.copyBtn.textContent = original;
      }, 1600);
    });
  }

  function retry(){
    clearTimers();
    state.isLoading = false;
    if (el.statusPill) el.statusPill.textContent = 'מוכן להתחלה';
    if (el.startBtn) el.startBtn.disabled = false;
    setStage('idle');
  }

  function bindEvents(){
    if (el.startBtn) el.startBtn.addEventListener('click', startSearch);
    if (el.copyBtn) el.copyBtn.addEventListener('click', copyNumber);
    if (el.retryBtn) el.retryBtn.addEventListener('click', startSearch);
  }

  function init(){
    removeResultNote();
    bindEvents();
    retry();
  }

  window.addEventListener('beforeunload', clearTimers);
  init();
})();
