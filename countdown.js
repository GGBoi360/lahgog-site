// The live countdown page (/c?d=…, R84) for someone without the app. A port of the app's rules, kept in step with:
// src/features/sharing/sharePayload.ts (decode + validate), src/domain/birthdays.ts (yearly dates, Feb 29, Hebrew
// via hebcal), src/domain/eventDates.ts + repeats.ts (one-time and repeating events). Times are the visitor's local
// time, like the app. hebcal (self-hosted, /vendor) is loaded only for Hebrew dates.
(function (global) {
  'use strict';

  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  var HEBCAL_SRC = '/vendor/hebcal-core-6.9.3.min.js';

  // ---- payload (sharePayload.ts) ----

  function b64urlBytes(text) {
    var values = [];
    for (var i = 0; i < text.length; i++) {
      var v = ALPHABET.indexOf(text[i]);
      if (v < 0) return null;
      values.push(v);
    }
    if (values.length % 4 === 1) return null;
    var bytes = [];
    for (var j = 0; j < values.length; j += 4) {
      var n = (values[j] << 18) | (values[j + 1] << 12) | ((values[j + 2] || 0) << 6) | (values[j + 3] || 0);
      bytes.push((n >> 16) & 255);
      if (j + 2 < values.length) bytes.push((n >> 8) & 255);
      if (j + 3 < values.length) bytes.push(n & 255);
    }
    return bytes;
  }

  function utf8(bytes) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    } catch (_e) {
      return null;
    }
  }

  var isInt = function (v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; };
  var isText = function (v) { return typeof v === 'string' && v.trim().length > 0 && v.length <= 80; };

  function validRepeat(r) {
    if (!r || typeof r !== 'object' || !isInt(r.every) || r.every < 1 || r.every > 52) return null;
    if (r.kind === 'weekly') {
      if (!Array.isArray(r.days) || !r.days.length || !r.days.every(function (d) { return isInt(d) && d >= 0 && d <= 6; })) return null;
      return { kind: 'weekly', every: r.every, days: r.days.slice() };
    }
    if (r.kind === 'monthly') {
      if (['day', 'weekday', 'lastWeekday'].indexOf(r.on) < 0 || ['gregorian', 'hebrew'].indexOf(r.calendar) < 0) return null;
      return { kind: 'monthly', every: r.every, on: r.on, calendar: r.calendar };
    }
    return null;
  }

  function validBirth(b) {
    if (!b || typeof b !== 'object' || !isInt(b.day) || !isInt(b.month) || (b.year !== undefined && !isInt(b.year))) return null;
    if (b.calendar === 'gregorian') {
      if (b.month < 1 || b.month > 12 || b.day < 1 || b.day > daysInMonth(b.year === undefined ? 2024 : b.year, b.month)) return null;
      return { calendar: 'gregorian', day: b.day, month: b.month, year: b.year, mar1: b.leapDayRule === 'mar1' && b.month === 2 && b.day === 29 };
    }
    if (b.calendar === 'hebrew') {
      if (b.month < 1 || b.month > 13 || b.day < 1 || b.day > 30) return null;
      return { calendar: 'hebrew', day: b.day, month: b.month, year: b.year, leapYearBirth: b.leapYearBirth === true };
    }
    return null;
  }

  function decode(encoded) {
    if (!encoded || encoded.length > 2000) return null;
    var bytes = b64urlBytes(encoded);
    var json = bytes && utf8(bytes);
    if (!json) return null;
    var d;
    try { d = JSON.parse(json); } catch (_e) { return null; }
    if (!d || typeof d !== 'object' || d.v !== 1 || !isText(d.name)) return null;
    if (['birthday', 'anniversary', 'other'].indexOf(d.eventType) < 0) return null;
    if (d.title !== undefined && !isText(d.title)) return null;
    var birth = validBirth(d.birth);
    if (!birth) return null;
    if (d.oneTime !== undefined && d.oneTime !== true) return null;
    if (d.oneTime && birth.year === undefined) return null;
    var repeat = d.repeat === undefined ? undefined : validRepeat(d.repeat);
    if (repeat === null) return null;
    if (repeat && (d.eventType !== 'other' || birth.year === undefined || d.oneTime)) return null;
    return {
      name: d.name.trim(),
      eventType: d.eventType,
      title: d.title ? d.title.trim() : undefined,
      birth: birth,
      oneTime: d.oneTime === true,
      repeat: repeat,
      time: typeof d.time === 'string' && TIME.test(d.time) ? d.time : undefined,
      // R107: an "other" event over several days (2..61, MAX_SPAN_DAYS + 1); anything else is dropped, like the app.
      days: d.eventType === 'other' && !repeat && isInt(d.days) && d.days >= 2 && d.days <= 61 ? d.days : 1,
    };
  }

  // ---- Gregorian calendar dates as {year, month, day} (no Date math across time zones) ----

  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInMonth(y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  function dayNumber(d) { return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86400000); }
  function fromDayNumber(n) { var t = new Date(n * 86400000); return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() }; }
  function addDays(d, n) { return fromDayNumber(dayNumber(d) + n); }
  function compare(a, b) { return dayNumber(a) - dayNumber(b); }
  function weekday(d) { return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay(); }
  function today() { var t = new Date(); return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() }; }

  // ---- Hebrew (hebcal) ----

  function H() { return global.hebcal; }
  function fromHebrew(day, month, year) {
    var g = new (H().HDate)(day, month, year).greg();
    return { year: g.getFullYear(), month: g.getMonth() + 1, day: g.getDate() };
  }
  function toHebrew(d) {
    var h = new (H().HDate)(new Date(d.year, d.month - 1, d.day));
    return { year: h.getFullYear(), month: h.getMonth(), day: h.getDate() };
  }
  // birthdays.ts hebrewBirthOrigin: a year-less Hebrew date gets a reference year of the right kind.
  function hebrewOrigin(b) {
    var HDate = H().HDate;
    if (b.year !== undefined) return new HDate(b.day, b.month, b.year);
    var leap = b.month === 13 || b.leapYearBirth;
    for (var y = 5700; y > 5600; y--) {
      if (HDate.isLeapYear(y) === leap && b.month <= HDate.monthsInYear(y) && HDate.daysInMonth(b.month, y) >= b.day) return new HDate(b.day, b.month, y);
    }
    return null;
  }

  // ---- the next date (birthdays.ts nextOccurrence, eventDates.ts nextEventOccurrence, repeats.ts nextRepeat) ----

  function yearlyIn(b, year) {
    if (b.calendar === 'gregorian') {
      if (b.year !== undefined && year < b.year) return null;
      if (b.month === 2 && b.day === 29 && !isLeap(year)) return b.mar1 ? { year: year, month: 3, day: 1 } : { year: year, month: 2, day: 28 };
      return { year: year, month: b.month, day: b.day };
    }
    var origin = hebrewOrigin(b);
    var observed = origin && H().HebrewCalendar.getBirthdayOrAnniversary(year, origin);
    if (!observed) return null;
    var g = observed.greg();
    return { year: g.getFullYear(), month: g.getMonth() + 1, day: g.getDate() };
  }

  function nextYearly(b, t) {
    var start = b.calendar === 'hebrew' ? toHebrew(t).year : t.year;
    for (var y = start; y <= start + 1; y++) {
      var date = yearlyIn(b, y);
      if (date && compare(date, t) >= 0) return { date: date, turning: b.year === undefined ? undefined : y - b.year };
    }
    return null;
  }

  function hebrewMonthIndex(h) {
    var HDate = H().HDate;
    var idx = 0;
    for (var y = 5600; y < h.year; y++) idx += HDate.monthsInYear(y);
    var leap = HDate.isLeapYear(h.year);
    return idx + (h.month >= 7 ? h.month - 7 : (leap ? 7 : 6) + h.month - 1);
  }
  function dayMatches(on, startDay, day, monthLength, startWd, wd) {
    if (on === 'day') return day === Math.min(startDay, monthLength);
    if (wd !== startWd) return false;
    if (on === 'lastWeekday') return day + 7 > monthLength;
    return Math.ceil(day / 7) === Math.ceil(startDay / 7);
  }
  function matches(rule, start, date) {
    if (compare(date, start) < 0) return false;
    if (rule.kind === 'weekly') {
      if (rule.days.indexOf(weekday(date)) < 0) return false;
      var weeks = (dayNumber(addDays(date, -weekday(date))) - dayNumber(addDays(start, -weekday(start)))) / 7;
      return weeks % rule.every === 0;
    }
    if (rule.calendar === 'gregorian') {
      if (((date.year * 12 + date.month) - (start.year * 12 + start.month)) % rule.every !== 0) return false;
      return dayMatches(rule.on, start.day, date.day, daysInMonth(date.year, date.month), weekday(start), weekday(date));
    }
    var s = toHebrew(start), h = toHebrew(date);
    if ((hebrewMonthIndex(h) - hebrewMonthIndex(s)) % rule.every !== 0) return false;
    return dayMatches(rule.on, s.day, h.day, H().HDate.daysInMonth(h.month, h.year), weekday(start), weekday(date));
  }

  function nextDate(ev, t) {
    if (!ev.oneTime && !ev.repeat) return nextYearly(ev.birth, t);
    var b = ev.birth;
    var on = b.calendar === 'gregorian' ? { year: b.year, month: b.month, day: b.day } : fromHebrew(b.day, b.month, b.year);
    if (ev.repeat) {
      var date = compare(t, on) > 0 ? t : on;
      for (var i = 0; i <= 732; i++) {
        if (matches(ev.repeat, on, date)) return { date: date };
        date = addDays(date, 1);
      }
      return null;
    }
    return compare(on, t) >= 0 ? { date: on } : null;
  }

  function needsHebcal(ev) {
    return ev.birth.calendar === 'hebrew' || (ev.repeat && ev.repeat.kind === 'monthly' && ev.repeat.calendar === 'hebrew');
  }

  function loadHebcal(done) {
    if (global.hebcal) return done(true);
    var s = document.createElement('script');
    s.src = HEBCAL_SRC;
    s.onload = function () { done(!!global.hebcal); };
    s.onerror = function () { done(false); };
    document.head.appendChild(s);
  }

  // ---- the page ----

  function subject(ev) {
    var t = ev.eventType === 'other' ? (ev.title || ev.name) : ev.name;
    if (ev.eventType === 'birthday') return 'יום ההולדת של ' + t;
    if (ev.eventType === 'anniversary') return 'יום השנה של ' + t;
    return t;
  }

  // A multi-day event (R107) is current until its last day: look for occurrences from (today - days + 1).
  function nextSpan(ev, t) {
    var next = nextDate(ev, ev.days > 1 ? addDays(t, 1 - ev.days) : t);
    if (!next) return null;
    return { date: next.date, end: addDays(next.date, ev.days - 1) };
  }

  function dateLabel(d, end) {
    var js = function (x) { return new Date(x.year, x.month - 1, x.day); };
    if (compare(end, d) === 0) return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(js(d));
    var dm = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' });
    // "3–6 בנובמבר" in the same month, "30 בנובמבר – 2 בדצמבר" across months (as the app shows it).
    if (d.year === end.year && d.month === end.month) return d.day + '–' + dm.format(js(end));
    return dm.format(js(d)) + ' – ' + dm.format(js(end));
  }

  function render(ev, els) {
    var t = today();
    var next = nextSpan(ev, t);
    els.title.textContent = 'עד ' + subject(ev);
    if (!next) {
      els.when.textContent = 'האירוע הזה כבר עבר';
      return;
    }
    var d = next.date;
    els.when.textContent = dateLabel(d, next.end) + (ev.time ? ' · בשעה ' + ev.time : '');
    var parts = ev.time ? ev.time.split(':') : null;
    var target = new Date(d.year, d.month - 1, d.day, parts ? +parts[0] : 0, parts ? +parts[1] : 0, 0);
    // From the first day to the last day of a multi-day event: no counter, the "today" state.
    if (ev.days > 1 && compare(d, t) <= 0) {
      els.today.hidden = false;
      return;
    }
    if (!parts && compare(d, t) === 0) {
      els.today.hidden = false;
      return;
    }
    els.clock.hidden = false;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var ms = target - new Date();
      if (ms <= 0) {
        els.clock.hidden = true;
        els.today.hidden = false;
        clearInterval(timer);
        return;
      }
      var s = Math.floor(ms / 1000);
      els.days.textContent = Math.floor(s / 86400);
      els.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      els.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      els.seconds.textContent = pad(s % 60);
    };
    var timer = setInterval(tick, 1000);
    tick();
  }

  global.LahgogCountdown = {
    decode: decode,
    nextDate: nextDate,
    nextSpan: nextSpan,
    dateLabel: dateLabel,
    needsHebcal: needsHebcal,
    show: function (encoded, els, onInvalid) {
      var ev = decode(encoded);
      if (!ev) return onInvalid();
      if (!needsHebcal(ev)) return render(ev, els);
      loadHebcal(function (ok) {
        if (ok) return render(ev, els);
        els.title.textContent = 'עד ' + subject(ev);
        els.when.textContent = 'התאריך לפי הלוח העברי. אפשר לראות את הספירה באפליקציה.';
      });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
