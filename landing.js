// The landing page's live bits: today's calendar page (Gregorian + Hebrew date) and a countdown to the next
// Hanukkah. Everything is computed in the browser from Intl's Hebrew calendar; nothing is fetched.
(function () {
  'use strict';
  var root = document.documentElement;
  var lang = root.lang === 'en' ? 'en' : 'he';

  // Hebrew numerals (gematria) for days and years: 15 → ט״ו, 5787 → תשפ״ז.
  var ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  var TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  var HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
  function gematria(n) {
    n = n % 1000;
    var s = HUNDREDS[Math.floor(n / 100)];
    var rest = n % 100;
    if (rest === 15) s += 'טו';
    else if (rest === 16) s += 'טז';
    else s += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }

  var HEB = 'he-IL-u-ca-hebrew';
  function hebrewParts(date) {
    var parts = new Intl.DateTimeFormat(HEB, { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date);
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    return { day: +out.day, month: out.month, year: +out.year };
  }

  function hebrewLabel(date) {
    if (lang === 'en') return new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    var h = hebrewParts(date);
    return gematria(h.day) + ' ב' + h.month + ' ' + gematria(h.year);
  }

  // ---- the calendar page ----
  var now = new Date();
  var el = function (id) { return document.getElementById(id); };
  if (el('calDay')) {
    var locale = lang === 'en' ? 'en-GB' : 'he-IL';
    el('calWeekday').textContent = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now);
    el('calDay').textContent = now.getDate();
    el('calMonth').textContent = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(now);
    el('calHebrew').textContent = hebrewLabel(now);
  }

  // ---- the planner conversation plays once, when it scrolls into view ----
  var chat = document.querySelector('.chat');
  if (chat) {
    if ('IntersectionObserver' in window) {
      var seen = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { chat.classList.add('play'); seen.disconnect(); }
      }, { threshold: 0.35 });
      seen.observe(chat);
    } else {
      chat.classList.add('play');
    }
  }

  // ---- the next Hanukkah (25 Kislev), to its first day at midnight, like the app's countdown ----
  var counter = el('hanukkah');
  if (!counter) return;
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var target = null;
  for (var i = 0; i < 400 && !target; i++) {
    var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    var h = hebrewParts(d);
    if (h.day === 25 && h.month === 'כסלו') target = d;
  }
  if (!target) { counter.hidden = true; return; }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el('hanukkahDate').textContent = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(target);
  function tick() {
    var ms = target - new Date();
    if (ms <= 0) {
      el('hanukkahClock').hidden = true;
      el('hanukkahToday').hidden = false;
      return;
    }
    var s = Math.floor(ms / 1000);
    el('hDays').textContent = Math.floor(s / 86400);
    el('hHours').textContent = pad(Math.floor((s % 86400) / 3600));
    el('hMinutes').textContent = pad(Math.floor((s % 3600) / 60));
    el('hSeconds').textContent = pad(s % 60);
  }
  tick();
  // With "reduce motion", update once a minute and hide the seconds, as the app does.
  if (reduce) el('hSecondsBox').hidden = true;
  setInterval(tick, reduce ? 60000 : 1000);
})();
