// The invite pages. Every link the app shares (src/features/sharing/inviteLinks.ts) lands on one of them when the app
// didn't open it: /j/?c=<code> a chat, /i/?c=<code> an invite to the app, /f/?c=<code> a friend, /a?d=… an event,
// /l?d=… a list, /c?d=… a live countdown (countdown.js). Each is a real file (j/index.html, a.html, …) so link previews
// get HTTP 200 and the page's own card; they all load this script, which draws the page. 404.html forwards the older
// path forms (/j/<code>, /p/<token>, /g/<token>) to these files.
// On a phone with the app (lahgog.app verified through /.well-known/assetlinks.json) the app opens instead and this
// page is never seen. On Android without the app it sends the visitor to Google Play with the invite in the install
// referrer ("lahgog=<path and query>"), so the app can open the invite on its first launch (deferred deep link).
(function () {
  'use strict';
  var PACKAGE = 'com.lahgog.app';
  var STORE = 'https://play.google.com/store/apps/details?id=' + PACKAGE;
  var CODE = /^[A-HJKMNP-Z2-9]{8}$/;
  var KINDS = {
    j: { title: 'הוזמנת לצ׳אט', text: 'מזמינים אותך לצ׳אט בלחגוג.' },
    i: { title: 'בואו לחגוג ביחד 🎉', text: 'קיבלת הזמנה להצטרף ללחגוג.' },
    f: { title: 'בקשת חברות', text: 'מישהו רוצה להיות חברים בלחגוג.' },
    a: { title: 'אירוע שותף איתך', text: 'שיתפו איתך אירוע להוספה ללוח שלך בלחגוג.' },
    l: { title: 'רשימת ימי הולדת', text: 'שיתפו איתך ימי הולדת להוספה ללוח שלך בלחגוג.' },
  };
  var PAGE =
    '<section class="card" id="invite" hidden>' +
    '<h2 id="title"></h2><p id="text"></p>' +
    '<a class="button" id="play" href="' + STORE + '">להורדה מ-Google Play</a>' +
    '<p class="note" id="after">אחרי ההתקנה ההזמנה תיפתח באפליקציה.</p>' +
    '<p class="note" id="iosNote" hidden>לחגוג זמינה כרגע לאנדרואיד.</p>' +
    '<div id="codeBox" hidden><p>או להקליד באפליקציה את הקוד:</p><div class="code" id="code"></div>' +
    '<button class="button secondary" id="copy" type="button" hidden>העתקת הקוד</button></div>' +
    '</section>' +
    '<section class="card countdown" id="countdown" hidden>' +
    '<h2 id="cdTitle"></h2><p id="cdWhen"></p>' +
    '<div class="clock" id="cdClock" hidden aria-live="off">' +
    '<div><span id="cdDays">0</span><small>ימים</small></div>' +
    '<div><span id="cdHours">00</span><small>שעות</small></div>' +
    '<div><span id="cdMinutes">00</span><small>דקות</small></div>' +
    '<div><span id="cdSeconds">00</span><small>שניות</small></div>' +
    '</div>' +
    '<p class="today" id="cdToday" hidden>זה היום! 🎉</p>' +
    '<a class="button" id="cdPlay" href="' + STORE + '">לחגוג ב-Google Play</a>' +
    '<p class="note" id="cdNote">באפליקציה אפשר להוסיף את האירוע ללוח ולקבל תזכורת.</p>' +
    '</section>' +
    '<section class="card" id="missing" hidden>' +
    '<h2>הדף לא נמצא</h2><p>אולי הקישור נקטע בדרך.</p>' +
    '<a class="button secondary" href="/">לדף הבית</a>' +
    '</section>';

  var $ = function (id) { return document.getElementById(id); };
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  var android = /Android/.test(navigator.userAgent);
  document.getElementById('slot').innerHTML = PAGE;
  function missing() { $('missing').hidden = false; }

  // The install referrer carries the invite in the form every app version reads (/j/<code>, /a?d=…).
  function storeLink(invite) {
    var referrer = encodeURIComponent('lahgog=' + encodeURIComponent(invite));
    return STORE + (referrer.length < 900 ? '&referrer=' + referrer : '');
  }

  var path = location.pathname.replace(/\/+$/, '').replace(/\.html$/, '');
  var data = /[?&]d=([A-Za-z0-9_-]+)/.exec(location.search);

  // The live countdown (R84): shown here, ticking, for someone without the app.
  if (path === '/c') {
    if (!data) return missing();
    var cdScript = document.createElement('script');
    cdScript.src = '/countdown.js';
    cdScript.onload = function () {
      $('cdPlay').href = storeLink('/c' + location.search);
      if (ios) {
        $('cdPlay').hidden = true;
        $('cdNote').textContent = 'לחגוג זמינה כרגע לאנדרואיד.';
      }
      $('countdown').hidden = false;
      window.LahgogCountdown.show(data[1], {
        title: $('cdTitle'), when: $('cdWhen'), clock: $('cdClock'), today: $('cdToday'),
        days: $('cdDays'), hours: $('cdHours'), minutes: $('cdMinutes'), seconds: $('cdSeconds'),
      }, function () { $('countdown').hidden = true; missing(); });
    };
    cdScript.onerror = missing;
    document.head.appendChild(cdScript);
    return;
  }

  var withCode = /^\/(j|i|f)$/.exec(path);
  var withData = /^\/(a|l)$/.exec(path);
  var codeParam = /[?&]c=([A-Za-z0-9]{8})(?:&|$)/.exec(location.search);
  var kind = withCode && codeParam ? withCode[1] : withData && data ? withData[1] : null;
  var code = withCode && codeParam ? codeParam[1].toUpperCase() : null;
  if (!kind || (code && !CODE.test(code))) return missing();

  $('title').textContent = KINDS[kind].title;
  $('text').textContent = KINDS[kind].text;
  $('invite').hidden = false;
  var play = storeLink(code ? '/' + kind + '/' + code : path + location.search);
  $('play').href = play;

  if (code) {
    $('code').textContent = code;
    $('codeBox').hidden = false;
    if (navigator.clipboard) {
      var copy = $('copy');
      copy.hidden = false;
      copy.addEventListener('click', function () {
        navigator.clipboard.writeText(code).then(function () { copy.textContent = 'הועתק ✓'; });
      });
    }
  }

  if (ios) {
    $('play').hidden = true;
    $('after').hidden = true;
    $('iosNote').hidden = false;
  } else if (android) {
    // Like most apps: straight on to the store after a moment to read what the invite is.
    setTimeout(function () { location.href = play; }, 1500);
  }
})();
