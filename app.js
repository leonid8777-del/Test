(function () {
  "use strict";

  var DB_KEY = "LIQ_DB_V1";
  var REMINDER_KEY = "LIQ_REMINDER_LAST_RUN_V1";
  var DAY_MS = 24 * 60 * 60 * 1000;

  var STATUS = {
    EINGEGANGEN: { label: "Eingegangen", tone: "neutral" },
    IN_ANALYSE: { label: "In Analyse", tone: "info" },
    RUECKFRAGEN: { label: "Rueckfragen", tone: "warn" },
    BEWERTUNG: { label: "Bewertung", tone: "info" },
    ANGEBOT_GESENDET: { label: "Angebot gesendet", tone: "info" },
    ANGEBOT_ANGENOMMEN: { label: "Angebot angenommen", tone: "success" },
    ANGEBOT_ABGELEHNT: { label: "Angebot abgelehnt", tone: "danger" },
    IM_NETZWERK_ANGEBOTEN: { label: "Im Netzwerk angeboten", tone: "warn" },
    GEBOTE_VORHANDEN: { label: "Gebote vorhanden", tone: "success" },
    PREISREDUZIERUNG_ANGEFRAGT: { label: "Preisanpassung angefragt", tone: "warn" },
    ANGEBOT_ANGEPASST: { label: "Angebot angepasst", tone: "info" },
    KEINE_GEBOTE: { label: "Keine Gebote", tone: "danger" }
  };

  var STATUS_ORDER = [
    "EINGEGANGEN",
    "IN_ANALYSE",
    "RUECKFRAGEN",
    "BEWERTUNG",
    "ANGEBOT_GESENDET",
    "ANGEBOT_ANGENOMMEN",
    "ANGEBOT_ABGELEHNT",
    "IM_NETZWERK_ANGEBOTEN",
    "GEBOTE_VORHANDEN",
    "PREISREDUZIERUNG_ANGEFRAGT",
    "ANGEBOT_ANGEPASST",
    "KEINE_GEBOTE"
  ];

  var ALLOWED_TRANSITIONS = {
    EINGEGANGEN: ["IN_ANALYSE", "RUECKFRAGEN", "BEWERTUNG"],
    IN_ANALYSE: ["RUECKFRAGEN", "BEWERTUNG", "IM_NETZWERK_ANGEBOTEN", "KEINE_GEBOTE"],
    RUECKFRAGEN: ["IN_ANALYSE", "BEWERTUNG"],
    BEWERTUNG: ["ANGEBOT_GESENDET", "IM_NETZWERK_ANGEBOTEN"],
    ANGEBOT_GESENDET: ["ANGEBOT_ANGENOMMEN", "ANGEBOT_ABGELEHNT", "PREISREDUZIERUNG_ANGEFRAGT"],
    IM_NETZWERK_ANGEBOTEN: ["GEBOTE_VORHANDEN", "PREISREDUZIERUNG_ANGEFRAGT", "KEINE_GEBOTE"],
    GEBOTE_VORHANDEN: ["ANGEBOT_GESENDET", "PREISREDUZIERUNG_ANGEFRAGT"],
    PREISREDUZIERUNG_ANGEFRAGT: ["ANGEBOT_ANGEPASST", "ANGEBOT_ABGELEHNT", "ANGEBOT_ANGENOMMEN"],
    ANGEBOT_ANGEPASST: ["ANGEBOT_ANGENOMMEN", "ANGEBOT_ABGELEHNT"],
    ANGEBOT_ANGENOMMEN: [],
    ANGEBOT_ABGELEHNT: [],
    KEINE_GEBOTE: ["ANGEBOT_GESENDET", "IN_ANALYSE"]
  };

  var WIZARD_STEPS = [
    { id: 1, title: "Kontakt", sub: "Ansprechpartner" },
    { id: 2, title: "Postenprofil", sub: "Ware & Qualitaet" },
    { id: 3, title: "Logistik", sub: "Mengen & Upload" },
    { id: 4, title: "Preis", sub: "Preisrahmen" },
    { id: 5, title: "Bestaetigen", sub: "Freigaben" }
  ];

  var ALLOWED_UPLOAD_EXTENSIONS = ['.jpg','.jpeg','.png','.webp','.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.csv','.txt','.zip','.7z','.rar'];

  var uiState = {
    continueError: "",
    emailPreviewId: "",
    toasts: [],
    wizardAutosaveTimers: {},
    uploadPreviewUrls: {}
  };

  function init() {
    ensureDB();
    autoReminderCheckOnStart();

    window.addEventListener("hashchange", renderRoute);
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("change", onChange);
    document.addEventListener("input", onInput);

    if (!window.location.hash || window.location.hash === "#") {
      navigate("#/public", true);
      return;
    }

    renderRoute();
  }

  function ensureDB() {
    var raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      var seeded = createSeedDB(true);
      saveDB(seeded);
      return;
    }

    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("DB invalid");
      }
      var merged = mergeWithDefaultDB(parsed);
      saveDB(merged);
    } catch (_err) {
      var fallback = createSeedDB(true);
      saveDB(fallback);
    }
  }

  function createSeedDB(includeDemo) {
    var now = nowISO();
    var admin = {
      id: "usr_admin_seed",
      role: "admin",
      email: "admin@liquidato.local",
      phone: "+49 40 000000",
      passwordHashOrPlain: "admin",
      createdAt: now
    };

    var db = {
      users: [admin],
      sessions: { currentUserId: null, createdAt: null },
      tokens: [],
      requests: [],
      emailsOutbox: [],
      settings: {
        supportPhone: "+49 40 1234567",
        supportEmail: "support@liquidato.local",
        privacyUrl: "https://liquidato.local/datenschutz",
        uploadLimitMb: 100,
        networkAndBidsEnabled: true,
        bitrix: {
          enabled: false,
          webhookUrl: "",
          entityType: "Lead",
          fieldMapping: {
            email: "EMAIL",
            phone: "PHONE",
            shortDesc: "COMMENTS",
            status: "STAGE_ID"
          },
          stageMapping: {
            EINGEGANGEN: "NEW",
            IN_ANALYSE: "PREPARATION",
            ANGEBOT_GESENDET: "PROPOSAL"
          }
        }
      }
    };

    if (includeDemo) {
      var vendor = {
        id: "usr_vendor_demo",
        role: "vendor",
        email: "demo@anbieter.local",
        phone: "+49 171 555555",
        passwordHashOrPlain: "demo123",
        createdAt: now
      };
      db.users.push(vendor);

      var req = createRequestObject({
        userId: vendor.id,
        email: vendor.email,
        phone: vendor.phone,
        name: "Demo Anbieter",
        company: "Demo Handel GmbH",
        shortDesc: "8 Paletten Elektronik-Retouren, ungeprueft"
      });
      req.status = "IN_ANALYSE";
      req.postProfile.postenart = "Retouren";
      req.postProfile.qualitaet = "Gemischt";
      req.postProfile.kategorien = ["Elektrogeraete", "Mischwaren"];
      req.logistics.palletCount = "8";
      req.logistics.palletStatus = "abholbereit";
      req.logistics.deadlineType = "2-6 Wochen";
      applyRisk(req);
      pushTimeline(req, "SEED_DEMO", "system", { note: "Demo-Datensatz erstellt" });
      db.requests.push(req);

      var token = createMagicToken(db, vendor.id, req.id, 7);
      createEmail(db, {
        to: vendor.email,
        subject: "Bitte ergaenzen Sie Ihre Angaben - schnelleres Angebot",
        html: buildEmailHtml({
          title: "Ergaenzen Sie bitte Ihre Ankauf-Anfrage",
          intro: "Je vollstaendiger die Daten, desto schneller kann der Direktankauf geprueft werden.",
          ctaLabel: "Jetzt Angaben ergaenzen",
          actionLinkHash: "#/continue?token=" + encodeURIComponent(token.token),
          small: "Dieses Mailing wurde im Offline-Prototyp simuliert."
        }),
        relatedRequestId: req.id,
        actionLinkHash: "#/continue?token=" + encodeURIComponent(token.token)
      });
    }

    return db;
  }

  function mergeWithDefaultDB(db) {
    var defaults = createSeedDB(false);
    return {
      users: Array.isArray(db.users) ? db.users : defaults.users,
      sessions: db.sessions && typeof db.sessions === "object" ? db.sessions : defaults.sessions,
      tokens: Array.isArray(db.tokens) ? db.tokens : defaults.tokens,
      requests: Array.isArray(db.requests) ? db.requests : defaults.requests,
      emailsOutbox: Array.isArray(db.emailsOutbox) ? db.emailsOutbox : defaults.emailsOutbox,
      settings: Object.assign({}, defaults.settings, db.settings || {}, {
        bitrix: Object.assign({}, defaults.settings.bitrix, (db.settings && db.settings.bitrix) || {})
      })
    };
  }

  function getDB() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        return createSeedDB(true);
      }
      return mergeWithDefaultDB(JSON.parse(raw));
    } catch (_err) {
      return createSeedDB(true);
    }
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function withDB(mutator) {
    var db = getDB();
    var result = mutator(db) || {};
    saveDB(db);
    return result;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function parseHash() {
    var hash = window.location.hash || "#/public";
    if (hash.charAt(0) === "#") {
      hash = hash.slice(1);
    }
    if (!hash) {
      hash = "/public";
    }

    var qIndex = hash.indexOf("?");
    var path = qIndex >= 0 ? hash.slice(0, qIndex) : hash;
    var queryString = qIndex >= 0 ? hash.slice(qIndex + 1) : "";

    if (!path || path === "/") {
      path = "/public";
    }

    return {
      path: path,
      query: parseQuery(queryString)
    };
  }

  function parseQuery(queryString) {
    var out = {};
    if (!queryString) {
      return out;
    }
    queryString.split("&").forEach(function (part) {
      if (!part) {
        return;
      }
      var idx = part.indexOf("=");
      var key = idx >= 0 ? part.slice(0, idx) : part;
      var val = idx >= 0 ? part.slice(idx + 1) : "";
      out[decodeURIComponent(key)] = decodeURIComponent(val || "");
    });
    return out;
  }

  function resolveRoute(path) {
    var m;

    if (path === "/public") {
      return { name: "public" };
    }
    if (path === "/continue") {
      return { name: "continue" };
    }
    if (path === "/portal/login") {
      return { name: "portal_login" };
    }
    if (path === "/portal") {
      return { name: "portal_dashboard" };
    }

    m = path.match(/^\/portal\/request\/([^/]+)\/wizard$/);
    if (m) {
      return { name: "portal_wizard", requestId: m[1] };
    }

    m = path.match(/^\/portal\/request\/([^/]+)$/);
    if (m) {
      return { name: "portal_request", requestId: m[1] };
    }

    if (path === "/admin") {
      return { name: "admin" };
    }
    if (path === "/admin/settings") {
      return { name: "admin_settings" };
    }
    if (path === "/admin/emails" || path === "/emails") {
      return { name: "admin_emails" };
    }

    m = path.match(/^\/admin\/request\/([^/]+)$/);
    if (m) {
      return { name: "admin_request", requestId: m[1] };
    }

    return { name: "not_found" };
  }

  function navigate(hash, replace) {
    if (replace) {
      window.location.replace(hash);
      return;
    }
    window.location.hash = hash;
  }

  function renderRoute() {
    var parsed = parseHash();
    var route = resolveRoute(parsed.path);
    route.query = parsed.query;

    if (route.name === "continue") {
      if (consumeContinueToken(route.query.token)) {
        return;
      }
    }

    var db = getDB();
    var user = getCurrentUser(db);
    var app = document.getElementById("app");
    if (!app) {
      return;
    }

    app.innerHTML = renderShell(route, db, user);
    renderToasts();
  }

  function consumeContinueToken(tokenValue) {
    uiState.continueError = "";

    if (!tokenValue) {
      uiState.continueError = "Token fehlt. Bitte erneut ueber den E-Mail-Link starten.";
      return false;
    }

    var consumed = withDB(function (db) {
      var token = db.tokens.find(function (entry) {
        return entry.token === tokenValue;
      });

      if (!token) {
        return { ok: false, message: "Token nicht gefunden." };
      }

      if (token.usedAt) {
        return { ok: false, message: "Token wurde bereits verwendet." };
      }

      if (new Date(token.expiresAt).getTime() < Date.now()) {
        return { ok: false, message: "Token ist abgelaufen." };
      }

      token.usedAt = nowISO();

      db.sessions.currentUserId = token.userId;
      db.sessions.createdAt = nowISO();

      var req = db.requests.find(function (item) {
        return item.id === token.requestId;
      });
      if (req) {
        pushTimeline(req, "MAGIC_LINK_VERWENDET", "system", { token: token.token.slice(0, 6) + "..." });
      }

      return { ok: true, requestId: token.requestId };
    });

    if (!consumed.ok) {
      uiState.continueError = consumed.message || "Token ungueltig.";
      return false;
    }

    var db = getDB();
    var req = db.requests.find(function (item) {
      return item.id === consumed.requestId;
    });

    pushToast("Magic-Link eingeloest. Willkommen im Portal.", "success");

    if (!req) {
      navigate("#/portal", true);
      return true;
    }

    if (computeCompletion(req) < 60) {
      navigate("#/portal/request/" + encodeURIComponent(req.id) + "/wizard", true);
      return true;
    }

    navigate("#/portal", true);
    return true;
  }

  function renderShell(route, db, user) {
    return ""
      + '<div class="app-shell">'
      + renderTopNav(route, user)
      + '<main>'
      + renderMain(route, db, user)
      + renderFooterTools(user)
      + "</main>"
      + "</div>";
  }

  function renderTopNav(route, user) {
    var active = route.name;

    var publicClass = active === "public" || active === "continue" ? "active" : "";
    var portalClass = active.indexOf("portal_") === 0 ? "active" : "";
    var adminClass = active.indexOf("admin") === 0 ? "active" : "";
    var emailClass = active === "admin_emails" ? "active" : "";

    var chip = user
      ? '<span class="user-chip">' + escapeHtml(user.email) + " | " + escapeHtml(user.role) + "</span>"
      : '<span class="user-chip">Nicht eingeloggt</span>';

    var authAction = user
      ? '<button class="btn btn-secondary" data-action="logout">Logout</button>'
      : '<a class="btn btn-secondary" href="#/portal/login">Portal Login</a>';

    return ""
      + '<header class="top-nav">'
      + "<div class=\"brand\">"
      + '<div class="brand-mark">LQ</div>'
      + '<div class="brand-text"><strong>Liquidato Ankauf-Anfragen</strong><span>Offline Prototyp (file:// bereit)</span></div>'
      + "</div>"
      + '<nav class="nav-links" aria-label="Navigation">'
      + '<a href="#/public" class="' + publicClass + '">Ankauf-Anfragen</a>'
      + '<a href="#/portal" class="' + portalClass + '">Meine Posten</a>'
      + '<a href="#/admin" class="' + adminClass + '">Admin</a>'
      + '<a href="#/admin/emails" class="' + emailClass + '">E-Mail Outbox</a>'
      + "</nav>"
      + '<div class="nav-right">' + chip + authAction + "</div>"
      + "</header>";
  }

  function renderFooterTools(user) {
    var seedButtons = "";
    if (user && user.role === "admin") {
      seedButtons = ''
        + '<div class="btn-row">'
        + '<button class="btn btn-ghost" data-action="load-demo">Demo-Daten laden</button>'
        + '<button class="btn btn-danger" data-action="reset-all">Alle Daten zuruecksetzen</button>'
        + "</div>";
    }

    return ""
      + '<footer class="card">'
      + '<div class="footer-tools">'
      + '<small>Persistenz: localStorage key <code>' + DB_KEY + '</code>. E-Mails und Sync werden simuliert.</small>'
      + seedButtons
      + "</div>"
      + "</footer>";
  }

  function renderMain(route, db, user) {
    if (route.name === "public") {
      return renderPublic(route, db);
    }
    if (route.name === "continue") {
      return renderContinue(route);
    }
    if (route.name === "portal_login") {
      return renderPortalLogin(user);
    }
    if (route.name === "portal_dashboard") {
      return renderPortalDashboard(route, db, user);
    }
    if (route.name === "portal_wizard") {
      return renderPortalWizard(route, db, user);
    }
    if (route.name === "portal_request") {
      return renderPortalRequest(route, db, user);
    }
    if (route.name === "admin") {
      return renderAdminHome(route, db, user);
    }
    if (route.name === "admin_request") {
      return renderAdminRequest(route, db, user);
    }
    if (route.name === "admin_settings") {
      return renderAdminSettings(route, db, user);
    }
    if (route.name === "admin_emails") {
      return renderAdminEmails(route, db, user);
    }

    return '<section class="card"><h2>Seite nicht gefunden</h2><p class="muted">Bitte ueber die Navigation weitergehen.</p></section>';
  }

  function renderPublic(route, db) {
    var success = route.query.success === "1";
    var token = route.query.token || "";
    var requestId = route.query.request || "";

    return ""
      + '<section class="layout-two">'
      + '<article class="card card-soft stack">'
      + '<div class="section-title">'
      + '<h1>Ankauf von Restposten - schnell und strukturiert</h1>'
      + '<p class="muted">Direktankauf zuerst. Falls kein passendes Ankaufmodell moeglich ist, entscheiden Sie spaeter, ob Ihr Posten zusaetzlich im B2B-Netzwerk angeboten wird.</p>'
      + "</div>"
      + '<div class="hero-badges">'
      + '<span class="badge-trust">100% Vorauszahlung</span>'
      + '<span class="badge-trust">Kostenlose Abholung</span>'
      + '<span class="badge-trust">Export / B2B Netzwerk</span>'
      + "</div>"
      + '<figure class="hero-image">'
      + '<img src="assets/liquidato/cases/login-elektronik-main.jpg" alt="Ankauf von ungeprueften Elektronik-Retouren" />'
      + '<figcaption>Liquidato Ankauf in Grossmengen - Offline-Prototyp</figcaption>'
      + "</figure>"
      + '<div class="callout">'
      + "<strong>Warum dieser Ablauf?</strong>"
      + "<span>Kurzer Einstieg senkt Reibung. Vollstaendige Angaben im Anschluss verbessern Bewertung, Preisqualitaet und Geschwindigkeit.</span>"
      + "</div>"
      + '<ul class="inline-list">'
      + '<li>Rueckmeldung meist innerhalb 24 Stunden.</li>'
      + '<li>Daten werden nur fuer Angebotsbearbeitung genutzt.</li>'
      + '<li>Sie behalten jederzeit Entscheidungshoheit ueber B2B-Freigaben.</li>'
      + "</ul>"
      + "</article>"
      + '<article class="card stack">'
      + '<div class="section-title"><h2>Posten anbieten</h2><p class="muted">Schritt 1 von 5: Minimaler Einstieg.</p></div>'
      + (success
        ? renderPublicSuccess(token, requestId)
        : renderPublicForm(db.settings))
      + "</article>"
      + "</section>";
  }

  function renderPublicForm(settings) {
    return ""
      + '<form data-form="public-capture" class="stack" novalidate>'
      + '<div class="form-grid">'
      + '<div class="field" id="pf-email"><label for="publicEmail">E-Mail *</label><input id="publicEmail" name="email" type="email" required placeholder="ankauf@firma.de" /></div>'
      + '<div class="field" id="pf-phone"><label for="publicPhone">Telefon *</label><input id="publicPhone" name="phone" required placeholder="+49 ..." /></div>'
      + '<div class="field full" id="pf-short"><label for="publicShort">Kurzbeschreibung *</label><textarea id="publicShort" name="shortDesc" required placeholder="z.B. 12 Paletten Retouren-Elektrogeraete, gemischte Qualitaet"></textarea></div>'
      + '<div class="field"><label for="publicName">Name (optional)</label><input id="publicName" name="name" placeholder="optional, beschleunigt Pruefung" /></div>'
      + '<div class="field"><label for="publicCompany">Firma (optional)</label><input id="publicCompany" name="company" placeholder="optional, beschleunigt Pruefung" /></div>'
      + '<fieldset class="field full" id="pf-privacy"><legend>Datenschutz *</legend><label class="checkbox"><input type="checkbox" name="privacy" />Ich akzeptiere die Verarbeitung zur Angebotsbearbeitung. <a href="' + escapeAttr(settings.privacyUrl) + '" target="_blank" rel="noreferrer">Datenschutz</a></label></fieldset>'
      + "</div>"
      + '<p class="hint">Nach dem Absenden erzeugt der Prototyp eine E-Mail in der Outbox mit Magic-Link zur Datenergänzung.</p>'
      + '<div class="btn-row"><button class="btn btn-primary" type="submit">Anfrage starten</button></div>'
      + '<p id="publicError" class="error"></p>'
      + "</form>";
  }

  function renderPublicSuccess(token, requestId) {
    var continueHash = "#/continue?token=" + encodeURIComponent(token || "");
    var requestLink = requestId ? "#/portal/request/" + encodeURIComponent(requestId) + "/wizard" : "#/portal";

    return ""
      + '<div class="notice success">Danke! Wir haben Ihnen eine E-Mail gesendet (simuliert). Bitte ergaenzen Sie Ihre Angaben fuer eine schnellere Bewertung.</div>'
      + '<div class="btn-row">'
      + '<a class="btn btn-primary" href="' + continueHash + '">Jetzt weiter (simulierter E-Mail-Link)</a>'
      + '<a class="btn btn-secondary" href="#/admin/emails">Outbox oeffnen</a>'
      + '<a class="btn btn-ghost" href="' + requestLink + '">Zur Anfrage</a>'
      + "</div>";
  }

  function renderContinue() {
    return ""
      + '<section class="card stack">'
      + '<h2>Magic-Link pruefen</h2>'
      + '<p class="muted">Der Link konnte nicht eingeloest werden.</p>'
      + '<div class="notice error">' + escapeHtml(uiState.continueError || "Token ungueltig oder abgelaufen.") + "</div>"
      + '<div class="btn-row"><a class="btn btn-primary" href="#/public">Zur oeffentlichen Anfrage</a></div>'
      + "</section>";
  }

  function renderPortalLogin(user) {
    if (user && user.role === "vendor") {
      return ""
        + '<section class="card stack">'
        + "<h2>Bereits eingeloggt</h2>"
        + '<p class="muted">Sie sind als Anbieter angemeldet.</p>'
        + '<div class="btn-row"><a class="btn btn-primary" href="#/portal">Zu meinen Anfragen</a></div>'
        + "</section>";
    }

    return ""
      + '<section class="layout-two">'
      + '<article class="card card-soft stack">'
      + '<h2>Portalzugang fuer Anbieter</h2>'
      + '<p class="muted">Login mit E-Mail und Passwort. Falls noch kein Passwort gesetzt wurde, starten Sie ueber den Magic-Link aus der oeffentlichen Anfrage.</p>'
      + '<div class="callout"><strong>Magic-Link Hinweis</strong><span>Im Offline-Prototyp wird der Link in der E-Mail Outbox simuliert.</span></div>'
      + '<div class="btn-row"><a class="btn btn-secondary" href="#/public">Oeffentliche Anfrage absenden</a></div>'
      + "</article>"
      + '<article class="card stack">'
      + '<h2>Login</h2>'
      + '<form data-form="portal-login" class="stack" novalidate>'
      + '<div class="field"><label for="portalLoginEmail">E-Mail</label><input id="portalLoginEmail" name="email" type="email" required /></div>'
      + '<div class="field"><label for="portalLoginPassword">Passwort</label><input id="portalLoginPassword" name="password" type="password" required /></div>'
      + '<div class="btn-row"><button class="btn btn-primary" type="submit">Einloggen</button></div>'
      + '<p class="hint">Noch kein Passwort? Bitte zuerst die oeffentliche Anfrage absenden und den Magic-Link nutzen.</p>'
      + '<p id="portalLoginError" class="error"></p>'
      + "</form>"
      + "</article>"
      + "</section>";
  }

  function renderPortalDashboard(route, db, user) {
    if (!requireVendor(user)) {
      return "";
    }

    var ownRequests = db.requests
      .filter(function (req) { return req.ownerUserId === user.id; })
      .sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });

    var statusFilter = route.query.status || "ALL";
    var filtered = ownRequests.filter(function (req) {
      return statusFilter === "ALL" ? true : req.status === statusFilter;
    });

    var cards = filtered.length
      ? filtered.map(renderVendorRequestCard).join("")
      : '<div class="empty">Noch keine Anfragen gefunden.</div>';

    return ""
      + '<section class="card stack">'
      + '<div class="section-title">'
      + '<h1>Meine Anfragen / Meine Posten</h1>'
      + '<p class="muted">Uebersicht Ihrer Ankauf-Anfragen mit Risiko, Status und naechster Aktion.</p>'
      + "</div>"
      + renderStatusFilters(statusFilter, "#/portal")
      + '<div class="btn-row"><a class="btn btn-primary" href="#/public">Neue Anfrage</a></div>'
      + '<div class="requests-grid">' + cards + "</div>"
      + "</section>";
  }

  function renderVendorRequestCard(req) {
    var risk = req.risk || computeRisk(req);
    var completion = computeCompletion(req);
    var lastEvent = req.timeline && req.timeline.length ? req.timeline[req.timeline.length - 1] : null;

    return ""
      + '<article class="request-card">'
      + '<div class="head">'
      + '<strong>Anfrage ' + escapeHtml(req.id) + "</strong>"
      + renderStatusBadge(req.status)
      + "</div>"
      + '<p class="muted">' + escapeHtml(req.contact.shortDesc || "Keine Kurzbeschreibung") + "</p>"
      + '<div class="status-row">'
      + renderRiskPill(risk)
      + '<span class="badge neutral">Fertig: ' + completion + '%</span>'
      + "</div>"
      + '<p class="meta">Letzte Aktivitaet: ' + escapeHtml(formatDate(lastEvent ? lastEvent.at : req.updatedAt)) + "</p>"
      + '<div class="btn-row">'
      + '<a class="btn btn-secondary" href="#/portal/request/' + encodeURIComponent(req.id) + '/wizard">Angaben ergaenzen</a>'
      + '<a class="btn btn-primary" href="#/portal/request/' + encodeURIComponent(req.id) + '">Details</a>'
      + "</div>"
      + "</article>";
  }

  function renderPortalWizard(route, db, user) {
    if (!requireVendor(user)) {
      return "";
    }

    var req = db.requests.find(function (item) {
      return item.id === route.requestId && item.ownerUserId === user.id;
    });

    if (!req) {
      return '<section class="card"><h2>Anfrage nicht gefunden</h2></section>';
    }

    req.wizard = req.wizard || { currentStep: 1, maxUnlockedStep: 1 };
    var step = clamp(Number(route.query.step) || req.wizard.currentStep || 1, 1, 5);
    req.wizard.currentStep = step;
    req.wizard.maxUnlockedStep = Math.max(req.wizard.maxUnlockedStep || 1, step);

    var completion = computeCompletion(req);
    var risk = req.risk || computeRisk(req);
    var needsPassword = !String(user.passwordHashOrPlain || "").trim();

    saveDB(db);

    return ""
      + '<section class="layout-two">'
      + '<aside class="card stack">'
      + '<h2>Anfrage ' + escapeHtml(req.id) + '</h2>'
      + '<p class="muted">Schrittweise Datenerganzung fuer schnellere Ankaufpruefung.</p>'
      + '<div class="progress-wrap">'
      + '<div class="status-row"><strong>Completion</strong><span class="badge neutral">' + completion + '%</span></div>'
      + '<div class="progress-track"><span class="progress-fill" style="width:' + completion + '%"></span></div>'
      + "</div>"
      + '<div class="status-row">' + renderStatusBadge(req.status) + renderRiskPill(risk) + "</div>"
      + '<div class="callout"><strong>Support</strong><span>' + escapeHtml(db.settings.supportPhone) + ' | ' + escapeHtml(db.settings.supportEmail) + "</span></div>"
      + '<div class="btn-row"><a class="btn btn-secondary" href="#/portal/request/' + encodeURIComponent(req.id) + '">Zur Detailansicht</a></div>'
      + "</aside>"
      + '<article class="card stack">'
      + '<div class="section-title"><h2>Wizard</h2><p class="muted">Option C: Horizontaler Stepper oben.</p></div>'
      + renderStepper(req.wizard, step)
      + renderWizardForm(req, step, needsPassword)
      + "</article>"
      + "</section>";
  }

  function renderStepper(wizard, currentStep) {
    var nodes = WIZARD_STEPS.map(function (step) {
      var cls = "upcoming";
      if (step.id < currentStep) {
        cls = "done clickable";
      } else if (step.id === currentStep) {
        cls = "active";
      }
      if (step.id <= wizard.maxUnlockedStep && step.id !== currentStep) {
        cls += " clickable";
      }
      var clickable = step.id <= wizard.maxUnlockedStep ? "1" : "0";
      return ""
        + '<div class="step-node ' + cls + '" data-action="wizard-jump" data-step="' + step.id + '" data-clickable="' + clickable + '">'
        + '<span class="step-dot"></span>'
        + '<span class="label"><strong>Schritt ' + step.id + '</strong>' + escapeHtml(step.title) + "</span>"
        + "</div>";
    }).join("");

    return '<div class="stepper-c">' + nodes + "</div>";
  }

  function renderMixedSubgrades(req) {
    if (req.postProfile.qualitaet !== "Gemischt") {
      return "";
    }
    var grades = ["A-Ware", "B-Ware", "C-Ware", "D-Ware"];
    var current = req.postProfile.mixedSubgrades || [];
    var boxes = grades.map(function (g) {
      var checked = current.indexOf(g) >= 0 ? "checked" : "";
      return '<label class="checkbox"><input type="checkbox" name="mixedSubgrades" value="' + escapeAttr(g) + '" ' + checked + ' />' + escapeHtml(g) + '</label>';
    }).join("");
    return '<fieldset class="field full" id="wf-mixedSubgrades"><legend>Qualitaetsstufen im Gemisch *</legend><div class="checkbox-group">' + boxes + '</div><p class="hint">Mindestens eine Stufe auswaehlen.</p></fieldset>';
  }

  function renderWizardForm(req, step, needsPassword) {
    var links = req.logistics.links || ["", ""];
    var link1 = links[0] || "";
    var link2 = links[1] || "";

    var categories = [
      ["Textil/Bekleidung", "T"],
      ["Schuhe", "S"],
      ["Haushaltsartikel", "H"],
      ["Baustoffe", "B"],
      ["Elektrogeraete", "E"],
      ["Mischwaren", "M"]
    ];

    var categoryTiles = categories.map(function (item) {
      var checked = (req.postProfile.kategorien || []).indexOf(item[0]) >= 0 ? "checked" : "";
      return ''
        + '<label class="tile">'
        + '<input type="checkbox" name="kategorien" value="' + escapeAttr(item[0]) + '" ' + checked + ' />'
        + '<span class="mini-icon">' + item[1] + '</span>'
        + escapeHtml(item[0])
        + "</label>";
    }).join("");

    var uploads = (req.logistics.uploads || []).map(function (file) {
      var previewBtn = uiState.uploadPreviewUrls[file.id]
        ? '<button type="button" class="btn btn-ghost" data-action="preview-upload" data-upload-id="' + file.id + '">Vorschau oeffnen</button>'
        : "";
      return ''
        + '<li>'
        + '<span>' + escapeHtml(file.name) + ' (' + formatBytes(file.size) + ')</span>'
        + '<span class="btn-row">' + previewBtn + '<button type="button" class="btn btn-ghost" data-action="remove-upload" data-upload-id="' + file.id + '">Entfernen</button></span>'
        + "</li>";
    }).join("");

    var uploadSummary = (req.logistics.uploads || []).length
      ? (req.logistics.uploads || []).map(function (f, i) {
          return "Datei " + (i + 1) + ": " + escapeHtml(f.name) + " (" + formatBytes(f.size) + ")";
        }).join("<br/>")
      : "Keine Uploads";
    var linkSummary = (req.logistics.links || []).filter(Boolean).length
      ? (req.logistics.links || []).filter(Boolean).map(function (l, i) {
          return "Link " + (i + 1) + ": " + escapeHtml(l);
        }).join("<br/>")
      : "Keine Links";
    var mixedInfo = req.postProfile.qualitaet === "Gemischt" && (req.postProfile.mixedSubgrades || []).length
      ? " (Stufen: " + escapeHtml((req.postProfile.mixedSubgrades || []).join(", ")) + ")"
      : "";

    var summary = ""
      + '<div class="card card-soft stack">'
      + '<h3>Zusammenfassung aller Angaben</h3>'
      + '<div class="stack">'
      + '<div><strong>Kontakt</strong></div>'
      + '<p>Name: ' + escapeHtml(req.contact.name || "-") + ' | Firma: ' + escapeHtml(req.contact.company || "-") + '</p>'
      + '<p>E-Mail: ' + escapeHtml(req.contact.email) + ' | Telefon: ' + escapeHtml(req.contact.phone) + '</p>'
      + '<p>Kurzbeschreibung: ' + escapeHtml(req.contact.shortDesc || "-") + '</p>'
      + "</div>"
      + '<div class="stack">'
      + '<div><strong>Postenprofil</strong></div>'
      + '<p>Postenart: ' + escapeHtml(req.postProfile.postenart || "-") + ' | Qualitaet: ' + escapeHtml(req.postProfile.qualitaet || "-") + mixedInfo + '</p>'
      + '<p>Kategorien: ' + escapeHtml((req.postProfile.kategorien || []).join(", ") || "-") + '</p>'
      + '<p>Beschreibung: ' + escapeHtml(req.postProfile.beschreibung || "-") + '</p>'
      + '<p>Herkunft: ' + escapeHtml(req.postProfile.firstHand || "-") + ' | Restriktionen: ' + escapeHtml(req.postProfile.restrictions || "-") + '</p>'
      + "</div>"
      + '<div class="stack">'
      + '<div><strong>Logistik &amp; Medien</strong></div>'
      + '<p>PLZ/Ort/Land: ' + escapeHtml(req.logistics.plz || "-") + ' ' + escapeHtml(req.logistics.ort || "-") + ', ' + escapeHtml(req.logistics.land || "-") + '</p>'
      + '<p>Palettenstatus: ' + escapeHtml(req.logistics.palletStatus || "-") + ' | Paletten: ' + escapeHtml(req.logistics.palletCount || "-") + ' | Stueck: ' + escapeHtml(req.logistics.pieceCount || "-") + ' | Volumen: ' + escapeHtml(req.logistics.volumeM3 || "-") + ' m3</p>'
      + '<p>Abholbereit ab: ' + escapeHtml(req.logistics.readyFrom || "-") + ' | Deadline: ' + escapeHtml(req.logistics.deadlineType || "-") + ' ' + escapeHtml(req.logistics.deadlineDate || "") + '</p>'
      + '<p>' + uploadSummary + '</p>'
      + '<p>' + linkSummary + '</p>'
      + "</div>"
      + '<div class="stack">'
      + '<div><strong>Preisrahmen</strong></div>'
      + '<p>Geschaetzter Wert: ' + escapeHtml(req.price.estValue || "-") + ' | Wunschpreis: ' + escapeHtml(req.price.wishPrice || "-") + ' | Untergrenze: ' + escapeHtml(req.price.minAcceptable || "-") + '</p>'
      + '<p>Preisbasis: ' + escapeHtml(req.price.priceBasis || "-") + ' | MwSt: ' + escapeHtml(req.price.vatMode || "-") + '</p>'
      + "</div>"
      + '<div class="stack">'
      + '<div><strong>B2B-Freigaben</strong></div>'
      + '<p>Netzwerk Opt-In: ' + (req.consent.networkOptIn ? "Ja" : "Nein") + ' | Online Listing: ' + (req.consent.allowOnlineListing ? "Ja" : "Nein") + '</p>'
      + "</div>"
      + "</div>";

    return ""
      + '<form data-form="wizard-edit" data-request-id="' + escapeAttr(req.id) + '" id="wizard-form-' + escapeAttr(req.id) + '" class="stack" novalidate>'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'

      + '<section style="display:' + (step === 1 ? "block" : "none") + '">'
      + '<div class="form-grid">'
      + '<div class="field"><label>E-Mail</label><input name="contactEmail" type="email" value="' + escapeAttr(req.contact.email || "") + '" /></div>'
      + '<div class="field"><label>Telefon</label><input name="contactPhone" value="' + escapeAttr(req.contact.phone || "") + '" /></div>'
      + '<div class="field"><label>Name</label><input name="contactName" value="' + escapeAttr(req.contact.name || "") + '" /></div>'
      + '<div class="field"><label>Firma</label><input name="contactCompany" value="' + escapeAttr(req.contact.company || "") + '" /></div>'
      + '<div class="field full"><label>Kurzbeschreibung</label><textarea name="contactShortDesc">' + escapeHtml(req.contact.shortDesc || "") + '</textarea></div>'
      + "</div>"
      + "</section>"

      + '<section style="display:' + (step === 2 ? "block" : "none") + '">'
      + '<div class="form-grid">'
      + '<div class="field" id="wf-postenart"><label>Postenart *</label><select name="postenart">' + renderOptions(["", "Restposten", "Retouren", "Insolvenzwaren", "Sonderposten", "Ueberproduktion"], req.postProfile.postenart) + '</select></div>'
      + '<div class="field" id="wf-qualitaet"><label>Qualitaet *</label><select name="qualitaet">' + renderOptions(["", "Gemischt", "A-Ware", "B-Ware", "C-Ware", "D-Ware", "Ungeprueft"], req.postProfile.qualitaet) + '</select></div>'
      + renderMixedSubgrades(req)
      + '<fieldset class="field full" id="wf-kategorien"><legend>Kategorien *</legend><div class="tile-grid">' + categoryTiles + '</div></fieldset>'
      + '<div class="field full"><label>Beschreibung</label><textarea name="beschreibung">' + escapeHtml(req.postProfile.beschreibung || "") + '</textarea></div>'
      + '<div class="field"><label>Herkunft aus erster Hand?</label><select name="firstHand">' + renderOptions(["", "Ja", "Nein", "Unklar"], req.postProfile.firstHand || "") + '</select></div>'
      + '<div class="field"><label>Restriktionen</label><select name="restrictions">' + renderOptions(["", "Keine", "Markenbindung", "Regionale Restriktion", "Online-Verbot", "Sonstige"], req.postProfile.restrictions || "") + '</select></div>'
      + "</div>"
      + "</section>"

      + '<section style="display:' + (step === 3 ? "block" : "none") + '">'
      + '<div class="form-grid">'
      + '<div class="field" id="wf-plz"><label>PLZ *</label><input name="plz" value="' + escapeAttr(req.logistics.plz || "") + '" /></div>'
      + '<div class="field" id="wf-ort"><label>Ort *</label><input name="ort" value="' + escapeAttr(req.logistics.ort || "") + '" /></div>'
      + '<div class="field"><label>Land</label><input name="land" value="' + escapeAttr(req.logistics.land || "Deutschland") + '" /></div>'
      + '<div class="field" id="wf-palletStatus"><label>Palettenstatus *</label><select name="palletStatus">' + renderOptions(["", "abholbereit", "teilweise vorbereitet", "nicht palettiert"], req.logistics.palletStatus || "") + '</select></div>'
      + '<div class="field"><label>Palettenanzahl</label><input name="palletCount" value="' + escapeAttr(req.logistics.palletCount || "") + '" /></div>'
      + '<div class="field"><label>Stueckzahl</label><input name="pieceCount" value="' + escapeAttr(req.logistics.pieceCount || "") + '" /></div>'
      + '<div class="field"><label>Volumen (m3)</label><input name="volumeM3" value="' + escapeAttr(req.logistics.volumeM3 || "") + '" /></div>'
      + '<div class="field"><label>Abholbereit ab</label><input name="readyFrom" type="date" value="' + escapeAttr(req.logistics.readyFrom || "") + '" /></div>'
      + '<div class="field" id="wf-deadlineType"><label>Deadline Typ *</label><select name="deadlineType">' + renderOptions(["", "Sehr dringend", "2-6 Wochen", "2-6 Monate", "Laenger"], req.logistics.deadlineType || "") + '</select></div>'
      + '<div class="field"><label>Deadline Datum</label><input name="deadlineDate" type="date" value="' + escapeAttr(req.logistics.deadlineDate || "") + '" /></div>'
      + '<div class="field"><label>Bildlink 1</label><input name="link1" value="' + escapeAttr(link1) + '" placeholder="https://..." /></div>'
      + '<div class="field"><label>Bildlink 2</label><input name="link2" value="' + escapeAttr(link2) + '" placeholder="https://..." /></div>'
      + '<div class="field full">'
      + '<label>Dateien/Bilder Upload</label>'
      + '<div class="upload-box">'
      + '<input name="uploadFiles" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.7z,.rar" />'
      + '<p class="hint">Offline-Prototyp: persistiert nur Metadaten (Name, Groesse, Typ).</p>'
      + '<ul class="upload-list">' + (uploads || '<li><span>Keine Uploads vorhanden.</span></li>') + "</ul>"
      + "</div>"
      + "</div>"
      + "</div>"
      + "</section>"

      + '<section style="display:' + (step === 4 ? "block" : "none") + '">'
      + '<div class="form-grid">'
      + '<div class="field"><label>Geschaetzter Warenwert</label><input name="estValue" value="' + escapeAttr(req.price.estValue || "") + '" /></div>'
      + '<div class="field"><label>Wunschverkaufspreis gesamt</label><input name="wishPrice" value="' + escapeAttr(req.price.wishPrice || "") + '" /></div>'
      + '<div class="field"><label>Untergrenze akzeptabel</label><input name="minAcceptable" value="' + escapeAttr(req.price.minAcceptable || "") + '" /></div>'
      + '<div class="field"><label>Preisbasis</label><input name="priceBasis" value="' + escapeAttr(req.price.priceBasis || "") + '" placeholder="ab Lager / EXW" /></div>'
      + '<div class="field"><label>Mehrwertsteuer</label><select name="vatMode">' + renderOptions(["", "inkl. MwSt.", "zzgl. MwSt.", "steuerfrei"], req.price.vatMode || "") + '</select></div>'
      + "</div>"
      + "</section>"

      + '<section style="display:' + (step === 5 ? "block" : "none") + '">'
      + summary
      + '<fieldset class="field"><legend>Freigaben</legend>'
      + '<div class="checkbox-group">'
      + '<label class="checkbox"><input type="checkbox" name="networkOptIn" ' + (req.consent.networkOptIn ? "checked" : "") + ' />Anonym im Kundennetzwerk zur Preisfindung anbieten</label>'
      + '<label class="checkbox"><input type="checkbox" name="allowOnlineListing" ' + (req.consent.allowOnlineListing ? "checked" : "") + ' />Online Listing erlauben</label>'
      + '<div id="wf-confirmAll"><label class="checkbox"><input type="checkbox" name="confirmAll" />Ich bestaetige die Richtigkeit der Angaben *</label></div>'
      + "</div>"
      + "</fieldset>"
      + (needsPassword ? renderPasswordSetInline(req.id) : "")
      + "</section>"

      + '<div class="btn-row">'
      + '<button type="button" class="btn btn-secondary" data-action="wizard-back" data-request-id="' + escapeAttr(req.id) + '">Zurueck</button>'
      + '<button type="button" class="btn btn-secondary" data-action="wizard-next" data-request-id="' + escapeAttr(req.id) + '">Weiter</button>'
      + '<button type="button" class="btn btn-primary" data-action="wizard-submit" data-request-id="' + escapeAttr(req.id) + '">Anfrage absenden</button>'
      + "</div>"
      + '<p class="hint">Autosave aktiv. Daten werden lokal gespeichert.</p>'
      + "</form>";
  }

  function renderPasswordSetInline(requestId) {
    return ""
      + '<div class="card card-soft stack">'
      + '<h4>Passwort festlegen</h4>'
      + '<p class="muted">Fuer kuenftigen direkten Login bitte Passwort setzen.</p>'
      + '<form data-form="set-password" class="form-grid" novalidate>'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(requestId) + '" />'
      + '<div class="field"><label>Passwort (mind. 6 Zeichen)</label><input name="password" type="password" minlength="6" /></div>'
      + '<div class="field"><label>Passwort wiederholen</label><input name="password2" type="password" minlength="6" /></div>'
      + '<div class="field full"><button class="btn btn-primary" type="submit">Passwort speichern</button></div>'
      + "</form>"
      + "</div>";
  }

  function renderPortalRequest(route, db, user) {
    if (!requireVendor(user)) {
      return "";
    }

    var req = db.requests.find(function (item) {
      return item.id === route.requestId && item.ownerUserId === user.id;
    });

    if (!req) {
      return '<section class="card"><h2>Anfrage nicht gefunden</h2></section>';
    }

    applyRisk(req);
    saveDB(db);

    var timeline = renderTimeline(req.timeline);
    var messages = (req.timeline || []).filter(function (item) { return item.type === "MESSAGE"; });
    var offers = renderOffersForVendor(req);
    var risk = renderRiskPanel(req.risk);

    var priceAdjust = req.status === "PREISREDUZIERUNG_ANGEFRAGT"
      ? ''
        + '<div class="card stack">'
        + '<h4>Preisanpassung</h4>'
        + '<p class="muted">Bitte Wunschpreis/Untergrenze aktualisieren und absenden.</p>'
        + '<form data-form="vendor-price-adjust" class="form-grid">'
        + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
        + '<div class="field"><label>Wunschpreis</label><input name="wishPrice" value="' + escapeAttr(req.price.wishPrice || "") + '" /></div>'
        + '<div class="field"><label>Untergrenze</label><input name="minAcceptable" value="' + escapeAttr(req.price.minAcceptable || "") + '" /></div>'
        + '<div class="field full"><button class="btn btn-primary" type="submit">Angebot anpassen senden</button></div>'
        + "</form>"
        + "</div>"
      : "";

    return ""
      + '<section class="split">'
      + '<article class="stack">'
      + '<div class="card stack">'
      + '<div class="status-row">'
      + '<h2>Meine Anfrage ' + escapeHtml(req.id) + '</h2>'
      + renderStatusBadge(req.status)
      + "</div>"
      + '<p class="muted">' + escapeHtml(req.contact.shortDesc || "") + "</p>"
      + '<div class="btn-row"><a class="btn btn-secondary" href="#/portal/request/' + encodeURIComponent(req.id) + '/wizard">Wizard oeffnen</a></div>'
      + '<div class="card card-soft stack">'
      + '<p><strong>Kontakt:</strong> ' + escapeHtml(req.contact.name || "-") + ' | ' + escapeHtml(req.contact.email) + ' | ' + escapeHtml(req.contact.phone) + "</p>"
      + '<p><strong>Postenprofil:</strong> ' + escapeHtml(req.postProfile.postenart || "-") + ' | ' + escapeHtml(req.postProfile.qualitaet || "-") + "</p>"
      + '<p><strong>Kategorien:</strong> ' + escapeHtml((req.postProfile.kategorien || []).join(", ") || "-") + "</p>"
      + '<p><strong>Logistik:</strong> Paletten ' + escapeHtml(req.logistics.palletCount || "-") + ', Stueck ' + escapeHtml(req.logistics.pieceCount || "-") + ', Volumen ' + escapeHtml(req.logistics.volumeM3 || "-") + "</p>"
      + '<p><strong>Preis:</strong> Wunsch ' + escapeHtml(req.price.wishPrice || "-") + ' / Untergrenze ' + escapeHtml(req.price.minAcceptable || "-") + "</p>"
      + "</div>"
      + '<form data-form="vendor-consent" class="stack">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<fieldset class="field"><legend>Freigaben</legend>'
      + '<div class="checkbox-group">'
      + '<label class="checkbox"><input type="checkbox" name="networkOptIn" ' + (req.consent.networkOptIn ? "checked" : "") + ' />Anonym im Kundennetzwerk anbieten</label>'
      + '<label class="checkbox"><input type="checkbox" name="allowOnlineListing" ' + (req.consent.allowOnlineListing ? "checked" : "") + ' />Online Listing erlauben</label>'
      + "</div>"
      + "</fieldset>"
      + '<div class="btn-row"><button class="btn btn-primary" type="submit">Freigaben speichern</button></div>'
      + "</form>"
      + "</div>"
      + risk
      + '<div class="card stack"><h3>Angebote</h3>' + offers + "</div>"
      + priceAdjust
      + '<div class="card stack">'
      + '<h3>Nachrichten</h3>'
      + renderMessages(messages)
      + '<form data-form="vendor-message" class="stack">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<div class="field"><label>Nachricht an Liquidato</label><textarea name="message" required placeholder="Rueckfrage oder Zusatzinfo"></textarea></div>'
      + '<div class="btn-row"><button class="btn btn-primary" type="submit">Nachricht senden</button></div>'
      + "</form>"
      + "</div>"
      + "</article>"
      + '<aside class="card stack"><h3>Timeline</h3>' + timeline + "</aside>"
      + "</section>";
  }

  function renderMessages(items) {
    if (!items.length) {
      return '<div class="empty">Noch keine Nachrichten vorhanden.</div>';
    }

    return '<div class="stack">' + items.slice().reverse().map(function (item) {
      var actor = item.actor === "admin" ? "Liquidato" : item.actor === "vendor" ? "Sie" : "System";
      return ''
        + '<div class="message">'
        + '<div class="meta">' + escapeHtml(formatDate(item.at)) + ' | ' + escapeHtml(actor) + '</div>'
        + '<div>' + escapeHtml((item.payload && item.payload.message) || "") + "</div>"
        + "</div>";
    }).join("") + "</div>";
  }

  function renderOffersForVendor(req) {
    if (!req.offers || !req.offers.length) {
      return '<div class="empty">Noch kein Angebot vorhanden.</div>';
    }

    return req.offers.slice().reverse().map(function (offer) {
      var decisionLabel = offer.decision === "accepted"
        ? '<span class="badge success">Angenommen</span>'
        : offer.decision === "declined"
          ? '<span class="badge danger">Abgelehnt</span>'
          : '<span class="badge neutral">Offen</span>';

      var decisionButtons = !offer.decision
        ? '<div class="btn-row">'
          + '<button type="button" class="btn btn-primary" data-action="offer-decision" data-request-id="' + escapeAttr(req.id) + '" data-offer-id="' + escapeAttr(offer.id) + '" data-decision="accepted">Annehmen</button>'
          + '<button type="button" class="btn btn-secondary" data-action="offer-decision" data-request-id="' + escapeAttr(req.id) + '" data-offer-id="' + escapeAttr(offer.id) + '" data-decision="declined">Ablehnen</button>'
          + "</div>"
        : "";

      return ''
        + '<div class="card card-soft stack">'
        + '<div class="status-row"><strong>' + escapeHtml(offer.amount || "-") + ' ' + escapeHtml(offer.currency || "EUR") + '</strong>' + decisionLabel + "</div>"
        + '<p class="muted">' + escapeHtml(offer.text || "") + "</p>"
        + '<p class="meta">Erstellt: ' + escapeHtml(formatDate(offer.createdAt)) + "</p>"
        + decisionButtons
        + "</div>";
    }).join("");
  }

  function renderRiskPanel(risk) {
    risk = risk || { score: 0, level: "low", factors: [], recommendations: [] };

    var factors = risk.factors.length
      ? "<ul class=\"inline-list\">" + risk.factors.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") + "</ul>"
      : '<p class="muted">Keine kritischen Faktoren erkannt.</p>';

    var recos = risk.recommendations.length
      ? "<ul class=\"inline-list\">" + risk.recommendations.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") + "</ul>"
      : '<p class="muted">Keine zusaetzlichen Empfehlungen.</p>';

    return ""
      + '<div class="card stack">'
      + '<h3>Risikoanalyse & Preisdruck</h3>'
      + '<div class="status-row">' + renderRiskPill(risk) + '<span class="badge neutral">Score: ' + risk.score + '/100</span></div>'
      + '<div><strong>Faktoren</strong>' + factors + '</div>'
      + '<div><strong>Empfehlungen</strong>' + recos + '</div>'
      + "</div>";
  }

  function renderAdminHome(route, db, user) {
    if (!user || user.role !== "admin") {
      return renderAdminLogin();
    }

    var statusFilter = route.query.status || "ALL";
    var riskFilter = route.query.risk || "ALL";
    var networkFilter = route.query.network || "ALL";

    var filtered = db.requests.filter(function (req) {
      var statusOk = statusFilter === "ALL" ? true : req.status === statusFilter;
      var riskLevel = (req.risk && req.risk.level) || computeRisk(req).level;
      var riskOk = riskFilter === "ALL" ? true : riskLevel === riskFilter;
      var netOk = networkFilter === "ALL"
        ? true
        : networkFilter === "OPTIN"
          ? !!req.consent.networkOptIn
          : !req.consent.networkOptIn;
      return statusOk && riskOk && netOk;
    }).sort(function (a, b) {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    var kpi = buildAdminKpi(db.requests);

    var rows = filtered.length ? filtered.map(function (req) {
      var owner = db.users.find(function (u) { return u.id === req.ownerUserId; });
      return ''
        + "<tr>"
        + "<td>" + escapeHtml(req.id) + "</td>"
        + "<td>" + escapeHtml(owner ? owner.email : "-") + "</td>"
        + "<td>" + escapeHtml(req.postProfile.postenart || "-") + " / " + escapeHtml((req.postProfile.kategorien || []).join(", ") || "-") + "</td>"
        + "<td>" + escapeHtml(req.logistics.palletCount || "-") + "</td>"
        + "<td>" + renderStatusBadge(req.status) + "</td>"
        + "<td>" + renderRiskPill(req.risk || computeRisk(req)) + "</td>"
        + "<td>" + escapeHtml(formatDate(req.updatedAt)) + "</td>"
        + "<td><a class=\"btn btn-secondary\" href=\"#/admin/request/" + encodeURIComponent(req.id) + "\">Oeffnen</a></td>"
        + "</tr>";
    }).join("") : "<tr><td colspan=\"8\">Keine Treffer</td></tr>";

    return ""
      + '<section class="card stack">'
      + '<div class="section-title"><h1>Admin - Ankauf-Anfragen</h1><p class="muted">Steuerung von Status, Rueckfragen, Angeboten, Netzwerk und Geboten.</p></div>'
      + '<div class="kpi">'
      + '<div class="item"><strong>' + kpi.total + '</strong><span>Anfragen gesamt</span></div>'
      + '<div class="item"><strong>' + kpi.offersOpen + '</strong><span>Angebote offen</span></div>'
      + '<div class="item"><strong>' + kpi.highRisk + '</strong><span>Hohes Risiko</span></div>'
      + "</div>"
      + renderAdminFilters(statusFilter, riskFilter, networkFilter)
      + '<div class="table-wrap"><table><thead><tr><th>ID</th><th>Besitzer</th><th>Posten/Kategorien</th><th>Paletten</th><th>Status</th><th>Risiko</th><th>Letzte Aktivitaet</th><th>Aktion</th></tr></thead><tbody>'
      + rows
      + "</tbody></table></div>"
      + "</section>";
  }

  function renderAdminLogin() {
    return ""
      + '<section class="layout-two">'
      + '<article class="card card-soft stack">'
      + '<h2>Admin-Bereich</h2>'
      + '<p class="muted">Seed-Login fuer Demo: <strong>admin@liquidato.local</strong> / <strong>admin</strong></p>'
      + '<div class="callout"><strong>Hinweis</strong><span>Alle Prozesse laufen offline und werden in localStorage simuliert.</span></div>'
      + "</article>"
      + '<article class="card stack">'
      + '<h2>Admin Login</h2>'
      + '<form data-form="admin-login" class="stack" novalidate>'
      + '<div class="field"><label>E-Mail</label><input name="email" type="email" required /></div>'
      + '<div class="field"><label>Passwort</label><input name="password" type="password" required /></div>'
      + '<div class="btn-row"><button class="btn btn-primary" type="submit">Einloggen</button></div>'
      + '<p id="adminLoginError" class="error"></p>'
      + "</form>"
      + "</article>"
      + "</section>";
  }

  function renderAdminRequest(route, db, user) {
    if (!requireAdmin(user)) {
      return "";
    }

    var req = db.requests.find(function (item) {
      return item.id === route.requestId;
    });

    if (!req) {
      return '<section class="card"><h2>Anfrage nicht gefunden</h2></section>';
    }

    var owner = db.users.find(function (u) { return u.id === req.ownerUserId; });
    var transitions = (ALLOWED_TRANSITIONS[req.status] || []).slice();
    if (transitions.indexOf(req.status) < 0) {
      transitions.unshift(req.status);
    }

    var bids = req.bids && req.bids.length
      ? req.bids.slice().reverse().map(function (bid) {
        return '<li><strong>' + escapeHtml(bid.amount) + ' ' + escapeHtml(bid.currency) + '</strong> - ' + escapeHtml(bid.buyerLabelInternal || "") + '<br /><span class="muted">' + escapeHtml(bid.terms || "") + '</span></li>';
      }).join("")
      : '<li>Keine Gebote</li>';

    var offers = req.offers && req.offers.length
      ? req.offers.slice().reverse().map(function (offer) {
        return '<li><strong>' + escapeHtml(offer.amount || "-") + ' ' + escapeHtml(offer.currency || "EUR") + '</strong> - ' + escapeHtml(offer.text || "") + '</li>';
      }).join("")
      : '<li>Keine Angebote</li>';

    var timeline = renderTimeline(req.timeline);

    return ""
      + '<section class="split">'
      + '<article class="stack">'
      + '<div class="card stack">'
      + '<div class="status-row"><h2>Admin Detail ' + escapeHtml(req.id) + '</h2>' + renderStatusBadge(req.status) + renderRiskPill(req.risk || computeRisk(req)) + '</div>'
      + '<p class="muted">Besitzer: ' + escapeHtml(owner ? owner.email : "-") + ' | ' + escapeHtml(req.contact.phone || "-") + '</p>'
      + '<div class="card card-soft stack">'
      + '<p><strong>Kurzbeschreibung:</strong> ' + escapeHtml(req.contact.shortDesc || "-") + '</p>'
      + '<p><strong>Postenprofil:</strong> ' + escapeHtml(req.postProfile.postenart || "-") + ' / ' + escapeHtml(req.postProfile.qualitaet || "-") + '</p>'
      + '<p><strong>Kategorien:</strong> ' + escapeHtml((req.postProfile.kategorien || []).join(", ") || "-") + '</p>'
      + '<p><strong>Logistik:</strong> Paletten ' + escapeHtml(req.logistics.palletCount || "-") + ', Volumen ' + escapeHtml(req.logistics.volumeM3 || "-") + ', Deadline ' + escapeHtml(req.logistics.deadlineType || "-") + '</p>'
      + '<p><strong>Preis:</strong> Wunsch ' + escapeHtml(req.price.wishPrice || "-") + ', Untergrenze ' + escapeHtml(req.price.minAcceptable || "-") + '</p>'
      + '<p><strong>Netzwerk Opt-In:</strong> ' + (req.consent.networkOptIn ? "Ja" : "Nein") + '</p>'
      + "</div>"
      + "</div>"

      + '<div class="card stack">'
      + '<h3>Aktionen</h3>'
      + '<form data-form="admin-status" class="form-grid">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<div class="field"><label>Status setzen</label><select name="status">' + renderOptions(transitions, req.status) + '</select></div>'
      + '<div class="field"><label>Notiz</label><input name="note" placeholder="optional" /></div>'
      + '<div class="field full"><button class="btn btn-primary" type="submit">Status aktualisieren</button></div>'
      + "</form>"

      + '<form data-form="admin-message" class="stack">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<div class="field"><label>Rueckfrage senden</label><textarea name="message" required></textarea></div>'
      + '<div class="btn-row"><button class="btn btn-secondary" type="submit">Rueckfrage senden (Status: Rueckfragen)</button></div>'
      + "</form>"

      + '<form data-form="admin-evaluation" class="stack">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<div class="field"><label>Bewertung/Notiz</label><textarea name="evaluation" required></textarea></div>'
      + '<div class="btn-row"><button class="btn btn-secondary" type="submit">Bewertung speichern (Status: Bewertung)</button></div>'
      + "</form>"

      + '<form data-form="admin-offer" class="form-grid">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<div class="field"><label>Angebot Betrag</label><input name="amount" required /></div>'
      + '<div class="field"><label>Waehrung</label><input name="currency" value="EUR" /></div>'
      + '<div class="field full"><label>Angebotstext</label><textarea name="text"></textarea></div>'
      + '<div class="field full"><button class="btn btn-primary" type="submit">Angebot erstellen</button></div>'
      + "</form>"

      + '<div class="btn-row">'
      + '<button class="btn btn-secondary" type="button" data-action="admin-network" data-request-id="' + escapeAttr(req.id) + '">Im Netzwerk anbieten</button>'
      + '<button class="btn btn-secondary" type="button" data-action="admin-no-bids" data-request-id="' + escapeAttr(req.id) + '">Keine Gebote markieren</button>'
      + '<button class="btn btn-ghost" type="button" data-action="bitrix-sync" data-request-id="' + escapeAttr(req.id) + '">Bitrix Sync (Stub)</button>'
      + "</div>"

      + '<form data-form="admin-bid" class="form-grid">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<div class="field"><label>Gebot</label><input name="amount" required /></div>'
      + '<div class="field"><label>Waehrung</label><input name="currency" value="EUR" /></div>'
      + '<div class="field"><label>Buyer Label (intern)</label><input name="buyer" /></div>'
      + '<div class="field"><label>Terms</label><input name="terms" /></div>'
      + '<div class="field full"><button class="btn btn-secondary" type="submit">Gebot hinzufuegen</button></div>'
      + "</form>"

      + '<form data-form="admin-price-request" class="stack">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<div class="field"><label>Nachricht zur Preisanpassung</label><textarea name="message" required></textarea></div>'
      + '<div class="btn-row"><button class="btn btn-secondary" type="submit">Preisanpassung anfragen</button></div>'
      + "</form>"

      + '<form data-form="admin-offer-adjust" class="form-grid">'
      + '<input type="hidden" name="requestId" value="' + escapeAttr(req.id) + '" />'
      + '<div class="field"><label>Neuer Betrag</label><input name="amount" required /></div>'
      + '<div class="field"><label>Waehrung</label><input name="currency" value="EUR" /></div>'
      + '<div class="field full"><label>Text</label><textarea name="text"></textarea></div>'
      + '<div class="field full"><button class="btn btn-primary" type="submit">Angebot anpassen</button></div>'
      + "</form>"
      + "</div>"

      + '<div class="card stack"><h3>Angebote</h3><ul class="inline-list">' + offers + '</ul></div>'
      + '<div class="card stack"><h3>Gebote</h3><ul class="inline-list">' + bids + '</ul></div>'
      + "</article>"
      + '<aside class="card stack"><h3>Timeline</h3>' + timeline + "</aside>"
      + "</section>";
  }

  function renderAdminSettings(route, db, user) {
    if (!requireAdmin(user)) {
      return "";
    }

    var bitrix = db.settings.bitrix || {};
    var requestOptions = db.requests.map(function (req) {
      return '<option value="' + escapeAttr(req.id) + '">' + escapeHtml(req.id + " - " + (req.contact.shortDesc || "")) + "</option>";
    }).join("");

    return ""
      + '<section class="card stack">'
      + '<div class="section-title"><h1>Settings</h1><p class="muted">Systemparameter, Reminder, Netzwerk-Feature und Bitrix-Stub.</p></div>'
      + '<form data-form="settings" class="stack">'
      + '<div class="form-grid">'
      + '<div class="field"><label>Support Telefon</label><input name="supportPhone" value="' + escapeAttr(db.settings.supportPhone || "") + '" /></div>'
      + '<div class="field"><label>Support E-Mail</label><input name="supportEmail" value="' + escapeAttr(db.settings.supportEmail || "") + '" /></div>'
      + '<div class="field full"><label>Datenschutz URL</label><input name="privacyUrl" value="' + escapeAttr(db.settings.privacyUrl || "") + '" /></div>'
      + '<div class="field"><label>Upload Limit (MB)</label><input name="uploadLimitMb" type="number" min="1" value="' + escapeAttr(String(db.settings.uploadLimitMb || 100)) + '" /></div>'
      + '<fieldset class="field"><legend>Features</legend>'
      + '<div class="checkbox-group">'
      + '<label class="checkbox"><input type="checkbox" name="networkAndBidsEnabled" ' + (db.settings.networkAndBidsEnabled ? "checked" : "") + ' />Netzwerk & Gebote aktiv</label>'
      + '<label class="checkbox"><input type="checkbox" name="bitrixEnabled" ' + (bitrix.enabled ? "checked" : "") + ' />Bitrix Sync aktiv</label>'
      + "</div>"
      + "</fieldset>"
      + '<div class="field"><label>Bitrix Webhook URL</label><input name="bitrixWebhookUrl" value="' + escapeAttr(bitrix.webhookUrl || "") + '" /></div>'
      + '<div class="field"><label>Entity Type</label><select name="bitrixEntityType">' + renderOptions(["Lead", "Deal"], bitrix.entityType || "Lead") + '</select></div>'
      + '<div class="field full"><label>Field Mapping (pro Zeile local=remote)</label><textarea name="bitrixFieldMapping">' + escapeHtml(mappingToText(bitrix.fieldMapping || {})) + '</textarea></div>'
      + '<div class="field full"><label>Stage Mapping (pro Zeile status=stage)</label><textarea name="bitrixStageMapping">' + escapeHtml(mappingToText(bitrix.stageMapping || {})) + '</textarea></div>'
      + "</div>"
      + '<div class="btn-row"><button class="btn btn-primary" type="submit">Settings speichern</button></div>'
      + "</form>"

      + '<div class="card card-soft stack">'
      + '<h3>Bitrix Sync (Stub)</h3>'
      + '<form data-form="settings-sync" class="form-grid">'
      + '<div class="field"><label>Anfrage fuer Sync</label><select name="requestId">' + requestOptions + '</select></div>'
      + '<div class="field"><label>&nbsp;</label><button class="btn btn-secondary" type="submit">Sync now (Stub)</button></div>'
      + "</form>"
      + '<p class="hint">Der Stub schreibt nur Timeline-Events und erzeugt eine fake remote_id.</p>'
      + "</div>"

      + '<div class="btn-row">'
      + '<button class="btn btn-secondary" type="button" data-action="simulate-reminder" data-hours="24">Reminder jetzt simulieren (24h)</button>'
      + '<button class="btn btn-secondary" type="button" data-action="simulate-reminder" data-hours="72">Reminder jetzt simulieren (3T)</button>'
      + '<button class="btn btn-secondary" type="button" data-action="simulate-reminder" data-hours="168">Reminder jetzt simulieren (7T)</button>'
      + "</div>"

      + '<div class="btn-row">'
      + '<button class="btn btn-ghost" type="button" data-action="load-demo">Demo-Daten laden</button>'
      + '<button class="btn btn-danger" type="button" data-action="reset-all">Alle Daten zuruecksetzen</button>'
      + "</div>"
      + "</section>";
  }

  function renderAdminEmails(route, db, user) {
    if (!requireAdmin(user)) {
      return "";
    }

    var emails = db.emailsOutbox.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (!uiState.emailPreviewId && emails.length) {
      uiState.emailPreviewId = emails[0].id;
    }

    var preview = emails.find(function (mail) { return mail.id === uiState.emailPreviewId; }) || null;

    var list = emails.length
      ? emails.map(function (mail) {
        var active = mail.id === uiState.emailPreviewId ? " style=\"border-color:#cf6161; background:#fff3f3;\"" : "";
        return ''
          + '<li class="mail-item"' + active + '>'
          + '<div><strong>' + escapeHtml(mail.subject) + '</strong></div>'
          + '<div class="meta">An: ' + escapeHtml(mail.to) + ' | ' + escapeHtml(formatDate(mail.createdAt)) + '</div>'
          + '<div class="meta">Request: ' + escapeHtml(mail.relatedRequestId || "-") + '</div>'
          + '<div class="btn-row">'
          + '<button class="btn btn-secondary" type="button" data-action="preview-mail" data-mail-id="' + escapeAttr(mail.id) + '">Preview</button>'
          + '<button class="btn btn-ghost" type="button" data-action="open-mail-link" data-mail-id="' + escapeAttr(mail.id) + '">Oeffnen</button>'
          + "</div>"
          + "</li>";
      }).join("")
      : '<div class="empty">Noch keine E-Mails erzeugt.</div>';

    var previewHtml = preview
      ? '<div class="mail-preview">' + preview.html + "</div>"
      : '<div class="empty">Keine E-Mail ausgewaehlt.</div>';

    return ""
      + '<section class="card stack">'
      + '<div class="section-title"><h1>E-Mail Outbox (simuliert)</h1><p class="muted">Alle im Prototyp ausgeloesten Mails mit klickbaren Aktionslinks.</p></div>'
      + '<div class="btn-row">'
      + '<button class="btn btn-secondary" type="button" data-action="simulate-reminder" data-hours="24">Reminder 24h</button>'
      + '<button class="btn btn-secondary" type="button" data-action="simulate-reminder" data-hours="72">Reminder 3T</button>'
      + '<button class="btn btn-secondary" type="button" data-action="simulate-reminder" data-hours="168">Reminder 7T</button>'
      + "</div>"
      + '<div class="split">'
      + '<div><ul class="mail-list">' + list + "</ul></div>"
      + '<div class="stack">'
      + '<h3>Preview</h3>'
      + previewHtml
      + "</div>"
      + "</div>"
      + "</section>";
  }

  function renderStatusFilters(activeStatus, baseHash) {
    var chips = ["ALL"].concat(STATUS_ORDER).map(function (statusKey) {
      var label = statusKey === "ALL" ? "Alle" : STATUS[statusKey].label;
      var active = statusKey === activeStatus ? "active" : "";
      var href = baseHash + (statusKey === "ALL" ? "" : "?status=" + encodeURIComponent(statusKey));
      return '<a href="' + href + '" class="' + active + '">' + escapeHtml(label) + "</a>";
    }).join("");

    return '<div class="filters">' + chips + "</div>";
  }

  function renderAdminFilters(activeStatus, risk, network) {
    var statusFilter = renderStatusFilters(activeStatus, "#/admin");

    var riskFilters = [
      ["ALL", "Risiko: alle"],
      ["low", "Risiko: niedrig"],
      ["medium", "Risiko: mittel"],
      ["high", "Risiko: hoch"]
    ].map(function (item) {
      var qs = "?status=" + encodeURIComponent(activeStatus) + "&risk=" + encodeURIComponent(item[0]) + "&network=" + encodeURIComponent(network);
      var cls = item[0] === risk ? "active" : "";
      return '<a href="#/admin' + qs + '" class="' + cls + '">' + item[1] + "</a>";
    }).join("");

    var networkFilters = [
      ["ALL", "Netzwerk: alle"],
      ["OPTIN", "Netzwerk: Opt-In"],
      ["NO", "Netzwerk: kein Opt-In"]
    ].map(function (item) {
      var qs = "?status=" + encodeURIComponent(activeStatus) + "&risk=" + encodeURIComponent(risk) + "&network=" + encodeURIComponent(item[0]);
      var cls = item[0] === network ? "active" : "";
      return '<a href="#/admin' + qs + '" class="' + cls + '">' + item[1] + "</a>";
    }).join("");

    return statusFilter
      + '<div class="filters">' + riskFilters + "</div>"
      + '<div class="filters">' + networkFilters + "</div>";
  }

  function renderTimeline(items) {
    if (!items || !items.length) {
      return '<div class="empty">Keine Timeline-Eintraege vorhanden.</div>';
    }

    return '<ul class="timeline">' + items.slice().reverse().map(function (entry) {
      return ''
        + '<li>'
        + '<strong>' + escapeHtml(entry.type) + '</strong>'
        + '<div class="meta">' + escapeHtml(formatDate(entry.at)) + ' | ' + escapeHtml(entry.actor) + "</div>"
        + '<div>' + escapeHtml(timelinePayloadSummary(entry.payload)) + "</div>"
        + "</li>";
    }).join("") + "</ul>";
  }

  function timelinePayloadSummary(payload) {
    if (!payload) {
      return "";
    }
    if (typeof payload === "string") {
      return payload;
    }

    var parts = [];
    Object.keys(payload).forEach(function (key) {
      var value = payload[key];
      if (value === null || value === undefined || value === "") {
        return;
      }
      if (typeof value === "object") {
        parts.push(key + ": " + JSON.stringify(value));
      } else {
        parts.push(key + ": " + String(value));
      }
    });
    return parts.join(" | ");
  }

  function renderStatusBadge(status) {
    var meta = STATUS[status] || STATUS.EINGEGANGEN;
    return '<span class="badge ' + meta.tone + '">' + escapeHtml(meta.label) + "</span>";
  }

  function renderRiskPill(risk) {
    var level = risk.level || "low";
    var label = level === "high" ? "hoch" : level === "medium" ? "mittel" : "niedrig";
    return '<span class="pill-risk ' + escapeAttr(level) + '">Risiko: ' + escapeHtml(label) + ' (' + risk.score + '/100)</span>';
  }

  function renderOptions(options, selectedValue) {
    return options.map(function (item) {
      var label;
      var value;
      if (typeof item === "string") {
        value = item;
        label = item || "Bitte waehlen";
      } else {
        value = item.value;
        label = item.label;
      }
      var selected = String(value) === String(selectedValue || "") ? "selected" : "";
      return '<option value="' + escapeAttr(value) + '" ' + selected + '>' + escapeHtml(label) + '</option>';
    }).join("");
  }

  function onClick(event) {
    var target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    var actionEl = target.closest("[data-action]");
    if (!actionEl) {
      return;
    }

    var action = actionEl.getAttribute("data-action");

    if (action === "logout") {
      event.preventDefault();
      withDB(function (db) {
        db.sessions.currentUserId = null;
        db.sessions.createdAt = null;
      });
      pushToast("Erfolgreich ausgeloggt.", "success");
      navigate("#/public");
      return;
    }

    if (action === "wizard-next" || action === "wizard-back" || action === "wizard-submit" || action === "wizard-jump") {
      event.preventDefault();
      handleWizardStepAction(actionEl, action);
      return;
    }

    if (action === "offer-decision") {
      event.preventDefault();
      var requestId = actionEl.getAttribute("data-request-id");
      var offerId = actionEl.getAttribute("data-offer-id");
      var decision = actionEl.getAttribute("data-decision");
      handleOfferDecision(requestId, offerId, decision);
      return;
    }

    if (action === "remove-upload") {
      event.preventDefault();
      removeUpload(actionEl.getAttribute("data-upload-id"));
      return;
    }

    if (action === "preview-upload") {
      event.preventDefault();
      previewUpload(actionEl.getAttribute("data-upload-id"));
      return;
    }

    if (action === "admin-network") {
      event.preventDefault();
      adminOfferNetwork(actionEl.getAttribute("data-request-id"));
      return;
    }

    if (action === "admin-no-bids") {
      event.preventDefault();
      adminNoBids(actionEl.getAttribute("data-request-id"));
      return;
    }

    if (action === "bitrix-sync") {
      event.preventDefault();
      syncNow(actionEl.getAttribute("data-request-id"));
      return;
    }

    if (action === "preview-mail") {
      event.preventDefault();
      uiState.emailPreviewId = actionEl.getAttribute("data-mail-id") || "";
      renderRoute();
      return;
    }

    if (action === "open-mail-link") {
      event.preventDefault();
      openMailLink(actionEl.getAttribute("data-mail-id"));
      return;
    }

    if (action === "simulate-reminder") {
      event.preventDefault();
      var hours = Number(actionEl.getAttribute("data-hours") || "0");
      if (hours > 0) {
        simulateReminders([hours], true);
      }
      return;
    }

    if (action === "load-demo") {
      event.preventDefault();
      localStorage.setItem(DB_KEY, JSON.stringify(createSeedDB(true)));
      pushToast("Demo-Daten wurden geladen.", "success");
      navigate("#/admin", true);
      return;
    }

    if (action === "reset-all") {
      event.preventDefault();
      var confirmed = window.confirm("Alle App-Daten loeschen und neu initialisieren?");
      if (!confirmed) {
        return;
      }
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem(REMINDER_KEY);
      ensureDB();
      pushToast("Alle Daten wurden zurueckgesetzt.", "success");
      navigate("#/public", true);
    }
  }

  function onSubmit(event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    var formType = form.getAttribute("data-form");
    if (!formType) {
      return;
    }

    event.preventDefault();

    if (formType === "public-capture") {
      submitPublicCapture(form);
      return;
    }
    if (formType === "portal-login") {
      submitPortalLogin(form);
      return;
    }
    if (formType === "set-password") {
      submitSetPassword(form);
      return;
    }
    if (formType === "vendor-consent") {
      submitVendorConsent(form);
      return;
    }
    if (formType === "vendor-message") {
      submitVendorMessage(form);
      return;
    }
    if (formType === "vendor-price-adjust") {
      submitVendorPriceAdjust(form);
      return;
    }
    if (formType === "admin-login") {
      submitAdminLogin(form);
      return;
    }
    if (formType === "admin-status") {
      submitAdminStatus(form);
      return;
    }
    if (formType === "admin-message") {
      submitAdminMessage(form);
      return;
    }
    if (formType === "admin-evaluation") {
      submitAdminEvaluation(form);
      return;
    }
    if (formType === "admin-offer") {
      submitAdminOffer(form);
      return;
    }
    if (formType === "admin-bid") {
      submitAdminBid(form);
      return;
    }
    if (formType === "admin-price-request") {
      submitAdminPriceRequest(form);
      return;
    }
    if (formType === "admin-offer-adjust") {
      submitAdminOfferAdjust(form);
      return;
    }
    if (formType === "settings") {
      submitSettings(form);
      return;
    }
    if (formType === "settings-sync") {
      submitSettingsSync(form);
      return;
    }
  }

  function onChange(event) {
    var target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    var errorField = target.closest(".field-error");
    if (errorField) {
      errorField.classList.remove("field-error");
    }

    if (target instanceof HTMLInputElement && target.name === "uploadFiles") {
      var form = target.closest('form[data-form="wizard-edit"]');
      if (form) {
        handleUploadFiles(form, target);
      }
      return;
    }

    var wizardForm = target.closest('form[data-form="wizard-edit"]');
    if (wizardForm) {
      scheduleWizardAutosave(wizardForm);
    }
  }

  function onInput(event) {
    var target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    var errorField = target.closest(".field-error");
    if (errorField) {
      errorField.classList.remove("field-error");
    }

    var wizardForm = target.closest('form[data-form="wizard-edit"]');
    if (wizardForm) {
      scheduleWizardAutosave(wizardForm);
    }
  }

  function submitPublicCapture(form) {
    clearFormErrors(form);
    var fd = new FormData(form);
    var email = normalizeEmail(fd.get("email"));
    var phone = String(fd.get("phone") || "").trim();
    var shortDesc = String(fd.get("shortDesc") || "").trim();
    var privacy = fd.get("privacy") === "on";
    var name = String(fd.get("name") || "").trim();
    var company = String(fd.get("company") || "").trim();

    var firstError = "";
    if (!isValidEmail(email)) {
      markFieldError(form, "pf-email");
      firstError = "Bitte gueltige E-Mail eingeben.";
    }
    if (!phone) {
      markFieldError(form, "pf-phone");
      firstError = firstError || "Telefon ist erforderlich.";
    }
    if (!shortDesc) {
      markFieldError(form, "pf-short");
      firstError = firstError || "Kurzbeschreibung ist erforderlich.";
    }
    if (!privacy) {
      markFieldError(form, "pf-privacy");
      firstError = firstError || "Datenschutz muss bestaetigt werden.";
    }

    if (firstError) {
      var errNode = form.querySelector("#publicError");
      if (errNode) {
        errNode.textContent = firstError;
      }
      return;
    }

    var result = withDB(function (db) {
      var user = db.users.find(function (item) {
        return item.role === "vendor" && normalizeEmail(item.email) === email;
      });

      if (!user) {
        user = {
          id: uid("usr"),
          role: "vendor",
          email: email,
          phone: phone,
          passwordHashOrPlain: "",
          createdAt: nowISO()
        };
        db.users.push(user);
      } else {
        user.phone = phone || user.phone;
      }

      var req = createRequestObject({
        userId: user.id,
        email: email,
        phone: phone,
        name: name,
        company: company,
        shortDesc: shortDesc
      });

      applyRisk(req);
      db.requests.push(req);

      var token = createMagicToken(db, user.id, req.id, 7);
      createEmail(db, {
        to: email,
        subject: "Bitte ergaenzen Sie Ihre Angaben - schnelleres Angebot",
        html: buildEmailHtml({
          title: "Ihre Anfrage ist eingegangen",
          intro: "Bitte ergaenzen Sie Ihre Angaben. So koennen wir schneller ein passendes Ankaufangebot pruefen.",
          ctaLabel: "Angaben ergaenzen",
          actionLinkHash: "#/continue?token=" + encodeURIComponent(token.token),
          small: "Hinweis: Diese E-Mail wurde im Offline-Prototyp simuliert."
        }),
        relatedRequestId: req.id,
        actionLinkHash: "#/continue?token=" + encodeURIComponent(token.token)
      });

      pushTimeline(req, "ANFRAGE_EINGEREICHT", "vendor", { source: "public" });
      return { requestId: req.id, token: token.token };
    });

    pushToast("Anfrage gespeichert. Magic-Link wurde erzeugt.", "success");
    navigate("#/public?success=1&request=" + encodeURIComponent(result.requestId) + "&token=" + encodeURIComponent(result.token));
  }

  function submitPortalLogin(form) {
    var fd = new FormData(form);
    var email = normalizeEmail(fd.get("email"));
    var password = String(fd.get("password") || "");

    var result = withDB(function (db) {
      var user = db.users.find(function (item) {
        return item.role === "vendor" && normalizeEmail(item.email) === email && String(item.passwordHashOrPlain || "") === password;
      });

      if (!user) {
        return { ok: false };
      }

      db.sessions.currentUserId = user.id;
      db.sessions.createdAt = nowISO();
      return { ok: true };
    });

    var err = form.querySelector("#portalLoginError");
    if (!result.ok) {
      if (err) {
        err.textContent = "Login fehlgeschlagen. Pruefen Sie E-Mail/Passwort oder nutzen Sie den Magic-Link.";
      }
      return;
    }

    pushToast("Login erfolgreich.", "success");
    navigate("#/portal");
  }

  function submitAdminLogin(form) {
    var fd = new FormData(form);
    var email = normalizeEmail(fd.get("email"));
    var password = String(fd.get("password") || "");

    var result = withDB(function (db) {
      var admin = db.users.find(function (item) {
        return item.role === "admin" && normalizeEmail(item.email) === email && String(item.passwordHashOrPlain || "") === password;
      });
      if (!admin) {
        return { ok: false };
      }
      db.sessions.currentUserId = admin.id;
      db.sessions.createdAt = nowISO();
      return { ok: true };
    });

    var err = form.querySelector("#adminLoginError");
    if (!result.ok) {
      if (err) {
        err.textContent = "Admin Login fehlgeschlagen.";
      }
      return;
    }

    pushToast("Admin Login erfolgreich.", "success");
    navigate("#/admin");
  }

  function submitSetPassword(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var password = String(fd.get("password") || "");
    var password2 = String(fd.get("password2") || "");

    if (!password || password.length < 6 || password !== password2) {
      pushToast("Passwort ungueltig (mind. 6 Zeichen, beide Felder gleich).", "error");
      return;
    }

    var done = withDB(function (db) {
      var user = getCurrentUser(db);
      if (!user || user.role !== "vendor") {
        return { ok: false };
      }
      user.passwordHashOrPlain = password;

      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (req) {
        pushTimeline(req, "PASSWORT_GESETZT", "vendor", {});
      }
      return { ok: true };
    });

    if (!done.ok) {
      pushToast("Passwort konnte nicht gespeichert werden.", "error");
      return;
    }

    pushToast("Passwort gespeichert.", "success");
    renderRoute();
  }

  function submitVendorConsent(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var networkOptIn = fd.get("networkOptIn") === "on";
    var allowOnlineListing = fd.get("allowOnlineListing") === "on";

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }
      req.consent.networkOptIn = networkOptIn;
      req.consent.allowOnlineListing = allowOnlineListing;
      req.updatedAt = nowISO();
      applyRisk(req);
      pushTimeline(req, "FREIGABEN_AKTUALISIERT", "vendor", {
        networkOptIn: networkOptIn,
        allowOnlineListing: allowOnlineListing
      });
      return {};
    });

    pushToast("Freigaben aktualisiert.", "success");
    renderRoute();
  }

  function submitVendorMessage(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var message = String(fd.get("message") || "").trim();

    if (!message) {
      pushToast("Bitte Nachricht eingeben.", "error");
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }
      pushTimeline(req, "MESSAGE", "vendor", { message: message });
      req.updatedAt = nowISO();
      return {};
    });

    pushToast("Nachricht gespeichert.", "success");
    renderRoute();
  }

  function submitVendorPriceAdjust(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var wishPrice = String(fd.get("wishPrice") || "").trim();
    var minAcceptable = String(fd.get("minAcceptable") || "").trim();

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }
      req.price.wishPrice = wishPrice;
      req.price.minAcceptable = minAcceptable;
      req.updatedAt = nowISO();
      pushTimeline(req, "PREISANPASSUNG_VENDOR", "vendor", {
        wishPrice: wishPrice,
        minAcceptable: minAcceptable
      });

      if (req.status === "PREISREDUZIERUNG_ANGEFRAGT") {
        req.status = "ANGEBOT_ANGEPASST";
        pushTimeline(req, "STATUS_WECHSEL", "vendor", { to: "ANGEBOT_ANGEPASST" });
      }
      applyRisk(req);
      return {};
    });

    pushToast("Preisanpassung gesendet.", "success");
    renderRoute();
  }

  function submitAdminStatus(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var status = String(fd.get("status") || "");
    var note = String(fd.get("note") || "").trim();

    var result = withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return { ok: false, message: "Anfrage nicht gefunden." };
      }

      var allowed = ALLOWED_TRANSITIONS[req.status] || [];
      if (status !== req.status && allowed.indexOf(status) < 0) {
        return { ok: false, message: "Statuswechsel laut Workflow nicht erlaubt." };
      }

      if (status !== req.status) {
        req.status = status;
        pushTimeline(req, "STATUS_WECHSEL", "admin", { to: status, note: note });
      } else if (note) {
        pushTimeline(req, "STATUS_NOTIZ", "admin", { note: note });
      }

      req.updatedAt = nowISO();
      return { ok: true };
    });

    if (!result.ok) {
      pushToast(result.message, "error");
      return;
    }

    pushToast("Status aktualisiert.", "success");
    renderRoute();
  }

  function submitAdminMessage(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var message = String(fd.get("message") || "").trim();

    if (!message) {
      pushToast("Rueckfrage darf nicht leer sein.", "error");
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }

      req.status = "RUECKFRAGEN";
      pushTimeline(req, "STATUS_WECHSEL", "admin", { to: "RUECKFRAGEN" });
      pushTimeline(req, "MESSAGE", "admin", { message: message });
      req.updatedAt = nowISO();

      createEmail(db, {
        to: req.contact.email,
        subject: "Rueckfrage zu Ihrer Ankauf-Anfrage",
        html: buildEmailHtml({
          title: "Wir benoetigen weitere Angaben",
          intro: message,
          ctaLabel: "Anfrage oeffnen",
          actionLinkHash: "#/portal/request/" + encodeURIComponent(req.id),
          small: "Bitte antworten Sie direkt im Portal."
        }),
        relatedRequestId: req.id,
        actionLinkHash: "#/portal/request/" + encodeURIComponent(req.id)
      });
      return {};
    });

    pushToast("Rueckfrage gesendet.", "success");
    renderRoute();
  }

  function submitAdminEvaluation(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var evaluation = String(fd.get("evaluation") || "").trim();

    if (!evaluation) {
      pushToast("Bewertung darf nicht leer sein.", "error");
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }
      req.status = "BEWERTUNG";
      req.updatedAt = nowISO();
      pushTimeline(req, "STATUS_WECHSEL", "admin", { to: "BEWERTUNG" });
      pushTimeline(req, "BEWERTUNG_NOTIZ", "admin", { text: evaluation });
      return {};
    });

    pushToast("Bewertung gespeichert.", "success");
    renderRoute();
  }

  function submitAdminOffer(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var amount = String(fd.get("amount") || "").trim();
    var currency = String(fd.get("currency") || "EUR").trim() || "EUR";
    var text = String(fd.get("text") || "").trim();

    if (!amount) {
      pushToast("Betrag fehlt.", "error");
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }

      req.offers.push({
        id: uid("offer"),
        amount: amount,
        currency: currency,
        text: text,
        createdAt: nowISO(),
        pdfName: "angebot_" + req.id + ".pdf"
      });

      req.status = "ANGEBOT_GESENDET";
      req.updatedAt = nowISO();
      pushTimeline(req, "ANGEBOT_ERSTELLT", "admin", { amount: amount, currency: currency });
      pushTimeline(req, "STATUS_WECHSEL", "admin", { to: "ANGEBOT_GESENDET" });

      createEmail(db, {
        to: req.contact.email,
        subject: "Ihr Ankauf-Angebot liegt vor",
        html: buildEmailHtml({
          title: "Ihr Angebot ist verfuegbar",
          intro: "Es wurde ein Angebot in Hoehe von " + amount + " " + currency + " erstellt.",
          ctaLabel: "Angebot im Portal ansehen",
          actionLinkHash: "#/portal/request/" + encodeURIComponent(req.id),
          small: text || "Bitte pruefen und annehmen oder ablehnen."
        }),
        relatedRequestId: req.id,
        actionLinkHash: "#/portal/request/" + encodeURIComponent(req.id)
      });

      return {};
    });

    pushToast("Angebot erstellt.", "success");
    renderRoute();
  }

  function submitAdminBid(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var amount = String(fd.get("amount") || "").trim();
    var currency = String(fd.get("currency") || "EUR").trim() || "EUR";
    var buyer = String(fd.get("buyer") || "").trim();
    var terms = String(fd.get("terms") || "").trim();

    if (!amount) {
      pushToast("Gebotbetrag fehlt.", "error");
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }

      req.bids.push({
        id: uid("bid"),
        amount: amount,
        currency: currency,
        terms: terms,
        createdAt: nowISO(),
        buyerLabelInternal: buyer
      });

      req.status = "GEBOTE_VORHANDEN";
      req.updatedAt = nowISO();
      pushTimeline(req, "GEBOT_HINZUGEFUEGT", "admin", { amount: amount, currency: currency, buyer: buyer });
      pushTimeline(req, "STATUS_WECHSEL", "admin", { to: "GEBOTE_VORHANDEN" });
      return {};
    });

    pushToast("Gebot hinzugefuegt.", "success");
    renderRoute();
  }

  function submitAdminPriceRequest(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var message = String(fd.get("message") || "").trim();

    if (!message) {
      pushToast("Nachricht fehlt.", "error");
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }

      req.status = "PREISREDUZIERUNG_ANGEFRAGT";
      req.updatedAt = nowISO();
      pushTimeline(req, "STATUS_WECHSEL", "admin", { to: "PREISREDUZIERUNG_ANGEFRAGT" });
      pushTimeline(req, "MESSAGE", "admin", { message: message });

      createEmail(db, {
        to: req.contact.email,
        subject: "Preisanpassung angefragt",
        html: buildEmailHtml({
          title: "Bitte Preisrahmen anpassen",
          intro: message,
          ctaLabel: "Preis im Portal aktualisieren",
          actionLinkHash: "#/portal/request/" + encodeURIComponent(req.id),
          small: "Status wurde auf Preisanpassung angefragt gesetzt."
        }),
        relatedRequestId: req.id,
        actionLinkHash: "#/portal/request/" + encodeURIComponent(req.id)
      });

      return {};
    });

    pushToast("Preisanpassung angefragt.", "success");
    renderRoute();
  }

  function submitAdminOfferAdjust(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    var amount = String(fd.get("amount") || "").trim();
    var currency = String(fd.get("currency") || "EUR").trim() || "EUR";
    var text = String(fd.get("text") || "").trim();

    if (!amount) {
      pushToast("Betrag fehlt.", "error");
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }

      req.offers.push({
        id: uid("offer"),
        amount: amount,
        currency: currency,
        text: text,
        createdAt: nowISO(),
        pdfName: "angebot_angepasst_" + req.id + ".pdf"
      });

      req.status = "ANGEBOT_ANGEPASST";
      req.updatedAt = nowISO();
      pushTimeline(req, "ANGEBOT_ANGEPASST", "admin", { amount: amount, currency: currency });
      pushTimeline(req, "STATUS_WECHSEL", "admin", { to: "ANGEBOT_ANGEPASST" });

      createEmail(db, {
        to: req.contact.email,
        subject: "Angepasstes Angebot verfuegbar",
        html: buildEmailHtml({
          title: "Ihr Angebot wurde angepasst",
          intro: "Neues Angebot: " + amount + " " + currency,
          ctaLabel: "Angebot ansehen",
          actionLinkHash: "#/portal/request/" + encodeURIComponent(req.id),
          small: text || "Bitte Angebot pruefen."
        }),
        relatedRequestId: req.id,
        actionLinkHash: "#/portal/request/" + encodeURIComponent(req.id)
      });

      return {};
    });

    pushToast("Angebot angepasst und versendet.", "success");
    renderRoute();
  }

  function submitSettings(form) {
    var fd = new FormData(form);

    var newSettings = {
      supportPhone: String(fd.get("supportPhone") || "").trim(),
      supportEmail: String(fd.get("supportEmail") || "").trim(),
      privacyUrl: String(fd.get("privacyUrl") || "").trim(),
      uploadLimitMb: clamp(Number(fd.get("uploadLimitMb") || 100), 1, 500),
      networkAndBidsEnabled: fd.get("networkAndBidsEnabled") === "on",
      bitrix: {
        enabled: fd.get("bitrixEnabled") === "on",
        webhookUrl: String(fd.get("bitrixWebhookUrl") || "").trim(),
        entityType: String(fd.get("bitrixEntityType") || "Lead"),
        fieldMapping: parseMappingText(String(fd.get("bitrixFieldMapping") || "")),
        stageMapping: parseMappingText(String(fd.get("bitrixStageMapping") || ""))
      }
    };

    withDB(function (db) {
      db.settings = Object.assign({}, db.settings, newSettings);
      return {};
    });

    pushToast("Settings gespeichert.", "success");
    renderRoute();
  }

  function submitSettingsSync(form) {
    var fd = new FormData(form);
    var requestId = String(fd.get("requestId") || "");
    if (!requestId) {
      pushToast("Bitte Anfrage auswaehlen.", "error");
      return;
    }
    syncNow(requestId);
  }

  function validateWizardStep(req, step) {
    var errors = [];
    if (step === 2) {
      if (!req.postProfile.postenart) {
        errors.push({fieldId: "wf-postenart", message: "Postenart ist erforderlich."});
      }
      if (!req.postProfile.qualitaet) {
        errors.push({fieldId: "wf-qualitaet", message: "Qualitaet ist erforderlich."});
      }
      if (!(req.postProfile.kategorien || []).length) {
        errors.push({fieldId: "wf-kategorien", message: "Mindestens eine Kategorie waehlen."});
      }
      if (req.postProfile.qualitaet === "Gemischt" && !(req.postProfile.mixedSubgrades || []).length) {
        errors.push({fieldId: "wf-mixedSubgrades", message: "Mindestens eine Qualitaetsstufe waehlen."});
      }
    }
    if (step === 3) {
      if (!String(req.logistics.plz || "").trim()) {
        errors.push({fieldId: "wf-plz", message: "PLZ ist erforderlich."});
      }
      if (!String(req.logistics.ort || "").trim()) {
        errors.push({fieldId: "wf-ort", message: "Ort ist erforderlich."});
      }
      if (!req.logistics.palletStatus) {
        errors.push({fieldId: "wf-palletStatus", message: "Palettenstatus ist erforderlich."});
      }
      if (!req.logistics.deadlineType) {
        errors.push({fieldId: "wf-deadlineType", message: "Deadline Typ ist erforderlich."});
      }
    }
    if (step === 5) {
      var wizardForm = document.querySelector('form[data-form="wizard-edit"]');
      var confirmBox = wizardForm ? wizardForm.querySelector('input[name="confirmAll"]') : null;
      if (!confirmBox || !confirmBox.checked) {
        errors.push({fieldId: "wf-confirmAll", message: "Bitte Richtigkeit bestaetigen."});
      }
    }
    return {valid: errors.length === 0, errors: errors};
  }

  function showWizardErrors(errors) {
    errors.forEach(function (err) {
      var node = document.getElementById(err.fieldId);
      if (node) {
        node.classList.add("field-error");
      }
    });
    if (errors.length) {
      pushToast(errors[0].message, "error");
    }
  }

  function handleWizardStepAction(actionEl, action) {
    var requestId = actionEl.getAttribute("data-request-id") || getWizardRequestIdFromDOM();
    if (!requestId) {
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }

      req.wizard = req.wizard || { currentStep: 1, maxUnlockedStep: 1 };
      saveWizardFormFromDOM(db, req.id, false);

      if (action === "wizard-next") {
        var currentStep = req.wizard.currentStep || 1;
        var validation = validateWizardStep(req, currentStep);
        if (!validation.valid) {
          showWizardErrors(validation.errors);
          return {};
        }
        req.wizard.currentStep = clamp(currentStep + 1, 1, 5);
        req.wizard.maxUnlockedStep = Math.max(req.wizard.maxUnlockedStep || 1, req.wizard.currentStep);
      }

      if (action === "wizard-back") {
        req.wizard.currentStep = clamp((req.wizard.currentStep || 1) - 1, 1, 5);
      }

      if (action === "wizard-jump") {
        var step = Number(actionEl.getAttribute("data-step") || "1");
        var clickable = actionEl.getAttribute("data-clickable") === "1";
        if (clickable) {
          req.wizard.currentStep = clamp(step, 1, 5);
        }
      }

      if (action === "wizard-submit") {
        var submitValidation = validateWizardStep(req, 5);
        if (!submitValidation.valid) {
          showWizardErrors(submitValidation.errors);
          return {};
        }

        pushTimeline(req, "ANFRAGE_ABGESCHLOSSEN", "vendor", { completion: computeCompletion(req) + "%" });
        req.updatedAt = nowISO();
        pushToast("Anfrage abgesendet. Wir pruefen den Direktankauf.", "success");
      }

      req.updatedAt = nowISO();
      applyRisk(req);
      return {};
    });

    renderRoute();
  }

  function getWizardRequestIdFromDOM() {
    var form = document.querySelector('form[data-form="wizard-edit"]');
    return form ? form.getAttribute("data-request-id") : "";
  }

  function scheduleWizardAutosave(form) {
    var requestId = form.getAttribute("data-request-id");
    if (!requestId) {
      return;
    }

    if (uiState.wizardAutosaveTimers[requestId]) {
      clearTimeout(uiState.wizardAutosaveTimers[requestId]);
    }

    uiState.wizardAutosaveTimers[requestId] = window.setTimeout(function () {
      withDB(function (db) {
        saveWizardFormFromDOM(db, requestId, false);
        return {};
      });
    }, 260);
  }

  function saveWizardFormFromDOM(db, requestId, showToast) {
    var req = db.requests.find(function (item) {
      return item.id === requestId;
    });
    if (!req) {
      return;
    }

    var form = document.getElementById("wizard-form-" + requestId);
    if (!form) {
      return;
    }

    var fd = new FormData(form);

    req.contact.email = String(fd.get("contactEmail") || req.contact.email || "").trim();
    req.contact.phone = String(fd.get("contactPhone") || req.contact.phone || "").trim();
    req.contact.name = String(fd.get("contactName") || "").trim();
    req.contact.company = String(fd.get("contactCompany") || "").trim();
    req.contact.shortDesc = String(fd.get("contactShortDesc") || "").trim();

    req.postProfile.postenart = String(fd.get("postenart") || "");
    req.postProfile.qualitaet = String(fd.get("qualitaet") || "");
    req.postProfile.kategorien = fd.getAll("kategorien").map(function (v) { return String(v); });
    req.postProfile.beschreibung = String(fd.get("beschreibung") || "").trim();
    req.postProfile.firstHand = String(fd.get("firstHand") || "");
    req.postProfile.restrictions = String(fd.get("restrictions") || "");
    req.postProfile.mixedSubgrades = fd.getAll("mixedSubgrades").map(function (v) { return String(v); });

    req.logistics.plz = String(fd.get("plz") || "").trim();
    req.logistics.ort = String(fd.get("ort") || "").trim();
    req.logistics.land = String(fd.get("land") || "Deutschland").trim();
    req.logistics.palletStatus = String(fd.get("palletStatus") || "");
    req.logistics.palletCount = String(fd.get("palletCount") || "").trim();
    req.logistics.pieceCount = String(fd.get("pieceCount") || "").trim();
    req.logistics.volumeM3 = String(fd.get("volumeM3") || "").trim();
    req.logistics.readyFrom = String(fd.get("readyFrom") || "");
    req.logistics.deadlineType = String(fd.get("deadlineType") || "");
    req.logistics.deadlineDate = String(fd.get("deadlineDate") || "");

    var l1 = String(fd.get("link1") || "").trim();
    var l2 = String(fd.get("link2") || "").trim();
    req.logistics.links = [l1, l2].filter(Boolean);

    req.price.estValue = String(fd.get("estValue") || "").trim();
    req.price.wishPrice = String(fd.get("wishPrice") || "").trim();
    req.price.minAcceptable = String(fd.get("minAcceptable") || "").trim();
    req.price.priceBasis = String(fd.get("priceBasis") || "").trim();
    req.price.vatMode = String(fd.get("vatMode") || "").trim();

    req.consent.networkOptIn = fd.get("networkOptIn") === "on";
    req.consent.allowOnlineListing = fd.get("allowOnlineListing") === "on";

    req.updatedAt = nowISO();
    applyRisk(req);

    if (showToast) {
      pushToast("Wizard gespeichert.", "success");
    }
  }

  function handleUploadFiles(form, inputEl) {
    var requestId = form.getAttribute("data-request-id");
    if (!requestId) {
      return;
    }

    var files = Array.prototype.slice.call((inputEl && inputEl.files) || []);
    if (!files.length) {
      return;
    }

    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }

      var maxBytes = Number(db.settings.uploadLimitMb || 100) * 1024 * 1024;
      var currentSize = (req.logistics.uploads || []).reduce(function (sum, item) {
        return sum + Number(item.size || 0);
      }, 0);

      var added = 0;
      var rejected = 0;
      files.forEach(function (file) {
        var ext = (file.name || "").toLowerCase().replace(/^.*(\.[^.]+)$/, "$1");
        if (ALLOWED_UPLOAD_EXTENSIONS.indexOf(ext) < 0) {
          rejected += 1;
          return;
        }
        if (currentSize + file.size > maxBytes) {
          return;
        }

        var upload = {
          id: uid("upl"),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          addedAt: nowISO()
        };

        req.logistics.uploads.push(upload);
        currentSize += file.size;
        added += 1;

        if ((file.type || "").indexOf("image/") === 0) {
          uiState.uploadPreviewUrls[upload.id] = URL.createObjectURL(file);
        }
      });

      req.updatedAt = nowISO();
      applyRisk(req);
      pushTimeline(req, "UPLOADS_AKTUALISIERT", "vendor", { added: added });

      if (rejected) {
        pushToast(rejected + " Datei(en) abgelehnt (unerlaubter Typ). Erlaubt: " + ALLOWED_UPLOAD_EXTENSIONS.join(", "), "error");
      }
      if (!added && !rejected) {
        pushToast("Upload-Limit erreicht. Keine neue Datei aufgenommen.", "error");
      } else if (added) {
        pushToast(added + " Datei(en) hinzugefuegt.", "success");
      }

      return {};
    });

    if (inputEl) {
      inputEl.value = "";
    }
    renderRoute();
  }

  function removeUpload(uploadId) {
    if (!uploadId) {
      return;
    }

    withDB(function (db) {
      db.requests.forEach(function (req) {
        var before = req.logistics.uploads.length;
        req.logistics.uploads = req.logistics.uploads.filter(function (item) {
          return item.id !== uploadId;
        });
        if (req.logistics.uploads.length !== before) {
          req.updatedAt = nowISO();
          applyRisk(req);
          pushTimeline(req, "UPLOAD_ENTFERNT", "vendor", { uploadId: uploadId });
        }
      });
      return {};
    });

    if (uiState.uploadPreviewUrls[uploadId]) {
      URL.revokeObjectURL(uiState.uploadPreviewUrls[uploadId]);
      delete uiState.uploadPreviewUrls[uploadId];
    }

    pushToast("Upload entfernt.", "info");
    renderRoute();
  }

  function previewUpload(uploadId) {
    var url = uiState.uploadPreviewUrls[uploadId];
    if (!url) {
      pushToast("Keine Session-Vorschau verfuegbar (nur waehrend aktueller Sitzung).", "error");
      return;
    }
    window.open(url, "_blank");
  }

  function handleOfferDecision(requestId, offerId, decision) {
    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }

      var offer = req.offers.find(function (item) {
        return item.id === offerId;
      });
      if (!offer || offer.decision) {
        return {};
      }

      offer.decision = decision;
      offer.decidedAt = nowISO();

      if (decision === "accepted") {
        req.status = "ANGEBOT_ANGENOMMEN";
      } else {
        req.status = "ANGEBOT_ABGELEHNT";
      }
      req.updatedAt = nowISO();

      pushTimeline(req, "ANGEBOT_ENTSCHEIDUNG", "vendor", { offerId: offerId, decision: decision });
      pushTimeline(req, "STATUS_WECHSEL", "vendor", { to: req.status });
      return {};
    });

    pushToast(decision === "accepted" ? "Angebot angenommen." : "Angebot abgelehnt.", "success");
    renderRoute();
  }

  function adminOfferNetwork(requestId) {
    var result = withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return { ok: false, message: "Anfrage nicht gefunden." };
      }
      if (!db.settings.networkAndBidsEnabled) {
        return { ok: false, message: "Netzwerk/Gebote in Settings deaktiviert." };
      }
      if (!req.consent.networkOptIn) {
        return { ok: false, message: "Vendor hat kein Netzwerk-Opt-In gegeben." };
      }

      req.status = "IM_NETZWERK_ANGEBOTEN";
      req.updatedAt = nowISO();
      pushTimeline(req, "STATUS_WECHSEL", "admin", { to: "IM_NETZWERK_ANGEBOTEN" });
      pushTimeline(req, "NETZWERK_ANGEBOT_AKTIV", "admin", {});
      return { ok: true };
    });

    if (!result.ok) {
      pushToast(result.message, "error");
      return;
    }

    pushToast("Anfrage im Netzwerk angeboten.", "success");
    renderRoute();
  }

  function adminNoBids(requestId) {
    withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return {};
      }
      req.status = "KEINE_GEBOTE";
      req.updatedAt = nowISO();
      pushTimeline(req, "STATUS_WECHSEL", "admin", { to: "KEINE_GEBOTE" });
      pushTimeline(req, "KEINE_GEBOTE", "admin", {});
      return {};
    });

    pushToast("Keine Gebote markiert.", "success");
    renderRoute();
  }

  function openMailLink(mailId) {
    var db = getDB();
    var mail = db.emailsOutbox.find(function (item) {
      return item.id === mailId;
    });
    if (!mail || !mail.actionLinkHash) {
      pushToast("Kein Aktionslink vorhanden.", "error");
      return;
    }
    navigate(mail.actionLinkHash);
  }

  function syncNow(requestId) {
    var result = withDB(function (db) {
      var req = db.requests.find(function (item) {
        return item.id === requestId;
      });
      if (!req) {
        return { ok: false, message: "Anfrage fuer Sync nicht gefunden." };
      }

      var remoteId = "bx_" + Date.now().toString(36);
      req.remote = req.remote || {};
      req.remote.bitrixRemoteId = remoteId;
      req.remote.lastSyncAt = nowISO();

      pushTimeline(req, "BITRIX_SYNC_STUB", "system", {
        remoteId: remoteId,
        entityType: (db.settings.bitrix && db.settings.bitrix.entityType) || "Lead",
        enabled: !!(db.settings.bitrix && db.settings.bitrix.enabled)
      });
      req.updatedAt = nowISO();
      return { ok: true, remoteId: remoteId };
    });

    if (!result.ok) {
      pushToast(result.message, "error");
      return;
    }

    pushToast("Bitrix Sync (Stub) ausgefuehrt: " + result.remoteId, "success");
    renderRoute();
  }

  function simulateReminders(hoursList, force, silent) {
    var result = withDB(function (db) {
      var now = Date.now();
      var sent = 0;

      db.requests.forEach(function (req) {
        var isTerminal = req.status === "ANGEBOT_ANGENOMMEN" || req.status === "ANGEBOT_ABGELEHNT";
        if (isTerminal) {
          return;
        }

        hoursList.forEach(function (hours) {
          var minAge = hours * 60 * 60 * 1000;
          var updatedAtTs = new Date(req.updatedAt || req.createdAt).getTime();
          if (!force && now - updatedAtTs < minAge) {
            return;
          }

          var marker = "REMINDER_SIM_" + hours + "H";
          var already = (req.timeline || []).some(function (entry) {
            return entry.type === marker;
          });
          if (already) {
            return;
          }

          var token = createMagicToken(db, req.ownerUserId, req.id, 7);
          createEmail(db, {
            to: req.contact.email,
            subject: "Erinnerung: Bitte Angaben zu Ihrer Ankauf-Anfrage ergaenzen",
            html: buildEmailHtml({
              title: "Erinnerung zur Datenerganzung",
              intro: "Je mehr Daten vorliegen, desto praeziser koennen wir Ankaufpreis und Abwicklung einschaetzen.",
              ctaLabel: "Jetzt fortsetzen",
              actionLinkHash: "#/continue?token=" + encodeURIComponent(token.token),
              small: "Reminder-Simulation " + hours + "h"
            }),
            relatedRequestId: req.id,
            actionLinkHash: "#/continue?token=" + encodeURIComponent(token.token)
          });

          pushTimeline(req, marker, "system", { hours: hours });
          req.updatedAt = nowISO();
          sent += 1;
        });
      });

      return { sent: sent };
    });

    localStorage.setItem(REMINDER_KEY, nowISO());
    if (!silent) {
      if (result.sent) {
        pushToast(result.sent + " Reminder simuliert.", "success");
      } else {
        pushToast("Keine faelligen Reminder gefunden.", "info");
      }
      renderRoute();
    }
  }

  function autoReminderCheckOnStart() {
    var lastRun = localStorage.getItem(REMINDER_KEY);
    var shouldRun = true;
    if (lastRun) {
      var diff = Date.now() - new Date(lastRun).getTime();
      shouldRun = diff > (60 * 60 * 1000);
    }
    if (!shouldRun) {
      return;
    }
    simulateReminders([24, 72, 168], false, true);
  }

  function createMagicToken(db, userId, requestId, days) {
    var token = {
      token: uid("tok"),
      userId: userId,
      requestId: requestId,
      expiresAt: new Date(Date.now() + (days || 7) * DAY_MS).toISOString(),
      usedAt: null
    };
    db.tokens.push(token);
    return token;
  }

  function createEmail(db, payload) {
    var email = {
      id: uid("mail"),
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      createdAt: nowISO(),
      relatedRequestId: payload.relatedRequestId || "",
      actionLinkHash: payload.actionLinkHash || ""
    };
    db.emailsOutbox.push(email);

    if (payload.relatedRequestId) {
      var req = db.requests.find(function (item) {
        return item.id === payload.relatedRequestId;
      });
      if (req) {
        pushTimeline(req, "EMAIL_GESENDET", "system", {
          subject: payload.subject,
          to: payload.to,
          outboxId: email.id
        });
      }
    }

    return email;
  }

  function buildEmailHtml(opts) {
    return ""
      + '<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#111827;line-height:1.5;">'
      + '<h2 style="margin:0 0 8px;color:#7f1d1d;">' + escapeHtml(opts.title || "Liquidato") + '</h2>'
      + '<p style="margin:0 0 12px;">' + escapeHtml(opts.intro || "") + '</p>'
      + '<p style="margin:0 0 12px;"><a href="' + escapeAttr(opts.actionLinkHash || "#/public") + '" style="display:inline-block;background:#8f1f1f;color:#fff;text-decoration:none;padding:9px 12px;border-radius:8px;font-weight:700;">' + escapeHtml(opts.ctaLabel || "Portal oeffnen") + '</a></p>'
      + '<p style="margin:0;color:#6b7280;font-size:12px;">' + escapeHtml(opts.small || "") + '</p>'
      + "</div>";
  }

  function createRequestObject(input) {
    var now = nowISO();
    return {
      id: uid("req"),
      ownerUserId: input.userId,
      createdAt: now,
      updatedAt: now,
      status: "EINGEGANGEN",
      consent: {
        privacyAcceptedAt: now,
        networkOptIn: false,
        allowOnlineListing: false
      },
      utm: {
        source: "offline",
        medium: "direct",
        campaign: "prototype"
      },
      contact: {
        email: input.email || "",
        phone: input.phone || "",
        name: input.name || "",
        company: input.company || "",
        shortDesc: input.shortDesc || ""
      },
      postProfile: {
        postenart: "",
        qualitaet: "",
        kategorien: [],
        mixedSubgrades: [],
        beschreibung: "",
        firstHand: "",
        restrictions: ""
      },
      logistics: {
        plz: "",
        ort: "",
        land: "Deutschland",
        palletStatus: "",
        palletCount: "",
        pieceCount: "",
        volumeM3: "",
        readyFrom: "",
        deadlineType: "",
        deadlineDate: "",
        uploads: [],
        links: []
      },
      price: {
        estValue: "",
        wishPrice: "",
        minAcceptable: "",
        priceBasis: "",
        vatMode: ""
      },
      risk: {
        score: 0,
        level: "low",
        factors: [],
        recommendations: []
      },
      offers: [],
      bids: [],
      timeline: []
    };
  }

  function pushTimeline(req, type, actor, payload) {
    req.timeline = req.timeline || [];
    req.timeline.push({
      id: uid("tl"),
      type: type,
      actor: actor,
      at: nowISO(),
      payload: payload || {}
    });
  }

  function applyRisk(req) {
    req.risk = computeRisk(req);
  }

  function computeRisk(req) {
    var score = 0;
    var factors = [];
    var recommendations = [];

    if (!String(req.logistics.palletCount || "").trim()) {
      score += 15;
      factors.push("Keine Palettenanzahl angegeben.");
      recommendations.push("Palettenanzahl ergaenzen.");
    }

    var mediaCount = (req.logistics.uploads || []).length + (req.logistics.links || []).length;
    if (mediaCount === 0) {
      score += 20;
      factors.push("Keine Fotos oder Uploads vorhanden.");
      recommendations.push("Fotos oder Dokumente hochladen.");
    }

    var quality = String(req.postProfile.qualitaet || "").toLowerCase();
    if (quality === "gemischt" || quality === "ungeprueft") {
      score += 16;
      factors.push("Qualitaet gemischt/ungeprueft.");
      if (quality === "gemischt" && !(req.postProfile.mixedSubgrades || []).length) {
        score += 5;
        recommendations.push("Qualitaetsstufen im Gemisch angeben (A/B/C/D).");
      } else {
        recommendations.push("Qualitaet genauer aufschluesseln.");
      }
    }

    if ((req.postProfile.kategorien || []).indexOf("Mischwaren") >= 0) {
      score += 10;
      factors.push("Kategorie Mischwaren erhoeht Preisunsicherheit.");
      recommendations.push("Kategorien genauer trennen.");
    }

    if (!String(req.postProfile.firstHand || "").trim() || req.postProfile.firstHand === "Unklar") {
      score += 8;
      factors.push("Herkunft/Ownership unklar.");
      recommendations.push("Herkunft dokumentieren (erste Hand, Kaufnachweise). ");
    }

    var restriction = String(req.postProfile.restrictions || "");
    if (restriction && restriction !== "Keine") {
      score += 12;
      factors.push("Starke Verkaufsrestriktionen vorhanden.");
      recommendations.push("Restriktionen spezifizieren oder lockern.");
    }

    if (!String(req.logistics.deadlineType || "").trim()) {
      score += 7;
      factors.push("Keine Deadline angegeben.");
      recommendations.push("Deadline angeben.");
    }

    if (!String(req.logistics.volumeM3 || "").trim()) {
      score += 6;
      recommendations.push("Volumen in m3 ergaenzen.");
    }

    score = clamp(score, 0, 100);

    var level = "low";
    if (score >= 67) {
      level = "high";
    } else if (score >= 34) {
      level = "medium";
    }

    recommendations = dedupe(recommendations).slice(0, 6);

    return {
      score: score,
      level: level,
      factors: factors,
      recommendations: recommendations
    };
  }

  function computeCompletion(req) {
    var fields = [
      req.contact.email,
      req.contact.phone,
      req.contact.shortDesc,
      req.postProfile.postenart,
      req.postProfile.qualitaet,
      (req.postProfile.kategorien || []).length ? "ok" : "",
      req.postProfile.beschreibung,
      req.logistics.palletStatus,
      req.logistics.palletCount,
      req.logistics.pieceCount,
      req.logistics.volumeM3,
      req.logistics.deadlineType,
      (req.logistics.uploads || []).length || (req.logistics.links || []).length ? "ok" : "",
      req.price.estValue,
      req.price.wishPrice,
      req.price.minAcceptable,
      req.consent.networkOptIn ? "ok" : "",
      req.consent.allowOnlineListing ? "ok" : ""
    ];

    var filled = fields.filter(function (item) {
      return String(item || "").trim() !== "";
    }).length;

    return Math.round((filled / fields.length) * 100);
  }

  function buildAdminKpi(requests) {
    var offersOpen = 0;
    var highRisk = 0;

    requests.forEach(function (req) {
      var lastOffer = req.offers && req.offers.length ? req.offers[req.offers.length - 1] : null;
      if (lastOffer && !lastOffer.decision) {
        offersOpen += 1;
      }
      var risk = req.risk || computeRisk(req);
      if (risk.level === "high") {
        highRisk += 1;
      }
    });

    return {
      total: requests.length,
      offersOpen: offersOpen,
      highRisk: highRisk
    };
  }

  function requireVendor(user) {
    if (!user || user.role !== "vendor") {
      navigate("#/portal/login", true);
      return false;
    }
    return true;
  }

  function requireAdmin(user) {
    if (!user || user.role !== "admin") {
      navigate("#/admin", true);
      return false;
    }
    return true;
  }

  function getCurrentUser(db) {
    if (!db.sessions || !db.sessions.currentUserId) {
      return null;
    }
    return db.users.find(function (u) {
      return u.id === db.sessions.currentUserId;
    }) || null;
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
  }

  function clearFormErrors(form) {
    Array.prototype.slice.call(form.querySelectorAll(".field-error")).forEach(function (node) {
      node.classList.remove("field-error");
    });
  }

  function markFieldError(form, fieldId) {
    var node = document.getElementById(fieldId);
    if (node) {
      node.classList.add("field-error");
    }
  }

  function parseMappingText(text) {
    var obj = {};
    String(text || "").split(/\r?\n/).forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      var idx = trimmed.indexOf("=");
      if (idx < 0) {
        return;
      }
      var key = trimmed.slice(0, idx).trim();
      var val = trimmed.slice(idx + 1).trim();
      if (key) {
        obj[key] = val;
      }
    });
    return obj;
  }

  function mappingToText(map) {
    return Object.keys(map || {}).map(function (key) {
      return key + "=" + map[key];
    }).join("\n");
  }

  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  function dedupe(arr) {
    var out = [];
    var seen = {};
    arr.forEach(function (item) {
      if (!seen[item]) {
        seen[item] = true;
        out.push(item);
      }
    });
    return out;
  }

  function formatDate(isoString) {
    if (!isoString) {
      return "-";
    }
    var date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatBytes(bytes) {
    var size = Number(bytes || 0);
    if (size < 1024) {
      return size + " B";
    }
    if (size < 1024 * 1024) {
      return (size / 1024).toFixed(1) + " KB";
    }
    return (size / (1024 * 1024)).toFixed(1) + " MB";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function pushToast(message, type, ttl) {
    var toast = {
      id: uid("toast"),
      message: message,
      type: type || "info"
    };
    uiState.toasts.push(toast);
    renderToasts();

    window.setTimeout(function () {
      uiState.toasts = uiState.toasts.filter(function (item) {
        return item.id !== toast.id;
      });
      renderToasts();
    }, typeof ttl === "number" ? ttl : 2600);
  }

  function renderToasts() {
    var root = document.getElementById("toast-root");
    if (!root) {
      return;
    }
    root.innerHTML = uiState.toasts.map(function (toast) {
      return '<div class="toast ' + escapeAttr(toast.type) + '">' + escapeHtml(toast.message) + "</div>";
    }).join("");
  }

  init();
})();
