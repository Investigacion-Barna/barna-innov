/**
 * Diagnóstico de Cultura de Innovación — Webhook
 * Recibe POST JSON desde la página web y escribe una fila por respuesta
 * en una hoja "Respuestas web" del Spreadsheet enlazado.
 *
 * Cómo publicar:
 * 1. Abre la Google Sheet donde quieras guardar las respuestas.
 * 2. Extensiones → Apps Script.
 * 3. Pega este archivo (renómbralo a Code.gs si quieres).
 * 4. Implementar → Nueva implementación → Tipo: Aplicación web.
 *    - Ejecutar como: tú.
 *    - Quién tiene acceso: Cualquiera.
 *    - Implementar y copiar la URL.
 * 5. Pega la URL en js/app.js como WEBHOOK_URL.
 */

// Debe coincidir EXACTAMENTE con SHARED_TOKEN en js/app.js.
// No es un secreto fuerte (cualquiera puede leerlo en el código del navegador),
// pero filtra POSTs automatizados / pruebas de fuerza bruta que no lo incluyan.
var SHARED_TOKEN = 'barna-innova-2026-XnT4q7vBz9';

// Validación rápida de forma del payload. Rechaza cuerpos malformados.
function isValidPayload(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.demog || typeof data.demog !== 'object') return false;
  if (!data.likert || typeof data.likert !== 'object') return false;
  if (!data.scores || typeof data.scores !== 'object') return false;
  if (!data.perfil || !data.perfil.nombre) return false;
  // Debe haber al menos 40 ítems Likert; el form completo manda 50.
  if (Object.keys(data.likert).length < 40) return false;
  return true;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 1) Honeypot: si el campo oculto viene con cualquier valor, es bot.
    if (data.hp) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true })) // fingir éxito al bot
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2) Token compartido.
    if (data.token !== SHARED_TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3) Forma del payload.
    if (!isValidPayload(data)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'bad payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Respuestas web');
    if (!sheet) {
      sheet = ss.insertSheet('Respuestas web');
    }

    // Construir cabecera y fila dinámicamente la primera vez.
    const likertCodes = Object.keys(data.likert || {}).sort(function (a, b) {
      // Orden D1.1, D1.2, ..., D8.6
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      // Eliminar la "D" del primer segmento
      return (a.localeCompare(b, 'es', { numeric: true }));
    });
    const dimCodes = Object.keys(data.scores || {}).sort();
    const openIds = Object.keys(data.opens || {}).sort();
    const demogIds = Object.keys(data.demog || {});

    if (sheet.getLastRow() === 0) {
      const headers = ['Timestamp']
        .concat(demogIds.map(function (k) { return 'demog.' + k; }))
        .concat(likertCodes)
        .concat(openIds.map(function (k) { return 'open.' + k; }))
        .concat(dimCodes.map(function (k) { return 'prom.' + k; }))
        .concat(dimCodes.map(function (k) { return 'nivel.' + k; }))
        .concat(['perfil.id', 'perfil.nombre']);
      sheet.appendRow(headers);
    }

    const row = [data.timestamp || new Date().toISOString()]
      .concat(demogIds.map(function (k) { return data.demog[k] || ''; }))
      .concat(likertCodes.map(function (k) { return data.likert[k]; }))
      .concat(openIds.map(function (k) { return data.opens[k] || ''; }))
      .concat(dimCodes.map(function (k) { return data.scores[k]; }))
      .concat(dimCodes.map(function (k) { return data.niveles[k]; }))
      .concat([data.perfil && data.perfil.id, data.perfil && data.perfil.nombre]);

    sheet.appendRow(row);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Endpoint GET de prueba — abrir la URL en el navegador para verificar despliegue.
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: 'Webhook activo. Usa POST con JSON.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
