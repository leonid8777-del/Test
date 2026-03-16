# Liquidato Offline-Prototyp

## Oeffnen auf Mac (Hauptweg)
1. `index.html` im Finder per Doppelklick oeffnen.
2. In Safari oder Chrome laeuft die App direkt ueber `file://`.

## Optionaler Fallback (nur falls Hash-Routing im Browser zickt)
- Im Projektordner: `python3 -m http.server`
- Dann im Browser oeffnen: `http://localhost:8000`

## Reset / Seed
- Als Admin in `#/admin/settings`:
  - `Demo-Daten laden`
  - `Alle Daten zuruecksetzen`
- Standard-DB-Key: `LIQ_DB_V1` (localStorage).

## Seed-Login
- Admin:
  - E-Mail: `admin@liquidato.local`
  - Passwort: `admin`
- Demo Vendor (optional im Seed enthalten):
  - E-Mail: `demo@anbieter.local`
  - Passwort: `demo123`

## Demo-Flows

### 1) Public Anfrage -> Continue -> Wizard -> Passwort -> Dashboard
1. `#/public` oeffnen.
2. Minimalformular absenden (E-Mail, Telefon, Kurzbeschreibung, Datenschutz).
3. `Jetzt weiter (simulierter E-Mail-Link)` klicken oder Outbox oeffnen.
4. Im Wizard Schritte 1-5 ergaenzen.
5. In Schritt 5 Passwort setzen.
6. Zu `#/portal` wechseln und Anfrage-Status verfolgen.

### 2) Admin -> Status -> Rueckfrage -> Angebot -> Netzwerk -> Gebote -> Preisanpassung
1. `#/admin` oeffnen und als Admin einloggen.
2. Anfrage in der Liste oeffnen.
3. Status setzen oder Rueckfrage senden.
4. Angebot erstellen (`ANGEBOT_GESENDET`).
5. Netzwerk anbieten (`IM_NETZWERK_ANGEBOTEN`) bei Opt-In.
6. Gebot hinzufuegen (`GEBOTE_VORHANDEN`) oder `Keine Gebote` setzen.
7. Preisanpassung anfragen (`PREISREDUZIERUNG_ANGEFRAGT`).
8. Angebot anpassen (`ANGEBOT_ANGEPASST`).

## Hinweise
- Keine externen Libraries, keine Build-Pipeline, keine CDNs.
- Alle E-Mails sind simuliert und in der Outbox sichtbar.
- Bitrix-Sync ist ein Stub: schreibt Timeline-Event + fake `remote_id`.

## Neue Mini-App: FocusFlow (To-do)
- Datei: `todo-app/index.html`
- Starten per Doppelklick oder via lokaler Server-URL:
  - `python3 -m http.server`
  - `http://localhost:8000/todo-app/`
- Features:
  - Aufgabe hinzufuegen, abhaken, loeschen
  - Filter: Alle / Offen / Erledigt
  - Persistenz per `localStorage`
