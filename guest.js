// Guest pages (no account): /p/<token> answers a plan's invitation (R105), /g/<token> a chat event's (R51).
// The server functions are public by design (plan_guest_view / plan_guest_rsvp, guest_event / guest_rsvp) and return
// only what a guest may see. The key that lets a guest change their answer stays in this browser (localStorage).
// The anon key below is the app's public key (role "anon"): access is decided by those functions, not by the key.
(function () {
  'use strict';
  var URL_ = 'https://utoqxsnszlltpngnrtrk.supabase.co/rest/v1/rpc/';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0b3F4c25zemxsdHBuZ25ydHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTcyMzQsImV4cCI6MjEwNzAzMzIzNH0.WUmGt7daEfSfYJrofqFVbpGQH0glI2hovFoyPB2qpic';
  var KINDS = {
    p: { view: 'plan_guest_view', rsvp: 'plan_guest_rsvp', no: 'no', maxPlus: 20, who: 'מארגני האירוע' },
    g: { view: 'guest_event', rsvp: 'guest_rsvp', no: 'not', maxPlus: 10, who: 'חברי הצ׳אט של האירוע' },
  };
  var $ = function (id) { return document.getElementById(id); };

  function call(fn, body) {
    return fetch(URL_ + fn, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) { var e = new Error((data && data.message) || 'error'); e.code = data && data.code; throw e; }
        return data;
      });
    });
  }

  function store(token) {
    var k = 'lahgog.guest.' + token;
    return {
      get: function () { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
      set: function (v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: the answer is saved, only changing it later needs the key */ } },
    };
  }

  function dateLabel(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  }

  function joinNames(list) {
    if (!list || !list.length) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' ו' + list[list.length - 1];
  }

  window.LahgogGuest = {
    show: function (kind, token, onMissing) {
      var cfg = KINDS[kind];
      var saved = store(token);
      $('guest').hidden = false;
      $('gWho').textContent = cfg.who;
      $('gPlus').max = String(cfg.maxPlus);
      call(cfg.view, { p_token: token }).then(function (ev) {
        if (!ev) { $('guest').hidden = true; return onMissing(); }
        $('gTitle').textContent = ev.title || '';
        var when = [dateLabel(ev.startsOn), ev.startTime ? 'בשעה ' + String(ev.startTime).slice(0, 5) : ''].filter(Boolean).join(', ');
        $('gWhen').textContent = when || 'התאריך עוד לא נקבע';
        if (ev.place) { $('gPlace').textContent = '📍 ' + ev.place; $('gPlace').hidden = false; }
        var hosts = kind === 'p' ? joinNames(ev.hosts) : ev.host;
        if (hosts) { $('gHosts').textContent = (kind === 'p' ? 'מארגנים: ' : 'מזמין/ה: ') + hosts; $('gHosts').hidden = false; }
        if (ev.notes) { $('gNotes').textContent = ev.notes; $('gNotes').hidden = false; }
        $('gGoing').textContent = ev.going ? 'מגיעים עד עכשיו: ' + ev.going : '';
        $('gLoading').hidden = true;
        $('gBody').hidden = false;
        var mine = saved.get();
        if (mine) {
          $('gName').value = mine.name || '';
          $('gPlus').value = mine.plus || 0;
          var r = document.querySelector('input[name="gAnswer"][value="' + mine.answer + '"]');
          if (r) r.checked = true;
          $('gDone').hidden = false;
          $('gSubmit').textContent = 'עדכון התשובה';
        }
      }).catch(function () {
        $('gLoading').textContent = 'לא הצלחנו לטעון את ההזמנה. בדקו את החיבור ונסו שוב.';
      });

      $('gForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var name = $('gName').value.trim();
        var picked = document.querySelector('input[name="gAnswer"]:checked');
        var plus = Math.max(0, Math.min(cfg.maxPlus, parseInt($('gPlus').value || '0', 10) || 0));
        $('gError').hidden = true;
        if (!name || name.length > 60) return fail('כתבו שם (עד 60 תווים).');
        if (!picked) return fail('בחרו אם תגיעו.');
        var answer = picked.value === 'no' ? cfg.no : picked.value;
        var mine = saved.get();
        $('gSubmit').disabled = true;
        call(cfg.rsvp, { p_token: token, p_name: name, p_answer: answer, p_plus_ones: plus, p_key: mine && mine.key ? mine.key : null })
          .then(function (res) {
            if (!res) return fail('הקישור כבר לא פעיל.');
            saved.set({ key: (res && res.key) || (mine && mine.key), name: name, answer: picked.value, plus: plus });
            $('gDone').hidden = false;
            $('gDone').textContent = 'התשובה נשמרה. אפשר לשנות אותה כאן בכל זמן, מהמכשיר הזה.';
            $('gSubmit').textContent = 'עדכון התשובה';
          })
          .catch(function (err) {
            if (err.code === '54000') return fail('האירוע מלא, ולא ניתן להוסיף עוד אורחים.');
            if (err.code === 'P0002') { saved.set(null); return fail('לא מצאנו את התשובה הקודמת. אפשר לשלוח תשובה חדשה.'); }
            fail('לא הצלחנו לשמור. בדקו את החיבור ונסו שוב.');
          })
          .then(function () { $('gSubmit').disabled = false; });
      });

      function fail(msg) { $('gError').textContent = msg; $('gError').hidden = false; }
    },
  };
})();
