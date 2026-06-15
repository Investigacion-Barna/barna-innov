#!/usr/bin/env node
/**
 * Genera un HTML personalizado por cada respondente del Google Form
 * y luego lo convierte a PDF usando Chrome headless.
 *
 * Uso:
 *   node scripts/generate-reports.js
 *
 * Salida (gitignored):
 *   reportes/
 *     01-<email-slug>.html
 *     01-<email-slug>.pdf
 *     ...
 *
 * Requiere:
 *   - El .xlsx con respuestas en la raíz del proyecto.
 *   - google-chrome o chromium en el PATH.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

global.window = {};
const PROJECT_ROOT = path.resolve(__dirname, '..');
require(path.join(PROJECT_ROOT, 'js/profiles.js'));
require(path.join(PROJECT_ROOT, 'js/questions.js'));
const P = global.window.PROFILES;
const Q = global.window.QUESTIONS;

const DIMS = ['D1','D2','D3','D4','D5','D6','D7','D8'];

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

function slugify(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// Fase 1 · Parsear el xlsx
// ============================================================
function findXlsx() {
  const files = fs.readdirSync(PROJECT_ROOT).filter((f) => f.endsWith('.xlsx'));
  if (!files.length) throw new Error('No se encontró ningún .xlsx en el proyecto.');
  return path.join(PROJECT_ROOT, files[0]);
}

function extractRespondents() {
  const xlsxPath = findXlsx();
  const extractDir = '/tmp/xlsx_reportes';
  execSync(`rm -rf "${extractDir}" && unzip -o "${xlsxPath}" -d "${extractDir}" > /dev/null`);

  const pyScript = `
import re, json, xml.etree.ElementTree as ET
ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
ss = ET.parse('${extractDir}/xl/sharedStrings.xml').getroot()
strings = []
for si in ss.findall(ns + 'si'):
    t = si.find(ns + 't')
    if t is not None: strings.append(t.text or '')
    else: strings.append(''.join((r.find(ns + 't').text or '') for r in si.findall(ns + 'r')))
ws = ET.parse('${extractDir}/xl/worksheets/sheet1.xml').getroot()
def get_row(rownum):
    out = {}
    for row in ws.iter(ns + 'row'):
        if int(row.get('r')) != rownum: continue
        for c in row.findall(ns + 'c'):
            ref = c.get('r'); col = re.match(r'[A-Z]+', ref).group()
            ct = c.get('t'); v = c.find(ns + 'v')
            if v is None: continue
            out[col] = strings[int(v.text)] if ct == 's' else v.text
    return out
codes = get_row(1)
respondents = []
for row in ws.iter(ns + 'row'):
    r = int(row.get('r'))
    if r < 3: continue
    cells = {}
    for c in row.findall(ns + 'c'):
        ref = c.get('r'); col = re.match(r'[A-Z]+', ref).group()
        ct = c.get('t'); v = c.find(ns + 'v')
        if v is None: continue
        cells[col] = strings[int(v.text)] if ct == 's' else v.text
    if not cells.get('B') and not cells.get('J'):
        continue
    likert = {}
    for col, code in codes.items():
        if re.match(r'^D\\d\\.\\d$', code or ''):
            val = cells.get(col)
            if val:
                try: likert[code] = float(val)
                except: pass
    respondents.append({
        'row': r,
        'timestamp': cells.get('A', ''),
        'email': cells.get('B', ''),
        'tamano': cells.get('C', ''),
        'sector': cells.get('D', ''),
        'anios': cells.get('E', ''),
        'propiedad': cells.get('F', ''),
        'escolaridad': cells.get('G', ''),
        'financiamiento': cells.get('H', ''),
        'posicion': cells.get('I', ''),
        'likert': likert,
    })
print(json.dumps(respondents, ensure_ascii=False))
`;
  const pyPath = '/tmp/extract_respondents.py';
  fs.writeFileSync(pyPath, pyScript);
  const out = execSync(`python3 ${pyPath}`, { encoding: 'utf-8' });
  return JSON.parse(out);
}

// ============================================================
// Fase 2 · Calcular resultado y armar HTML
// ============================================================
function computeResult(respondent) {
  // Promedios por dimensión
  const sums = {}, counts = {};
  Q.likert.forEach((it) => {
    const v = respondent.likert[it.code];
    if (typeof v === 'number') {
      sums[it.dim] = (sums[it.dim] || 0) + v;
      counts[it.dim] = (counts[it.dim] || 0) + 1;
    }
  });
  const scores = {};
  DIMS.forEach((d) => {
    scores[d] = counts[d] ? sums[d] / counts[d] : 0;
  });
  return P.evaluar(scores);
}

function buildMixedDisplay(cercanos) {
  const a = cercanos[0].profile;
  const b = cercanos[1].profile;
  const pctA = Math.round((cercanos[0].cumplidos / cercanos[0].total) * 100);
  const pctB = Math.round((cercanos[1].cumplidos / cercanos[1].total) * 100);
  return {
    nombre: `${a.nombre} + ${b.nombre}`,
    condicion: `Rasgos de ${a.nombre} (${pctA}%) · Rasgos de ${b.nombre} (${pctB}%)`,
    descripcion:
      `Tu organización combina elementos de dos perfiles culturales. ` +
      `Predomina "${a.nombre}": ${a.descripcion} ` +
      `Y al mismo tiempo aparecen rasgos de "${b.nombre}": ${b.descripcion}`,
    riesgo:
      `Como tu cultura mezcla dos perfiles, las implicaciones para tu transformación digital dependen de cuál predomine en cada decisión. ` +
      `Desde "${a.nombre}" — ${a.riesgo} ` +
      `Desde "${b.nombre}" — ${b.riesgo}`,
  };
}

function renderDimGrid(scores, niveles) {
  return DIMS.map((d) => {
    const meta = Q.dimensions[d];
    const nivel = niveles[d];
    const feedback = (meta.feedback && meta.feedback[nivel]) || '';
    return `<article class="dim-card dim-card-${nivel}">
      <header class="dim-card-head">
        <div>
          <span class="dim-card-code">${d}</span>
          <h4 class="dim-card-title">${escapeHtml(meta.title)}</h4>
        </div>
        <div class="dim-card-score">
          <span class="dim-card-num">${scores[d].toFixed(2)}<span class="dim-card-out">/5</span></span>
          <span class="dim-card-nivel nivel-${nivel}">${nivel}</span>
        </div>
      </header>
      <p class="dim-card-feedback">${escapeHtml(feedback)}</p>
    </article>`;
  }).join('\n');
}

function renderHtml(order, respondent) {
  const result = computeResult(respondent);
  const { scores, niveles } = result;
  const display = (result.cercanos && result.cercanos.length >= 2) ? buildMixedDisplay(result.cercanos) : result.perfil;
  const isMixto = result.perfil.id === 'mixto_transicion';

  const labels = DIMS.map((d) => `${d} — ${Q.dimensions[d].title}`);
  const data = DIMS.map((d) => +scores[d].toFixed(2));
  const dimGrid = renderDimGrid(scores, niveles);

  // Datos demográficos para mostrar al inicio
  const demogRows = [
    ['Email', respondent.email],
    ['Tamaño', respondent.tamano],
    ['Sector', respondent.sector],
    ['Años de operación', respondent.anios],
    ['Estructura de propiedad', respondent.propiedad],
    ['Escolaridad directiva', respondent.escolaridad],
    ['Financiamiento público para innovación', respondent.financiamiento],
    ['Posición del respondente', respondent.posicion],
  ].filter(([, v]) => v).map(([k, v]) =>
    `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`
  ).join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte personalizado — ${escapeHtml(respondent.email)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../styles.css">
<style>
@page { size: A4; margin: 14mm 14mm; }
body { background: #fff; }
.report-meta {
  background: var(--panel);
  padding: 14px 18px;
  border-radius: var(--radius);
  margin-bottom: 22px;
}
.report-meta table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.report-meta th {
  text-align: left;
  font-weight: 600;
  color: var(--muted);
  padding: 4px 12px 4px 0;
  white-space: nowrap;
  vertical-align: top;
  text-transform: uppercase;
  letter-spacing: .6px;
  font-size: 10.5px;
}
.report-meta td {
  padding: 4px 0;
  color: var(--ink);
}
.report-badge {
  display: inline-block; background: var(--blue); color: var(--navy);
  padding: 4px 12px; border-radius: 999px; font-size: 10.5px;
  font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
  margin-bottom: 12px;
}
.dim-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
.dim-card { padding: 12px 14px !important; page-break-inside: avoid; }
.dim-card-title { font-size: 14px !important; }
.dim-card-feedback { font-size: 12px !important; line-height: 1.5 !important; }
.dim-card-num { font-size: 18px !important; }
.profile-card { page-break-inside: avoid; }
.result-grid { grid-template-columns: 1fr 1fr !important; }
.radar-wrap canvas { max-height: 320px; }
</style>
</head>
<body>

<header class="topbar">
  <div class="container topbar-inner">
    <div class="brand">
      <span class="brand-mark">BARNA</span>
      <span class="brand-sep" aria-hidden="true">·</span>
      <span class="brand-tagline">Management School</span>
    </div>
    <div class="brand-context">Reporte personalizado · Investigación INNOVA</div>
  </div>
</header>

<section class="hero">
  <div class="container">
    <span class="report-badge">Reporte #${String(order).padStart(2, '0')}</span>
    <h1>${escapeHtml(display.nombre)}</h1>
    <p class="hero-lead">${isMixto ? 'Cultura mixta entre dos perfiles puros' : 'Perfil cultural puro identificado'}</p>
  </div>
</section>

<main class="container">
  <section class="step-panel">

    <div class="report-meta">
      <table>${demogRows}</table>
    </div>

    <div class="result-grid">
      <div class="radar-wrap">
        <canvas id="radar"></canvas>
      </div>
      <div class="profile-card">
        <div class="profile-tag">Perfil identificado</div>
        <h3>${escapeHtml(display.nombre)}</h3>
        <p class="profile-condition">${escapeHtml(display.condicion)}</p>
        <p>${escapeHtml(display.descripcion)}</p>
        <div class="risk-box">
          <strong>Implicaciones para tu transformación</strong>
          <p>${escapeHtml(display.riesgo)}</p>
        </div>
      </div>
    </div>

    <h3 class="section-title">Detalle por dimensión</h3>
    <p class="section-lead">Promedio, nivel y lectura corta de cada una de las 8 dimensiones culturales.</p>
    <div class="dim-grid">${dimGrid}</div>

  </section>
</main>

<footer class="footer">
  <div class="container">
    <small>Diagnóstico de Cultura de Innovación · 8 dimensiones · 50 ítems Likert · © BARNA Management School.</small>
  </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
new Chart(document.getElementById('radar').getContext('2d'), {
  type: 'radar',
  data: {
    labels: ${JSON.stringify(labels)},
    datasets: [{
      label: 'Tu organización',
      data: ${JSON.stringify(data)},
      backgroundColor: 'rgba(108, 153, 208, 0.22)',
      borderColor: 'rgba(0, 48, 87, 1)',
      pointBackgroundColor: 'rgba(108, 153, 208, 1)',
      pointBorderColor: 'rgba(0, 48, 87, 1)',
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
    }],
  },
  options: {
    responsive: true,
    animation: false,
    scales: { r: { suggestedMin: 1, suggestedMax: 5, ticks: { stepSize: 1, backdropColor: 'transparent' }, pointLabels: { font: { size: 10 } } } },
    plugins: { legend: { display: false } },
  },
});
// Señal a Chrome headless que ya está listo
setTimeout(() => { document.body.dataset.ready = '1'; }, 800);
</script>
</body>
</html>`;
}

// ============================================================
// Fase 3 · Generar HTML + PDF por respondente
// ============================================================
const OUT_DIR = path.join(PROJECT_ROOT, 'reportes');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const respondents = extractRespondents();
console.log(`Encontrados ${respondents.length} respondentes.`);

let chromeBin = '';
for (const candidate of ['google-chrome', 'chromium', 'chromium-browser']) {
  try { execSync(`which ${candidate}`, { stdio: 'pipe' }); chromeBin = candidate; break; }
  catch (_) {}
}
if (!chromeBin) {
  console.warn('⚠ Chrome/Chromium no encontrado. Generaré sólo HTML; abrir manualmente y usar Print to PDF.');
}

respondents.forEach((resp, idx) => {
  const order = idx + 1;
  const slug = slugify(resp.email.split('@')[0] || `respondente-${order}`);
  const baseName = `${String(order).padStart(2, '0')}-${slug}`;
  const htmlPath = path.join(OUT_DIR, `${baseName}.html`);
  const pdfPath = path.join(OUT_DIR, `${baseName}.pdf`);

  fs.writeFileSync(htmlPath, renderHtml(order, resp));
  console.log(`  HTML  → ${path.relative(PROJECT_ROOT, htmlPath)}`);

  if (chromeBin) {
    try {
      // Chrome headless con waitUntil para que Chart.js termine de renderizar
      const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--print-to-pdf="${pdfPath}"`,
        '--print-to-pdf-no-header',
        '--virtual-time-budget=4000',
        `--no-pdf-header-footer`,
        `"file://${htmlPath}"`,
      ];
      execSync(`${chromeBin} ${args.join(' ')} 2>/dev/null`, { stdio: 'pipe' });
      console.log(`  PDF   → ${path.relative(PROJECT_ROOT, pdfPath)}`);
    } catch (e) {
      console.error(`  ✗ Error generando PDF para ${resp.email}: ${e.message}`);
    }
  }
});

console.log(`\n✓ Listos ${respondents.length} reportes en reportes/`);
