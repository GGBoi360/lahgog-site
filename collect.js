// "Collect birthdays" (/collect, decision D21 step 2). Two sides, nothing stored anywhere:
//  - asking: I type my name and get a link (lahgog.app/collect#from=<name>) to send to friends or a group;
//  - answering: a friend opens it, types their name and date, and WhatsApp opens with a message back to me that holds
//    the date in words and the app's own "add to Lahgog" link (/a?d=…, the payload of src/features/sharing/
//    sharePayload.ts: {v:1, name, eventType:'birthday', birth:{calendar:'gregorian', day, month, year?, afterSunset?}}).
// Names travel after "#", which browsers never send to a server.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var SITE = 'https://lahgog.app';
  var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  var MAX_NAME = 40;

  // The app's payload encoding: JSON, UTF-8, base64url without padding.
  function pack(value) {
    var utf8 = unescape(encodeURIComponent(JSON.stringify(value)));
    return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function clean(text) { return String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME); }
  function hashParam(name) {
    var m = new RegExp('[#&]' + name + '=([^&]*)').exec(location.hash);
    if (!m) return '';
    try { return clean(decodeURIComponent(m[1])); } catch (_e) { return ''; }
  }
  function daysIn(month, year) { return new Date(year || 2024, month, 0).getDate(); }
  function openWhatsApp(text) { window.location.href = 'https://wa.me/?text=' + encodeURIComponent(text); }
  function copy(text, button, done) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () { button.textContent = done; });
  }

  // ---- selects for day and month ----
  var daySel = $('day'), monthSel = $('month');
  for (var d = 1; d <= 31; d++) { var o = document.createElement('option'); o.value = String(d); o.textContent = String(d); daySel.appendChild(o); }
  MONTHS.forEach(function (name, i) { var o = document.createElement('option'); o.value = String(i + 1); o.textContent = name; monthSel.appendChild(o); });

  var from = hashParam('from');
  if (from) {
    // ---- answering ----
    $('answer').hidden = false;
    $('headline').textContent = from + ' רוצה לזכור את יום ההולדת שלך 🎂';
    $('lead').textContent = 'ממלאים שם ותאריך, ונפתח וואטסאפ עם הודעה מוכנה אל ' + from + '. משם זה נכנס ללחגוג בלחיצה.';
    document.title = from + ' רוצה לזכור את יום ההולדת שלך | לחגוג';
    $('answerForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = clean($('myName').value);
      var day = +daySel.value, month = +monthSel.value;
      var yearText = $('year').value.trim();
      var year = yearText ? parseInt(yearText, 10) : undefined;
      var thisYear = new Date().getFullYear();
      $('answerError').hidden = true;
      if (!name) return fail('כתבו את השם שלכם.');
      if (!day || !month) return fail('בחרו יום וחודש.');
      if (year !== undefined && (isNaN(year) || year < 1900 || year > thisYear)) return fail('השנה לא נראית נכונה. אפשר גם להשאיר אותה ריקה.');
      if (day > daysIn(month, year)) return fail('אין יום כזה בחודש הזה.');
      var birth = { calendar: 'gregorian', day: day, month: month };
      if (year !== undefined) birth.year = year;
      if ($('mySunset').checked) birth.afterSunset = true;
      var link = SITE + '/a?d=' + pack({ v: 1, name: name, eventType: 'birthday', birth: birth });
      var words = day + ' ב' + MONTHS[month - 1] + (year !== undefined ? ' ' + year : '');
      var text = 'היי ' + from + ', יום ההולדת שלי: ' + words + ' 🎂\nלהוספה ללחגוג: ' + link;
      $('answerLink').value = text;
      $('answerDone').hidden = false;
      openWhatsApp(text);
    });
    $('answerCopy').addEventListener('click', function () { copy($('answerLink').value, $('answerCopy'), 'הועתק ✓'); });
  } else {
    // ---- asking ----
    $('ask').hidden = false;
    $('askForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = clean($('askName').value);
      $('askError').hidden = true;
      if (!name) { $('askError').hidden = false; return; }
      var link = SITE + '/collect#from=' + encodeURIComponent(name);
      var text = 'רוצה לזכור את יום ההולדת של כולם, בלי לפספס אף אחד 🎂 שלחו לי את שלכם כאן: ' + link;
      $('askLink').value = text;
      $('askDone').hidden = false;
      openWhatsApp(text);
    });
    $('askCopy').addEventListener('click', function () { copy($('askLink').value, $('askCopy'), 'הועתק ✓'); });
  }

  function fail(message) { $('answerError').textContent = message; $('answerError').hidden = false; }
})();
