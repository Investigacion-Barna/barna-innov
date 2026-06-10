// Diagnóstico de Cultura de Innovación — flujo wizard, scoring y render
(function () {
  'use strict';

  // ===== CONFIG =====
  // Pegar aquí la URL pública del Web App desplegado desde apps-script/webhook.gs
  // Si se deja vacío, el envío a Google Sheet se omite (el usuario sigue viendo su resultado).
  const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwZ8Qqpp5dcLtyUu6fF222WQOchy15AbEEL1n7kpd1Wg3aSgCSSegqm5ssmDBpIFUM/exec';
  // "Knock" compartido con webhook.gs. Visible en el código fuente — no es un
  // secreto fuerte, sólo filtra POSTs automatizados que no lo incluyan.
  // Genera uno nuevo (cualquier string aleatorio) y pégalo igual en webhook.gs.
  const SHARED_TOKEN = 'barna-innova-2026-XnT4q7vBz9';

  const Q = window.QUESTIONS;
  const P = window.PROFILES;
  const M = window.MATRIX;

  // ===== STATE =====
  const state = {
    step: 1,
    demog: {},
    likert: {},
    opens: {},
  };
  const STORAGE_KEY = 'barna-innov-diag-v1';
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) Object.assign(state, JSON.parse(saved));
  } catch (_) {}
  function persist() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  // ===== RENDER: Demográficas =====
  function renderDemog() {
    const root = document.getElementById('demogFields');
    root.innerHTML = '';
    Q.demographics.forEach((f) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const id = `f-${f.id}`;
      const lbl = document.createElement('label');
      lbl.setAttribute('for', id);
      lbl.textContent = f.label + (f.required ? ' *' : '');
      wrap.appendChild(lbl);

      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        const ph = document.createElement('option');
        ph.value = ''; ph.textContent = '— Selecciona —';
        input.appendChild(ph);
        f.options.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
      }
      input.id = id;
      input.name = f.id;
      if (f.required) input.required = true;
      if (state.demog[f.id]) input.value = state.demog[f.id];
      input.addEventListener('change', () => {
        state.demog[f.id] = input.value;
        persist();
      });
      wrap.appendChild(input);

      const err = document.createElement('div');
      err.className = 'error'; err.dataset.errFor = f.id;
      wrap.appendChild(err);

      root.appendChild(wrap);
    });
  }

  // ===== RENDER: Likert =====
  function renderLikert() {
    const root = document.getElementById('likertGroups');
    root.innerHTML = '';
    const byDim = {};
    Q.likert.forEach((it) => {
      (byDim[it.dim] = byDim[it.dim] || []).push(it);
    });
    Object.keys(byDim).forEach((dim, idx) => {
      const group = document.createElement('div');
      group.className = 'dim-group';
      const meta = Q.dimensions[dim] || { title: dim, subtitle: '' };
      const h = document.createElement('h3');
      h.textContent = `${idx + 1}. ${meta.title}`;
      group.appendChild(h);
      if (meta.subtitle) {
        const sub = document.createElement('p');
        sub.className = 'dim-sub';
        sub.textContent = meta.subtitle;
        group.appendChild(sub);
      }
      byDim[dim].forEach((item) => {
        const row = document.createElement('div');
        row.className = 'likert-item';
        row.dataset.code = item.code;

        const text = document.createElement('div');
        text.className = 'likert-text';
        text.textContent = item.text;
        row.appendChild(text);

        const scale = document.createElement('div');
        scale.className = 'likert-scale';
        Q.likertScale.forEach((s) => {
          const lbl = document.createElement('label');
          lbl.title = s.label;
          const inp = document.createElement('input');
          inp.type = 'radio';
          inp.name = `lk-${item.code}`;
          inp.value = String(s.value);
          if (state.likert[item.code] === s.value) inp.checked = true;
          inp.addEventListener('change', () => {
            state.likert[item.code] = s.value;
            row.classList.remove('missing');
            persist();
          });
          const num = document.createElement('span');
          num.className = 'num'; num.textContent = s.value;
          const t = document.createElement('span');
          t.textContent = s.label;
          lbl.appendChild(inp);
          lbl.appendChild(num);
          lbl.appendChild(t);
          scale.appendChild(lbl);
        });
        row.appendChild(scale);
        group.appendChild(row);
      });
      root.appendChild(group);
    });
  }

  // ===== RENDER: Abiertas =====
  function renderOpens() {
    const root = document.getElementById('openFields');
    root.innerHTML = '';
    Q.openQuestions.forEach((q) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const lbl = document.createElement('label');
      lbl.innerHTML = `<strong>${q.id} · ${q.title}</strong><br><span style="font-weight:400;color:var(--muted);font-size:14px">${q.body}</span>`;
      wrap.appendChild(lbl);
      const ta = document.createElement('textarea');
      ta.name = q.id; ta.rows = 4;
      ta.value = state.opens[q.id] || '';
      ta.addEventListener('input', () => {
        state.opens[q.id] = ta.value;
        persist();
      });
      wrap.appendChild(ta);
      root.appendChild(wrap);
    });
  }

  // ===== VALIDATION =====
  function validateDemog() {
    let ok = true;
    document.querySelectorAll('[data-err-for]').forEach((e) => (e.textContent = ''));
    Q.demographics.forEach((f) => {
      if (!f.required) return;
      const v = (state.demog[f.id] || '').trim();
      if (!v) {
        ok = false;
        const err = document.querySelector(`[data-err-for="${f.id}"]`);
        if (err) err.textContent = 'Este campo es obligatorio.';
      } else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        ok = false;
        const err = document.querySelector(`[data-err-for="${f.id}"]`);
        if (err) err.textContent = 'Correo no válido.';
      }
    });
    return ok;
  }

  function validateLikert() {
    let ok = true;
    let firstMissing = null;
    document.querySelectorAll('.likert-item').forEach((row) => {
      const code = row.dataset.code;
      if (state.likert[code] == null) {
        ok = false;
        row.classList.add('missing');
        if (!firstMissing) firstMissing = row;
      } else {
        row.classList.remove('missing');
      }
    });
    if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }

  // ===== SCORING =====
  function computeScores() {
    const sums = {}, counts = {};
    Q.likert.forEach((it) => {
      const v = state.likert[it.code];
      if (typeof v === 'number') {
        sums[it.dim] = (sums[it.dim] || 0) + v;
        counts[it.dim] = (counts[it.dim] || 0) + 1;
      }
    });
    const proms = {};
    Object.keys(Q.dimensions).forEach((d) => {
      proms[d] = counts[d] ? sums[d] / counts[d] : 0;
    });
    return proms;
  }

  // ===== RENDER: Resultado =====
  let radarChart = null;
  function renderResult(result) {
    const { scores, niveles, perfil, cercanos } = result;

    // Cuando es fallback con cercanos, sintetizamos la tarjeta usando los
    // 2 perfiles más cercanos en lugar del texto genérico de "Perfil mixto".
    const display = (cercanos && cercanos.length >= 2)
      ? buildMixedDisplay(cercanos)
      : perfil;

    document.getElementById('profileName').textContent = display.nombre;
    document.getElementById('profileCondition').textContent = display.condicion;
    document.getElementById('profileDescription').textContent = display.descripcion;
    document.getElementById('profileRisk').textContent = display.riesgo;

    const labels = Object.keys(Q.dimensions).map((d) => `${d} — ${Q.dimensions[d].title}`);
    const data = Object.keys(Q.dimensions).map((d) => +scores[d].toFixed(2));
    const ctx = document.getElementById('radar').getContext('2d');
    if (radarChart) radarChart.destroy();
    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Tu organización',
          data,
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
        scales: {
          r: {
            suggestedMin: 1, suggestedMax: 5,
            ticks: { stepSize: 1, backdropColor: 'transparent' },
            pointLabels: { font: { size: 11 } },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    const tbody = document.getElementById('scoresBody');
    tbody.innerHTML = '';
    Object.keys(Q.dimensions).forEach((d) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${d}</strong> — ${Q.dimensions[d].title}</td>
        <td data-label="Promedio (1–5)">${scores[d].toFixed(2)}</td>
        <td data-label="Nivel" class="nivel-${niveles[d]}">${niveles[d]}</td>`;
      tbody.appendChild(tr);
    });

    renderItemAnalysis(scores, niveles);
  }

  // Construye la "tarjeta principal" cuando ningún perfil puro matchea:
  // toma los nombres, descripciones y riesgos de los 2 perfiles más cercanos
  // y los combina en un solo bloque hablándole directamente al encuestado.
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


  // ===== RENDER: Análisis detallado por ítem (Matriz de interpretación) =====
  function renderItemAnalysis(scores, niveles) {
    const root = document.getElementById('itemAnalysis');
    root.innerHTML = '';
    root.dataset.filter = 'all';

    // Filtro
    const filterBar = document.createElement('div');
    filterBar.className = 'analysis-filter';
    filterBar.innerHTML = `
      <span class="analysis-filter-label">Filtrar:</span>
      <button type="button" class="filter-chip active" data-filter-set="all">Todos los ítems</button>
      <button type="button" class="filter-chip cnt-low"  data-filter-set="low">▼ Sólo bajos</button>
      <button type="button" class="filter-chip cnt-high" data-filter-set="high">▲ Sólo altos</button>`;
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter-set]');
      if (!btn) return;
      const sel = btn.dataset.filterSet;
      root.dataset.filter = sel;
      filterBar.querySelectorAll('.filter-chip').forEach((b) =>
        b.classList.toggle('active', b.dataset.filterSet === sel));
      // Re-collapsar y mostrar/ocultar dim-analysis sin matches
      root.querySelectorAll('.dim-analysis').forEach((d) => {
        const visible = d.querySelectorAll(
          sel === 'all' ? '.item-card' :
          sel === 'low' ? '.item-card.item-low' :
                          '.item-card.item-high'
        ).length;
        d.style.display = visible ? '' : 'none';
        if (visible && sel !== 'all') d.open = true;
      });
    });
    root.appendChild(filterBar);

    // Agrupar ítems de la matriz por dimensión
    const byDim = {};
    M.items.forEach((it) => { (byDim[it.dim] = byDim[it.dim] || []).push(it); });

    Object.keys(byDim).forEach((dim, idx) => {
      const dimItems = byDim[dim];
      const dimAvg = scores[dim] != null ? scores[dim].toFixed(2) : '—';
      const dimNivel = niveles[dim] || '—';
      const dimTitle = M.dimTitles[dim] || dim;

      // Contar respuestas por bucket
      const counts = { low: 0, mid: 0, high: 0 };
      dimItems.forEach((it) => {
        const s = state.likert[it.code];
        if (typeof s === 'number') counts[M.bucket(s)]++;
      });

      const details = document.createElement('details');
      details.className = 'dim-analysis';
      if (idx === 0) details.open = true;

      const summary = document.createElement('summary');
      summary.innerHTML = `
        <span class="dim-analysis-code">${dim}</span>
        <span class="dim-analysis-title">${dimTitle}</span>
        <span class="dim-analysis-meta">
          <span class="dim-analysis-score">${dimAvg}/5</span>
          <span class="nivel-${dimNivel}">${dimNivel}</span>
          <span class="dim-analysis-counts">
            <span class="cnt cnt-high" title="Items en nivel alto">▲ ${counts.high}</span>
            <span class="cnt cnt-mid"  title="Items en nivel medio">● ${counts.mid}</span>
            <span class="cnt cnt-low"  title="Items en nivel bajo">▼ ${counts.low}</span>
          </span>
        </span>`;
      details.appendChild(summary);

      const body = document.createElement('div');
      body.className = 'dim-analysis-body';

      dimItems.forEach((it) => {
        const s = state.likert[it.code];
        if (typeof s !== 'number') return;
        const lvl = M.bucket(s);
        const interp = it[lvl];

        const card = document.createElement('div');
        card.className = `item-card item-${lvl}`;
        card.innerHTML = `
          <div class="item-head">
            <span class="item-code">${it.code}</span>
            <span class="item-signal">${it.signal}</span>
            <span class="item-score">${s}/5</span>
          </div>
          <p class="item-text">${escapeHtml(it.text)}</p>
          <p class="item-interp"><strong>Lectura:</strong> ${escapeHtml(interp)}</p>`;
        body.appendChild(card);
      });

      details.appendChild(body);
      root.appendChild(details);
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // ===== WEBHOOK =====
  async function sendToSheet(payload) {
    if (!WEBHOOK_URL) return { skipped: true };
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        // text/plain evita preflight CORS en Apps Script Web App
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      return await res.json().catch(() => ({ ok: true }));
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // ===== STEP NAVIGATION =====
  function showStep(n) {
    state.step = n;
    persist();
    document.querySelectorAll('.step-panel').forEach((p) => {
      p.classList.toggle('hidden', +p.dataset.step !== n);
    });
    document.querySelectorAll('.progress-steps .step').forEach((s) => {
      const k = +s.dataset.step;
      s.classList.toggle('active', k === n);
      s.classList.toggle('done', k < n);
    });
    document.getElementById('progressFill').style.width = (n / 4 * 100) + '%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const next = e.target.closest('[data-next]');
    const prev = e.target.closest('[data-prev]');
    if (next) {
      if (state.step === 1 && !validateDemog()) return;
      if (state.step === 2 && !validateLikert()) return;
      showStep(state.step + 1);
    } else if (prev) {
      showStep(state.step - 1);
    }
  });

  document.getElementById('wizard').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateLikert()) { showStep(2); return; }

    const status = document.getElementById('resultStatus');
    status.className = 'status'; status.textContent = 'Calculando tu perfil…';

    const scores = computeScores();
    const result = P.evaluar(scores);
    showStep(4);
    renderResult(result);

    const payload = {
      token: SHARED_TOKEN,
      hp: (document.getElementById('hp-website') || {}).value || '',
      timestamp: new Date().toISOString(),
      demog: state.demog,
      likert: state.likert,
      opens: state.opens,
      scores,
      niveles: result.niveles,
      perfil: { id: result.perfil.id, nombre: result.perfil.nombre },
    };
    const sent = await sendToSheet(payload);
    if (sent.skipped) {
      status.className = 'status'; status.textContent = 'Resultado generado. (Envío a hoja deshabilitado — configura WEBHOOK_URL en js/app.js)';
    } else if (sent.ok === false) {
      status.className = 'status err'; status.textContent = 'No se pudo guardar tu respuesta automáticamente, pero tu resultado se muestra abajo.';
    } else {
      status.className = 'status ok'; status.textContent = '✓ Respuesta registrada. Gracias por participar.';
    }
  });

  // ===== INIT =====
  renderDemog();
  renderLikert();
  renderOpens();
  showStep(state.step || 1);
})();
