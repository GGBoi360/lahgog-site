// The Hebrew-birthday calculator (/hebrew-birthday, G5). Everything is computed in the browser with the same hebcal
// function the app uses (HebrewCalendar.getBirthdayOrAnniversary: Adar in a leap year, the 30th of Cheshvan or
// Kislev). The date lives in the address after "#", which browsers never send to a server.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var H = window.hebcal;
  if (!H || !H.HDate) return;
  var HDate = H.HDate, Cal = H.HebrewCalendar;
  var DAY = 86400000;

  // Hebrew numerals (gematria) for a year: 5756 -> תשנ״ו.
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
  // hebcal writes month names with vowel points; the page shows them plain.
  function plain(text) { return text.replace(/[֑-ׇ]/g, ''); }
  function hebrewDay(hd) { return plain(hd.renderGematriya()); }

  var full = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function daysBetween(a, b) { return Math.round((midnight(b) - midnight(a)) / DAY); }
  function inDays(n) {
    if (n === 0) return 'היום! 🎉';
    if (n === 1) return 'מחר';
    if (n === 2) return 'מחרתיים';
    return 'בעוד ' + n + ' ימים';
  }

  function birthdayIn(year, origin) {
    var b = Cal.getBirthdayOrAnniversary(year, origin);
    return b ? b.greg() : null;
  }

  function compute(iso, afterSunset) {
    var p = iso.split('-');
    var born = new Date(+p[0], +p[1] - 1, +p[2]);
    if (afterSunset) born = new Date(born.getFullYear(), born.getMonth(), born.getDate() + 1);
    var origin = new HDate(born);
    var today = midnight(new Date());
    var thisYear = new HDate(today).getFullYear();
    var next = null, nextYear = thisYear;
    for (var y = thisYear; y <= thisYear + 1 && !next; y++) {
      var g = birthdayIn(y, origin);
      if (g && midnight(g) >= today) { next = g; nextYear = y; }
    }
    var rows = [];
    for (var k = 0; k < 5; k++) {
      var gy = birthdayIn(nextYear + k, origin);
      if (gy) rows.push({ year: nextYear + k, date: gy });
    }
    return {
      origin: origin,
      next: next,
      age: nextYear - origin.getFullYear(),
      rows: rows,
      bar: birthdayIn(origin.getFullYear() + 13, origin),
      bat: birthdayIn(origin.getFullYear() + 12, origin),
      today: today,
    };
  }

  function render(r) {
    $('rHebrew').textContent = hebrewDay(r.origin);
    if (r.next) {
      $('rNext').textContent = full.format(r.next);
      $('rNextIn').textContent = inDays(daysBetween(r.today, r.next)) + (r.age > 0 ? ' · יום הולדת ' + r.age + ' לפי הלוח העברי' : '');
    }
    var list = $('rYears');
    list.textContent = '';
    r.rows.forEach(function (row) {
      var li = document.createElement('li');
      var y = document.createElement('b');
      y.textContent = gematria(row.year);
      var d = document.createElement('span');
      d.textContent = full.format(row.date);
      li.appendChild(y);
      li.appendChild(d);
      list.appendChild(li);
    });
    $('rBar').textContent = r.bar ? full.format(r.bar) : '';
    $('rBat').textContent = r.bat ? full.format(r.bat) : '';
    $('result').hidden = false;
  }

  // The form, and the address after "#" (d=YYYY-MM-DD, s=1 after sunset) so a result can be shared or bookmarked.
  var form = $('calc');
  var input = $('birth');
  var sunset = $('sunset');
  var ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  function valid(iso) {
    var m = ISO.exec(iso || '');
    if (!m) return false;
    var y = +m[1];
    return y >= 1900 && y <= 2100;
  }
  function run(iso, s, writeHash) {
    if (!valid(iso)) { $('error').hidden = false; $('result').hidden = true; return; }
    $('error').hidden = true;
    render(compute(iso, s));
    if (writeHash && window.history && history.replaceState) history.replaceState(null, '', '#d=' + iso + (s ? '&s=1' : ''));
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    run(input.value, sunset.checked, true);
  });
  // The result's address (the date after "#") through the phone's share sheet, or copied where there is none.
  var shareBtn = $('share');
  shareBtn.addEventListener('click', function () {
    if (!valid(input.value)) return;
    run(input.value, sunset.checked, true);
    var url = location.href;
    if (navigator.share) {
      navigator.share({ title: 'יום ההולדת העברי שלי', text: 'התאריך העברי: ' + $('rHebrew').textContent, url: url }).catch(function () { /* closed */ });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        shareBtn.textContent = '✓ הקישור הועתק';
        setTimeout(function () { shareBtn.textContent = '🔗 שיתוף'; }, 2500);
      });
    }
  });
  var m = /d=(\d{4}-\d{2}-\d{2})/.exec(location.hash);
  if (m && valid(m[1])) {
    input.value = m[1];
    sunset.checked = /s=1/.test(location.hash);
    run(m[1], sunset.checked, false);
  }
})();
