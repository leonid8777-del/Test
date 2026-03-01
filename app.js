/* ============================================================
   Liquidato – app.js
   Offline SPA | No build | No CDN | file:// kompatibel
   localStorage Key: LIQ_DB_V1
   ============================================================ */

/* ============================================================
   1. CONSTANTS & HELPERS
   ============================================================ */
var DB_KEY = 'LIQ_DB_V1';
var REMINDER_KEY = 'LIQ_REMINDER_LAST_RUN_V1';

var STATUS_LABELS = {
  EINGEGANGEN:              'Eingegangen',
  IN_ANALYSE:               'In Prüfung',
  RUECKFRAGEN:              'Rückfragen',
  BEWERTUNG:                'Bewertung',
  ANGEBOT_GESENDET:         'Angebot gesendet',
  ANGEBOT_ANGENOMMEN:       'Angebot angenommen',
  ANGEBOT_ABGELEHNT:        'Abgelehnt',
  IM_NETZWERK_ANGEBOTEN:    'Im Netzwerk',
  GEBOTE_VORHANDEN:         'Gebote vorhanden',
  PREISREDUZIERUNG_ANGEFRAGT:'Preisreduzierung angefragt',
  ANGEBOT_ANGEPASST:        'Angebot angepasst',
  KEINE_GEBOTE:             'Keine Gebote'
};

var STATUS_BADGE_CLASS = {
  EINGEGANGEN:               'badge-gray',
  IN_ANALYSE:                'badge-blue',
  RUECKFRAGEN:               'badge-orange',
  BEWERTUNG:                 'badge-orange',
  ANGEBOT_GESENDET:          'badge-primary',
  ANGEBOT_ANGENOMMEN:        'badge-green',
  ANGEBOT_ABGELEHNT:         'badge-red',
  IM_NETZWERK_ANGEBOTEN:     'badge-blue',
  GEBOTE_VORHANDEN:          'badge-orange',
  PREISREDUZIERUNG_ANGEFRAGT:'badge-orange',
  ANGEBOT_ANGEPASST:         'badge-primary',
  KEINE_GEBOTE:              'badge-gray'
};

var ALLOWED_TRANSITIONS = {
  EINGEGANGEN:               ['IN_ANALYSE'],
  IN_ANALYSE:                ['RUECKFRAGEN','BEWERTUNG'],
  RUECKFRAGEN:               ['IN_ANALYSE','BEWERTUNG'],
  BEWERTUNG:                 ['ANGEBOT_GESENDET','IM_NETZWERK_ANGEBOTEN'],
  ANGEBOT_GESENDET:          ['ANGEBOT_ANGENOMMEN','ANGEBOT_ABGELEHNT'],
  IM_NETZWERK_ANGEBOTEN:     ['GEBOTE_VORHANDEN','KEINE_GEBOTE'],
  GEBOTE_VORHANDEN:          ['PREISREDUZIERUNG_ANGEFRAGT','ANGEBOT_GESENDET'],
  PREISREDUZIERUNG_ANGEFRAGT:['ANGEBOT_ANGEPASST'],
  ANGEBOT_ANGEPASST:         ['ANGEBOT_ANGENOMMEN','ANGEBOT_ABGELEHNT'],
  ANGEBOT_ANGENOMMEN:        [],
  ANGEBOT_ABGELEHNT:         [],
  KEINE_GEBOTE:              []
};

var UPLOAD_ALLOWED_EXTS = [
  '.jpg','.jpeg','.png','.webp','.gif',
  '.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx',
  '.csv','.txt','.zip','.7z','.rar'
];
var UPLOAD_MAX_TOTAL_MB = 100;

var WIZARD_STEPS = [
  { idx: 1, label: 'Kontakt' },
  { idx: 2, label: 'Posten­profil' },
  { idx: 3, label: 'Logistik & Medien' },
  { idx: 4, label: 'Preisvorstellung' },
  { idx: 5, label: 'Prüfen & Absenden' }
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nowIso() { return new Date().toISOString(); }

function fmtDate(iso) {
  if (!iso) return '–';
  var d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '–';
  var d = new Date(iso);
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function esc(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function randomToken() {
  var arr = [];
  for (var i = 0; i < 32; i++) arr.push(Math.floor(Math.random() * 36).toString(36));
  return arr.join('');
}

function hashSimple(str) {
  // Simple proto hash – NOT cryptographic, for demo only
  var h = 5381;
  for (var i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h = h & h; }
  return 'sha:' + Math.abs(h).toString(16);
}

function checkPassword(plain, stored) {
  if (!stored) return false;
  if (stored.startsWith('sha:')) return stored === hashSimple(plain);
  return stored === plain;
}

/* ============================================================
   2. DB: LOAD / SAVE / SEED
   ============================================================ */
function dbLoad() {
  try {
    var raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

function dbSave(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) {}
}

function dbEmpty() {
  return {
    users: [],
    sessions: { currentUserId: null, createdAt: null },
    tokens: [],
    requests: [],
    emailsOutbox: [],
    settings: {
      supportPhone: '+49 89 1234567',
      supportEmail: 'ankauf@liquidato.de',
      privacyUrl: '#/datenschutz',
      uploadLimitMb: 100,
      networkAndBidsEnabled: true,
      bitrix: {
        enabled: false,
        webhookUrl: '',
        entityType: 'deal',
        fieldMapping: {},
        stageMapping: {}
      }
    }
  };
}

function dbSeed(db) {
  // Admin user
  if (!db.users.find(function(u){ return u.email === 'admin@liquidato.local'; })) {
    db.users.push({
      id: 'u_admin_01',
      role: 'admin',
      email: 'admin@liquidato.local',
      phone: '',
      passwordHashOrPlain: hashSimple('admin'),
      createdAt: '2024-01-01T10:00:00.000Z'
    });
  }
  // Demo vendor
  var demoVendor = db.users.find(function(u){ return u.email === 'demo@anbieter.local'; });
  if (!demoVendor) {
    demoVendor = {
      id: 'u_demo_vendor',
      role: 'vendor',
      email: 'demo@anbieter.local',
      phone: '+49 151 9876543',
      passwordHashOrPlain: hashSimple('demo123'),
      company: 'Demo Handels GmbH',
      name: 'Max Mustermann',
      createdAt: '2024-06-01T09:00:00.000Z'
    };
    db.users.push(demoVendor);
  }
  // Demo request
  if (!db.requests.find(function(r){ return r.ownerUserId === 'u_demo_vendor'; })) {
    var reqId = 'req_demo_01';
    db.requests.push({
      id: reqId,
      ownerUserId: 'u_demo_vendor',
      createdAt: '2024-06-15T10:30:00.000Z',
      updatedAt: '2024-06-16T08:00:00.000Z',
      status: 'IN_ANALYSE',
      consent: {
        privacyAcceptedAt: '2024-06-15T10:30:00.000Z',
        networkOptIn: true,
        allowOnlineListing: false
      },
      contact: {
        email: 'demo@anbieter.local',
        phone: '+49 151 9876543',
        name: 'Max Mustermann',
        company: 'Demo Handels GmbH',
        shortDesc: 'Gemischte Elektronik-Retouren aus Online-Handel'
      },
      postProfile: {
        postenart: 'retouren',
        qualitaet: 'gemischt',
        mixedSubgrades: ['A','B'],
        kategorien: ['elektronik','haushalt'],
        beschreibung: 'Ca. 2.000 Einheiten Elektronik und Haushaltsgeräte, überwiegend ungeöffnet, einige mit leichten Beschädigungen. Aus regelmäßiger Rücknahme aus Onlinehandel.',
        firstHand: true,
        restrictions: false
      },
      logistics: {
        plz: '80331',
        ort: 'München',
        land: 'DE',
        palletStatus: 'palettiert',
        palletCount: 12,
        pieceCount: 2000,
        volumeM3: 28,
        readyFrom: '2024-07-01',
        deadlineType: 'flexibel',
        deadlineDate: null,
        uploads: [],
        links: []
      },
      price: {
        estValue: 45000,
        wishPrice: 18000,
        minAcceptable: 12000,
        priceBasis: 'gesamt',
        vatMode: 'regelbesteuerung'
      },
      risk: {},
      offers: [],
      bids: [],
      messages: [],
      timeline: [
        { id: uid(), type: 'status_change', actor: 'system', at: '2024-06-15T10:30:00.000Z', payload: { from: null, to: 'EINGEGANGEN', note: 'Anfrage eingegangen' } },
        { id: uid(), type: 'status_change', actor: 'admin', at: '2024-06-16T08:00:00.000Z', payload: { from: 'EINGEGANGEN', to: 'IN_ANALYSE', note: 'Prüfung gestartet' } }
      ]
    });
    // Compute risk for demo request
    var db2 = db;
    var req = db2.requests[db2.requests.length - 1];
    req.risk = computeRisk(req);
  }
}

function dbInit() {
  var db = dbLoad();
  if (!db) {
    db = dbEmpty();
    dbSeed(db);
    dbSave(db);
  }
  return db;
}

function dbLoadFresh() { return dbLoad() || dbEmpty(); }

/* ============================================================
   3. SESSION / AUTH
   ============================================================ */
function sessionGet() {
  var db = dbLoadFresh();
  if (!db.sessions || !db.sessions.currentUserId) return null;
  return db.users.find(function(u){ return u.id === db.sessions.currentUserId; }) || null;
}

function sessionSet(userId) {
  var db = dbLoadFresh();
  db.sessions = { currentUserId: userId, createdAt: nowIso() };
  dbSave(db);
}

function sessionClear() {
  var db = dbLoadFresh();
  db.sessions = { currentUserId: null, createdAt: null };
  dbSave(db);
}

function requireAuth(role) {
  var user = sessionGet();
  if (!user) { navigate('/portal/login'); return null; }
  if (role && user.role !== role) { navigate('/portal/login'); return null; }
  return user;
}

function requireAdmin() {
  var user = sessionGet();
  if (!user || user.role !== 'admin') { navigate('/admin'); return null; }
  return user;
}

/* ============================================================
   4. RISK ENGINE
   ============================================================ */
function computeRisk(req) {
  var factors = [];
  var score = 0;

  var p = req.postProfile || {};
  var l = req.logistics || {};
  var pr = req.price || {};

  // Qualität
  if (p.qualitaet === 'c_d' || p.qualitaet === 'schrott') {
    factors.push({ icon: '⚠', text: 'Niedrige Warenqualität erhöht Abwertungsrisiko', impact: 'high' });
    score += 30;
  } else if (p.qualitaet === 'gemischt') {
    factors.push({ icon: '⚡', text: 'Gemischte Qualität – Sortieraufwand einkalkulieren', impact: 'medium' });
    score += 15;
  }

  // Kategorien – Mischwaren
  if (p.kategorien && p.kategorien.length > 2) {
    factors.push({ icon: '📦', text: 'Verschiedene Kategorien (Mischwaren) – erschwerter Direktankauf', impact: 'medium' });
    score += 10;
  }

  // Restriktionen
  if (p.restrictions) {
    factors.push({ icon: '🚫', text: 'Weiterverkaufsrestriktionen gemeldet – rechtliche Prüfung nötig', impact: 'high' });
    score += 25;
  }

  // Kein Ersthandel
  if (p.firstHand === false) {
    factors.push({ icon: '🔄', text: 'Ware aus zweiter Hand – Herkunftsnachweis prüfen', impact: 'medium' });
    score += 10;
  }

  // Uploads
  if (!l.uploads || l.uploads.length === 0) {
    factors.push({ icon: '📷', text: 'Keine Fotos/Dateien hochgeladen – Bewertung erschwert', impact: 'medium' });
    score += 12;
  }

  // Palettenangaben
  if (!l.palletCount || !l.pieceCount) {
    factors.push({ icon: '📋', text: 'Mengenangaben unvollständig – Schätzung unsicherer', impact: 'low' });
    score += 6;
  }

  // Deadline
  if (l.deadlineType === 'dringend') {
    factors.push({ icon: '⏰', text: 'Dringende Abgabe – Preisdruck möglich', impact: 'medium' });
    score += 8;
  }

  // Volumen sehr groß
  if (l.volumeM3 && l.volumeM3 > 100) {
    factors.push({ icon: '🚛', text: 'Sehr großes Volumen – logistischer Aufwand erhöht', impact: 'low' });
    score += 5;
  }

  // Preis zu hoch
  if (pr.wishPrice && pr.estValue && pr.wishPrice > pr.estValue * 0.6) {
    factors.push({ icon: '💰', text: 'Wunschpreis hoch im Verhältnis zum geschätzten Warenwert', impact: 'medium' });
    score += 8;
  }

  score = Math.min(score, 100);
  var level = score < 30 ? 'low' : score < 60 ? 'medium' : 'high';
  var recommendations = [];
  if (score >= 30) recommendations.push('Besichtigungsprotokoll oder Bildmaterial anfordern');
  if (p.restrictions) recommendations.push('Rechtliche Freigabe für Weiterverkauf klären');
  if (level === 'high') recommendations.push('Preisabschlag von 15–25% gegenüber Marktwert einkalkulieren');
  if (!l.uploads || l.uploads.length < 2) recommendations.push('Mind. 3–5 Fotos vom Warenbestand einfordern');

  return { score: score, level: level, factors: factors, recommendations: recommendations };
}

/* ============================================================
   5. OUTBOX / EMAIL HELPERS
   ============================================================ */
function outboxAdd(db, to, subject, html, relatedRequestId, actionLinkHash) {
  db.emailsOutbox.push({
    id: uid(), to: to, subject: subject, html: html,
    createdAt: nowIso(), relatedRequestId: relatedRequestId || null,
    actionLinkHash: actionLinkHash || null
  });
}

function sendMagicLinkEmail(db, user, token, requestId) {
  var link = '#/continue?token=' + token;
  var html = '<p>Hallo' + (user.name ? ' ' + esc(user.name) : '') + ',</p>'
    + '<p>Bitte ergänzen Sie Ihre Angaben für eine schnellere Angebotserstellung.</p>'
    + '<p><strong>Ihre Ankaufsanfrage wurde erfolgreich eingereicht.</strong> '
    + 'Um den Prozess zu beschleunigen, bitten wir Sie, weitere Details zu Ihrem Posten anzugeben.</p>'
    + '<p style="margin:1.5rem 0"><a href="' + link + '" style="background:#8f1f1f;color:#fff;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:700">Angaben ergänzen →</a></p>'
    + '<p style="color:#666;font-size:.85em">Der Link ist 7 Tage gültig. Falls Sie diesen Link nicht angefordert haben, können Sie diese E-Mail ignorieren.</p>'
    + '<p style="color:#666;font-size:.85em">Ihr Liquidato-Team</p>';
  outboxAdd(db, user.email, 'Bitte ergänzen Sie Ihre Angaben – schnelleres Angebot', html, requestId, link);
}

function sendOfferEmail(db, user, req, offer) {
  var html = '<p>Hallo' + (user.name ? ' ' + esc(user.name) : '') + ',</p>'
    + '<p>Wir haben Ihre Anfrage geprüft und freuen uns, Ihnen folgendes Angebot zu unterbreiten:</p>'
    + '<p style="font-size:1.5rem;font-weight:700;color:#8f1f1f">' + (offer.amount ? Number(offer.amount).toLocaleString('de-DE') + ' €' : '') + '</p>'
    + (offer.text ? '<p>' + esc(offer.text) + '</p>' : '')
    + '<p><a href="#/portal/request/' + req.id + '">Angebot ansehen und reagieren →</a></p>'
    + '<p style="color:#666;font-size:.85em">Liquidato – Direktankauf</p>';
  outboxAdd(db, user.email, 'Ihr Liquidato-Angebot liegt vor', html, req.id, '#/portal/request/' + req.id);
}

function sendReminderEmail(db, user, req, hoursElapsed) {
  var html = '<p>Hallo' + (user.name ? ' ' + esc(user.name) : '') + ',</p>'
    + '<p>Ihre Anfrage wartet noch auf Ergänzungen. Je vollständiger Ihre Angaben, desto schneller erhalten Sie ein Angebot.</p>'
    + '<p><a href="#/portal/request/' + req.id + '/wizard">Angaben jetzt ergänzen →</a></p>'
    + '<p style="color:#666;font-size:.85em">Liquidato-Team</p>';
  outboxAdd(db, user.email, 'Erinnerung: Bitte ergänzen Sie Ihre Anfrage', html, req.id, '#/portal/request/' + req.id + '/wizard');
}

/* ============================================================
   6. ROUTER
   ============================================================ */
var currentRoute = null;

function navigate(hash) {
  window.location.hash = hash;
}

function parseRoute(hash) {
  var h = hash.replace(/^#/, '');
  var qIdx = h.indexOf('?');
  var path = qIdx >= 0 ? h.slice(0, qIdx) : h;
  var qs = qIdx >= 0 ? h.slice(qIdx + 1) : '';
  var params = {};
  if (qs) {
    qs.split('&').forEach(function(p) {
      var kv = p.split('=');
      if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
  }
  var segments = path.split('/').filter(Boolean);
  return { path: path, segments: segments, params: params };
}

function renderRoute() {
  var hash = window.location.hash || '#/public';
  var r = parseRoute(hash);
  var app = document.getElementById('app');
  currentRoute = r;

  // /public
  if (r.path === '/public' || r.path === '' || r.path === '/') {
    return renderPublicForm(app);
  }
  // /continue?token=...
  if (r.path === '/continue') {
    return renderContinue(app, r.params.token);
  }
  // /portal/login
  if (r.path === '/portal/login') {
    return renderPortalLogin(app);
  }
  // /portal/request/:id/wizard
  if (r.segments[0] === 'portal' && r.segments[1] === 'request' && r.segments[3] === 'wizard') {
    return renderPortalWizard(app, r.segments[2], parseInt(r.params.step) || 1);
  }
  // /portal/request/:id
  if (r.segments[0] === 'portal' && r.segments[1] === 'request' && r.segments[2]) {
    return renderPortalRequestDetail(app, r.segments[2]);
  }
  // /portal
  if (r.path === '/portal') {
    return renderPortalDashboard(app);
  }
  // /admin/request/:id
  if (r.segments[0] === 'admin' && r.segments[1] === 'request' && r.segments[2]) {
    return renderAdminRequestDetail(app, r.segments[2]);
  }
  // /admin/settings
  if (r.path === '/admin/settings') {
    return renderAdminSettings(app);
  }
  // /admin/emails or /emails
  if (r.path === '/admin/emails' || r.path === '/emails') {
    return renderAdminEmails(app);
  }
  // /admin
  if (r.path === '/admin') {
    return renderAdmin(app);
  }

  // 404
  app.innerHTML = '<div class="liq-wrap"><div class="page-content"><div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Seite nicht gefunden</div><a href="#/public" class="btn btn-primary mt">Zur Startseite</a></div></div></div>';
}

/* ============================================================
   7. SHELL / NAV
   ============================================================ */
function renderTopbar(user) {
  var navHtml = '';
  if (!user) {
    navHtml = '<a href="#/portal/login">Anmelden</a>';
  } else if (user.role === 'vendor') {
    navHtml = '<span class="topbar-user-label">' + esc(user.email) + '</span>'
      + '<a href="#/portal">Meine Anfragen</a>'
      + '<button onclick="doLogout()">Abmelden</button>';
  } else if (user.role === 'admin') {
    navHtml = '<span class="topbar-user-label">Admin</span>'
      + '<a href="#/admin">Anfragen</a>'
      + '<a href="#/admin/emails">Postausgang</a>'
      + '<a href="#/admin/settings">Einstellungen</a>'
      + '<button onclick="doLogout()">Abmelden</button>';
  }
  return '<nav class="liq-topbar"><div class="liq-topbar-inner">'
    + '<a href="#/public" class="liq-logo"><span class="liq-logo-text">Liquid<span style="color:var(--liq-text)">ato</span></span></a>'
    + '<div class="liq-topbar-nav">' + navHtml + '</div>'
    + '</div></nav>';
}

function doLogout() {
  sessionClear();
  navigate('/public');
}


/* ============================================================
   8. VALIDATION HELPERS
   ============================================================ */
function markFieldError(fieldId, msg) {
  var el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.add('error');
  var wrap = el.closest('.form-group') || el.parentNode;
  var existing = wrap.querySelector('.field-error-msg');
  if (!existing) {
    var err = document.createElement('div');
    err.className = 'field-error-msg';
    err.textContent = msg;
    wrap.appendChild(err);
  } else {
    existing.textContent = msg;
  }
}

function clearFieldError(fieldId) {
  var el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.remove('error');
  var wrap = el.closest('.form-group') || el.parentNode;
  var existing = wrap.querySelector('.field-error-msg');
  if (existing) existing.remove();
}

function clearFormErrors(formId) {
  var form = document.getElementById(formId) || document;
  var errMsgs = form.querySelectorAll('.field-error-msg');
  errMsgs.forEach(function(e){ e.remove(); });
  var errFields = form.querySelectorAll('.form-control.error, .upload-zone.error');
  errFields.forEach(function(e){ e.classList.remove('error'); });
}

function addLiveValidation(formId) {
  var form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('input, select, textarea').forEach(function(el) {
    el.addEventListener('input', function() {
      if (el.id) clearFieldError(el.id);
    });
    el.addEventListener('change', function() {
      if (el.id) clearFieldError(el.id);
    });
  });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^[\+\d\s\-\(\)]{7,}$/.test(phone.trim());
}

function validateUploadFile(file) {
  var name = file.name.toLowerCase();
  var valid = UPLOAD_ALLOWED_EXTS.some(function(ext){ return name.endsWith(ext); });
  return valid;
}

/* ============================================================
   9. PUBLIC CAPTURE FORM
   ============================================================ */
function renderPublicForm(app) {
  var user = sessionGet();
  var db = dbLoadFresh();
  var settings = db.settings;

  app.innerHTML = renderTopbar(user)
    + '<div class="hero-section"><div class="hero-bg"></div><div class="hero-content liq-wrap">'
    + '<h1 class="hero-title">Restposten, Retouren &amp; Insolvenzmassen<br><em>Direktankauf – schnell, fair, diskret.</em></h1>'
    + '<p class="hero-subtitle">Wir kaufen großvolumige B2B-Warenbestände direkt an. Kostenlose Abholung, 100 % Vorauszahlung.</p>'
    + '</div></div>'
    + '<div class="liq-wrap"><div class="public-layout">'
    + renderPublicSidebar(settings)
    + '<div class="public-main">'
    + '<div class="card">'
    + '<h2 class="card-title">Ankaufanfrage stellen</h2>'
    + '<p class="card-subtitle">In 2 Minuten Ihre Anfrage einreichen – wir melden uns innerhalb von 24 Stunden.</p>'
    + '<form id="public-form" onsubmit="return false;">'
    + '<div class="form-group"><label class="form-label" for="pub-email">E-Mail-Adresse <span class="req">*</span></label>'
    + '<input class="form-control" type="email" id="pub-email" placeholder="ihre@email.de" autocomplete="email" /></div>'
    + '<div class="form-group"><label class="form-label" for="pub-phone">Telefon <span class="req">*</span></label>'
    + '<input class="form-control" type="tel" id="pub-phone" placeholder="+49 ..." autocomplete="tel" /></div>'
    + '<div class="form-group"><label class="form-label" for="pub-desc">Kurzbeschreibung des Postens <span class="req">*</span></label>'
    + '<textarea class="form-control" id="pub-desc" rows="3" placeholder="z.B. 500 Paletten Elektronik-Retouren, ca. 10.000 Einheiten…"></textarea>'
    + '<div class="form-hint">Je mehr Details, desto schneller erhalten Sie ein Angebot.</div></div>'
    + '<div class="form-group"><label class="form-label" for="pub-name">Name / Ansprechpartner <span class="text-muted">(optional)</span></label>'
    + '<input class="form-control" type="text" id="pub-name" placeholder="Vor- und Nachname" autocomplete="name" /></div>'
    + '<div class="form-group"><label class="form-label" for="pub-company">Firma <span class="text-muted">(optional)</span></label>'
    + '<input class="form-control" type="text" id="pub-company" placeholder="GmbH, AG, Einzelhandel…" autocomplete="organization" /></div>'
    + '<div class="form-group">'
    + '<label class="check-label"><input type="checkbox" id="pub-privacy" /> <span>Ich habe die <a href="' + settings.privacyUrl + '" target="_blank">Datenschutzerklärung</a> gelesen und stimme zu. <span class="req">*</span></span></label>'
    + '</div>'
    + '<div id="pub-form-error" class="alert alert-error hidden" style="margin-bottom:.75rem"></div>'
    + '<button class="btn btn-primary btn-lg btn-full" onclick="submitPublicCapture()">Anfrage unverbindlich einreichen →</button>'
    + '<p class="text-xs text-muted text-center mt-sm">Kostenlos &amp; unverbindlich · Kein Spam · 100 % Datenschutz</p>'
    + '</form></div></div></div></div>';

  addLiveValidation('public-form');
}

function renderPublicSidebar(settings) {
  return '<div class="public-sidebar">'
    + '<div class="card mb">'
    + '<h3 style="font-size:1rem;font-weight:700;margin-bottom:.85rem">Warum Liquidato?</h3>'
    + '<div class="trust-badges">'
    + '<div class="trust-badge"><span class="trust-badge-icon">✅</span><div><strong>100 % Vorauszahlung</strong><br>Sicherer Zahlungseingang vor Abholung</div></div>'
    + '<div class="trust-badge"><span class="trust-badge-icon">🚛</span><div><strong>Kostenlose Abholung</strong><br>Wir holen EU-weit ab – auf unsere Kosten</div></div>'
    + '<div class="trust-badge"><span class="trust-badge-icon">⚡</span><div><strong>Schnelle Bewertung</strong><br>Erstangebot innerhalb von 24–48 Stunden</div></div>'
    + '<div class="trust-badge"><span class="trust-badge-icon">🔒</span><div><strong>Diskrete Abwicklung</strong><br>Keine öffentlichen Ausschreibungen nötig</div></div>'
    + '<div class="trust-badge"><span class="trust-badge-icon">🌍</span><div><strong>B2B-Export-Netzwerk</strong><br>Zugang zu EU- und Drittland-Käufern (optional)</div></div>'
    + '</div></div>'
    + '<div class="card">'
    + '<h3 style="font-size:.9rem;font-weight:700;margin-bottom:.5rem">Direkter Ansprechpartner</h3>'
    + '<p class="text-sm text-muted mb-sm">Fragen? Wir helfen gerne weiter.</p>'
    + '<p class="text-sm"><strong>📞 ' + esc(settings.supportPhone) + '</strong></p>'
    + '<p class="text-sm" style="margin-top:.35rem"><strong>✉ ' + esc(settings.supportEmail) + '</strong></p>'
    + '</div></div>';
}

function submitPublicCapture() {
  var email = document.getElementById('pub-email').value.trim();
  var phone = document.getElementById('pub-phone').value.trim();
  var desc  = document.getElementById('pub-desc').value.trim();
  var name  = document.getElementById('pub-name').value.trim();
  var company = document.getElementById('pub-company').value.trim();
  var privacy = document.getElementById('pub-privacy').checked;
  var errDiv  = document.getElementById('pub-form-error');

  clearFormErrors('public-form');
  var errors = [];

  if (!email || !validateEmail(email)) {
    markFieldError('pub-email', 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
    errors.push('E-Mail ungültig');
  }
  if (!phone || !validatePhone(phone)) {
    markFieldError('pub-phone', 'Bitte geben Sie eine gültige Telefonnummer ein.');
    errors.push('Telefon fehlt');
  }
  if (!desc || desc.length < 10) {
    markFieldError('pub-desc', 'Bitte beschreiben Sie den Posten (mind. 10 Zeichen).');
    errors.push('Beschreibung fehlt');
  }
  if (!privacy) {
    markFieldError('pub-privacy', 'Bitte stimmen Sie der Datenschutzerklärung zu.');
    errors.push('Datenschutz nicht bestätigt');
  }

  if (errors.length > 0) {
    errDiv.textContent = 'Bitte korrigieren Sie die markierten Felder.';
    errDiv.classList.remove('hidden');
    return;
  }
  errDiv.classList.add('hidden');

  var db = dbLoadFresh();

  // Find or create vendor
  var user = db.users.find(function(u){ return u.email === email; });
  if (!user) {
    user = {
      id: uid(), role: 'vendor', email: email,
      phone: phone, name: name, company: company,
      passwordHashOrPlain: null, createdAt: nowIso()
    };
    db.users.push(user);
  } else {
    if (phone) user.phone = phone;
    if (name) user.name = name;
    if (company) user.company = company;
  }

  // Create request
  var reqId = uid();
  var req = {
    id: reqId,
    ownerUserId: user.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    status: 'EINGEGANGEN',
    consent: { privacyAcceptedAt: nowIso(), networkOptIn: false, allowOnlineListing: false },
    contact: { email: email, phone: phone, name: name, company: company, shortDesc: desc },
    postProfile: { postenart: '', qualitaet: '', mixedSubgrades: [], kategorien: [], beschreibung: '', firstHand: null, restrictions: null },
    logistics: { plz: '', ort: '', land: 'DE', palletStatus: '', palletCount: null, pieceCount: null, volumeM3: null, readyFrom: '', deadlineType: 'flexibel', deadlineDate: null, uploads: [], links: [] },
    price: { estValue: null, wishPrice: null, minAcceptable: null, priceBasis: 'gesamt', vatMode: 'regelbesteuerung' },
    risk: {},
    offers: [], bids: [], messages: [],
    timeline: [{ id: uid(), type: 'status_change', actor: 'system', at: nowIso(), payload: { from: null, to: 'EINGEGANGEN', note: 'Anfrage eingegangen' } }]
  };
  req.risk = computeRisk(req);
  db.requests.push(req);

  // Magic link token
  var token = randomToken();
  var expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  db.tokens.push({ token: token, userId: user.id, requestId: reqId, expiresAt: expiresAt, usedAt: null });

  // Outbox
  sendMagicLinkEmail(db, user, token, reqId);

  dbSave(db);

  // Set session
  sessionSet(user.id);

  // Show success
  renderPublicSuccess(document.getElementById('app'), email, token, reqId);
}

function renderPublicSuccess(app, email, token, reqId) {
  var user = sessionGet();
  app.innerHTML = renderTopbar(user)
    + '<div class="liq-wrap-sm"><div class="page-content">'
    + '<div class="card text-center">'
    + '<div style="font-size:3rem;margin-bottom:1rem">✅</div>'
    + '<h2 style="font-size:1.4rem;font-weight:700;margin-bottom:.5rem">Anfrage eingereicht!</h2>'
    + '<p class="text-muted mb">Wir haben Ihre Anfrage erhalten und werden uns innerhalb von 24 Stunden melden.</p>'
    + '<div class="alert alert-info" style="text-align:left;margin-bottom:1.25rem">'
    + '<strong>📧 E-Mail versandt an ' + esc(email) + '</strong><br>'
    + '<span style="font-size:.85em">Wir haben Ihnen einen Link zur Ergänzung Ihrer Angaben geschickt. Je vollständiger die Angaben, desto schneller erhalten Sie ein Angebot.</span>'
    + '</div>'
    + '<p class="text-sm text-muted mb">Möchten Sie die Angaben direkt jetzt ergänzen?</p>'
    + '<a href="#/continue?token=' + token + '" class="btn btn-primary btn-lg">Angaben jetzt ergänzen →</a>'
    + '<p class="text-xs text-muted mt-sm">Oder gehen Sie zu <a href="#/portal">Meinen Anfragen</a></p>'
    + '</div></div></div>';
}


/* ============================================================
   10. CONTINUE / MAGIC LINK
   ============================================================ */
function renderContinue(app, token) {
  if (!token) { navigate('/portal/login'); return; }
  var db = dbLoadFresh();
  var tokenObj = db.tokens.find(function(t){ return t.token === token; });

  if (!tokenObj) {
    app.innerHTML = renderTopbar(null) + '<div class="liq-wrap-sm"><div class="page-content"><div class="alert alert-error">Link ungültig oder nicht gefunden.</div><a href="#/public" class="btn btn-secondary mt">Zur Startseite</a></div></div>';
    return;
  }
  if (new Date(tokenObj.expiresAt) < new Date()) {
    app.innerHTML = renderTopbar(null) + '<div class="liq-wrap-sm"><div class="page-content"><div class="alert alert-error">Dieser Link ist abgelaufen. Bitte starten Sie eine neue Anfrage.</div><a href="#/public" class="btn btn-primary mt">Neue Anfrage</a></div></div>';
    return;
  }

  // Mark token used
  if (!tokenObj.usedAt) {
    tokenObj.usedAt = nowIso();
    var req = db.requests.find(function(r){ return r.id === tokenObj.requestId; });
    if (req) {
      req.timeline.push({ id: uid(), type: 'magic_link_used', actor: 'vendor', at: nowIso(), payload: { note: 'Magic Link aufgerufen' } });
    }
    dbSave(db);
  }

  // Set session
  sessionSet(tokenObj.userId);

  // Redirect to wizard
  navigate('/portal/request/' + tokenObj.requestId + '/wizard?step=1');
}

/* ============================================================
   11. PORTAL LOGIN
   ============================================================ */
function renderPortalLogin(app) {
  var user = sessionGet();
  if (user) { navigate('/portal'); return; }

  app.innerHTML = '<div class="login-wrap">'
    + '<div class="card login-card">'
    + '<div class="login-logo"><span class="liq-logo-text">Liquid<span style="color:var(--liq-text)">ato</span></span></div>'
    + '<h2 style="font-size:1.1rem;font-weight:700;text-align:center;margin-bottom:1.25rem">Anmelden</h2>'
    + '<form id="login-form" onsubmit="return false;">'
    + '<div class="form-group"><label class="form-label" for="login-email">E-Mail</label>'
    + '<input class="form-control" type="email" id="login-email" placeholder="ihre@email.de" autocomplete="email" /></div>'
    + '<div class="form-group"><label class="form-label" for="login-pw">Passwort</label>'
    + '<input class="form-control" type="password" id="login-pw" placeholder="••••••••" autocomplete="current-password" /></div>'
    + '<div id="login-error" class="alert alert-error hidden" style="margin-bottom:.75rem"></div>'
    + '<button class="btn btn-primary btn-full" onclick="doPortalLogin()">Anmelden</button>'
    + '</form>'
    + '<p class="text-xs text-muted text-center mt">Demo-Zugänge: demo@anbieter.local / demo123 &nbsp;|&nbsp; admin@liquidato.local / admin</p>'
    + '<p class="text-center mt-sm text-sm"><a href="#/public">← Neue Anfrage stellen</a></p>'
    + '</div></div>';

  document.getElementById('login-form').addEventListener('keydown', function(e){ if (e.key === 'Enter') doPortalLogin(); });
}

function doPortalLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pw    = document.getElementById('login-pw').value;
  var err   = document.getElementById('login-error');

  var db = dbLoadFresh();
  var user = db.users.find(function(u){ return u.email === email; });
  if (!user || !checkPassword(pw, user.passwordHashOrPlain)) {
    err.textContent = 'E-Mail oder Passwort ungültig.';
    err.classList.remove('hidden');
    return;
  }
  err.classList.add('hidden');
  sessionSet(user.id);
  if (user.role === 'admin') { navigate('/admin'); } else { navigate('/portal'); }
}

/* ============================================================
   12. PORTAL DASHBOARD (VENDOR)
   ============================================================ */
function renderPortalDashboard(app) {
  var user = requireAuth('vendor');
  if (!user) return;
  var db = dbLoadFresh();
  var requests = db.requests.filter(function(r){ return r.ownerUserId === user.id; });

  var filterStatus = '';
  var filterHtml = '<div class="filter-bar">'
    + '<input class="form-control" type="search" id="dash-search" placeholder="Suche…" oninput="filterDashboard()" />'
    + '<select class="form-control" id="dash-filter-status" onchange="filterDashboard()">'
    + '<option value="">Alle Status</option>'
    + Object.keys(STATUS_LABELS).map(function(k){ return '<option value="' + k + '">' + STATUS_LABELS[k] + '</option>'; }).join('')
    + '</select>'
    + '</div>';

  var cardsHtml = requests.length === 0
    ? '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-title">Noch keine Anfragen</div><p class="text-muted">Stellen Sie jetzt Ihre erste Ankaufanfrage.</p><a href="#/public" class="btn btn-primary mt">Neue Anfrage</a></div>'
    : '<div class="dash-grid" id="dash-grid">' + requests.map(function(r){ return renderRequestCard(r); }).join('') + '</div>';

  app.innerHTML = renderTopbar(user)
    + '<div class="liq-wrap"><div class="page-content">'
    + '<div class="section-header"><h1 class="section-title">Meine Anfragen</h1>'
    + '<a href="#/public" class="btn btn-primary">+ Neue Anfrage</a></div>'
    + filterHtml + cardsHtml
    + '</div></div>';

  // Run reminders silently
  checkReminders();
}

function renderRequestCard(r) {
  var comp = computeCompletion(r);
  var status = STATUS_LABELS[r.status] || r.status;
  var badgeCls = STATUS_BADGE_CLASS[r.status] || 'badge-gray';
  var desc = (r.contact && r.contact.shortDesc) ? r.contact.shortDesc.slice(0, 80) : '';
  if (desc.length === 80) desc += '…';

  return '<div class="card request-card" data-id="' + r.id + '" data-status="' + r.status + '" data-desc="' + esc(desc.toLowerCase()) + '">'
    + '<div class="request-card-header">'
    + '<div><div class="request-card-title">' + esc(r.contact.shortDesc ? r.contact.shortDesc.slice(0,50) : 'Anfrage') + '</div>'
    + '<div class="request-card-meta">' + fmtDate(r.createdAt) + '</div></div>'
    + '<span class="badge ' + badgeCls + '">' + esc(status) + '</span>'
    + '</div>'
    + '<p class="text-sm text-muted mb-sm">' + esc(desc) + '</p>'
    + '<div class="completion-meter"><div class="completion-label"><span>Vollständigkeit</span><span>' + comp + '%</span></div>'
    + '<div class="completion-bar"><div class="completion-fill" style="width:' + comp + '%"></div></div></div>'
    + '<div style="margin-top:.85rem;display:flex;gap:.5rem;flex-wrap:wrap">'
    + '<a href="#/portal/request/' + r.id + '" class="btn btn-secondary btn-sm">Details</a>'
    + (comp < 100 ? '<a href="#/portal/request/' + r.id + '/wizard" class="btn btn-primary btn-sm">Angaben ergänzen</a>' : '')
    + '</div></div>';
}

function filterDashboard() {
  var query = (document.getElementById('dash-search').value || '').toLowerCase();
  var status = document.getElementById('dash-filter-status').value;
  var cards = document.querySelectorAll('#dash-grid .request-card');
  cards.forEach(function(card) {
    var desc = card.getAttribute('data-desc') || '';
    var cardStatus = card.getAttribute('data-status') || '';
    var matchQuery = !query || desc.includes(query);
    var matchStatus = !status || cardStatus === status;
    card.style.display = (matchQuery && matchStatus) ? '' : 'none';
  });
}

/* ============================================================
   13. PORTAL REQUEST DETAIL
   ============================================================ */
function renderPortalRequestDetail(app, reqId) {
  var user = requireAuth('vendor');
  if (!user) return;
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId && r.ownerUserId === user.id; });
  if (!req) {
    app.innerHTML = renderTopbar(user) + '<div class="liq-wrap"><div class="page-content"><div class="alert alert-error">Anfrage nicht gefunden.</div></div></div>';
    return;
  }

  var status = STATUS_LABELS[req.status] || req.status;
  var badgeCls = STATUS_BADGE_CLASS[req.status] || 'badge-gray';
  var comp = computeCompletion(req);

  // Check for active offer
  var latestOffer = req.offers && req.offers.length > 0 ? req.offers[req.offers.length - 1] : null;
  var offerHtml = '';
  if (latestOffer && !latestOffer.decision && (req.status === 'ANGEBOT_GESENDET' || req.status === 'ANGEBOT_ANGEPASST')) {
    offerHtml = '<div class="offer-box">'
      + '<div style="font-size:.85rem;color:var(--liq-primary);font-weight:700;margin-bottom:.35rem">📨 Aktuelles Angebot</div>'
      + (latestOffer.amount ? '<div class="offer-amount">' + Number(latestOffer.amount).toLocaleString('de-DE') + ' <span class="offer-currency">€</span></div>' : '')
      + (latestOffer.text ? '<p class="text-sm" style="margin-top:.5rem">' + esc(latestOffer.text) + '</p>' : '')
      + '<div class="offer-actions">'
      + '<button class="btn btn-primary" onclick="vendorAcceptOffer(\'' + req.id + '\',\'' + latestOffer.id + '\')">✓ Annehmen</button>'
      + '<button class="btn btn-danger" onclick="vendorRejectOffer(\'' + req.id + '\',\'' + latestOffer.id + '\')">✗ Ablehnen</button>'
      + '</div></div>';
  }

  // Price adjustment request
  var priceAdjHtml = '';
  if (req.status === 'PREISREDUZIERUNG_ANGEFRAGT') {
    priceAdjHtml = '<div class="alert alert-warning" style="margin-bottom:1rem">'
      + '⚡ <strong>Preisreduzierung angefragt:</strong> Unser Team hat nach Netzwerkauswertung eine Preisanpassung angefragt. '
      + 'Bitte teilen Sie uns Ihren Mindesakzeptanzpreis mit.'
      + '<div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">'
      + '<input class="form-control" id="price-adj-input" type="number" placeholder="Mindestpreis €" style="max-width:200px" />'
      + '<button class="btn btn-primary btn-sm" onclick="vendorConfirmPriceAdj(\'' + req.id + '\')">Senden</button>'
      + '</div></div>';
  }

  // Messages
  var msgsHtml = '';
  if (req.messages && req.messages.length > 0) {
    msgsHtml = '<div class="card mb">'
      + '<h3 class="card-title">Rückfragen</h3>'
      + '<div class="msg-thread">'
      + req.messages.map(function(m){
          return '<div class="msg-bubble ' + m.from + '">'
            + esc(m.text)
            + '<div class="msg-meta">' + fmtDateTime(m.at) + ' · ' + (m.from === 'admin' ? 'Liquidato' : 'Sie') + '</div>'
            + '</div>';
        }).join('')
      + '</div>'
      + (req.status === 'RUECKFRAGEN' ? '<div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">'
          + '<textarea class="form-control" id="vendor-reply-text" rows="2" placeholder="Ihre Antwort…" style="flex:1"></textarea>'
          + '<button class="btn btn-primary btn-sm" onclick="vendorSendReply(\'' + req.id + '\')">Senden</button>'
          + '</div>' : '')
      + '</div>';
  }

  // Timeline
  var tlHtml = '<div class="timeline">' + (req.timeline || []).slice().reverse().map(function(t){
    var label = t.payload && t.payload.note ? t.payload.note : (t.type === 'status_change' ? ('Status: ' + (STATUS_LABELS[t.payload.to] || t.payload.to)) : t.type);
    var dotCls = t.actor === 'admin' ? 'admin' : t.actor === 'vendor' ? 'vendor' : 'system';
    return '<div class="timeline-item"><div class="timeline-dot ' + dotCls + '"></div><div class="timeline-body">'
      + '<div class="timeline-label">' + esc(label) + '</div>'
      + '<div class="timeline-time">' + fmtDateTime(t.at) + '</div>'
      + (t.payload && t.payload.desc ? '<div class="timeline-desc">' + esc(t.payload.desc) + '</div>' : '')
      + '</div></div>';
  }).join('') + '</div>';

  app.innerHTML = renderTopbar(user)
    + '<div class="liq-wrap"><div class="page-content">'
    + '<a href="#/portal" class="back-link">← Meine Anfragen</a>'
    + '<div class="detail-layout">'
    + '<div class="detail-main">'
    + '<div class="card mb">'
    + '<div class="section-header">'
    + '<div><h2 style="font-size:1.15rem;font-weight:700">' + esc(req.contact.shortDesc || 'Anfrage') + '</h2>'
    + '<p class="text-xs text-muted">ID: ' + req.id + ' · Eingereicht: ' + fmtDate(req.createdAt) + '</p></div>'
    + '<span class="badge ' + badgeCls + '">' + esc(status) + '</span>'
    + '</div>'
    + '<div class="completion-meter mb"><div class="completion-label"><span>Angaben Vollständigkeit</span><span>' + comp + '%</span></div>'
    + '<div class="completion-bar"><div class="completion-fill" style="width:' + comp + '%"></div></div></div>'
    + (comp < 100 ? '<a href="#/portal/request/' + req.id + '/wizard" class="btn btn-primary btn-sm">Angaben ergänzen ✏️</a>' : '<span class="badge badge-green">✓ Vollständig ausgefüllt</span>')
    + '</div>'
    + offerHtml + priceAdjHtml + msgsHtml
    + '<div class="card"><h3 class="card-title">Verlauf</h3>' + tlHtml + '</div>'
    + '</div>'
    + '<div class="detail-sidebar">'
    + '<div class="card"><h3 class="card-title" style="font-size:.95rem">Kontakt &amp; Support</h3>'
    + '<p class="text-sm mb-sm">Bei Fragen zu Ihrer Anfrage:</p>'
    + renderSupportContact(db.settings)
    + '</div>'
    + renderConsentToggles(req)
    + '</div></div></div></div>';
}

function renderSupportContact(settings) {
  return '<p class="text-sm"><strong>📞 ' + esc(settings.supportPhone) + '</strong></p>'
    + '<p class="text-sm" style="margin-top:.35rem"><strong>✉ ' + esc(settings.supportEmail) + '</strong></p>';
}

function renderConsentToggles(req) {
  var netOptIn = req.consent && req.consent.networkOptIn;
  var allowList = req.consent && req.consent.allowOnlineListing;
  return '<div class="card mt">'
    + '<h3 class="card-title" style="font-size:.95rem">Freigaben</h3>'
    + '<div class="consent-row"><div class="consent-row-label"><div class="consent-row-title">B2B-Netzwerk</div><div class="consent-row-desc">Angebot im Händlernetz prüfen lassen</div></div>'
    + '<label class="toggle-switch"><input type="checkbox" ' + (netOptIn ? 'checked' : '') + ' onchange="toggleConsent(\'' + req.id + '\',\'networkOptIn\',this.checked)" /><span class="toggle-slider"></span></label>'
    + '</div>'
    + '<div class="consent-row" style="margin-top:.5rem"><div class="consent-row-label"><div class="consent-row-title">Online-Listing</div><div class="consent-row-desc">Artikel im Liquidato-Portal öffentlich listen</div></div>'
    + '<label class="toggle-switch"><input type="checkbox" ' + (allowList ? 'checked' : '') + ' onchange="toggleConsent(\'' + req.id + '\',\'allowOnlineListing\',this.checked)" /><span class="toggle-slider"></span></label>'
    + '</div></div>';
}

function toggleConsent(reqId, field, value) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  req.consent[field] = value;
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'consent_change', actor: 'vendor', at: nowIso(), payload: { field: field, value: value, note: 'Freigabe geändert: ' + field } });
  dbSave(db);
}

function vendorAcceptOffer(reqId, offerId) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  var offer = req.offers.find(function(o){ return o.id === offerId; });
  if (!offer) return;
  offer.decision = 'accepted';
  offer.decidedAt = nowIso();
  req.status = 'ANGEBOT_ANGENOMMEN';
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'offer_decision', actor: 'vendor', at: nowIso(), payload: { decision: 'accepted', note: 'Angebot angenommen' } });
  dbSave(db);
  renderRoute();
}

function vendorRejectOffer(reqId, offerId) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  var offer = req.offers.find(function(o){ return o.id === offerId; });
  if (!offer) return;
  offer.decision = 'rejected';
  offer.decidedAt = nowIso();
  req.status = 'ANGEBOT_ABGELEHNT';
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'offer_decision', actor: 'vendor', at: nowIso(), payload: { decision: 'rejected', note: 'Angebot abgelehnt' } });
  dbSave(db);
  renderRoute();
}

function vendorSendReply(reqId) {
  var text = document.getElementById('vendor-reply-text').value.trim();
  if (!text) return;
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  if (!req.messages) req.messages = [];
  req.messages.push({ id: uid(), from: 'vendor', text: text, at: nowIso() });
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'message', actor: 'vendor', at: nowIso(), payload: { note: 'Antwort auf Rückfrage gesendet' } });
  dbSave(db);
  renderRoute();
}

function vendorConfirmPriceAdj(reqId) {
  var val = document.getElementById('price-adj-input').value;
  if (!val) return;
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  req.price.minAcceptable = parseFloat(val);
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'price_adj_vendor', actor: 'vendor', at: nowIso(), payload: { minAcceptable: val, note: 'Mindestpreis übermittelt: ' + val + ' €' } });
  req.status = 'ANGEBOT_ANGEPASST';
  dbSave(db);
  renderRoute();
}


/* ============================================================
   14. WIZARD (5 STEPS) – P0: Validation + Stepper + Uploads
      P1: Mixed Grades + Step 5 Summary
   ============================================================ */

/* Completion meter */
function computeCompletion(req) {
  var score = 0; var total = 10;
  var c = req.contact || {};
  var p = req.postProfile || {};
  var l = req.logistics || {};
  var pr = req.price || {};

  if (c.email) score++;
  if (c.phone) score++;
  if (c.shortDesc && c.shortDesc.length > 5) score++;
  if (p.postenart) score++;
  if (p.qualitaet) score++;
  if (p.kategorien && p.kategorien.length > 0) score++;
  if (l.plz && l.ort) score++;
  if (l.palletStatus) score++;
  if (pr.wishPrice) score++;
  if (l.uploads && l.uploads.length > 0) score++;

  return Math.round((score / total) * 100);
}

/* Stepper HTML (Option C – horizontal) */
function renderStepper(currentStep, req) {
  var comp = computeCompletion(req);
  var html = '<div class="stepper-c" id="wizard-stepper">';
  WIZARD_STEPS.forEach(function(s) {
    var isDone = s.idx < currentStep;
    var isActive = s.idx === currentStep;
    var isDisabled = s.idx > currentStep;
    var cls = isDone ? 'completed clickable' : isActive ? 'active' : isDisabled ? 'disabled' : '';
    var clickable = isDone ? 'onclick="wizardJump(\'' + window._wizReqId + '\',' + s.idx + ')"' : '';
    html += '<div class="step-item ' + cls + '" ' + clickable + '>';
    html += '<div class="step-node">' + (isDone ? '<span class="step-checkmark"></span>' : s.idx) + '</div>';
    html += '<div class="step-label">' + esc(s.label) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function wizardJump(reqId, stepIdx) {
  navigate('/portal/request/' + reqId + '/wizard?step=' + stepIdx);
}

/* Main wizard renderer */
function renderPortalWizard(app, reqId, stepNum) {
  var user = requireAuth('vendor');
  if (!user) return;
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId && r.ownerUserId === user.id; });
  if (!req) {
    app.innerHTML = renderTopbar(user) + '<div class="liq-wrap"><div class="page-content"><div class="alert alert-error">Anfrage nicht gefunden.</div></div></div>';
    return;
  }

  // Clamp step
  if (stepNum < 1) stepNum = 1;
  if (stepNum > 5) stepNum = 5;

  // Store for stepper callbacks
  window._wizReqId = reqId;

  var comp = computeCompletion(req);
  var stepper = renderStepper(stepNum, req);
  var formHtml = renderWizardStep(stepNum, req, db);

  var sidebarHtml = '<div class="wizard-sidebar">'
    + '<div class="card"><h3 style="font-size:.9rem;font-weight:700;margin-bottom:.6rem">Vollständigkeit</h3>'
    + '<div class="completion-bar" style="margin-bottom:.4rem"><div class="completion-fill" style="width:' + comp + '%"></div></div>'
    + '<div style="font-size:.85rem;color:var(--liq-muted)">' + comp + '% ausgefüllt</div>'
    + '<hr class="divider" style="margin:1rem 0">'
    + '<div class="trust-badges">'
    + '<div class="trust-badge"><span class="trust-badge-icon">✅</span><div><strong>100% Vorauszahlung</strong><br>Sicherheit vor Abholung</div></div>'
    + '<div class="trust-badge"><span class="trust-badge-icon">🚛</span><div><strong>Kostenlose Abholung</strong><br>EU-weit auf unsere Kosten</div></div>'
    + '<div class="trust-badge"><span class="trust-badge-icon">⚡</span><div><strong>Schnelle Bewertung</strong><br>Erstangebot in 24–48 h</div></div>'
    + '</div></div>'
    + '</div>';

  app.innerHTML = renderTopbar(user)
    + '<div class="liq-wrap"><div class="page-content">'
    + '<a href="#/portal/request/' + req.id + '" class="back-link">← Zur Anfrage</a>'
    + '<h2 style="font-size:1.2rem;font-weight:700;margin-bottom:1.25rem">Angaben ergänzen</h2>'
    + stepper
    + '<div class="wizard-layout">'
    + sidebarHtml
    + '<div class="wizard-main">'
    + '<div class="card">' + formHtml + '</div>'
    + '</div></div></div></div>';

  // Attach live validation
  addLiveValidation('wizard-step-form');

  // Restore upload list display
  renderUploadList(req.logistics.uploads || [], req.id);

  // Mixed grades toggle
  var qualSelect = document.getElementById('wiz-qualitaet');
  if (qualSelect) { updateMixedGrades(qualSelect.value); }
}

/* ============================================================
   Wizard Step Forms
   ============================================================ */
function renderWizardStep(step, req, db) {
  var c = req.contact || {};
  var p = req.postProfile || {};
  var l = req.logistics || {};
  var pr = req.price || {};

  var title = WIZARD_STEPS[step - 1].label;
  var html = '<h3 style="font-size:1.05rem;font-weight:700;margin-bottom:1.25rem">Schritt ' + step + ' von 5 – ' + esc(title) + '</h3>'
    + '<form id="wizard-step-form" onsubmit="return false;">';

  if (step === 1) html += renderWizardStep1(c);
  if (step === 2) html += renderWizardStep2(p);
  if (step === 3) html += renderWizardStep3(l);
  if (step === 4) html += renderWizardStep4(pr);
  if (step === 5) html += renderWizardStep5(req, db);

  html += '</form>';
  html += renderWizardActions(step, req.id);
  return html;
}

function renderWizardStep1(c) {
  return '<div class="form-group"><label class="form-label" for="wiz-email">E-Mail <span class="req">*</span></label>'
    + '<input class="form-control" type="email" id="wiz-email" value="' + esc(c.email||'') + '" autocomplete="email" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-phone">Telefon <span class="req">*</span></label>'
    + '<input class="form-control" type="tel" id="wiz-phone" value="' + esc(c.phone||'') + '" autocomplete="tel" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-name">Ihr Name</label>'
    + '<input class="form-control" type="text" id="wiz-name" value="' + esc(c.name||'') + '" autocomplete="name" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-company">Firma</label>'
    + '<input class="form-control" type="text" id="wiz-company" value="' + esc(c.company||'') + '" autocomplete="organization" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-shortdesc">Kurzbeschreibung des Postens <span class="req">*</span></label>'
    + '<textarea class="form-control" id="wiz-shortdesc" rows="3">' + esc(c.shortDesc||'') + '</textarea></div>';
}

function renderWizardStep2(p) {
  var postenarten = [
    ['','Bitte wählen…'],
    ['retouren','Retouren / Rücksendungen'],
    ['restposten','Restposten / Überbestände'],
    ['insolvenz','Insolvenzmasse / Geschäftsauflösung'],
    ['b_ware','B-Ware / Ausstellungsstücke'],
    ['gemischt','Gemischt (verschiedene Typen)']
  ];
  var qualitaeten = [
    ['','Bitte wählen…'],
    ['neuwertig','Neuwertig / ungeöffnet (A-Ware)'],
    ['gut','Gut erhalten (A/B-Ware)'],
    ['gemischt','Gemischt (A/B/C/D)'],
    ['c_d','Überwiegend C/D-Ware'],
    ['schrott','Defekt / Schrott']
  ];
  var kategorien = [
    ['elektronik','Elektronik & Technik'],
    ['haushalt','Haushalt & Küchengeräte'],
    ['mode','Mode & Textilien'],
    ['spielzeug','Spielzeug & Hobby'],
    ['sport','Sport & Outdoor'],
    ['moebel','Möbel & Einrichtung'],
    ['lebensmittel','Lebensmittel & Getränke'],
    ['drogerie','Drogerie & Körperpflege'],
    ['auto','Auto & Motorrad'],
    ['garten','Garten & Heimwerken'],
    ['buero','Büro & Geschäftsausstattung'],
    ['sonstiges','Sonstiges']
  ];

  var mixedSubgrades = p.mixedSubgrades || [];

  return '<div class="form-group"><label class="form-label" for="wiz-postenart">Art des Postens <span class="req">*</span></label>'
    + '<select class="form-control" id="wiz-postenart">'
    + postenarten.map(function(o){ return '<option value="' + o[0] + '"' + (p.postenart === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select></div>'

    + '<div class="form-group"><label class="form-label" for="wiz-qualitaet">Qualität der Ware <span class="req">*</span></label>'
    + '<select class="form-control" id="wiz-qualitaet" onchange="updateMixedGrades(this.value)">'
    + qualitaeten.map(function(o){ return '<option value="' + o[0] + '"' + (p.qualitaet === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select></div>'

    // Mixed subgrades (P1)
    + '<div id="mixed-grades-section" class="mixed-grades-wrap" style="display:none">'
    + '<div class="mixed-grades-title">Welche Güteklassen sind enthalten? <span class="req">*</span></div>'
    + '<div class="mixed-grades-grid">'
    + ['A','B','C','D'].map(function(g){
        return '<label class="check-label"><input type="checkbox" name="mixed-grade" value="' + g + '"'
          + (mixedSubgrades.indexOf(g) >= 0 ? ' checked' : '') + ' onchange="onMixedGradeChange()" /> '
          + 'Güteklasse ' + g + '</label>';
      }).join('')
    + '</div>'
    + '<div id="mixed-grades-error" class="field-error-msg hidden">Bitte wählen Sie mind. eine Güteklasse.</div>'
    + '</div>'

    + '<div class="form-group"><label class="form-label">Warengruppe(n) <span class="req">*</span></label>'
    + '<div class="check-group" id="wiz-kategorien">'
    + kategorien.map(function(o){
        var checked = p.kategorien && p.kategorien.indexOf(o[0]) >= 0;
        return '<label class="check-label"><input type="checkbox" name="kategorie" value="' + o[0] + '"' + (checked ? ' checked' : '') + ' onchange="clearKategorienError()" /> ' + o[1] + '</label>';
      }).join('')
    + '</div>'
    + '<div id="kategorien-error" class="field-error-msg hidden">Bitte wählen Sie mind. eine Warengruppe.</div>'
    + '</div>'

    + '<div class="form-group"><label class="form-label" for="wiz-beschreibung">Detaillierte Beschreibung <span class="req">*</span></label>'
    + '<textarea class="form-control" id="wiz-beschreibung" rows="4" placeholder="Art, Zustand, Besonderheiten des Postens…">' + esc(p.beschreibung||'') + '</textarea></div>'

    + '<div class="form-group"><label class="form-label">Ersthandelsware?</label>'
    + '<div class="radio-group">'
    + '<label class="check-label"><input type="radio" name="firsthand" value="yes"' + (p.firstHand === true ? ' checked' : '') + ' /> Ja, direkt vom Hersteller / Importeur</label>'
    + '<label class="check-label"><input type="radio" name="firsthand" value="no"' + (p.firstHand === false ? ' checked' : '') + ' /> Nein, aus zweiter Hand</label>'
    + '</div></div>'

    + '<div class="form-group"><label class="form-label">Weiterverkaufsrestriktionen?</label>'
    + '<div class="radio-group">'
    + '<label class="check-label"><input type="radio" name="restrictions" value="no"' + (p.restrictions === false ? ' checked' : '') + ' /> Keine bekannt</label>'
    + '<label class="check-label"><input type="radio" name="restrictions" value="yes"' + (p.restrictions === true ? ' checked' : '') + ' /> Ja, Restriktionen vorhanden</label>'
    + '</div></div>';
}

function renderWizardStep3(l) {
  var totalMb = (l.uploads || []).reduce(function(s,u){ return s + (u.size || 0); }, 0) / 1048576;
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">'
    + '<div class="form-group"><label class="form-label" for="wiz-plz">PLZ <span class="req">*</span></label>'
    + '<input class="form-control" type="text" id="wiz-plz" value="' + esc(l.plz||'') + '" maxlength="10" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-ort">Ort <span class="req">*</span></label>'
    + '<input class="form-control" type="text" id="wiz-ort" value="' + esc(l.ort||'') + '" /></div>'
    + '</div>'
    + '<div class="form-group"><label class="form-label" for="wiz-land">Land</label>'
    + '<select class="form-control" id="wiz-land">'
    + [['DE','Deutschland'],['AT','Österreich'],['CH','Schweiz'],['NL','Niederlande'],['PL','Polen'],['FR','Frankreich'],['IT','Italien'],['ES','Spanien'],['OTHER','Anderes EU-Land']].map(function(o){ return '<option value="' + o[0] + '"' + (l.land === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-palletstatus">Palettenbereitstellung</label>'
    + '<select class="form-control" id="wiz-palletstatus">'
    + [['','Bitte wählen…'],['palettiert','Fertig palettiert'],['lose','Lose (Schüttware)'],['gemischt','Teils palettiert']].map(function(o){ return '<option value="' + o[0] + '"' + (l.palletStatus === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem">'
    + '<div class="form-group"><label class="form-label" for="wiz-pallets">Anzahl Paletten</label>'
    + '<input class="form-control" type="number" id="wiz-pallets" value="' + esc(l.palletCount||'') + '" min="0" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-pieces">Stückzahl (ca.)</label>'
    + '<input class="form-control" type="number" id="wiz-pieces" value="' + esc(l.pieceCount||'') + '" min="0" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-volume">Volumen m³</label>'
    + '<input class="form-control" type="number" id="wiz-volume" value="' + esc(l.volumeM3||'') + '" min="0" step="0.1" /></div>'
    + '</div>'
    + '<div class="form-group"><label class="form-label" for="wiz-ready">Verfügbar ab</label>'
    + '<input class="form-control" type="date" id="wiz-ready" value="' + esc(l.readyFrom||'') + '" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-deadlinetype">Zeitdruck</label>'
    + '<select class="form-control" id="wiz-deadlinetype" onchange="toggleDeadlineDate(this.value)">'
    + [['flexibel','Flexibel – kein fixer Termin'],['geplant','Geplant – Zieldatum'],['dringend','Dringend – muss schnell weg']].map(function(o){ return '<option value="' + o[0] + '"' + (l.deadlineType === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="form-group" id="wiz-deadline-date-group" style="display:' + (l.deadlineType === 'geplant' ? '' : 'none') + '">'
    + '<label class="form-label" for="wiz-deadline">Wunsch-Datum</label>'
    + '<input class="form-control" type="date" id="wiz-deadline" value="' + esc(l.deadlineDate||'') + '" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-links">Links (Google Drive, Dropbox etc.)</label>'
    + '<input class="form-control" type="url" id="wiz-links" placeholder="https://…" value="' + esc((l.links||[]).join(', ')) + '" />'
    + '<div class="form-hint">Mehrere Links durch Komma trennen</div></div>'
    // Upload zone
    + '<div class="form-group">'
    + '<label class="form-label">Fotos &amp; Dateien hochladen</label>'
    + '<div class="upload-zone" id="upload-zone" onclick="document.getElementById(\'upload-input\').click()" ondragover="uploadDragOver(event)" ondragleave="uploadDragLeave(event)" ondrop="uploadDrop(event)">'
    + '<input type="file" id="upload-input" multiple accept="' + UPLOAD_ALLOWED_EXTS.join(',') + '" onchange="handleUploadFiles(this.files,\'' + window._wizReqId + '\')" />'
    + '<p>📁 Fotos, Listen, Rechnungen hochladen</p>'
    + '<p class="text-xs" style="margin-top:.3rem">Erlaubt: JPG, PNG, PDF, Excel, Word, ZIP u.v.m. · Max. ' + UPLOAD_MAX_TOTAL_MB + ' MB gesamt</p>'
    + '</div>'
    + '<div id="upload-error" class="field-error-msg hidden"></div>'
    + '<div class="upload-list" id="upload-list"></div>'
    + '<div class="text-xs text-muted mt-sm">Gesamt: <span id="upload-total-size">' + totalMb.toFixed(1) + '</span> MB / ' + UPLOAD_MAX_TOTAL_MB + ' MB</div>'
    + '</div>';
}

function renderWizardStep4(pr) {
  return '<div class="alert alert-info mb">'
    + '💡 Die Angaben zum Preis helfen uns, schneller ein passendes Angebot zu erstellen. Alles freiwillig.'
    + '</div>'
    + '<div class="form-group"><label class="form-label" for="wiz-estvalue">Geschätzter Warenwert (€)</label>'
    + '<input class="form-control" type="number" id="wiz-estvalue" value="' + esc(pr.estValue||'') + '" min="0" placeholder="z.B. 50000" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-wishprice">Wunschpreis (€) <span class="req">*</span></label>'
    + '<input class="form-control" type="number" id="wiz-wishprice" value="' + esc(pr.wishPrice||'') + '" min="0" placeholder="Ihr Zielerlös" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-minprice">Mindestakzeptanzpreis (€)</label>'
    + '<input class="form-control" type="number" id="wiz-minprice" value="' + esc(pr.minAcceptable||'') + '" min="0" placeholder="Absolutes Minimum" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-pricebasis">Preisbasis</label>'
    + '<select class="form-control" id="wiz-pricebasis">'
    + [['gesamt','Gesamtpreis'],['pro_palette','Pro Palette'],['pro_stueck','Pro Stück'],['pro_kg','Pro Kilogramm']].map(function(o){ return '<option value="' + o[0] + '"' + (pr.priceBasis === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-vatmode">Mehrwertsteuer</label>'
    + '<select class="form-control" id="wiz-vatmode">'
    + [['regelbesteuerung','Regelbesteuerung (MwSt. ausweisbar)'],['differenzbesteuerung','Differenzbesteuerung'],['keine','Keine MwSt. / Privatperson']].map(function(o){ return '<option value="' + o[0] + '"' + (pr.vatMode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
    + '</select></div>';
}

/* Step 5 – Full Summary (P1 enhancement) */
function renderWizardStep5(req, db) {
  var c = req.contact || {};
  var p = req.postProfile || {};
  var l = req.logistics || {};
  var pr = req.price || {};
  var cons = req.consent || {};

  function row(label, val) {
    return '<tr><td>' + esc(label) + '</td><td>' + (val ? esc(String(val)) : '<span class="text-muted">–</span>') + '</td></tr>';
  }
  function boolVal(v) { return v === true ? 'Ja' : v === false ? 'Nein' : '–'; }

  var postenartLabels = { retouren:'Retouren',restposten:'Restposten',insolvenz:'Insolvenz',b_ware:'B-Ware',gemischt:'Gemischt' };
  var qualLabels = { neuwertig:'Neuwertig (A)',gut:'Gut (A/B)',gemischt:'Gemischt',c_d:'C/D-Ware',schrott:'Defekt/Schrott' };

  var subgradesHtml = (p.qualitaet === 'gemischt' && p.mixedSubgrades && p.mixedSubgrades.length > 0)
    ? ' (' + p.mixedSubgrades.join(', ') + ')' : '';

  var uploadsHtml = '';
  if (l.uploads && l.uploads.length > 0) {
    uploadsHtml = l.uploads.map(function(u, i) {
      var isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(u.name||'');
      return '<div class="upload-item">'
        + '<span class="upload-item-icon">' + (isImg ? '🖼' : '📄') + '</span>'
        + '<span class="upload-item-name">' + (isImg ? 'Bild ' + (i+1) : 'Datei ' + (i+1)) + ': ' + esc(u.name) + '</span>'
        + '<span class="upload-item-size">' + fmtBytes(u.size) + '</span>'
        + '</div>';
    }).join('');
  }

  var comp = computeCompletion(req);
  var compClass = comp >= 80 ? 'alert-success' : comp >= 50 ? 'alert-warning' : 'alert-error';

  return '<div class="alert ' + compClass + ' mb">Ihre Angaben sind zu <strong>' + comp + '%</strong> vollständig.'
    + (comp < 70 ? ' Bitte ergänzen Sie fehlende Pflichtfelder in den vorherigen Schritten.' : ' Super – Sie können jetzt absenden.') + '</div>'

    + '<div class="summary-section-title">Kontakt</div>'
    + '<table class="summary-table"><tbody>'
    + row('E-Mail', c.email)
    + row('Telefon', c.phone)
    + row('Name', c.name)
    + row('Firma', c.company)
    + row('Kurzbeschreibung', c.shortDesc)
    + '</tbody></table>'

    + '<div class="summary-section-title">Postenprofil</div>'
    + '<table class="summary-table"><tbody>'
    + row('Postenart', postenartLabels[p.postenart] || p.postenart)
    + row('Qualität', (qualLabels[p.qualitaet] || p.qualitaet) + subgradesHtml)
    + row('Warengruppen', (p.kategorien||[]).join(', '))
    + row('Ersthandel', boolVal(p.firstHand))
    + row('Restriktionen', boolVal(p.restrictions))
    + '</tbody></table>'

    + '<div class="summary-section-title">Logistik</div>'
    + '<table class="summary-table"><tbody>'
    + row('PLZ / Ort', [l.plz, l.ort, l.land].filter(Boolean).join(', '))
    + row('Paletten', l.palletCount)
    + row('Stückzahl', l.pieceCount)
    + row('Volumen', l.volumeM3 ? l.volumeM3 + ' m³' : null)
    + row('Verfügbar ab', l.readyFrom ? fmtDate(l.readyFrom) : null)
    + row('Zeitdruck', { flexibel:'Flexibel', geplant:'Geplant', dringend:'Dringend' }[l.deadlineType] || l.deadlineType)
    + '</tbody></table>'

    + '<div class="summary-section-title">Medien &amp; Links</div>'
    + (uploadsHtml ? '<div class="upload-list">' + uploadsHtml + '</div>' : '<p class="text-sm text-muted">Keine Dateien hochgeladen</p>')
    + ((l.links && l.links.length > 0) ? '<p class="text-sm mt-sm"><strong>Links:</strong> ' + l.links.map(function(lnk){ return '<a href="' + esc(lnk) + '" target="_blank">' + esc(lnk) + '</a>'; }).join(', ') + '</p>' : '')

    + '<div class="summary-section-title">Preisvorstellung</div>'
    + '<table class="summary-table"><tbody>'
    + row('Geschätzter Warenwert', pr.estValue ? Number(pr.estValue).toLocaleString('de-DE') + ' €' : null)
    + row('Wunschpreis', pr.wishPrice ? Number(pr.wishPrice).toLocaleString('de-DE') + ' €' : null)
    + row('Mindestakzeptanz', pr.minAcceptable ? Number(pr.minAcceptable).toLocaleString('de-DE') + ' €' : null)
    + row('Preisbasis', { gesamt:'Gesamt',pro_palette:'Pro Palette',pro_stueck:'Pro Stück',pro_kg:'Pro kg' }[pr.priceBasis] || pr.priceBasis)
    + row('MwSt.-Modus', pr.vatMode)
    + '</tbody></table>'

    + '<div class="summary-section-title">Freigaben</div>'
    + '<table class="summary-table"><tbody>'
    + row('Datenschutz bestätigt', cons.privacyAcceptedAt ? 'Ja, am ' + fmtDate(cons.privacyAcceptedAt) : 'Nein')
    + row('B2B-Netzwerk Opt-In', boolVal(cons.networkOptIn))
    + row('Online-Listing', boolVal(cons.allowOnlineListing))
    + '</tbody></table>'

    // Passwort setzen (wenn noch keins)
    + renderPasswordSection(req)

    // Pflicht-Checkbox "Alles korrekt"
    + '<div class="form-group" style="margin-top:1.25rem;padding:1rem;border:1.5px solid var(--liq-border);border-radius:8px">'
    + '<label class="check-label" style="font-size:.92rem">'
    + '<input type="checkbox" id="wiz-confirm-correct" onchange="clearFieldError(\'wiz-confirm-correct\')" />'
    + '<span><strong>Ich bestätige, dass alle Angaben korrekt und vollständig sind.</strong><br>'
    + '<span class="text-muted text-xs">Falsche oder unvollständige Angaben können den Ankaufprozess verzögern.</span></span>'
    + '</label>'
    + '</div>';
}

function renderPasswordSection(req) {
  var db = dbLoadFresh();
  var user = db.users.find(function(u){ return u.id === req.ownerUserId; });
  if (!user || user.passwordHashOrPlain) return '';
  return '<div class="card-sm" style="margin-top:1rem;border:1.5px solid var(--liq-primary);border-radius:8px;background:var(--liq-primary-light)">'
    + '<h4 style="font-size:.9rem;font-weight:700;margin-bottom:.5rem">🔑 Passwort für Ihren Bereich festlegen</h4>'
    + '<p class="text-xs text-muted mb">Sie können sich danach jederzeit direkt einloggen.</p>'
    + '<div class="form-group"><label class="form-label" for="wiz-pw">Neues Passwort</label>'
    + '<input class="form-control" type="password" id="wiz-pw" placeholder="Mindestens 6 Zeichen" /></div>'
    + '<div class="form-group"><label class="form-label" for="wiz-pw2">Passwort wiederholen</label>'
    + '<input class="form-control" type="password" id="wiz-pw2" placeholder="Nochmals eingeben" /></div>'
    + '</div>';
}

function renderWizardActions(step, reqId) {
  var backHtml = step > 1
    ? '<button class="btn btn-secondary" onclick="handleWizardNavAction(\'' + reqId + '\',' + step + ',\'back\')">← Zurück</button>'
    : '<a href="#/portal/request/' + reqId + '" class="btn btn-ghost">← Abbrechen</a>';

  var nextLabel = step < 5 ? 'Weiter →' : 'Abschicken ✓';
  var nextBtn = '<button class="btn btn-primary" onclick="handleWizardNavAction(\'' + reqId + '\',' + step + ',\'next\')">' + nextLabel + '</button>';

  return '<div class="wizard-actions">' + backHtml + '<div class="wizard-actions-right">'
    + '<button class="btn btn-ghost btn-sm" onclick="saveWizardFromDOM(\'' + reqId + '\',' + step + ',false)">Zwischenspeichern</button>'
    + nextBtn + '</div></div>';
}

/* ============================================================
   Wizard Navigation + Validation
   ============================================================ */
function handleWizardNavAction(reqId, currentStep, action) {
  if (action === 'back') {
    saveWizardFromDOM(reqId, currentStep, false);
    navigate('/portal/request/' + reqId + '/wizard?step=' + (currentStep - 1));
    return;
  }

  // action === 'next': validate first
  var valid = validateWizardStep(currentStep, reqId);
  if (!valid) return;

  saveWizardFromDOM(reqId, currentStep, true);

  if (currentStep < 5) {
    navigate('/portal/request/' + reqId + '/wizard?step=' + (currentStep + 1));
  } else {
    // Submit
    submitWizard(reqId);
  }
}

function validateWizardStep(step, reqId) {
  clearFormErrors('wizard-step-form');
  var ok = true;

  if (step === 1) {
    var email = document.getElementById('wiz-email').value.trim();
    var phone = document.getElementById('wiz-phone').value.trim();
    var desc  = document.getElementById('wiz-shortdesc').value.trim();
    if (!email || !validateEmail(email)) { markFieldError('wiz-email', 'Gültige E-Mail erforderlich.'); ok = false; }
    if (!phone || !validatePhone(phone)) { markFieldError('wiz-phone', 'Gültige Telefonnummer erforderlich.'); ok = false; }
    if (!desc || desc.length < 5) { markFieldError('wiz-shortdesc', 'Kurzbeschreibung erforderlich (mind. 5 Zeichen).'); ok = false; }
  }

  if (step === 2) {
    var postenart = document.getElementById('wiz-postenart').value;
    var qualitaet = document.getElementById('wiz-qualitaet').value;
    var kats = Array.from(document.querySelectorAll('input[name="kategorie"]:checked')).map(function(c){ return c.value; });
    var beschr = document.getElementById('wiz-beschreibung').value.trim();

    if (!postenart) { markFieldError('wiz-postenart', 'Bitte Art des Postens wählen.'); ok = false; }
    if (!qualitaet) { markFieldError('wiz-qualitaet', 'Bitte Qualität wählen.'); ok = false; }

    // P1: Mixed subgrades validation
    if (qualitaet === 'gemischt') {
      var grades = Array.from(document.querySelectorAll('input[name="mixed-grade"]:checked')).map(function(c){ return c.value; });
      if (grades.length === 0) {
        document.getElementById('mixed-grades-error').classList.remove('hidden');
        ok = false;
      }
    }

    if (kats.length === 0) {
      document.getElementById('kategorien-error').classList.remove('hidden');
      ok = false;
    }
    if (!beschr || beschr.length < 10) { markFieldError('wiz-beschreibung', 'Bitte beschreiben Sie den Posten ausführlicher (mind. 10 Zeichen).'); ok = false; }
  }

  if (step === 3) {
    var plz = document.getElementById('wiz-plz').value.trim();
    var ort = document.getElementById('wiz-ort').value.trim();
    if (!plz) { markFieldError('wiz-plz', 'PLZ erforderlich.'); ok = false; }
    if (!ort) { markFieldError('wiz-ort', 'Ort erforderlich.'); ok = false; }
    // Upload errors are shown live during upload
    var uploadErr = document.getElementById('upload-error');
    if (uploadErr && !uploadErr.classList.contains('hidden') && uploadErr.textContent) { ok = false; }
  }

  if (step === 4) {
    var wishprice = document.getElementById('wiz-wishprice').value.trim();
    if (!wishprice || parseFloat(wishprice) <= 0) { markFieldError('wiz-wishprice', 'Bitte Wunschpreis angeben.'); ok = false; }
  }

  if (step === 5) {
    var confirmed = document.getElementById('wiz-confirm-correct').checked;
    if (!confirmed) { markFieldError('wiz-confirm-correct', 'Bitte bestätigen Sie die Richtigkeit Ihrer Angaben.'); ok = false; }
    // Password check
    var pwEl  = document.getElementById('wiz-pw');
    var pw2El = document.getElementById('wiz-pw2');
    if (pwEl && pwEl.value) {
      if (pwEl.value.length < 6) { markFieldError('wiz-pw', 'Passwort muss mind. 6 Zeichen haben.'); ok = false; }
      else if (pw2El && pwEl.value !== pw2El.value) { markFieldError('wiz-pw2', 'Passwörter stimmen nicht überein.'); ok = false; }
    }
  }

  if (!ok) {
    // Scroll to first error
    var firstErr = document.querySelector('.form-control.error, .field-error-msg:not(.hidden)');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return ok;
}

function onMixedGradeChange() {
  var grades = Array.from(document.querySelectorAll('input[name="mixed-grade"]:checked'));
  var errEl = document.getElementById('mixed-grades-error');
  if (errEl) {
    errEl.classList.toggle('hidden', grades.length > 0);
  }
}

function clearKategorienError() {
  var errEl = document.getElementById('kategorien-error');
  if (errEl) errEl.classList.add('hidden');
}

function updateMixedGrades(val) {
  var section = document.getElementById('mixed-grades-section');
  if (section) section.style.display = (val === 'gemischt') ? '' : 'none';
}

function toggleDeadlineDate(val) {
  var group = document.getElementById('wiz-deadline-date-group');
  if (group) group.style.display = (val === 'geplant') ? '' : 'none';
}

/* Save wizard form data to DB */
function saveWizardFromDOM(reqId, step, updateTimeline) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;

  if (step === 1) {
    req.contact.email   = document.getElementById('wiz-email').value.trim();
    req.contact.phone   = document.getElementById('wiz-phone').value.trim();
    req.contact.name    = document.getElementById('wiz-name').value.trim();
    req.contact.company = document.getElementById('wiz-company').value.trim();
    req.contact.shortDesc = document.getElementById('wiz-shortdesc').value.trim();
    // Sync user data
    var user = db.users.find(function(u){ return u.id === req.ownerUserId; });
    if (user) {
      user.email   = req.contact.email;
      user.phone   = req.contact.phone;
      user.name    = req.contact.name;
      user.company = req.contact.company;
    }
  }

  if (step === 2) {
    req.postProfile.postenart   = document.getElementById('wiz-postenart').value;
    req.postProfile.qualitaet   = document.getElementById('wiz-qualitaet').value;
    req.postProfile.kategorien  = Array.from(document.querySelectorAll('input[name="kategorie"]:checked')).map(function(c){ return c.value; });
    req.postProfile.beschreibung = document.getElementById('wiz-beschreibung').value.trim();
    var fhRadio = document.querySelector('input[name="firsthand"]:checked');
    req.postProfile.firstHand   = fhRadio ? fhRadio.value === 'yes' : null;
    var restRadio = document.querySelector('input[name="restrictions"]:checked');
    req.postProfile.restrictions = restRadio ? restRadio.value === 'yes' : null;
    // P1: mixed subgrades
    if (req.postProfile.qualitaet === 'gemischt') {
      req.postProfile.mixedSubgrades = Array.from(document.querySelectorAll('input[name="mixed-grade"]:checked')).map(function(c){ return c.value; });
    } else {
      req.postProfile.mixedSubgrades = [];
    }
  }

  if (step === 3) {
    req.logistics.plz          = document.getElementById('wiz-plz').value.trim();
    req.logistics.ort          = document.getElementById('wiz-ort').value.trim();
    req.logistics.land         = document.getElementById('wiz-land').value;
    req.logistics.palletStatus = document.getElementById('wiz-palletstatus').value;
    req.logistics.palletCount  = parseInt(document.getElementById('wiz-pallets').value) || null;
    req.logistics.pieceCount   = parseInt(document.getElementById('wiz-pieces').value) || null;
    req.logistics.volumeM3     = parseFloat(document.getElementById('wiz-volume').value) || null;
    req.logistics.readyFrom    = document.getElementById('wiz-ready').value;
    req.logistics.deadlineType = document.getElementById('wiz-deadlinetype').value;
    var deadlineEl = document.getElementById('wiz-deadline');
    req.logistics.deadlineDate = deadlineEl ? deadlineEl.value : null;
    var linksVal = document.getElementById('wiz-links').value.trim();
    req.logistics.links = linksVal ? linksVal.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : [];
  }

  if (step === 4) {
    req.price.estValue      = parseFloat(document.getElementById('wiz-estvalue').value) || null;
    req.price.wishPrice     = parseFloat(document.getElementById('wiz-wishprice').value) || null;
    req.price.minAcceptable = parseFloat(document.getElementById('wiz-minprice').value) || null;
    req.price.priceBasis    = document.getElementById('wiz-pricebasis').value;
    req.price.vatMode       = document.getElementById('wiz-vatmode').value;
  }

  if (step === 5) {
    // Password
    var pwEl = document.getElementById('wiz-pw');
    if (pwEl && pwEl.value && pwEl.value.length >= 6) {
      var user = db.users.find(function(u){ return u.id === req.ownerUserId; });
      if (user) user.passwordHashOrPlain = hashSimple(pwEl.value);
    }
  }

  req.updatedAt = nowIso();
  req.risk = computeRisk(req);

  if (updateTimeline) {
    req.timeline.push({ id: uid(), type: 'wizard_step', actor: 'vendor', at: nowIso(), payload: { step: step, note: 'Schritt ' + step + ' ausgefüllt' } });
  }

  dbSave(db);
}

function submitWizard(reqId) {
  saveWizardFromDOM(reqId, 5, true);
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (req && req.status === 'EINGEGANGEN') {
    req.status = 'IN_ANALYSE';
    req.timeline.push({ id: uid(), type: 'status_change', actor: 'system', at: nowIso(), payload: { from: 'EINGEGANGEN', to: 'IN_ANALYSE', note: 'Wizard abgeschlossen, Prüfung gestartet' } });
    dbSave(db);
  }
  navigate('/portal/request/' + reqId);
}


/* ============================================================
   15. UPLOAD HANDLER – P0: Type whitelist + size limits
   ============================================================ */
function handleUploadFiles(files, reqId) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  if (!req.logistics.uploads) req.logistics.uploads = [];

  var errEl = document.getElementById('upload-error');
  var zoneEl = document.getElementById('upload-zone');

  var errs = [];
  var currentTotal = req.logistics.uploads.reduce(function(s,u){ return s + (u.size||0); }, 0);

  Array.from(files).forEach(function(file) {
    // Type check
    if (!validateUploadFile(file)) {
      errs.push('"' + file.name + '" – Dateityp nicht erlaubt (erlaubt: JPG, PNG, PDF, Excel, Word, ZIP…)');
      return;
    }
    // Size check per file (50 MB per file)
    if (file.size > 50 * 1048576) {
      errs.push('"' + file.name + '" – Datei zu groß (max. 50 MB pro Datei)');
      return;
    }
    // Total size check
    if ((currentTotal + file.size) > UPLOAD_MAX_TOTAL_MB * 1048576) {
      errs.push('Gesamtlimit von ' + UPLOAD_MAX_TOTAL_MB + ' MB überschritten.');
      return;
    }

    // Read as data URL for preview (images only in memory)
    var isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    var uploadEntry = {
      id: uid(),
      name: file.name,
      size: file.size,
      type: file.type,
      addedAt: nowIso(),
      dataUrl: null
    };

    if (isImg) {
      var reader = new FileReader();
      reader.onload = (function(entry) {
        return function(e) {
          entry.dataUrl = e.target.result;
          dbSave(db);
          renderUploadList(req.logistics.uploads, reqId);
        };
      })(uploadEntry);
      reader.readAsDataURL(file);
    }

    req.logistics.uploads.push(uploadEntry);
    currentTotal += file.size;
  });

  if (errs.length > 0) {
    errEl.textContent = errs.join(' · ');
    errEl.classList.remove('hidden');
    if (zoneEl) zoneEl.classList.add('error');
  } else {
    errEl.classList.add('hidden');
    if (zoneEl) zoneEl.classList.remove('error');
  }

  req.updatedAt = nowIso();
  dbSave(db);
  renderUploadList(req.logistics.uploads, reqId);
  updateUploadTotal(req.logistics.uploads);

  // Reset file input
  var inp = document.getElementById('upload-input');
  if (inp) inp.value = '';
}

function renderUploadList(uploads, reqId) {
  var list = document.getElementById('upload-list');
  if (!list) return;
  if (!uploads || uploads.length === 0) { list.innerHTML = ''; return; }

  list.innerHTML = uploads.map(function(u, i) {
    var isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(u.name||'');
    var preview = (isImg && u.dataUrl)
      ? '<img class="upload-preview" src="' + u.dataUrl + '" alt="Vorschau" />'
      : '<span class="upload-item-icon">' + (isImg ? '🖼' : '📄') + '</span>';
    return '<div class="upload-item" id="upload-item-' + u.id + '">'
      + preview
      + '<span class="upload-item-name">' + esc(u.name) + '</span>'
      + '<span class="upload-item-size">' + fmtBytes(u.size) + '</span>'
      + '<button class="upload-remove" title="Entfernen" onclick="removeUpload(\'' + (reqId || window._wizReqId) + '\',\'' + u.id + '\')">✕</button>'
      + '</div>';
  }).join('');
}

function removeUpload(reqId, uploadId) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  req.logistics.uploads = req.logistics.uploads.filter(function(u){ return u.id !== uploadId; });
  req.updatedAt = nowIso();
  dbSave(db);
  renderUploadList(req.logistics.uploads, reqId);
  updateUploadTotal(req.logistics.uploads);
  // Clear upload error if any
  var errEl = document.getElementById('upload-error');
  if (errEl) { errEl.classList.add('hidden'); }
  var zoneEl = document.getElementById('upload-zone');
  if (zoneEl) zoneEl.classList.remove('error');
}

function updateUploadTotal(uploads) {
  var totalEl = document.getElementById('upload-total-size');
  if (!totalEl) return;
  var total = (uploads || []).reduce(function(s,u){ return s + (u.size||0); }, 0) / 1048576;
  totalEl.textContent = total.toFixed(1);
}

function uploadDragOver(e) {
  e.preventDefault();
  var zone = document.getElementById('upload-zone');
  if (zone) zone.classList.add('drag-over');
}
function uploadDragLeave(e) {
  var zone = document.getElementById('upload-zone');
  if (zone) zone.classList.remove('drag-over');
}
function uploadDrop(e) {
  e.preventDefault();
  var zone = document.getElementById('upload-zone');
  if (zone) zone.classList.remove('drag-over');
  if (e.dataTransfer && e.dataTransfer.files) {
    handleUploadFiles(e.dataTransfer.files, window._wizReqId);
  }
}

/* ============================================================
   16. REMINDER SIMULATION
   ============================================================ */
function checkReminders() {
  var db = dbLoadFresh();
  var lastRun = localStorage.getItem(REMINDER_KEY);
  var now = Date.now();
  if (lastRun && (now - parseInt(lastRun)) < 3600000) return; // once per hour
  localStorage.setItem(REMINDER_KEY, now.toString());

  db.requests.forEach(function(req) {
    if (req.status !== 'EINGEGANGEN') return;
    var comp = computeCompletion(req);
    if (comp >= 80) return;
    var hrs = (now - new Date(req.createdAt).getTime()) / 3600000;
    if (hrs >= 24) {
      var user = db.users.find(function(u){ return u.id === req.ownerUserId; });
      if (user) sendReminderEmail(db, user, req, hrs);
    }
  });
  dbSave(db);
}

function triggerReminderCheck(hours) {
  var db = dbLoadFresh();
  var count = 0;
  db.requests.forEach(function(req) {
    var comp = computeCompletion(req);
    if (comp < 80) {
      var user = db.users.find(function(u){ return u.id === req.ownerUserId; });
      if (user) { sendReminderEmail(db, user, req, hours); count++; }
    }
  });
  dbSave(db);
  alert('Erinnerung simuliert für ' + count + ' Anfrage(n). E-Mails im Postausgang.');
}


/* ============================================================
   17. ADMIN BACKOFFICE
   ============================================================ */
function renderAdmin(app) {
  var user = sessionGet();
  if (!user || user.role !== 'admin') { navigate('/admin'); app.innerHTML = renderAdminLoginForm(); return; }

  var db = dbLoadFresh();
  var requests = db.requests.slice().sort(function(a,b){ return new Date(b.updatedAt) - new Date(a.updatedAt); });

  var filterHtml = '<div class="filter-bar">'
    + '<input class="form-control" type="search" id="admin-search" placeholder="Suche E-Mail, Beschreibung…" oninput="filterAdminList()" />'
    + '<select class="form-control" id="admin-filter-status" onchange="filterAdminList()">'
    + '<option value="">Alle Status</option>'
    + Object.keys(STATUS_LABELS).map(function(k){ return '<option value="' + k + '">' + STATUS_LABELS[k] + '</option>'; }).join('')
    + '</select>'
    + '<span class="text-xs text-muted">' + requests.length + ' Anfragen</span>'
    + '</div>';

  var tableHtml = '<div class="admin-table-wrap"><table class="admin-table" id="admin-table"><thead><tr>'
    + '<th>Status</th><th>E-Mail</th><th>Beschreibung</th><th>Vollst.</th><th>Datum</th><th>Risiko</th><th></th>'
    + '</tr></thead><tbody>'
    + requests.map(function(r) {
        var user2 = db.users.find(function(u){ return u.id === r.ownerUserId; });
        var comp = computeCompletion(r);
        var risk = r.risk || {};
        var riskHtml = risk.level ? '<span class="badge badge-' + (risk.level==='low'?'green':risk.level==='medium'?'orange':'red') + '">' + risk.score + '</span>' : '–';
        return '<tr data-id="' + r.id + '" data-status="' + r.status + '" data-search="' + esc((r.contact.email+' '+(r.contact.shortDesc||'')).toLowerCase()) + '">'
          + '<td><span class="badge ' + (STATUS_BADGE_CLASS[r.status]||'badge-gray') + '">' + esc(STATUS_LABELS[r.status]||r.status) + '</span></td>'
          + '<td class="text-sm">' + esc((user2&&user2.email)||r.contact.email||'') + '</td>'
          + '<td class="text-sm">' + esc((r.contact.shortDesc||'').slice(0,50)) + '</td>'
          + '<td><span class="badge ' + (comp>=80?'badge-green':comp>=50?'badge-orange':'badge-red') + '">' + comp + '%</span></td>'
          + '<td class="text-xs text-muted">' + fmtDate(r.createdAt) + '</td>'
          + '<td>' + riskHtml + '</td>'
          + '<td><a href="#/admin/request/' + r.id + '" class="btn btn-secondary btn-sm">→</a></td>'
          + '</tr>';
      }).join('')
    + '</tbody></table></div>';

  app.innerHTML = renderTopbar(user)
    + '<div class="liq-wrap"><div class="page-content">'
    + '<div class="section-header"><h1 class="section-title">Ankauf-Anfragen</h1>'
    + '<div style="display:flex;gap:.5rem">'
    + '<a href="#/admin/emails" class="btn btn-secondary btn-sm">📧 Postausgang</a>'
    + '<a href="#/admin/settings" class="btn btn-secondary btn-sm">⚙ Einstellungen</a>'
    + '</div></div>'
    + filterHtml + tableHtml
    + '</div></div>';
}

function renderAdminLoginForm() {
  return '<div class="login-wrap"><div class="card login-card">'
    + '<div class="login-logo"><span class="liq-logo-text">Liquid<span style="color:var(--liq-text)">ato</span> <span style="font-size:.8rem;font-weight:400">Admin</span></span></div>'
    + '<form id="admin-login-form" onsubmit="return false;">'
    + '<div class="form-group"><label class="form-label" for="adm-email">E-Mail</label>'
    + '<input class="form-control" type="email" id="adm-email" value="admin@liquidato.local" /></div>'
    + '<div class="form-group"><label class="form-label" for="adm-pw">Passwort</label>'
    + '<input class="form-control" type="password" id="adm-pw" value="" placeholder="admin" /></div>'
    + '<div id="adm-login-error" class="alert alert-error hidden" style="margin-bottom:.75rem"></div>'
    + '<button class="btn btn-primary btn-full" onclick="doAdminLogin()">Anmelden</button>'
    + '</form>'
    + '<p class="text-xs text-muted text-center mt">admin@liquidato.local / admin</p>'
    + '</div></div>';
}

function doAdminLogin() {
  var email = document.getElementById('adm-email').value.trim();
  var pw    = document.getElementById('adm-pw').value;
  var err   = document.getElementById('adm-login-error');
  var db = dbLoadFresh();
  var user = db.users.find(function(u){ return u.email === email && u.role === 'admin'; });
  if (!user || !checkPassword(pw, user.passwordHashOrPlain)) {
    err.textContent = 'Zugangsdaten ungültig.';
    err.classList.remove('hidden');
    return;
  }
  sessionSet(user.id);
  renderRoute();
}

function filterAdminList() {
  var query  = (document.getElementById('admin-search').value || '').toLowerCase();
  var status = document.getElementById('admin-filter-status').value;
  var rows = document.querySelectorAll('#admin-table tbody tr');
  rows.forEach(function(row) {
    var rowStatus = row.getAttribute('data-status') || '';
    var rowSearch = row.getAttribute('data-search') || '';
    var matchQ = !query || rowSearch.includes(query);
    var matchS = !status || rowStatus === status;
    row.style.display = (matchQ && matchS) ? '' : 'none';
  });
}

/* Admin Request Detail */
function renderAdminRequestDetail(app, reqId) {
  var user = requireAdmin();
  if (!user) { app.innerHTML = renderAdminLoginForm(); return; }

  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) {
    app.innerHTML = renderTopbar(user) + '<div class="liq-wrap"><div class="page-content"><div class="alert alert-error">Anfrage nicht gefunden.</div><a href="#/admin" class="btn btn-secondary mt">Zurück</a></div></div>';
    return;
  }

  var vendor = db.users.find(function(u){ return u.id === req.ownerUserId; });
  var risk = req.risk || computeRisk(req);
  var settings = db.settings;

  // Allowed status transitions
  var transitions = ALLOWED_TRANSITIONS[req.status] || [];
  var transitionHtml = transitions.length > 0
    ? transitions.map(function(s){ return '<button class="action-btn-admin" onclick="adminSetStatus(\'' + req.id + '\',\'' + s + '\')">' + esc(STATUS_LABELS[s]||s) + '</button>'; }).join('')
    : '<span class="text-muted text-sm">Keine weiteren Übergänge möglich</span>';

  var networkHtml = '';
  if (settings.networkAndBidsEnabled && req.consent && req.consent.networkOptIn) {
    networkHtml = '<button class="action-btn-admin" onclick="adminOfferNetwork(\'' + req.id + '\')">🌍 Im Netzwerk anbieten</button>';
  }

  // Messages
  var msgsHtml = '';
  if (req.messages && req.messages.length > 0) {
    msgsHtml = '<div class="msg-thread mb">'
      + req.messages.map(function(m){
          return '<div class="msg-bubble ' + m.from + '">' + esc(m.text) + '<div class="msg-meta">' + fmtDateTime(m.at) + ' · ' + (m.from === 'admin' ? 'Liquidato' : 'Anbieter') + '</div></div>';
        }).join('')
      + '</div>';
  }

  // Timeline
  var tlHtml = '<div class="timeline">' + (req.timeline||[]).slice().reverse().map(function(t) {
    var label = t.payload && t.payload.note ? t.payload.note : t.type;
    var dotCls = t.actor === 'admin' ? 'admin' : t.actor === 'vendor' ? 'vendor' : 'system';
    return '<div class="timeline-item"><div class="timeline-dot ' + dotCls + '"></div><div class="timeline-body">'
      + '<div class="timeline-label">' + esc(label) + '</div>'
      + '<div class="timeline-time">' + fmtDateTime(t.at) + ' · ' + t.actor + '</div>'
      + '</div></div>';
  }).join('') + '</div>';

  // Risk display
  var riskHtml = '<div class="risk-score-wrap">'
    + '<div class="risk-circle risk-' + risk.level + '">' + risk.score + '</div>'
    + '<div><strong>' + (risk.level === 'low' ? '✅ Geringes Risiko' : risk.level === 'medium' ? '⚡ Mittleres Risiko' : '⚠ Hohes Risiko') + '</strong>'
    + '<p class="text-xs text-muted">Score: ' + risk.score + '/100</p></div></div>'
    + '<div class="risk-factors">'
    + (risk.factors||[]).map(function(f){ return '<div class="risk-factor"><span class="risk-factor-icon">' + f.icon + '</span>' + esc(f.text) + '</div>'; }).join('')
    + '</div>'
    + ((risk.recommendations||[]).length > 0 ? '<p class="text-xs text-muted mt-sm"><strong>Empfehlungen:</strong> ' + risk.recommendations.map(esc).join(' · ') + '</p>' : '');

  // Offer input
  var offerInputHtml = '<div style="margin-top:.75rem">'
    + '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">'
    + '<input class="form-control" id="admin-offer-amount" type="number" placeholder="Betrag €" style="max-width:160px" />'
    + '<input class="form-control" id="admin-offer-text" type="text" placeholder="Angebotsnotiz (optional)" style="flex:1;min-width:180px" />'
    + '</div>'
    + '<button class="btn btn-primary btn-sm" onclick="adminSendOffer(\'' + req.id + '\')">Angebot erstellen &amp; senden</button>'
    + '</div>';

  // Bid input
  var bidInputHtml = settings.networkAndBidsEnabled
    ? '<div style="margin-top:.75rem">'
      + '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">'
      + '<input class="form-control" id="admin-bid-amount" type="number" placeholder="Gebot €" style="max-width:160px" />'
      + '<input class="form-control" id="admin-bid-buyer" type="text" placeholder="Käufer (intern)" style="flex:1" />'
      + '</div>'
      + '<button class="btn btn-secondary btn-sm" onclick="adminAddBid(\'' + req.id + '\')">Gebot erfassen</button>'
      + '</div>'
    : '';

  app.innerHTML = renderTopbar(user)
    + '<div class="liq-wrap"><div class="page-content">'
    + '<a href="#/admin" class="back-link">← Alle Anfragen</a>'
    + '<div class="detail-layout">'
    + '<div class="detail-main">'

    // Status + transitions
    + '<div class="card mb">'
    + '<div class="section-header"><div><h2 style="font-size:1.1rem;font-weight:700">' + esc(req.contact.shortDesc||'Anfrage') + '</h2>'
    + '<p class="text-xs text-muted">ID: ' + req.id + ' · ' + fmtDateTime(req.createdAt) + '</p></div>'
    + '<span class="badge ' + (STATUS_BADGE_CLASS[req.status]||'badge-gray') + '">' + esc(STATUS_LABELS[req.status]||req.status) + '</span>'
    + '</div>'
    + '<h4 style="font-size:.85rem;font-weight:700;margin-bottom:.5rem">Status setzen:</h4>'
    + '<div class="action-grid">' + transitionHtml + (networkHtml||'') + '</div>'
    + '</div>'

    // Actions
    + '<div class="card mb"><div class="tab-bar">'
    + '<button class="tab-btn active" onclick="switchAdminTab(this,\'tab-rueckfrage\')">Rückfrage</button>'
    + '<button class="tab-btn" onclick="switchAdminTab(this,\'tab-angebot\')">Angebot</button>'
    + '<button class="tab-btn" onclick="switchAdminTab(this,\'tab-gebote\')">Gebote</button>'
    + '<button class="tab-btn" onclick="switchAdminTab(this,\'tab-preisadj\')">Preisanpassung</button>'
    + '</div>'

    + '<div id="tab-rueckfrage" class="tab-panel active">'
    + msgsHtml
    + '<textarea class="form-control" id="admin-msg-text" rows="3" placeholder="Rückfrage eingeben…"></textarea>'
    + '<button class="btn btn-primary btn-sm mt-sm" onclick="adminSendMessage(\'' + req.id + '\')">Senden</button>'
    + '</div>'

    + '<div id="tab-angebot" class="tab-panel">'
    + '<p class="text-sm text-muted mb-sm">Erstellen Sie ein verbindliches Angebot an den Anbieter.</p>'
    + offerInputHtml + '</div>'

    + '<div id="tab-gebote" class="tab-panel">'
    + (settings.networkAndBidsEnabled ? '<p class="text-sm text-muted mb-sm">Gebote aus dem B2B-Netzwerk erfassen:</p>' + bidInputHtml + renderBidsList(req) : '<div class="alert alert-info">B2B-Netzwerk deaktiviert in den Einstellungen.</div>')
    + '</div>'

    + '<div id="tab-preisadj" class="tab-panel">'
    + '<p class="text-sm text-muted mb-sm">Preisreduzierung anfragen (nur wenn Status Gebote vorhanden).</p>'
    + '<button class="btn btn-secondary btn-sm" onclick="adminRequestPriceAdj(\'' + req.id + '\')" '
    + (req.status === 'GEBOTE_VORHANDEN' ? '' : 'disabled') + '>Preisreduzierung anfragen</button>'
    + '</div></div>'

    // Timeline
    + '<div class="card"><h3 class="card-title">Verlauf</h3>' + tlHtml + '</div>'
    + '</div>'

    // Sidebar
    + '<div class="detail-sidebar">'
    + '<div class="card mb"><h3 class="card-title" style="font-size:.9rem">Kontakt</h3>'
    + (vendor ? '<p class="text-sm"><strong>' + esc(vendor.name||vendor.email) + '</strong></p>'
      + (vendor.company ? '<p class="text-sm text-muted">' + esc(vendor.company) + '</p>' : '')
      + '<p class="text-sm mt-sm">📧 ' + esc(vendor.email) + '</p>'
      + '<p class="text-sm">📞 ' + esc(vendor.phone||'–') + '</p>' : '–')
    + '</div>'
    + '<div class="card mb"><h3 class="card-title" style="font-size:.9rem">Risikoanalyse</h3>' + riskHtml + '</div>'
    + renderAdminPostenInfo(req)
    + '</div>'
    + '</div></div></div>';
}

function renderBidsList(req) {
  if (!req.bids || req.bids.length === 0) return '<p class="text-sm text-muted mt-sm">Noch keine Gebote.</p>';
  return '<div class="upload-list mt-sm">'
    + req.bids.map(function(b){ return '<div class="upload-item"><span class="upload-item-icon">💰</span>'
      + '<span class="upload-item-name">' + esc(b.buyerLabelInternal) + '</span>'
      + '<span class="upload-item-size"><strong>' + Number(b.amount).toLocaleString('de-DE') + ' €</strong></span>'
      + '<span class="text-xs text-muted">' + fmtDate(b.createdAt) + '</span>'
      + '</div>'; }).join('')
    + '</div>';
}

function renderAdminPostenInfo(req) {
  var p = req.postProfile || {};
  var l = req.logistics || {};
  var pr = req.price || {};
  function row(label, val) { return '<tr><td>' + esc(label) + '</td><td>' + esc(String(val||'–')) + '</td></tr>'; }
  return '<div class="card"><h3 class="card-title" style="font-size:.9rem">Posten-Details</h3>'
    + '<table class="summary-table"><tbody>'
    + row('Postenart', p.postenart)
    + row('Qualität', p.qualitaet + (p.mixedSubgrades && p.mixedSubgrades.length ? ' (' + p.mixedSubgrades.join(',') + ')' : ''))
    + row('Kategorien', (p.kategorien||[]).join(', '))
    + row('PLZ / Ort', [l.plz, l.ort, l.land].filter(Boolean).join(', '))
    + row('Paletten', l.palletCount)
    + row('Stückzahl', l.pieceCount)
    + row('Wunschpreis', pr.wishPrice ? Number(pr.wishPrice).toLocaleString('de-DE') + ' €' : null)
    + row('Mindestpreis', pr.minAcceptable ? Number(pr.minAcceptable).toLocaleString('de-DE') + ' €' : null)
    + row('Uploads', l.uploads ? l.uploads.length : 0)
    + '</tbody></table></div>';
}

function switchAdminTab(btn, tabId) {
  var bar = btn.closest('.tab-bar');
  bar.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  var card = btn.closest('.card');
  card.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
  var panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

/* Admin Actions */
function adminSetStatus(reqId, newStatus) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  var allowed = ALLOWED_TRANSITIONS[req.status] || [];
  if (allowed.indexOf(newStatus) < 0) { alert('Ungültiger Statusübergang.'); return; }
  var oldStatus = req.status;
  req.status = newStatus;
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'status_change', actor: 'admin', at: nowIso(), payload: { from: oldStatus, to: newStatus, note: 'Status geändert: ' + (STATUS_LABELS[newStatus]||newStatus) } });
  dbSave(db);
  renderRoute();
}

function adminSendMessage(reqId) {
  var text = document.getElementById('admin-msg-text').value.trim();
  if (!text) return;
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  if (!req.messages) req.messages = [];
  req.messages.push({ id: uid(), from: 'admin', text: text, at: nowIso() });
  req.status = 'RUECKFRAGEN';
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'message', actor: 'admin', at: nowIso(), payload: { note: 'Rückfrage gesendet: ' + text.slice(0, 60) } });
  var user = db.users.find(function(u){ return u.id === req.ownerUserId; });
  if (user) outboxAdd(db, user.email, 'Rückfrage zu Ihrer Anfrage', '<p>' + esc(text) + '</p><p><a href="#/portal/request/' + req.id + '">Zur Anfrage →</a></p>', req.id, '#/portal/request/' + req.id);
  dbSave(db);
  renderRoute();
}

function adminSendOffer(reqId) {
  var amount = parseFloat(document.getElementById('admin-offer-amount').value);
  var text   = document.getElementById('admin-offer-text').value.trim();
  if (!amount || amount <= 0) { alert('Bitte Betrag eingeben.'); return; }
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  var offer = { id: uid(), amount: amount, currency: 'EUR', text: text, createdAt: nowIso(), decision: null, decidedAt: null };
  req.offers.push(offer);
  req.status = 'ANGEBOT_GESENDET';
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'offer_created', actor: 'admin', at: nowIso(), payload: { amount: amount, note: 'Angebot erstellt: ' + amount.toLocaleString('de-DE') + ' €' } });
  var user = db.users.find(function(u){ return u.id === req.ownerUserId; });
  if (user) sendOfferEmail(db, user, req, offer);
  dbSave(db);
  renderRoute();
}

function adminAddBid(reqId) {
  var amount = parseFloat(document.getElementById('admin-bid-amount').value);
  var buyer  = document.getElementById('admin-bid-buyer').value.trim();
  if (!amount || !buyer) { alert('Betrag und Käufer-Label erforderlich.'); return; }
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  if (!req.bids) req.bids = [];
  req.bids.push({ id: uid(), amount: amount, currency: 'EUR', buyerLabelInternal: buyer, createdAt: nowIso() });
  if (req.status === 'IM_NETZWERK_ANGEBOTEN') req.status = 'GEBOTE_VORHANDEN';
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'bid_added', actor: 'admin', at: nowIso(), payload: { amount: amount, buyer: buyer, note: 'Gebot erfasst: ' + amount + ' € von ' + buyer } });
  dbSave(db);
  renderRoute();
}

function adminOfferNetwork(reqId) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req) return;
  req.status = 'IM_NETZWERK_ANGEBOTEN';
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'network_offer', actor: 'admin', at: nowIso(), payload: { note: 'Im B2B-Netzwerk angeboten' } });
  dbSave(db);
  renderRoute();
}

function adminRequestPriceAdj(reqId) {
  var db = dbLoadFresh();
  var req = db.requests.find(function(r){ return r.id === reqId; });
  if (!req || req.status !== 'GEBOTE_VORHANDEN') return;
  req.status = 'PREISREDUZIERUNG_ANGEFRAGT';
  req.updatedAt = nowIso();
  req.timeline.push({ id: uid(), type: 'price_adj_requested', actor: 'admin', at: nowIso(), payload: { note: 'Preisreduzierung beim Anbieter angefragt' } });
  var user = db.users.find(function(u){ return u.id === req.ownerUserId; });
  if (user) outboxAdd(db, user.email, 'Wir fragen eine Preisanpassung an', '<p>Um Ihren Posten erfolgreich zu vermitteln, bitten wir Sie um eine Preisanpassung.</p><a href="#/portal/request/' + req.id + '">Details ansehen →</a>', req.id, '#/portal/request/' + req.id);
  dbSave(db);
  renderRoute();
}


/* ============================================================
   18. ADMIN SETTINGS
   ============================================================ */
function renderAdminSettings(app) {
  var user = requireAdmin();
  if (!user) { app.innerHTML = renderAdminLoginForm(); return; }
  var db = dbLoadFresh();
  var s = db.settings;

  app.innerHTML = renderTopbar(user)
    + '<div class="liq-wrap"><div class="page-content">'
    + '<div class="section-header"><h1 class="section-title">Einstellungen</h1></div>'

    + '<div class="card mb"><h2 class="card-title">Allgemein</h2>'
    + '<div class="form-group"><label class="form-label">Support-Telefon</label>'
    + '<input class="form-control" id="set-phone" value="' + esc(s.supportPhone||'') + '" /></div>'
    + '<div class="form-group"><label class="form-label">Support-E-Mail</label>'
    + '<input class="form-control" id="set-email" value="' + esc(s.supportEmail||'') + '" /></div>'
    + '<div class="form-group"><label class="form-label">Datenschutz-URL</label>'
    + '<input class="form-control" id="set-privacy" value="' + esc(s.privacyUrl||'') + '" /></div>'
    + '<div class="form-group"><label class="form-label">Upload-Limit (MB)</label>'
    + '<input class="form-control" type="number" id="set-uploadmb" value="' + (s.uploadLimitMb||100) + '" /></div>'
    + '<div class="consent-row"><div class="consent-row-label"><div class="consent-row-title">B2B-Netzwerk &amp; Gebote aktivieren</div><div class="consent-row-desc">Ermöglicht Netzwerkangebote und Gebotserfassung</div></div>'
    + '<label class="toggle-switch"><input type="checkbox" id="set-network" ' + (s.networkAndBidsEnabled?'checked':'') + ' /><span class="toggle-slider"></span></label>'
    + '</div>'
    + '<div style="margin-top:1rem"><button class="btn btn-primary" onclick="saveSettings()">Speichern</button></div>'
    + '</div>'

    + '<div class="card mb"><h2 class="card-title">Bitrix24-Integration</h2>'
    + '<div class="alert alert-info mb">Bitrix-Sync ist nur als UI-Prototyp implementiert. Keine echten API-Calls.</div>'
    + '<div class="consent-row mb"><div class="consent-row-label"><div class="consent-row-title">Bitrix-Sync aktivieren</div></div>'
    + '<label class="toggle-switch"><input type="checkbox" id="set-bitrix-enabled" ' + (s.bitrix&&s.bitrix.enabled?'checked':'') + ' /></span><span class="toggle-slider"></span></label>'
    + '</div>'
    + '<div class="form-group"><label class="form-label">Webhook-URL</label>'
    + '<input class="form-control" id="set-bitrix-url" value="' + esc(s.bitrix&&s.bitrix.webhookUrl||'') + '" placeholder="https://yourbitrix.bitrix24.de/rest/..." /></div>'
    + '<button class="btn btn-secondary btn-sm" onclick="alert(\'Bitrix-Sync simuliert (kein echter API-Call)\')">Verbindung testen (Simulation)</button>'
    + '</div>'

    + '<div class="card"><h2 class="card-title">Demo-Daten</h2>'
    + '<div style="display:flex;gap:.75rem;flex-wrap:wrap">'
    + '<button class="btn btn-secondary" onclick="reloadDemoData()">Demo-Daten neu laden</button>'
    + '<button class="btn btn-danger" onclick="resetAllData()">Alle Daten zurücksetzen</button>'
    + '</div>'
    + '<div style="margin-top:.75rem">'
    + '<strong class="text-sm">Erinnerungen simulieren:</strong><br>'
    + '<div style="display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap">'
    + '<button class="btn btn-secondary btn-sm" onclick="triggerReminderCheck(24)">24h</button>'
    + '<button class="btn btn-secondary btn-sm" onclick="triggerReminderCheck(72)">72h</button>'
    + '<button class="btn btn-secondary btn-sm" onclick="triggerReminderCheck(168)">168h (7d)</button>'
    + '</div></div>'
    + '</div>'
    + '</div></div>';
}

function saveSettings() {
  var db = dbLoadFresh();
  db.settings.supportPhone       = document.getElementById('set-phone').value.trim();
  db.settings.supportEmail       = document.getElementById('set-email').value.trim();
  db.settings.privacyUrl         = document.getElementById('set-privacy').value.trim();
  db.settings.uploadLimitMb      = parseInt(document.getElementById('set-uploadmb').value) || 100;
  db.settings.networkAndBidsEnabled = document.getElementById('set-network').checked;
  db.settings.bitrix.enabled     = document.getElementById('set-bitrix-enabled').checked;
  db.settings.bitrix.webhookUrl  = document.getElementById('set-bitrix-url').value.trim();
  dbSave(db);
  alert('Einstellungen gespeichert.');
}

function reloadDemoData() {
  if (!confirm('Demo-Daten werden neu geladen. Bestehende Demo-Anfragen bleiben erhalten.')) return;
  var db = dbLoadFresh();
  dbSeed(db);
  dbSave(db);
  alert('Demo-Daten geladen.');
  renderRoute();
}

function resetAllData() {
  if (!confirm('Alle Daten werden gelöscht. Sind Sie sicher?')) return;
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(REMINDER_KEY);
  sessionClear();
  var db = dbEmpty();
  dbSeed(db);
  dbSave(db);
  alert('Daten zurückgesetzt. Demo-Zugänge wiederhergestellt.');
  navigate('/admin');
}

/* ============================================================
   19. EMAIL OUTBOX
   ============================================================ */
function renderAdminEmails(app) {
  var user = sessionGet();
  if (!user || user.role !== 'admin') { app.innerHTML = renderAdminLoginForm(); return; }
  var db = dbLoadFresh();
  var emails = db.emailsOutbox.slice().reverse();

  var listHtml = emails.length === 0
    ? '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">Postausgang leer</div></div>'
    : emails.map(function(em, idx) {
        return '<div class="card mb" id="email-card-' + em.id + '">'
          + '<div class="section-header" style="margin-bottom:.5rem">'
          + '<div><strong class="text-sm">' + esc(em.subject) + '</strong><br>'
          + '<span class="text-xs text-muted">An: ' + esc(em.to) + ' · ' + fmtDateTime(em.createdAt) + '</span></div>'
          + '<button class="btn btn-secondary btn-sm" onclick="toggleEmailPreview(\'' + em.id + '\')">Vorschau</button>'
          + '</div>'
          + '<div id="email-preview-' + em.id + '" class="email-preview hidden">'
          + '<div class="email-preview-header"><strong>Von:</strong> noreply@liquidato.de &nbsp; <strong>An:</strong> ' + esc(em.to) + '<br><strong>Betreff:</strong> ' + esc(em.subject) + '</div>'
          + '<div class="email-preview-body">' + (em.html||'') + '</div>'
          + '</div>'
          + (em.actionLinkHash ? '<p class="text-xs mt-sm"><a href="' + esc(em.actionLinkHash) + '">Action-Link öffnen →</a></p>' : '')
          + '</div>';
      }).join('');

  app.innerHTML = renderTopbar(user)
    + '<div class="liq-wrap"><div class="page-content">'
    + '<div class="section-header"><h1 class="section-title">E-Mail Postausgang</h1>'
    + '<span class="badge badge-gray">' + emails.length + ' E-Mails</span></div>'
    + listHtml
    + '</div></div>';
}

function toggleEmailPreview(emailId) {
  var el = document.getElementById('email-preview-' + emailId);
  if (el) el.classList.toggle('hidden');
}

/* ============================================================
   20. INIT & EVENT LISTENERS
   ============================================================ */
function init() {
  // Init DB
  dbInit();

  // Check if admin page needs login
  var hash = window.location.hash || '';

  // Route
  renderRoute();

  // Listen for hash changes
  window.addEventListener('hashchange', function() {
    renderRoute();
    window.scrollTo(0, 0);
  });

  // Check reminders once per hour silently
  if (!window.location.hash.includes('/admin') && !window.location.hash.includes('/portal')) {
    checkReminders();
  }
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
