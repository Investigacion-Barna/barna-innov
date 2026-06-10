#!/usr/bin/env node
/**
 * Genera un HTML por cada resultado posible del diagnóstico de cultura
 * (5 perfiles puros + las mezclas A+B alcanzables = hasta 25 demos). Útil
 * para presentaciones donde quieres mostrar cómo se vería el reporte sin
 * tener que rellenar 50 preguntas en vivo.
 *
 * Uso:
 *   node scripts/generate-demos.js
 *
 * Salida:
 *   demos/
 *     index.html        ← índice navegable de todos los demos
 *     01-...html        ← un demo por resultado
 */
'use strict';

const fs = require('fs');
const path = require('path');

global.window = {};
const PROJECT_ROOT = path.resolve(__dirname, '..');
require(path.join(PROJECT_ROOT, 'js/profiles.js'));
require(path.join(PROJECT_ROOT, 'js/questions.js'));
require(path.join(PROJECT_ROOT, 'js/matrix.js'));

const P = global.window.PROFILES;
const Q = global.window.QUESTIONS;
const M = global.window.MATRIX;

const DIMS = ['D1','D2','D3','D4','D5','D6','D7','D8'];
const LEVELS = ['Bajo','Medio','Alto'];

const nivelToScore = (n) => n === 'Bajo' ? 2 : n === 'Medio' ? 3 : 4;
const nivelToAvg   = (n) => n === 'Bajo' ? 2.0 : n === 'Medio' ? 3.0 : 4.0;

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[c]);
}

// ============================================================
// Fase 1 · Buscar un ejemplo por cada outcome posible
// ============================================================
const examples = {}; // outcomeKey → niveles
function recordExample(niveles) {
  const promedios = {};
  for (const d of DIMS) promedios[d] = nivelToAvg(niveles[d]);
  const r = P.evaluar(promedios);
  let key;
  if (r.perfil.id === 'mixto_transicion') {
    if (r.cercanos && r.cercanos.length >= 2) {
      key = r.cercanos[0].profile.id + '+' + r.cercanos[1].profile.id;
    } else {
      key = 'mixto_unknown';
    }
  } else {
    key = r.perfil.id;
  }
  if (!examples[key]) examples[key] = { ...niveles };
}

(function enumerate() {
  const acc = {};
  function rec(idx) {
    if (idx === DIMS.length) { recordExample(acc); return; }
    for (const l of LEVELS) { acc[DIMS[idx]] = l; rec(idx + 1); }
  }
  rec(0);
})();

console.log(`Found ${Object.keys(examples).length} reachable outcomes`);

// ============================================================
// Fase 2 · Renderizar HTML por outcome
// ============================================================
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

function renderItemAnalysis(stateLikert, scores, niveles) {
  const byDim = {};
  M.items.forEach((it) => { (byDim[it.dim] = byDim[it.dim] || []).push(it); });
  const keys = Object.keys(byDim);
  return keys.map((dim, idx) => {
    const items = byDim[dim];
    const dimAvg = scores[dim].toFixed(2);
    const dimNivel = niveles[dim];
    const dimTitle = M.dimTitles[dim] || dim;
    const counts = { low: 0, mid: 0, high: 0 };
    items.forEach((it) => {
      const s = stateLikert[it.code];
      if (typeof s === 'number') counts[M.bucket(s)]++;
    });
    const open = idx === 0 ? ' open' : '';
    const itemCards = items.map((it) => {
      const s = stateLikert[it.code];
      if (typeof s !== 'number') return '';
      const lvl = M.bucket(s);
      const interp = it[lvl];
      return `<div class="item-card item-${lvl}">
        <div class="item-head">
          <span class="item-code">${it.code}</span>
          <span class="item-signal">${escapeHtml(it.signal)}</span>
          <span class="item-score">${s}/5</span>
        </div>
        <p class="item-text">${escapeHtml(it.text)}</p>
        <p class="item-interp"><strong>Lectura:</strong> ${escapeHtml(interp)}</p>
      </div>`;
    }).join('');
    return `<details class="dim-analysis"${open}>
      <summary>
        <span class="dim-analysis-code">${dim}</span>
        <span class="dim-analysis-title">${escapeHtml(dimTitle)}</span>
        <span class="dim-analysis-meta">
          <span class="dim-analysis-score">${dimAvg}/5</span>
          <span class="nivel-${dimNivel}">${dimNivel}</span>
          <span class="dim-analysis-counts">
            <span class="cnt cnt-high">▲ ${counts.high}</span>
            <span class="cnt cnt-mid">● ${counts.mid}</span>
            <span class="cnt cnt-low">▼ ${counts.low}</span>
          </span>
        </span>
      </summary>
      <div class="dim-analysis-body">${itemCards}</div>
    </details>`;
  }).join('\n');
}

function renderDemo(order, niveles) {
  // Likert sintético
  const stateLikert = {};
  for (const it of Q.likert) stateLikert[it.code] = nivelToScore(niveles[it.dim]);

  // Scores y resultado
  const scores = {};
  for (const d of DIMS) scores[d] = nivelToAvg(niveles[d]);
  const r = P.evaluar(scores);
  const display = (r.cercanos && r.cercanos.length >= 2) ? buildMixedDisplay(r.cercanos) : r.perfil;
  const isMixto = r.perfil.id === 'mixto_transicion';

  const labels = DIMS.map((d) => `${d} — ${Q.dimensions[d].title}`);
  const data = DIMS.map((d) => +scores[d].toFixed(2));

  const scoresRows = DIMS.map((d) => `<tr>
    <td><strong>${d}</strong> — ${escapeHtml(Q.dimensions[d].title)}</td>
    <td data-label="Promedio (1–5)">${scores[d].toFixed(2)}</td>
    <td data-label="Nivel" class="nivel-${r.niveles[d]}">${r.niveles[d]}</td>
  </tr>`).join('');

  const analysis = renderItemAnalysis(stateLikert, scores, r.niveles);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo · ${escapeHtml(display.nombre)} — BARNA</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../styles.css">
<style>
.demo-badge {
  display: inline-block; background: var(--blue); color: var(--navy);
  padding: 4px 12px; border-radius: 999px; font-size: 11px;
  font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
  margin-bottom: 14px;
}
.demo-note {
  background: var(--panel); padding: 12px 16px;
  border-left: 3px solid var(--blue); border-radius: 0 4px 4px 0;
  margin-bottom: 26px; color: var(--muted); font-size: 13px;
}
.back-link {
  display: inline-block; margin-top: 22px; color: var(--navy);
  text-decoration: none; font-weight: 600; font-size: 14px;
}
.back-link:hover { text-decoration: underline; }
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
    <div class="brand-context">Demo · Investigación INNOVA</div>
  </div>
</header>

<section class="hero">
  <div class="container">
    <span class="demo-badge">Demo de resultado #${String(order).padStart(2, '0')}</span>
    <h1>${escapeHtml(display.nombre)}</h1>
    <p class="hero-lead">${isMixto ? 'Cultura mixta entre dos perfiles puros' : 'Perfil cultural puro identificado'}</p>
  </div>
</section>

<main class="container">
  <section class="step-panel" style="margin-top: 24px;">
    <p class="demo-note">Ejemplo sintético generado a partir de respuestas tipo. Muestra cómo se presentaría este resultado al encuestado en el wizard real.</p>

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
    <table class="scores-table">
      <thead><tr><th>Dimensión</th><th>Promedio (1–5)</th><th>Nivel</th></tr></thead>
      <tbody>${scoresRows}</tbody>
    </table>

    <h3 class="section-title">Análisis detallado por ítem</h3>
    <p class="section-lead">Para cada ítem, la lectura interpretativa del marco BARNA según la respuesta sintética generada.</p>
    <div id="itemAnalysis">${analysis}</div>

    <a href="index.html" class="back-link">← Volver al índice de demos</a>
  </section>
</main>

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
    scales: { r: { suggestedMin: 1, suggestedMax: 5, ticks: { stepSize: 1, backdropColor: 'transparent' }, pointLabels: { font: { size: 11 } } } },
    plugins: { legend: { display: false } },
  },
});
</script>
</body>
</html>`;
}

// ============================================================
// Fase 3 · Ordenar outcomes y generar archivos
// ============================================================
const ordered = [];
P.profiles.forEach((p) => {
  if (examples[p.id]) ordered.push({ kind: 'pure', key: p.id, profile: p });
});
P.profiles.forEach((a) => {
  P.profiles.forEach((b) => {
    if (a.id === b.id) return;
    const k = `${a.id}+${b.id}`;
    if (examples[k]) ordered.push({ kind: 'mixed', key: k, a, b });
  });
});

const DEMO_DIR = path.join(PROJECT_ROOT, 'demos');
if (!fs.existsSync(DEMO_DIR)) fs.mkdirSync(DEMO_DIR);

// Borrar HTMLs viejos para evitar restos de generaciones anteriores
fs.readdirSync(DEMO_DIR)
  .filter((f) => f.endsWith('.html'))
  .forEach((f) => fs.unlinkSync(path.join(DEMO_DIR, f)));

const indexEntries = [];
ordered.forEach((o, idx) => {
  const order = idx + 1;
  const slug = o.kind === 'pure'
    ? slugify(o.profile.nombre)
    : `${slugify(o.a.nombre)}-y-${slugify(o.b.nombre)}`;
  const filename = `${String(order).padStart(2, '0')}-${slug}.html`;
  fs.writeFileSync(path.join(DEMO_DIR, filename), renderDemo(order, examples[o.key]));

  indexEntries.push({
    order, filename, kind: o.kind,
    title: o.kind === 'pure' ? o.profile.nombre : `${o.a.nombre} + ${o.b.nombre}`,
    subtitle: o.kind === 'pure'
      ? `Perfil puro · ${o.profile.condicion}`
      : `Mezcla · ${o.a.nombre} predomina, con rasgos de ${o.b.nombre}`,
  });
});

// ============================================================
// Fase 4 · Índice navegable
// ============================================================
const cards = (kind) => indexEntries.filter((e) => e.kind === kind).map((e) =>
  `<a href="${e.filename}" class="demo-card">
    <span class="demo-card-num">Demo #${String(e.order).padStart(2,'0')}</span>
    <div class="demo-card-title">${escapeHtml(e.title)}</div>
    <p class="demo-card-subtitle">${escapeHtml(e.subtitle)}</p>
    <span class="demo-kind ${kind}">${kind === 'pure' ? 'Perfil puro' : 'Mezcla'}</span>
  </a>`
).join('');

const indexHtml = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demos de resultados · BARNA</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../styles.css">
<style>
.demo-grid {
  display: grid; grid-template-columns: 1fr; gap: 12px;
  margin: 28px 0;
}
@media (min-width: 720px) { .demo-grid { grid-template-columns: 1fr 1fr; } }
.demo-card {
  display: block; background: #fff; border: 1px solid var(--line);
  border-radius: var(--radius-lg); padding: 18px 20px;
  text-decoration: none; color: var(--ink);
  transition: all .12s ease;
}
.demo-card:hover {
  border-color: var(--navy);
  box-shadow: 0 2px 12px rgba(0,48,87,.08);
  transform: translateY(-1px);
}
.demo-card-num {
  font-size: 11px; font-weight: 700; color: var(--blue);
  letter-spacing: 1.4px; text-transform: uppercase;
}
.demo-card-title {
  font-size: 17px; font-weight: 700; color: var(--navy);
  margin: 4px 0 6px; line-height: 1.3;
}
.demo-card-subtitle {
  font-size: 13px; color: var(--muted); margin: 0 0 10px;
}
.demo-kind {
  display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.2px;
}
.demo-kind.pure  { background: #eaf7ed; color: var(--ok); }
.demo-kind.mixed { background: #fef4e1; color: var(--warn); }
.section-heading {
  margin: 36px 0 14px; font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.4px; color: var(--navy);
}
.howto {
  margin: 36px 0 24px; padding: 16px 18px;
  background: var(--panel); border-radius: var(--radius);
  color: var(--muted); font-size: 13px;
}
.howto strong { color: var(--navy); }
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
    <div class="brand-context">Demos · Investigación INNOVA</div>
  </div>
</header>

<section class="hero">
  <div class="container">
    <h1>Demos de resultados</h1>
    <p class="hero-lead">${indexEntries.length} ejemplos sintéticos generados a partir del marco de perfiles BARNA. Cada uno muestra cómo se presentaría un resultado al encuestado, con radar, perfil, lectura por ítem y todo el reporte final.</p>
  </div>
</section>

<main class="container">
  <h3 class="section-heading">Perfiles puros (${indexEntries.filter((e) => e.kind === 'pure').length})</h3>
  <div class="demo-grid">${cards('pure')}</div>

  <h3 class="section-heading">Mezclas (${indexEntries.filter((e) => e.kind === 'mixed').length})</h3>
  <div class="demo-grid">${cards('mixed')}</div>

  <div class="howto">
    <strong>Cómo usar estos demos</strong> · Cada link abre una vista idéntica al reporte real que recibiría un encuestado, con el radar, la tarjeta del perfil y la lectura ítem por ítem. Útil para presentar el alcance del instrumento sin tener que rellenar 50 preguntas en vivo.
  </div>
</main>

</body>
</html>`;

fs.writeFileSync(path.join(DEMO_DIR, 'index.html'), indexHtml);

console.log(`\n✓ Escritos ${ordered.length} demos + index.html en demos/`);
console.log(`  ${ordered.filter((o) => o.kind === 'pure').length} puros · ${ordered.filter((o) => o.kind === 'mixed').length} mezclas`);
console.log(`  Abrir: demos/index.html`);
