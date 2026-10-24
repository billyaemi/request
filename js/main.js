/* Hina Niside — site script
   1. JA/EN switch  2. hero slideshow  3. lightbox  4. contact form */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 0. loading screen (home): logo, then fade ---------- */
  var loader = doc.getElementById('loader');
  if (loader) {
    try { sessionStorage.setItem('seen', '1'); } catch (e) {}
    var t0 = Date.now(), gone = false;
    var hide = function () {
      if (gone) return; gone = true;
      var wait = Math.max(0, 2900 - (Date.now() - t0));   // let the logo settle
      setTimeout(function () { loader.classList.add('done'); }, wait);
    };
    if (doc.readyState === 'complete') hide(); else window.addEventListener('load', hide);
    setTimeout(hide, 5500);
  }

  /* ---------- 1. language ---------- */
  var PAGE_RE = /^(index|works|about|contact)\.html(#.*)?$/;

  function currentLang() { return root.getAttribute('data-lang') === 'en' ? 'en' : 'ja'; }

  function applyLang(lang) {
    root.setAttribute('data-lang', lang);
    root.lang = lang;

    var t = doc.querySelector('title[data-ja]');
    if (t) doc.title = t.getAttribute('data-' + lang);

    [].forEach.call(doc.querySelectorAll('[data-ph-ja]'), function (el) {
      el.setAttribute('placeholder', el.getAttribute('data-ph-' + lang));
    });
    [].forEach.call(doc.querySelectorAll('[data-alt-ja]'), function (el) {
      el.setAttribute('alt', el.getAttribute('data-alt-' + lang));
    });
    [].forEach.call(doc.querySelectorAll('option[data-ja]'), function (el) {
      el.textContent = el.getAttribute('data-' + lang);
    });
    [].forEach.call(doc.querySelectorAll('[data-set-lang]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === lang ? 'true' : 'false');
    });

    // keep the chosen language when moving between pages (works even without storage)
    [].forEach.call(doc.querySelectorAll('a[href]'), function (a) {
      var h = a.getAttribute('href');
      var hash = '';
      var i = h.indexOf('#');
      if (i > -1) { hash = h.slice(i); h = h.slice(0, i); }
      h = h.replace(/\?lang=(ja|en)$/, '');
      if (!PAGE_RE.test(h + hash) && !PAGE_RE.test(h)) return;
      a.setAttribute('href', h + (lang === 'en' ? '?lang=en' : '') + hash);
    });
  }

  [].forEach.call(doc.querySelectorAll('[data-set-lang]'), function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-set-lang');
      try { localStorage.setItem('lang', lang); } catch (e) {}
      applyLang(lang);
    });
  });
  applyLang(currentLang());

  /* ---------- 2. hero slideshow ---------- */
  var hero = doc.getElementById('hero');
  if (hero && hero.querySelectorAll('.dots button').length) {
    var slides = [].slice.call(hero.querySelectorAll('.slide'));
    var dots = [].slice.call(hero.querySelectorAll('.dots button'));
    var idx = 0, timer = null;

    var show = function (n) {
      slides[idx].classList.remove('on');
      dots[idx].setAttribute('aria-current', 'false');
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add('on');
      dots[idx].setAttribute('aria-current', 'true');
    };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var start = function () {
      stop();
      if (reduceMotion || slides.length < 2) return;
      timer = setInterval(function () { show(idx + 1); }, 5200);
    };
    dots.forEach(function (d, n) {
      d.addEventListener('click', function () { show(n); start(); });
    });
    doc.addEventListener('visibilitychange', function () { doc.hidden ? stop() : start(); });
    start();
  }

  /* home: switch the header to its solid style after the full-screen hero */
  if (hero && doc.body.classList.contains('home')) {
    var ticking = false;
    var check = function () {
      ticking = false;
      doc.body.classList.toggle('past-hero', window.scrollY > hero.offsetHeight - 70);
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(check); }
    }, { passive: true });
    check();
  }

  /* ---------- 3. lightbox (YouTube + images) ---------- */
  var cells = doc.querySelectorAll('.cell[data-yt], .cell[data-img], .cell[data-video]');
  if (cells.length) {
    var lb = doc.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Viewer');
    lb.innerHTML = '<button type="button" class="lb-close" aria-label="Close">&times;</button><div class="lb-body"></div>';
    doc.body.appendChild(lb);
    var body = lb.querySelector('.lb-body');
    var closeBtn = lb.querySelector('.lb-close');
    var lastFocus = null;

    var close = function () {
      lb.classList.remove('open');
      body.innerHTML = '';           // stops playback
      doc.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };
    var open = function (cell) {
      var yt = cell.getAttribute('data-yt');
      var start = cell.getAttribute('data-start');
      var ytUrl = yt ? 'https://youtu.be/' + encodeURIComponent(yt) +
                       (start ? '?t=' + parseInt(start, 10) : '') : '';

      // YouTube refuses to play inside a page opened from a local file (error 153),
      // so when previewing from disk just open YouTube itself.
      if (yt && location.protocol === 'file:') {
        window.open(ytUrl, '_blank', 'noopener');
        return;
      }

      lastFocus = cell;
      if (yt) {
        var q = 'autoplay=1&rel=0&playsinline=1' + (start ? '&start=' + parseInt(start, 10) : '');
        body.innerHTML =
          '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) + '?' + q + '"' +
          ' title="YouTube video" referrerpolicy="strict-origin-when-cross-origin"' +
          ' allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
          '<p class="hint">' + (currentLang() === 'en'
              ? 'If the video does not play, '
              : '再生できない場合は、') +
          '<a class="ext" target="_blank" rel="noopener" href="' + ytUrl + '">' +
          (currentLang() === 'en' ? 'open it on YouTube' : 'YouTubeで開く') + '</a></p>';
      } else if (cell.getAttribute('data-video')) {
        lastFocus = cell;
        body.innerHTML = '<video src="' + cell.getAttribute('data-video') + '" controls autoplay playsinline></video>';
      } else {
        var img = cell.querySelector('img');
        body.innerHTML = '<img src="' + cell.getAttribute('data-img') + '" alt="' +
          (img ? img.getAttribute('alt') || '' : (cell.getAttribute('data-alt') || '')) + '">';
      }
      lb.classList.add('open');
      doc.body.style.overflow = 'hidden';
      closeBtn.focus();
    };

    [].forEach.call(cells, function (c) { c.addEventListener('click', function () { open(c); }); });
    closeBtn.addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) close();
    });
  }


  /* ---------- 3a. dropdown groups ---------- */
  [].forEach.call(doc.querySelectorAll('.acc'), function (acc) {
    var h = acc.querySelector('.acc-h'), b = acc.querySelector('.acc-b');
    h.addEventListener('click', function () {
      var o = !acc.classList.contains('open');
      acc.classList.toggle('open', o);
      h.setAttribute('aria-expanded', o ? 'true' : 'false');
      if (o) b.removeAttribute('inert'); else b.setAttribute('inert', '');
    });
  });

  /* ---------- 3b. audio player: track list + waveform + sticky player ---------- */
  var tracks = [].slice.call(doc.querySelectorAll('.track'));
  if (tracks.length) {
    var au = new Audio(); au.preload = 'none';
    var np = doc.getElementById('np');
    var npWf = np.querySelector('.np-wf');
    var cur = null, curBars = [], npBars = [];
    var fmt = function (t) { t = Math.floor(t || 0); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); };
    var bars = function (box, peaks) {
      box.innerHTML = '';
      var out = [];
      peaks.forEach(function (v) { var b = doc.createElement('b'); b.style.height = Math.round(v * 100) + '%'; box.appendChild(b); out.push(b); });
      return out;
    };
    var paint = function (list, ratio) {
      var n = Math.floor(list.length * ratio);
      for (var i = 0; i < list.length; i++) list[i].classList.toggle('p', i < n);
    };
    var seekTo = function (e, box) {
      var r = box.getBoundingClientRect(), x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      var go = function () { au.currentTime = au.duration * x; };
      if (au.duration) go(); else au.addEventListener('loadedmetadata', go, { once: true });
    };
    tracks.forEach(function (tr) {
      var id = tr.getAttribute('data-src').replace(/^.*\//, '').replace('.mp3', '');
      tr._bars = bars(tr.querySelector('.wf'), (window.PEAKS && window.PEAKS[id]) || []);
      tr._peaks = (window.PEAKS && window.PEAKS[id]) || [];
      tr._title = tr.querySelector('.tt').firstChild.textContent.trim();
    });
    var reset = function (tr) {
      tr.classList.remove('on', 'playing'); paint(tr._bars, 0);
      tr.querySelector('.tm').textContent = tr._dur || '';
    };
    var play = function (tr) {
      if (cur === tr) { au.paused ? au.play() : au.pause(); return; }
      if (cur) reset(cur);
      cur = tr; au.src = tr.getAttribute('data-src');
      tr.classList.add('on');
      var ac = tr.closest('.acc'); if (ac && !ac.classList.contains('open')) ac.querySelector('.acc-h').click();
      np.classList.add('show'); doc.body.classList.add('has-np');
      np.querySelector('.np-title').textContent = tr._title;
      npBars = bars(npWf, tr._peaks);
      au.play();
    };
    var step = function (d) {
      var i = tracks.indexOf(cur) + d;
      if (cur && i >= 0 && i < tracks.length) play(tracks[i]);
    };
    tracks.forEach(function (tr) {
      tr.querySelector('.tp').addEventListener('click', function () { play(tr); });
      tr.querySelector('.wf').addEventListener('click', function (e) {
        if (cur !== tr) play(tr);
        seekTo(e, this);
      });
      // show durations without downloading the audio
      var m = new Audio(); m.preload = 'metadata'; m.src = tr.getAttribute('data-src');
      m.addEventListener('loadedmetadata', function () {
        tr._dur = fmt(m.duration);
        if (cur !== tr) tr.querySelector('.tm').textContent = tr._dur;
      });
    });
    np.querySelector('.np-close').addEventListener('click', function () {
      au.pause();
      if (cur) { reset(cur); cur = null; }
      np.classList.remove('show', 'playing');
      doc.body.classList.remove('has-np');
    });
    npWf.addEventListener('click', function (e) { seekTo(e, npWf); });
    np.querySelector('.np-play').addEventListener('click', function () { au.paused ? au.play() : au.pause(); });
    np.querySelector('.np-prev').addEventListener('click', function () { step(-1); });
    np.querySelector('.np-next').addEventListener('click', function () { step(1); });
    au.addEventListener('play', function () { if (cur) cur.classList.add('playing'); np.classList.add('playing'); });
    au.addEventListener('pause', function () { if (cur) cur.classList.remove('playing'); np.classList.remove('playing'); });
    au.addEventListener('timeupdate', function () {
      if (!cur || !au.duration) return;
      var r = au.currentTime / au.duration;
      paint(cur._bars, r); paint(npBars, r);
      var t = fmt(au.currentTime) + ' / ' + fmt(au.duration);
      cur.querySelector('.tm').textContent = t; np.querySelector('.np-time').textContent = t;
    });
    au.addEventListener('ended', function () {
      var i = tracks.indexOf(cur);
      if (i < tracks.length - 1) { play(tracks[i + 1]); } else { reset(cur); np.classList.remove('playing'); cur = null; }
    });
  }

  /* ---------- 4. contact form (Formspree) ---------- */
  var form = doc.getElementById('contact-form');
  if (form) {
    var btn = form.querySelector('.submit-btn');
    var msgs = {
      ok: doc.getElementById('msg-ok'),
      err: doc.getElementById('msg-err'),
      setup: doc.getElementById('msg-setup')
    };
    var showMsg = function (key) {
      Object.keys(msgs).forEach(function (k) { msgs[k].hidden = (k !== key); });
      if (key) msgs[key].scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.getAttribute('action').indexOf('YOUR_FORM_ID') > -1) { showMsg('setup'); return; }
      btn.disabled = true;
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (r) {
        if (r.ok) { form.reset(); showMsg('ok'); } else { showMsg('err'); }
      }).catch(function () {
        showMsg('err');
      }).then(function () { btn.disabled = false; });
    });
  }
})();
