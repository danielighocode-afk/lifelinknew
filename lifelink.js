/* LIFELINK shared runtime — accounts, page guards, navigation and flow state.
   Front-end prototype: data lives in this browser's localStorage. A real launch needs a backend. */
(function () {
  'use strict';
  var P = 'll_';
  var LL = (window.LL = {
    get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(P + k)); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { localStorage.setItem(P + k, JSON.stringify(v)); },
    del: function (k) { localStorage.removeItem(P + k); },
    q: function (k) { return new URLSearchParams(location.search).get(k); },
    go: function (url) { location.href = url; },
    hash: function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'h' + (h >>> 0).toString(36); },
    naira: function (n) { return '₦' + Number(n).toLocaleString('en-NG'); },
    uid: function (p) { return p + Math.floor(10000 + Math.random() * 89999); },
    session: function () { return LL.get('session', null); },
    home: function (u) {
      u = u || LL.session();
      if (!u) return 'index.html';
      if (u.role === 'admin') return 'admin.html';
      if (u.role === 'provider') return u.profileDone ? 'provider-dashboard.html' : 'provider-onboarding.html';
      return u.onboarded ? 'dashboard.html' : 'personalize.html';
    },
    users: function () { return LL.get('users', []); },
    saveUser: function (u) {
      var all = LL.users(); var i = all.findIndex(function (x) { return x.id === u.id; });
      if (i >= 0) all[i] = u; else all.push(u);
      LL.set('users', all);
      var s = LL.session(); if (s && s.id === u.id) LL.set('session', u);
    },
    signOut: function () { LL.del('session'); LL.go('index.html'); },
    toast: function (msg) {
      var t = document.getElementById('ll-toast');
      if (!t) {
        t = document.createElement('div'); t.id = 'll-toast';
        t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:#0F172A;color:#fff;font:700 13px "Plus Jakarta Sans",sans-serif;padding:12px 18px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);opacity:0;transition:.25s;z-index:99999;max-width:90vw;text-align:center;pointer-events:none';
        document.body.appendChild(t);
      }
      t.textContent = msg; t.style.opacity = 1; t.style.transform = 'translateX(-50%) translateY(0)';
      clearTimeout(t._h); t._h = setTimeout(function () { t.style.opacity = 0; t.style.transform = 'translateX(-50%) translateY(20px)'; }, 2600);
    },
    soon: function (what) { LL.toast((what || 'This section') + ' is coming in the next release.'); }
  });

  /* ---- seed demo accounts (first run) ---- */
  if (!LL.get('seeded')) {
    LL.set('users', [
      { id: 'u1', name: 'Daniel Okoro', email: 'daniel@lifelink.ng', phone: '08031234567', pw: LL.hash('password123'), role: 'customer', onboarded: true },
      { id: 'u2', name: 'Chukwudi Nnamdi', email: 'chuks@lifelink.ng', phone: '08034567890', pw: LL.hash('password123'), role: 'provider', profileDone: true, business: 'Chuks Electrical', category: 'Electrical' },
      { id: 'u3', name: 'LIFELINK Admin', email: 'admin@lifelink.ng', phone: '08000000000', pw: LL.hash('admin12345'), role: 'admin' }
    ]);
    LL.set('seeded', 1);
  }

  /* ---- page guard ---- */
  var body = document.body, page = body.getAttribute('data-ll-page') || '', need = body.getAttribute('data-ll-role') || 'public';
  var me = LL.session();
  if (need !== 'public') {
    var file = location.pathname.split('/').pop() || 'index.html';
    if (!me) { LL.go('signin.html?next=' + encodeURIComponent(file) + (page === 'onboard' ? '&mode=signup&role=provider' : '')); return; }
    if (need !== 'any' && me.role !== need && me.role !== 'admin') { LL.go(LL.home(me)); return; }
  }

  var first = me ? me.name.split(' ')[0] : '';

  /* ---- helpers ---- */
  function norm(t) { return (t || '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2190-\u21FF✓★]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function onText(map, scope) {
    // map: { 'text start': url | function }
    (scope || document).querySelectorAll('a, button').forEach(function (el) {
      var t = norm(el.textContent), keys = Object.keys(map);
      for (var i = 0; i < keys.length; i++) {
        if (t === keys[i] || t.indexOf(keys[i]) === 0) {
          var dest = map[keys[i]];
          el.removeAttribute('onclick');
          if (el.tagName === 'A') el.removeAttribute('href');
          el.style.cursor = 'pointer';
          el.addEventListener('click', function (d) { return function (e) { e.preventDefault(); e.stopPropagation(); typeof d === 'function' ? d(e) : LL.go(d); }; }(dest), true);
          break;
        }
      }
    });
  }
  function brandHome() {
    // make the LIFELINK logo/brand block clickable on pages with no explicit home link
    var cands = document.querySelectorAll('header a, header div, nav a, nav div, aside a, aside div');
    for (var i = 0; i < cands.length; i++) {
      var el = cands[i];
      if (el.children.length < 4 && /^life\s?link\b/i.test(el.textContent.replace(/\s+/g, ' ').trim()) && el.textContent.trim().length < 40) {
        if (el.closest('button')) continue;
        el.style.cursor = 'pointer';
        el.addEventListener('click', function (e) { e.preventDefault(); LL.go(me ? LL.home(me) : 'index.html'); });
        return;
      }
    }
  }
  function replaceName(from, to) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) if (n.nodeValue.indexOf(from) > -1 && !/SCRIPT|STYLE/.test(n.parentNode.tagName)) list.push(n);
    list.forEach(function (t) { t.nodeValue = t.nodeValue.split(from).join(to); });
    document.querySelectorAll('img[alt*="' + from + '"]').forEach(function (i) { i.alt = i.alt.split(from).join(to); });
  }
  function replaceExact(from, to) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) if (n.nodeValue.trim() === from && !/SCRIPT|STYLE/.test(n.parentNode.tagName)) n.nodeValue = n.nodeValue.replace(from, to);
  }
  function pill(label, url, id) {
    var b = document.createElement('button'); b.id = id || '';
    b.textContent = label;
    b.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#059669;color:#fff;font:800 14px "Plus Jakarta Sans",sans-serif;padding:14px 24px;border-radius:999px;border:0;box-shadow:0 10px 30px rgba(5,150,105,.35);cursor:pointer;z-index:9990';
    b.onclick = function () { typeof url === 'function' ? url() : LL.go(url); };
    document.body.appendChild(b); return b;
  }
  function setBookingStatus(id, status) {
    var all = LL.get('bookings', []); all.forEach(function (b) { if (b.id === id) b.status = status; }); LL.set('bookings', all);
  }
  function currentBooking() {
    var all = LL.get('bookings', []), id = LL.q('id') || LL.get('currentBooking');
    return all.find(function (b) { return b.id === id; }) || all[all.length - 1] || null;
  }
  window.LL_helpers = { onText: onText, pill: pill, norm: norm };

  /* ---- floating account / page menu ---- */
  function menu() {
    var role = me && me.role;
    var links = [['Home', 'index.html']];
    if (!me) links.push(['Sign in', 'signin.html'], ['Become a provider', 'provider-onboarding.html']);
    if (role === 'customer' || role === 'admin') links.push(['Dashboard', 'dashboard.html'], ['Request a service', 'request.html'], ['AI assistant', 'ai-assistant.html'], ['Find providers', 'discovery.html'], ['My bookings', 'booking.html'], ['Trust & safety', 'trust-safety.html']);
    if (role === 'provider' || role === 'admin') links.push(['Provider dashboard', 'provider-dashboard.html'], ['Provider verification', 'provider-verification.html']);
    if (role === 'admin') links.push(['Admin center', 'admin.html']);
    links.push(['Mobile app preview', 'mobile-home.html'], ['Android preview', 'android-app.html']);
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:99990;font-family:"Plus Jakarta Sans",sans-serif';
    var btn = document.createElement('button');
    btn.innerHTML = '☰';
    btn.title = 'LIFELINK menu';
    btn.style.cssText = 'width:40px;height:40px;border-radius:14px;border:1px solid #e2e8f0;background:#fff;color:#0F172A;font-size:18px;font-weight:800;box-shadow:0 6px 18px rgba(15,23,42,.15);cursor:pointer;opacity:.85';
    var panel = document.createElement('div');
    panel.style.cssText = 'display:none;position:absolute;left:0;bottom:48px;width:230px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 18px 40px rgba(15,23,42,.2);padding:10px;max-height:70vh;overflow:auto';
    var h = '<div style="padding:8px 10px 10px;border-bottom:1px solid #f1f5f9;margin-bottom:6px"><div style="font-size:11px;font-weight:800;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase">' + (me ? role : 'Guest') + '</div><div style="font-size:13px;font-weight:800;color:#0f172a">' + (me ? me.name : 'Not signed in') + '</div></div>';
    links.forEach(function (l) { h += '<a href="' + l[1] + '" style="display:block;padding:8px 10px;border-radius:10px;font-size:13px;font-weight:700;color:#334155;text-decoration:none">' + l[0] + '</a>'; });
    h += '<div style="border-top:1px solid #f1f5f9;margin-top:6px;padding-top:6px">';
    if (me) h += '<a href="#" data-act="out" style="display:block;padding:8px 10px;border-radius:10px;font-size:13px;font-weight:800;color:#dc2626;text-decoration:none">Sign out</a>';
    h += '<a href="#" data-act="reset" style="display:block;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:700;color:#94a3b8;text-decoration:none">Reset demo data</a></div>';
    panel.innerHTML = h;
    panel.querySelectorAll('a').forEach(function (a) { a.onmouseover = function () { a.style.background = '#f1f5f9'; }; a.onmouseout = function () { a.style.background = ''; }; });
    panel.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]'); if (!a) return; e.preventDefault();
      if (a.getAttribute('data-act') === 'out') LL.signOut();
      else if (confirm('Clear all demo accounts, requests and bookings in this browser?')) { Object.keys(localStorage).filter(function (k) { return k.indexOf(P) === 0; }).forEach(function (k) { localStorage.removeItem(k); }); LL.go('index.html'); }
    });
    btn.onclick = function () { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; };
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) panel.style.display = 'none'; });
    wrap.appendChild(panel); wrap.appendChild(btn); document.body.appendChild(wrap);
  }

  /* ================= PER-PAGE WIRING ================= */
  var pages = {};

  pages.home = function () {
    var m = {
      'home': 'index.html', 'services': function () { var el = document.querySelector('section:nth-of-type(2)'); el ? el.scrollIntoView({ behavior: 'smooth' }) : LL.go('discovery.html'); },
      'how it works': function () { var el = document.getElementById('how') || document.querySelector('section:nth-of-type(2)'); el && el.scrollIntoView({ behavior: 'smooth' }); },
      'for providers': 'provider-onboarding.html', 'about': 'trust-safety.html',
      'log in': me ? LL.home(me) : 'signin.html', 'get started': me ? LL.home(me) : 'signin.html?mode=signup',
      'repair': 'discovery.html?cat=repair', 'cleaning': 'discovery.html?cat=cleaning', 'beauty': 'discovery.html?cat=beauty',
      'home services': 'discovery.html?cat=home', 'business': 'discovery.html?cat=business', 'more': 'discovery.html'
    };
    onText(m);
    if (me) document.querySelectorAll('a').forEach(function (a) { var t = norm(a.textContent); if (t === 'log in') a.textContent = 'My Dashboard'; if (t === 'get started') a.textContent = 'Continue'; });
    window.handleSearch = function () {
      var i = document.querySelector('input[type=text]'); var v = i ? i.value.trim() : '';
      if (me && me.role === 'customer') LL.go('request.html' + (v ? '?q=' + encodeURIComponent(v) : ''));
      else { LL.set('afterLogin', 'request.html' + (v ? '?q=' + encodeURIComponent(v) : '')); LL.go('discovery.html' + (v ? '?q=' + encodeURIComponent(v) : '')); }
    };
    var i = document.querySelector('input[type=text]'); if (i) i.addEventListener('keydown', function (e) { if (e.key === 'Enter') window.handleSearch(); });
  };

  pages.signin = function () {
    var mode = LL.q('mode') === 'signup' ? 'signup' : 'signin';
    var form = document.querySelector('form'), h1 = document.querySelector('h1'), sub = h1 && h1.nextElementSibling;
    var idIn = form.querySelector('input[type=text]'), pwIn = document.getElementById('passwordInput');
    var btn = form.querySelector('button[type=submit], button:not([type])') || form.querySelector('button:last-of-type');
    var extra = document.createElement('div');
    extra.className = 'space-y-4'; extra.style.display = 'none';
    var fieldCls = 'width:100%;border:1px solid #e2e8f0;border-radius:14px;padding:13px 14px;font:600 14px "Plus Jakarta Sans",sans-serif;background:#fff;outline:none';
    extra.innerHTML = '<input id="llName" placeholder="Full name" style="' + fieldCls + '">' +
      '<div style="display:flex;gap:8px"><label style="flex:1;border:1px solid #e2e8f0;border-radius:14px;padding:12px;font:700 13px \'Plus Jakarta Sans\';cursor:pointer;display:flex;gap:8px;align-items:center"><input type="radio" name="llRole" value="customer" checked> I need a service</label>' +
      '<label style="flex:1;border:1px solid #e2e8f0;border-radius:14px;padding:12px;font:700 13px \'Plus Jakarta Sans\';cursor:pointer;display:flex;gap:8px;align-items:center"><input type="radio" name="llRole" value="provider"> I\'m a professional</label></div>';
    form.insertBefore(extra, form.firstChild);
    var err = document.createElement('div'); err.style.cssText = 'color:#dc2626;font:700 12px "Plus Jakarta Sans";min-height:16px'; form.insertBefore(err, btn);
    var pre = LL.q('role'); if (pre === 'provider') extra.querySelector('input[value=provider]').checked = true;
    function setMode(m) {
      mode = m; var up = m === 'signup';
      extra.style.display = up ? 'block' : 'none'; err.textContent = '';
      h1.textContent = up ? 'Create your account' : 'Welcome back';
      if (sub) sub.textContent = up ? 'Join LIFELINK to book or offer trusted services.' : 'Sign in to find trusted professionals near you.';
      btn.textContent = up ? 'Create Account' : 'Sign In';
      var link = Array.prototype.find.call(document.querySelectorAll('a'), function (a) { return /create an account|sign in instead/i.test(a.textContent); });
      if (link) link.textContent = up ? 'Sign in instead' : 'Create an account';
      var lead = link && link.parentNode; if (lead && lead.firstChild && lead.firstChild.nodeType === 3) lead.firstChild.nodeValue = up ? 'Already have an account? ' : "Don't have a LIFELINK account? ";
    }
    idIn.placeholder = '08012345678 or name@example.com';
    onText({
      'create an account': function () { setMode('signup'); }, 'sign in instead': function () { setMode('signin'); },
      'need help': 'trust-safety.html',
      'forgot password': function () {
        var id = prompt('Enter the email or phone number on your account:'); if (!id) return;
        var u = LL.users().find(function (x) { return x.email === id.trim().toLowerCase() || x.phone === id.trim(); });
        if (!u) return alert('No account found with that email or phone.');
        var np = prompt('Choose a new password (min 8 characters):'); if (!np || np.length < 8) return alert('Password must be at least 8 characters.');
        u.pw = LL.hash(np); LL.saveUser(u); LL.toast('Password updated. You can sign in now.');
      },
      'continue with google': function () { LL.toast('Google sign-in is not connected yet. Use email or phone.'); }
    });
    window.handleSignIn = function (e) {
      e.preventDefault(); err.textContent = '';
      var id = idIn.value.trim().toLowerCase(), pw = pwIn.value, users = LL.users();
      if (mode === 'signup') {
        var name = document.getElementById('llName').value.trim(), role = extra.querySelector('input[name=llRole]:checked').value;
        if (name.length < 2) return err.textContent = 'Please enter your full name.';
        if (pw.length < 8) return err.textContent = 'Use a password of at least 8 characters.';
        if (users.some(function (u) { return u.email === id || u.phone === id; })) return err.textContent = 'An account with that email or phone already exists. Sign in instead.';
        var isMail = id.indexOf('@') > -1;
        var u = { id: LL.uid('u'), name: name, email: isMail ? id : '', phone: isMail ? '' : id, pw: LL.hash(pw), role: role, onboarded: false, profileDone: false };
        LL.saveUser(u); LL.set('session', u); return route(u, true);
      }
      var user = users.find(function (u) { return (u.email === id || u.phone === id) && u.pw === LL.hash(pw); });
      if (!user) return err.textContent = 'Incorrect email/phone or password.';
      LL.set('session', user); route(user, false);
    };
    function route(u, fresh) {
      var next = LL.q('next') || LL.get('afterLogin', null); LL.del('afterLogin');
      var home = LL.home(u);
      if (next && !fresh && home === next) return LL.go(next);
      if (next && !fresh && u.role === 'customer' && /^(request|discovery|compare|provider-profile)/.test(next)) return LL.go(next);
      LL.go(home);
    }
    form.setAttribute('onsubmit', 'handleSignIn(event)');
    if (mode === 'signup') setMode('signup');
    if (me) LL.toast('Signed in as ' + me.name + '. Signing in again will switch account.');
  };

  pages.personalize = function () {
    var done = function () {
      var picks = Array.prototype.map.call(document.querySelectorAll('button[onclick^="toggleServiceSelection"]'), function (b) {
        return /border-emerald-600|bg-emerald-50/.test(b.className) || b.classList.contains('active') ? b.textContent.replace(/[✓\s]+$/, '').trim() : null;
      }).filter(Boolean);
      var m = Object.assign({}, me); m.onboarded = true; m.interests = picks; LL.saveUser(m);
      LL.toast('Your marketplace is ready.'); setTimeout(function () { LL.go(LL.get('afterLogin', null) || 'dashboard.html'); LL.del('afterLogin'); }, 600);
    };
    window.completeOnboarding = done;
  };

  pages.dashboard = function () {
    var _p = me.name.split(' '); replaceName('Daniel O.', _p[0] + (_p[1] ? ' ' + _p[1].charAt(0) + '.' : ''));
    replaceName('Daniel', first);
    onText({
      'dashboard': 'dashboard.html', 'my bookings': 'booking.html', 'messages': function () { LL.soon('Messages'); }, 'wallet': function () { LL.soon('Wallet'); },
      'reviews': 'review.html', 'settings': 'settings.html', 'book new service': 'request.html', 'view all bookings': 'booking.html',
      'contact provider': 'booking.html?msg=1', 'view live tracking': 'tracking.html', 'view details': 'booking.html', 'book service': 'request.html'
    });
    var b = LL.get('bookings', []); if (b.length) LL.set('currentBooking', b[b.length - 1].id);
  };

  pages.request = function () {
    var q = LL.q('q'), cat = LL.q('cat'), ta = document.getElementById('issueInput'), prev = LL.get('request', null);
    if (q && ta) ta.value = q;
    if (LL.q('edit') && prev && ta) { ta.value = prev.description || ''; var l = document.getElementById('locationInput'); if (l) l.value = prev.location || l.value; }
    if (ta && typeof updateCharCount === 'function') try { updateCharCount(); } catch (e) {}
    var pro = LL.q('pro');
    if (pro) { var hdr = document.querySelector('h1'); if (hdr) { var n = document.createElement('div'); n.style.cssText = 'margin-top:8px;font:800 13px "Plus Jakarta Sans";color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;display:inline-block;padding:6px 14px'; n.textContent = 'Booking directly with ' + pro; hdr.parentNode.insertBefore(n, hdr.nextSibling); } }
    window.handleFindProfessionals = function (e) {
      e.preventDefault();
      var desc = (ta && ta.value.trim()) || '', sel = document.getElementById('categorySelect');
      if (desc.length < 5) { LL.toast('Please describe what you need (at least a few words).'); ta && ta.focus(); return; }
      var urgencyBtn = Array.prototype.find.call(document.querySelectorAll('button[onclick^="selectUrgency"]'), function (b) { return /emerald-(600|500)/.test(b.className) && /border-emerald/.test(b.className); });
      var req = { id: 'LL-' + LL.uid(''), customerId: me.id, customer: me.name, description: desc, category: sel ? sel.options[sel.selectedIndex].text : 'General',
        location: (document.getElementById('locationInput') || {}).value || 'Benin City', urgency: urgencyBtn ? norm(urgencyBtn.textContent).split(' ')[0] : 'normal', createdAt: Date.now(), status: 'open', direct: pro || null };
      LL.set('request', req); var all = LL.get('requests', []); all.push(req); LL.set('requests', all);
      if (pro) {
        var price = Number(LL.q('price')) || 18500;
        LL.set('quote', { requestId: req.id, provider: pro, price: price, arrival: '45 min' }); return LL.go('payment.html');
      }
      LL.go('compare-quotes.html');
    };
  };

  pages.assistant = function () {
    onText({ 'back': 'dashboard.html', 'find technicians': function () { var t = document.querySelector('textarea,input[type=text]'); LL.go('request.html' + (t && t.value ? '?q=' + encodeURIComponent(t.value) : '')); } });
  };

  pages.discovery = function () {
    onText({ 'lifelink': 'index.html', 'explore services': 'discovery.html', 'how it works': 'index.html#how', 'become a provider': 'provider-onboarding.html' });
    var cat = LL.q('cat') || LL.q('q'); if (cat) { var s = document.querySelector('input[type=text],input[type=search]'); if (s && !s.value) { s.value = cat; s.dispatchEvent(new Event('input')); } }
    var lastPro = null, origOpen = window.openBookingModal;
    window.openBookingModal = function (id, e) {
      if (origOpen) origOpen(id, e);
      var n = document.getElementById('modalProName'); lastPro = n ? n.innerText : null;
    };
    window.confirmBooking = function () {
      var name = (document.getElementById('modalProName') || {}).innerText || lastPro || 'Provider';
      if (!me) { LL.set('afterLogin', 'request.html?pro=' + encodeURIComponent(name)); return LL.go('signin.html?next=request.html'); }
      LL.go('request.html?pro=' + encodeURIComponent(name));
    };
  };

  pages.profile = function () {
    onText({ 'find providers': 'discovery.html', 'how safety works': 'trust-safety.html', 'pricing & guarantee': 'trust-safety.html', 'home': 'index.html', 'edo state': 'discovery.html', 'benin city': 'discovery.html', 'electricians': 'discovery.html?cat=electrical' });
    if (me && me.role === 'provider') { var b = document.querySelectorAll('button'); b.forEach(function (x) { if (/^book now|^select/i.test(x.textContent.trim())) x.style.display = 'none'; }); }
    window.confirmBooking = function () {
      if (!me) { LL.set('afterLogin', 'request.html?pro=Chuks%20Electrical'); return LL.go('signin.html?next=request.html'); }
      LL.go('request.html?pro=Chuks%20Electrical&price=18500');
    };
  };

  pages.payment = function () {
    var qt = LL.get('quote', null);
    if (qt && typeof baseServicePrice !== 'undefined') {
      baseServicePrice = Number(qt.price); baseServiceFee = Math.round(baseServicePrice * 0.05);
      var spans = document.querySelectorAll('span'); spans.forEach(function (s) { var t = s.textContent.trim(); if (t === '₦22,000') s.textContent = LL.naira(baseServicePrice); else if (t === '₦1,100') s.textContent = LL.naira(baseServiceFee); else if (t === '-₦1,100') s.textContent = '-' + LL.naira(baseServiceFee); });
      replaceName('Chuks Electrical', qt.provider);
      if (typeof updateTotals === 'function') try { updateTotals(); } catch (e) {}
      var tot = baseServicePrice + baseServiceFee, pb = document.getElementById('pay-btn-label'); if (pb) pb.textContent = 'Pay ' + LL.naira(tot);
    }
    var origPay = window.processPayment;
    window.processPayment = function () {
      var req = LL.get('request', {}) , tot = (qt ? Number(qt.price) : 22000);
      var bk = { id: 'LL-' + LL.uid(''), customerId: me.id, requestId: req.id, provider: qt ? qt.provider : 'Provider', price: tot, category: req.category || 'Service', description: req.description || '', location: req.location || 'Benin City', status: 'paid', createdAt: Date.now() };
      var all = LL.get('bookings', []); all.push(bk); LL.set('bookings', all); LL.set('currentBooking', bk.id);
      origPay && origPay();
    };
    window.handleBackNavigation = function () { if (confirm('Leave checkout? Your booking slot will be released.')) LL.go('compare-quotes.html'); };
    var done = function () { LL.go('booking.html?id=' + LL.get('currentBooking')); };
    onText({ 'view booking details': done, 'back to booking': window.handleBackNavigation });
    var vb = Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return /view booking details/i.test(b.textContent); });
    if (vb) vb.onclick = done;
  };

  pages.booking = function () {
    var b = currentBooking();
    if (b) { replaceName('LL-28491', b.id); replaceName('Chuks Electrical', b.provider); replaceName('Chuks', b.provider.split(' ')[0]); replaceName('₦18,500', LL.naira(b.price)); }
    document.querySelectorAll('a').forEach(function (a) { if (!a.getAttribute('href') || a.getAttribute('href') === '#') { if (/bookings list|back/i.test(a.getAttribute('onclick') || '') || a.querySelector('svg,i')) { a.removeAttribute('onclick'); a.addEventListener('click', function (e) { e.preventDefault(); LL.go(me.role === 'provider' ? 'provider-dashboard.html' : 'dashboard.html'); }, true); } } });
    window.confirmCancellation = function () { if (b) setBookingStatus(b.id, 'cancelled'); LL.toast('Booking cancelled. Escrow refund started.'); setTimeout(function () { LL.go('dashboard.html'); }, 1200); };
    var bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);display:flex;gap:8px;z-index:9990;background:#fff;padding:8px;border-radius:999px;border:1px solid #e2e8f0;box-shadow:0 12px 30px rgba(15,23,42,.18);font-family:"Plus Jakarta Sans",sans-serif;flex-wrap:wrap;justify-content:center;max-width:94vw';
    [['Track live', 'tracking.html', '#059669', '#fff'], ['Leave a review', 'review.html', '#ecfdf5', '#047857'], ['Report a problem', 'dispute.html', '#fff1f2', '#be123c']].forEach(function (x) {
      var a = document.createElement('a'); a.href = x[1]; a.textContent = x[0]; a.style.cssText = 'padding:10px 16px;border-radius:999px;font-weight:800;font-size:13px;text-decoration:none;background:' + x[2] + ';color:' + x[3]; bar.appendChild(a);
    });
    document.body.appendChild(bar);
    if (LL.q('msg') && typeof openMessageModal === 'function') setTimeout(openMessageModal, 400);
  };

  pages.tracking = function () {
    onText({ 'back to home': 'dashboard.html' });
    var b = currentBooking(); if (b) { replaceName('Chuks Electrical', b.provider); replaceName('Chuks', b.provider.split(' ')[0]); }
    pill('Job complete — leave a review', function () { var bk = currentBooking(); if (bk) setBookingStatus(bk.id, 'completed'); LL.go('review.html'); });
  };

  pages.review = function () {
    var b = currentBooking();
    if (b) replaceName('Chuks Electrical', b.provider);
    window.handleBackClick = function () { LL.go('booking.html'); };
    window.closeModalAndRedirect = function () {
      var bk = currentBooking(); if (bk) { var all = LL.get('bookings', []); all.forEach(function (x) { if (x.id === bk.id) { x.status = 'completed'; x.reviewed = true; } }); LL.set('bookings', all); }
      LL.go('dashboard.html');
    };
    onText({ 'back to bookings': 'booking.html', 'return to dashboard': window.closeModalAndRedirect });
  };

  pages.dispute = function () {
    brandHome();
    window.closeDisputeModal = (function (orig) { return function () { orig && orig(); LL.go('dashboard.html'); }; })(window.closeDisputeModal);
    onText({ 'return to my disputes': function () { LL.go('dashboard.html'); } });
  };

  pages.trust = function () {
    onText({ 'life link trust & safety': me ? LL.home(me) : 'index.html', 'dashboard': me ? LL.home(me) : 'index.html', 'security': 'settings.html' });
  };

  pages.onboard = function () {
    onText({ 'provider sign in': 'signin.html?role=provider', 'chat support': 'trust-safety.html' });
    if (me) {
      var set = function (id, v) { var e = document.getElementById(id); if (e && v) e.value = v; };
      set('fullName', me.name); set('email', me.email); set('phoneNumber', me.phone);
    }
    window.nextStep = (function (orig) {
      return function () {
        if (typeof currentStep !== 'undefined' && typeof totalSteps !== 'undefined' && currentStep >= totalSteps) {
          var m = Object.assign({}, me); m.profileDone = true; m.business = (document.getElementById('businessName') || {}).value || m.name; m.category = (document.getElementById('mainCategory') || {}).value || ''; LL.saveUser(m);
          LL.toast('Application submitted. Next: verify your identity.'); return setTimeout(function () { LL.go('provider-verification.html'); }, 900);
        }
        orig();
      };
    })(window.nextStep);
  };

  pages.verify = function () {
    var steps = LL.get('verifySteps', {});
    window.submitVerification = function () {
      steps.done = (steps.done || 0) + 1; LL.set('verifySteps', steps);
      var m = Object.assign({}, me); m.verification = 'pending'; LL.saveUser(m);
      LL.toast('Documents submitted. We\'ll review them shortly.'); if (typeof closeVerificationModal === 'function') closeVerificationModal();
      if (!document.getElementById('ll-cont')) pill('Continue to dashboard →', 'provider-dashboard.html', 'll-cont');
    };
    if (steps.done && !document.getElementById('ll-cont')) pill('Continue to dashboard →', 'provider-dashboard.html', 'll-cont');
    brandHome();
  };

  pages.pdash = function () {
    replaceName('Chukwudi', first); if (me.business) replaceName('Chuks Electrical', me.business);
    onText({
      'dashboard': 'provider-dashboard.html', 'jobs': 'provider-request.html', 'messages': function () { LL.soon('Messages'); }, 'customers': function () { LL.soon('Customers'); },
      'earnings': function () { LL.soon('Earnings'); }, 'reviews': function () { LL.soon('Reviews'); }, 'profile': 'provider-profile.html', 'settings': 'settings.html',
      'view full schedule': function () { LL.soon('Schedule'); }, 'message': function () { LL.soon('Messages'); }, 'view job': 'provider-request.html',
      'set availability': function () { var a = !LL.get('available', true); LL.set('available', a); LL.toast(a ? 'You are now available for new jobs.' : 'You are now marked unavailable.'); },
      'withdraw to bank account': function () { LL.toast('Payouts open once payments go live.'); }
    });
    var open = LL.get('requests', []).filter(function (r) { return r.status === 'open'; });
    if (open.length) { var jobs = Array.prototype.find.call(document.querySelectorAll('a'), function (a) { return /^jobs/i.test(norm(a.textContent)); }); if (jobs) { var bd = jobs.querySelector('span:last-child'); if (bd && /new/i.test(bd.textContent)) bd.textContent = open.length + ' New'; } }
  };

  pages.preq = function () {
    var open = LL.get('requests', []).filter(function (r) { return r.status === 'open'; }), r = open[open.length - 1];
    if (r) {
      var h2 = document.querySelector('h2'); if (h2) h2.textContent = r.category + ' Services';
      replaceExact('\u201CMy AC is blowing air but the room isn\'t getting cold.\u201D', '\u201C' + r.description + '\u201D');
      replaceExact('"My AC is blowing air but the room isn\'t getting cold."', '"' + r.description + '"');
      replaceName('#REQ-7749', '#' + r.id); replaceExact('Benin City', r.location);
      replaceExact('Today, 4:00 PM', { normal: 'Scheduled day', soon: 'Within 2–4 hours', emergency: 'Emergency — immediate' }[r.urgency] || 'Scheduled day');
      replaceName('Verified Client', 'Verified Client • ' + r.customer.split(' ')[0]);
    }
    var pr = document.getElementById('quotePrice');
    function submitQuote() {
      var price = pr ? Number(pr.value) : 0; if (!price || price < 1000) { LL.toast('Enter a valid quote amount.'); return false; }
      var arr = document.getElementById('estArrival'); var qs = LL.get('quotes', []);
      qs.push({ requestId: r ? r.id : null, providerId: me.id, provider: me.business || me.name, price: price, arrival: arr ? arr.options[arr.selectedIndex].text : '45 min', message: (document.getElementById('quoteMessage') || {}).value || '', rating: 4.8, trust: 90, jobs: 40, createdAt: Date.now() });
      LL.set('quotes', qs); replaceExact('₦22,500', LL.naira(price)); return true;
    }
    var sendBtn = Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return /^send quote/i.test(b.textContent.trim()); });
    if (sendBtn) sendBtn.addEventListener('click', function () { submitQuote(); }, true);
    window.handleDecline = function () {
      if (!confirm('Decline this request?')) return;
      if (r) { var all = LL.get('requests', []); all.forEach(function (x) { if (x.id === r.id) x.declinedBy = (x.declinedBy || []).concat(me.id); }); LL.set('requests', all); }
      LL.go('provider-dashboard.html');
    };
    window.closeQuoteModal = function () { LL.go('provider-dashboard.html'); };
    onText({ 'return to dashboard': 'provider-dashboard.html' }); brandHome();
    var back = document.querySelector('header a, header button'); if (back && !/life/i.test(back.textContent)) back.addEventListener('click', function (e) { e.preventDefault(); LL.go('provider-dashboard.html'); });
  };

  pages.admin = function () {
    onText({ 'overview': 'admin.html', 'users': function () { LL.soon('User management'); }, 'providers': function () { LL.soon('Provider management'); }, 'bookings': function () { LL.soon('Bookings'); },
      'payments': function () { LL.soon('Payments'); }, 'disputes': function () { LL.soon('Disputes'); }, 'reviews': function () { LL.soon('Reviews'); }, 'verification': function () { LL.soon('Verification queue'); },
      'categories': function () { LL.soon('Categories'); }, 'locations': function () { LL.soon('Locations'); }, 'analytics': function () { LL.soon('Analytics'); }, 'settings': 'settings.html' });
    document.querySelectorAll('button').forEach(function (b) {
      var t = norm(b.textContent);
      if (t === 'approve verification' || t === 'reject') b.addEventListener('click', function () {
        var card = b.closest('[class*="rounded"]'); var wrapCard = card && card.parentElement && card.parentElement.children.length > 1 ? card : null;
        LL.toast(t === 'reject' ? 'Application rejected.' : 'Provider verified.');
        var users = LL.users().filter(function (u) { return u.role === 'provider' && u.verification === 'pending'; });
        if (t !== 'reject' && users[0]) { users[0].verification = 'verified'; LL.saveUser(users[0]); }
        if (wrapCard) { wrapCard.style.transition = '.3s'; wrapCard.style.opacity = 0; setTimeout(function () { wrapCard.remove(); }, 300); }
      }, true);
    });
  };

  pages.compare = function () {
    var req = LL.get('request', null) || { id: 'LL-8920', description: 'AC repair — Not cooling properly', location: 'Benin City, Edo State' };
    replaceName('AC repair — Not cooling properly', req.description.length > 60 ? req.description.slice(0, 57) + '…' : req.description);
    replaceName('Request #LL-8920', 'Request #' + req.id); replaceName('Benin City, Edo State', req.location);
    var seeds = [
      { provider: 'Chuks Cooling Services', price: 22000, rating: 4.9, reviews: 142, arrival: 35, trust: 94, jobs: 187, area: 'Master AC Specialist • GRA, Benin City', img: 'photo-1560250097-0b93528c311a' },
      { provider: 'Benin Chill Techs', price: 19500, rating: 4.7, reviews: 96, arrival: 50, trust: 89, jobs: 120, area: 'AC & Refrigeration • Ugbowo, Benin City', img: 'photo-1507003211169-0a1dd7228f2d' },
      { provider: 'Osagie Air & Power', price: 25000, rating: 4.8, reviews: 110, arrival: 25, trust: 91, jobs: 156, area: 'Cooling Engineer • Sapele Road, Benin City', img: 'photo-1472099645785-5658abf4ff4e' }
    ];
    var real = LL.get('quotes', []).filter(function (q) { return q.requestId === req.id; }).map(function (q) {
      var mins = parseInt((q.arrival.match(/\d+/) || [45])[0], 10); if (/hour|hr/i.test(q.arrival)) mins *= 60;
      return { provider: q.provider, price: q.price, rating: q.rating || 4.8, reviews: 24, arrival: mins, trust: q.trust || 90, jobs: q.jobs || 40, area: 'Verified Professional • Benin City', img: 'photo-1500648767791-00dcc994a43e', live: true };
    });
    var list = real.concat(seeds), box = document.getElementById('quotes-container');
    var star = '<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>';
    function card(q, i) {
      var best = i === 0;
      return '<div class="quote-card bg-white rounded-3xl p-6 sm:p-7 border-2 ' + (best ? 'border-emerald-500 shadow-md' : 'border-slate-200 shadow-xs') + ' relative overflow-hidden space-y-6" data-price="' + q.price + '" data-rating="' + q.rating + '" data-arrival="' + q.arrival + '" data-trust="' + q.trust + '">' +
        (best ? '<div class="best-ribbon absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold tracking-wider uppercase px-4 py-1 rounded-bl-2xl">★ LIFELINK Recommended Choice</div>' : '') +
        (q.live ? '<div class="absolute top-0 left-0 bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-3 py-1 rounded-br-2xl">New quote for your request</div>' : '') +
        '<div class="flex flex-col md:flex-row md:items-center justify-between gap-6"><div class="flex items-start gap-4">' +
        '<div class="relative shrink-0"><img src="https://images.unsplash.com/' + q.img + '?auto=format&fit=crop&q=80&w=200" alt="' + q.provider + '" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-100"></div>' +
        '<div class="space-y-1"><div class="flex items-center gap-2 flex-wrap"><h3 class="text-lg font-extrabold text-slate-900">' + q.provider + '</h3><span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">Verified Identity</span></div>' +
        '<p class="text-xs font-semibold text-emerald-700">' + q.area + '</p>' +
        '<div class="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-600 pt-1"><span class="flex items-center gap-1 text-amber-500">' + star + ' ' + q.rating + ' <span class="text-slate-400 font-semibold">(' + q.reviews + ' reviews)</span></span><span class="text-slate-300">•</span><span class="text-emerald-700">Trust Score: <strong>' + q.trust + '/100</strong></span><span class="text-slate-300">•</span><span>' + q.jobs + ' completed jobs</span></div></div></div>' +
        '<div class="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0 gap-3"><div class="text-left md:text-right"><span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Quote</span><span class="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">' + LL.naira(q.price) + '</span><span class="text-[11px] font-bold text-slate-500 block mt-0.5">Est. Arrival: <strong class="text-slate-900">' + (q.arrival >= 60 ? Math.round(q.arrival / 60) + ' hr' : q.arrival + ' min') + '</strong></span></div>' +
        '<div class="flex items-center gap-2"><button data-view="' + i + '" class="bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs px-4 py-3 rounded-xl border border-slate-200 transition">View Profile</button>' +
        '<button data-accept="' + i + '" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl shadow-md shadow-emerald-600/20 transition">Accept Quote</button></div></div></div></div>';
    }
    function render(l) { box.innerHTML = l.map(card).join(''); }
    render(list);
    var cnt = document.querySelector('header .animate-pulse'); if (cnt && cnt.nextElementSibling) cnt.nextElementSibling.textContent = list.length + ' Responses Received';
    window.sortQuotes = function (by) {
      var l = list.slice();
      if (by === 'price') l.sort(function (a, b) { return a.price - b.price; });
      else if (by === 'rating') l.sort(function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; });
      else if (by === 'arrival') l.sort(function (a, b) { return a.arrival - b.arrival; });
      else l = list.slice();
      list = by === 'best' ? list : list; render(l); view = l;
      ['best', 'price', 'rating', 'arrival'].forEach(function (k) {
        var b = document.getElementById('filter-' + k); if (!b) return; var on = k === by;
        b.className = (on ? 'filter-btn-active border-emerald-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200') + ' px-4 py-2.5 rounded-xl text-xs font-bold border transition shrink-0';
      });
    };
    var view = list;
    window.acceptQuote = function (q) {
      LL.set('quote', { requestId: req.id, provider: q.provider, price: q.price, arrival: q.arrival + ' min' });
      var all = LL.get('requests', []); all.forEach(function (r) { if (r.id === req.id) { r.status = 'accepted'; r.provider = q.provider; } }); LL.set('requests', all);
      LL.go('payment.html');
    };
    window.editRequest = function () { LL.go('request.html?edit=1'); };
    window.openProfileModal = function (q) {
      var m = document.createElement('div'); m.className = 'modal-backdrop'; m.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99980;padding:16px';
      m.innerHTML = '<div style="background:#fff;border-radius:24px;max-width:420px;width:100%;padding:26px;font-family:\'Plus Jakarta Sans\',sans-serif"><div style="display:flex;gap:14px;align-items:center"><img src="https://images.unsplash.com/' + q.img + '?auto=format&fit=crop&q=80&w=160" style="width:64px;height:64px;border-radius:16px;object-fit:cover"><div><div style="font-weight:800;font-size:18px;color:#0f172a">' + q.provider + '</div><div style="font-size:12px;font-weight:700;color:#047857">' + q.area + '</div></div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0;text-align:center"><div style="background:#f8fafc;border-radius:14px;padding:12px"><b style="font-size:18px">' + q.rating + '</b><div style="font-size:11px;color:#64748b;font-weight:700">Rating</div></div><div style="background:#f8fafc;border-radius:14px;padding:12px"><b style="font-size:18px">' + q.trust + '</b><div style="font-size:11px;color:#64748b;font-weight:700">Trust /100</div></div><div style="background:#f8fafc;border-radius:14px;padding:12px"><b style="font-size:18px">' + q.jobs + '</b><div style="font-size:11px;color:#64748b;font-weight:700">Jobs done</div></div></div>' +
        '<div style="display:flex;gap:8px"><button id="mClose" style="flex:1;padding:12px;border-radius:14px;border:1px solid #e2e8f0;background:#fff;font-weight:800;cursor:pointer">Close</button><a href="provider-profile.html" style="flex:1;padding:12px;border-radius:14px;background:#059669;color:#fff;font-weight:800;text-align:center;text-decoration:none">Full profile</a></div></div>';
      m.addEventListener('click', function (e) { if (e.target === m || e.target.id === 'mClose') m.remove(); }); document.body.appendChild(m);
    };
    box.addEventListener('click', function (e) {
      var a = e.target.closest('[data-accept]'), v = e.target.closest('[data-view]');
      if (a) window.acceptQuote(view[+a.getAttribute('data-accept')]); if (v) window.openProfileModal(view[+v.getAttribute('data-view')]);
    });
    document.querySelectorAll('header a').forEach(function (a) { if (a.getAttribute('href') === '#') { a.addEventListener('click', function (e) { e.preventDefault(); LL.go('request.html'); }); } });
  };

  pages.settings = function () { /* built-in page */ };
  pages.mobile = function () {}; pages.android = function () {};

  /* ---- run ---- */
  document.addEventListener('DOMContentLoaded', run);
  if (document.readyState !== 'loading') run();
  var ran = false;
  function run() {
    if (ran) return; ran = true;
    try { if (pages[page]) pages[page](); } catch (e) { console.error('LIFELINK wiring error on ' + page, e); }
    if (page !== 'signin' && page !== 'settings') try { brandHomeIfNeeded(); } catch (e) {}
    menu();
  }
  function brandHomeIfNeeded() { if (['home', 'dashboard', 'pdash', 'admin', 'mobile', 'android', 'preq', 'dispute', 'verify'].indexOf(page) < 0) brandHome(); }
})();
