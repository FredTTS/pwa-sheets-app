# CORS-fix i Google Apps Script

"Fel: Failed to fetch" när du sparar från GitHub beror på att **webbläsaren blockerar anropet** (CORS). Google Apps Script svarar inte med rätt huvuden för anrop från andra webbplatser (t.ex. GitHub Pages).

**Lösning:** Uppdatera ditt Google Apps Script så att det svarar med CORS-huvud och hanterar OPTIONS (preflight).

---

## 1. Lägg till dessa huvuden i scriptet

Överst i scriptet (eller i en gemensam funktion), definiera:

```javascript
var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
```

---

## 2. Lägg till funktionen doOptions()

Webbläsaren skickar en OPTIONS-förfrågan innan POST. Scriptet måste svara på den:

```javascript
function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(CORS_HEADERS);
}
```

---

## 3. Sätt CORS-huvud på alla svar från doGet och doPost

Varje gång du returnerar svar måste huvuden sättas.

**Exempel doPost** (efter att du skrivit till Sheet och skapar svaret):

```javascript
// Istället för att bara returnera:
// return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);

// Gör så här:
return ContentService.createTextOutput(JSON.stringify({ ok: true }))
  .setMimeType(ContentService.MimeType.JSON)
  .setHeaders(CORS_HEADERS);
```

**Exempel doGet** (för Hämta/Exportera):

```javascript
return ContentService.createTextOutput(JSON.stringify({ records: [...] }))
  .setMimeType(ContentService.MimeType.JSON)
  .setHeaders(CORS_HEADERS);
```

Sätt alltså **.setHeaders(CORS_HEADERS)** på varje `ContentService.createTextOutput(...)` du returnerar i både doGet och doPost.

---

## 4. Spara och publicera om

1. Spara projektet i Apps Script.
2. **Deploy** → **Manage deployments** → välj din befintliga deployment → **Edit** (penikonen) → **Version** → **New version** → **Deploy**.

Efter det ska anrop från GitHub fungera (ingen "Failed to fetch").

---

## Komplett exempel: hur hela scriptet kan se ut

Nedan är ett **helt exempel** som du kan anpassa. Byten ut `DITT_SPREADSHEET_ID` mot ditt arkets ID och `DIN_WRITE_KEY` mot samma nyckel som i din PWA. Strukturen på arket (namn på blad, kolumner) måste matcha hur du läser/skriver.

```javascript
// === CORS – behövs för anrop från GitHub Pages ===
var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(CORS_HEADERS);
}

// === Hjälp: returnera JSON med CORS ===
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(CORS_HEADERS);
}

// === Konfiguration – byt ut mot dina värden ===
var WRITE_KEY = 'DIN_WRITE_KEY';  // samma som i index.html APP_CONFIG.WRITE_KEY
var SPREADSHEET_ID = 'DITT_SPREADSHEET_ID';

// Rum som appen använder (samma ordning/ids som i PWA)
var ROOM_IDS = ['lila_rummet','bla_rummet','roda_rummet','grona_rummet','orangea_rummet','rosa_rummet','koket','personal_rummet'];
var ROOM_NAMES = ['Lila rummet','Blå rummet','Röda rummet','Gröna rummet','Orangea rummet','Rosa rummet','Köket','Personal rummet'];

function getSheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
}

// === POST: spara temperaturer (anropas när användaren klickar Spara) ===
function doPost(e) {
  try {
    var key = e.parameter && e.parameter.key;
    if (key !== WRITE_KEY) {
      return jsonOut({ ok: false, error: 'Ogiltig nyckel' });
    }
    if (!e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: 'Ingen data' });
    }
    var data = JSON.parse(e.postData.contents);
    var date = data.date;
    var values = data.values || {};
    if (!date) {
      return jsonOut({ ok: false, error: 'Datum saknas' });
    }

    var sheet = getSheet();
    // Antag att kolumn A = datum, B = rum-id, C = värde (eller anpassa till din layout)
    var lastRow = sheet.getLastRow();
    var headers = lastRow >= 1 ? sheet.getRange(1, 1, 1, 3).getValues()[0] : [];
    if (headers.length === 0) {
      sheet.appendRow(['Datum', 'Rum', 'Värde']);
    }

    for (var roomId in values) {
      if (values.hasOwnProperty(roomId)) {
        sheet.appendRow([date, roomId, values[roomId]]);
      }
    }
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err.message) });
  }
}

// === GET: hämta poster (för Hämta och Exportera) ===
function doGet(e) {
  try {
    var start = (e.parameter && e.parameter.start) || '';
    var end = (e.parameter && e.parameter.end) || '';
    var sheet = getSheet();
    var lastRow = Math.max(sheet.getLastRow(), 1);
    var data = sheet.getRange(1, 1, lastRow, 3).getValues();
    var records = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowDate = String(row[0] || '').trim();
      var roomId = String(row[1] || '').trim();
      var value = row[2];
      if (!rowDate) continue;
      if (start && rowDate < start) continue;
      if (end && rowDate > end) continue;
      var roomName = ROOM_NAMES[ROOM_IDS.indexOf(roomId)] || roomId;
      records.push({ date: rowDate, roomId: roomId, roomName: roomName, value: value === '' ? '' : String(value) });
    }
    return jsonOut({ records: records });
  } catch (err) {
    return jsonOut({ records: [], error: String(err.message) });
  }
}
```

### Anpassning

- **SPREADSHEET_ID**: Hitta i webbadressen till ditt Google Sheet:  
  `https://docs.google.com/spreadsheets/d/ **SPREADSHEET_ID** /edit`
- **WRITE_KEY**: Samma sträng som i `index.html` → `window.APP_CONFIG.WRITE_KEY`.
- **Blad/kolumner**: Exemplet använder första bladet och kolumnerna A=Datum, B=Rum (id), C=Värde. Om ditt ark har annan struktur (t.ex. ett blad per rum eller andra kolumnnamn) måste du ändra `getSheet()`, `doPost` (appendRow) och `doGet` (getRange och hur du bygger `records`) så att de matchar.
- Efter ändringar: **Spara** och **Deploy → Manage deployments → Edit → New version → Deploy**.
