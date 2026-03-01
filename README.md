# Liquidato – Offline SPA

B2B Direktankauf Restposten/Retouren/Insolvenzwaren
Kein Build | Kein npm | Keine externen Libs | file:// kompatibel

## Start

```
Doppelklick auf index.html
```

Oder bei CORS-Problemen:

```bash
python3 -m http.server
# öffne http://localhost:8000
```

## Demo-Zugänge

| Rolle  | E-Mail                   | Passwort |
|--------|--------------------------|----------|
| Admin  | admin@liquidato.local    | admin    |
| Vendor | demo@anbieter.local      | demo123  |

## Routen (Hash-basiert)

| Hash                              | Beschreibung                   |
|-----------------------------------|--------------------------------|
| `#/public`                        | Öffentliches Anfrageformular   |
| `#/continue?token=...`            | Magic-Link / Wizard-Einstieg   |
| `#/portal/login`                  | Vendor Login                   |
| `#/portal`                        | Vendor Dashboard               |
| `#/portal/request/:id`            | Anfrage-Detail                 |
| `#/portal/request/:id/wizard`     | Wizard (5 Schritte)            |
| `#/admin`                         | Admin-Übersicht                |
| `#/admin/request/:id`             | Admin Anfrage-Detail           |
| `#/admin/settings`                | Einstellungen                  |
| `#/admin/emails`                  | E-Mail Postausgang             |

## Flow 1: Public → Magic → Wizard → Portal

1. `#/public` → E-Mail, Telefon, Beschreibung, Datenschutz → „Anfrage einreichen"
2. Erfolgsseite → Magic-Link öffnen oder direkt weiterleiten
3. Wizard Schritt 1–5 ausfüllen (Validierung pro Schritt)
4. Schritt 5: Passwort setzen + bestätigen → Absenden
5. Redirect zu `#/portal/request/:id`

## Flow 2: Admin Backoffice

1. `#/admin` → Login: admin@liquidato.local / admin
2. Anfrage öffnen → Status-Übergang wählen (z.B. IN_ANALYSE)
3. Rückfrage senden → Status wird RUECKFRAGEN
4. Angebot erstellen → Status wird ANGEBOT_GESENDET + E-Mail in Outbox
5. (Optional) Im Netzwerk anbieten → Gebote erfassen → Preisanpassung anfragen
6. Vendor: Angebot annehmen / ablehnen

## Statusflow

```
EINGEGANGEN → IN_ANALYSE → RUECKFRAGEN → BEWERTUNG → ANGEBOT_GESENDET
                                                       ↓              ↓
                                             ANGEBOT_ANGENOMMEN  ANGEBOT_ABGELEHNT

Netzwerk-Optionalzweig:
BEWERTUNG → IM_NETZWERK_ANGEBOTEN → GEBOTE_VORHANDEN → PREISREDUZIERUNG_ANGEFRAGT → ANGEBOT_ANGEPASST
                                  → KEINE_GEBOTE
```

## Implementierte Features

### P0 (Pflicht)
- **Wizard-Validierung** pro Schritt: Rot-Markierung + Fehlertexte, Live-Bereinigung
- **Stepper (Option C)**: Horizontal, abgeschlossene Schritte klickbar, Labels umbrechen sauber
- **Upload-Regeln**: Dateityp-Whitelist, 50 MB/Datei, 100 MB gesamt, Fehlertext + rotes Feld

### P1 (Erweiterung)
- **Gemischt-Unterstufen**: Bei Qualität „Gemischt" erscheinen Checkboxen A/B/C/D mit Validierung
- **Step 5 Vollzusammenfassung**: Alle Eingaben, Upload-Vorschau (Bild 1/n, Datei 1/n), Pflichtcheckbox mit Microcopy

### Weitere Features
- Hash-Router, localStorage-Persistenz (LIQ_DB_V1)
- Seed: Admin + Demo-Vendor + Demo-Anfrage (IN_ANALYSE)
- Regelbasierte Risikoanalyse (Score 0–100, Faktoren, Empfehlungen)
- E-Mail Outbox (simuliert): Magic Links, Angebote, Rückfragen, Erinnerungen
- Consent-Toggles: B2B-Netzwerk, Online-Listing
- Admin: Status-Transitions, Rückfragen, Angebote, Gebote, Netzwerk, Preisanpassung
- Reminder-Simulation (24h/72h/7d)
- Bitrix24-Stub (UI + Datenmodell, keine echten Calls)
- Passwort-Hashing (SHA-256 Simulation via WebCrypto-Stub)

## Dateien

| Datei      | Beschreibung                                      |
|------------|---------------------------------------------------|
| index.html | Minimaler HTML-Shell, lädt styles.css + app.js    |
| styles.css | Design-System (CSS Custom Properties, responsive) |
| app.js     | Komplette App-Logik (kein Framework, kein Build)  |
| README.md  | Diese Datei                                       |
| assets/    | Logo SVG, Platzhalter-Bilder                      |
