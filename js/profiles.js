// Diagnóstico de Cultura de Innovación — perfiles y motor de evaluación
// Fuente: Hoja 2 "Reglas de perfiles culturales · ajustadas al marco 6.2"
// del archivo de la investigación BARNA.
// Los ítems están reformulados en positivo: 5 = mayor cultura innovadora.
//
// 5 perfiles puros + fallback "Perfil mixto / en transición" cuando ninguno aplica.

window.PROFILES = (function () {
  // Umbrales de clasificación de los promedios por dimensión.
  const THRESHOLDS = {
    BAJO_MAX: 2.5,   // promedio < 2.5  -> Bajo
    ALTO_MIN: 3.75,  // promedio >= 3.75 -> Alto
                     // entre ambos      -> Medio
  };

  function clasificar(prom) {
    if (prom < THRESHOLDS.BAJO_MAX) return 'Bajo';
    if (prom >= THRESHOLDS.ALTO_MIN) return 'Alto';
    return 'Medio';
  }

  // Reglas en orden de prioridad. Cada perfil expone `targets`: la lista
  // explícita de condiciones (dim → nivel esperado), usada tanto para
  // matching exacto como para calcular cercanía cuando ningún perfil aplica.
  const profiles = [
    {
      id: 'cultura_abierta',
      nombre: 'Cultura de innovación abierta',
      condicion: 'D1 Alto + D2 Alto + D3 Alto + D7 Alto + D8 Alto',
      descripcion: 'La organización muestra aprendizaje colectivo, tolerancia real al error, decisiones basadas en evidencia y liderazgo que modela comportamientos innovadores.',
      riesgo: 'Riesgo bajo para transformación digital; desafío: mantener y escalar la cultura al crecer.',
      nota: 'Se mantiene la regla del documento: alta en D1, D2, D3, D7 y D8.',
      targets: [
        { dim: 'D1', nivel: 'Alto' }, { dim: 'D2', nivel: 'Alto' },
        { dim: 'D3', nivel: 'Alto' }, { dim: 'D7', nivel: 'Alto' },
        { dim: 'D8', nivel: 'Alto' },
      ],
    },
    {
      id: 'aprendizaje_incipiente',
      nombre: 'Aprendizaje distribuido incipiente',
      condicion: 'D2 Alto + D6 Alto + D7 Medio',
      descripcion: 'Existen bolsas de innovación en distintos niveles. La cultura permite experimentación descentralizada, pero los silos aún limitan coordinación.',
      riesgo: 'Riesgo: el potencial de transformación existe, pero se pierde por falta de articulación interdepartamental.',
      nota: 'Se mantiene la regla del documento: alta D2 y D6, media D7.',
      targets: [
        { dim: 'D2', nivel: 'Alto' }, { dim: 'D6', nivel: 'Alto' },
        { dim: 'D7', nivel: 'Medio' },
      ],
    },
    {
      id: 'burocracia_innovadora',
      nombre: 'Burocracia innovadora',
      condicion: 'D3 Alto + D4 Bajo + D5 Bajo',
      descripcion: 'La organización tiene procesos sólidos y usa datos, pero la rigidez estructural limita la velocidad de experimentación y apertura al cambio.',
      riesgo: 'Riesgo: transformación digital formal sin cambio conductual real; adopción tecnológica sin cambiar cultura subyacente.',
      nota: 'Se mantiene la lógica documental adaptada a scoring positivo.',
      targets: [
        { dim: 'D3', nivel: 'Alto' }, { dim: 'D4', nivel: 'Bajo' },
        { dim: 'D5', nivel: 'Bajo' },
      ],
    },
    {
      id: 'centralizada_fragil',
      nombre: 'Innovación centralizada y frágil',
      condicion: 'D8 Alto + D2 Bajo + D7 Bajo',
      descripcion: 'La organización innova cuando el líder principal impulsa directamente; alta dependencia del caudillo organizacional. La innovación no se sostiene sin presencia activa del liderazgo.',
      riesgo: 'Riesgo: cambios en liderazgo paralizan innovación; adopción tecnológica bloqueada sin mandato explícito desde arriba.',
      nota: 'Se mantiene la regla del documento: alta D8, baja D2 y D7.',
      targets: [
        { dim: 'D8', nivel: 'Alto' }, { dim: 'D2', nivel: 'Bajo' },
        { dim: 'D7', nivel: 'Bajo' },
      ],
    },
    {
      id: 'reactiva_urgencia',
      nombre: 'Cultura reactiva de urgencia',
      condicion: 'D4 Bajo + D1 Bajo + D5 Bajo',
      descripcion: 'La organización puede ser eficiente operativamente, pero el corto plazo consume recursos, no hay tiempo protegido y la apertura al cambio es débil.',
      riesgo: 'Riesgo: iniciativas de transformación arrancan, pero mueren por falta de seguimiento; IA táctica sin integración estratégica.',
      nota: 'Ajuste técnico: el documento original decía alta D4, pero con los ítems reformulados en positivo, la condición coherente es D4 Bajo.',
      targets: [
        { dim: 'D4', nivel: 'Bajo' }, { dim: 'D1', nivel: 'Bajo' },
        { dim: 'D5', nivel: 'Bajo' },
      ],
    },
  ];

  // Una regla matchea cuando TODOS sus targets se cumplen exactamente.
  function matches(profile, niveles) {
    return profile.targets.every((t) => niveles[t.dim] === t.nivel);
  }

  const FALLBACK = {
    id: 'mixto_transicion',
    nombre: 'Perfil mixto / en transición',
    condicion: 'No cumple ninguno de los 5 perfiles puros',
    descripcion: 'La organización presenta una combinación de fortalezas y debilidades que no encaja con un perfil cultural puro definido. Es típico de organizaciones en transición o con dinámicas internas heterogéneas entre áreas.',
    riesgo: 'Riesgo variable: conviene revisar dimensión por dimensión cuáles son las palancas y cuáles los frenos para decidir dónde intervenir primero.',
  };

  // Distancia entre niveles: Alto-Bajo=2, Alto-Medio=1, Medio-Bajo=1, igual=0.
  const NIVEL_RANK = { Bajo: 0, Medio: 1, Alto: 2 };
  function distancia(a, b) {
    return Math.abs(NIVEL_RANK[a] - NIVEL_RANK[b]);
  }

  // Para un perfil dado y los niveles del encuestado:
  //   - cumplidos: cuántos targets matchean exactamente
  //   - total: cuántos targets tiene el perfil
  //   - desviacion: suma de distancias en las dims que no matchean
  //   - score: cumplidos - desviacion*0.5  (más alto = más cerca)
  function evaluarCercania(profile, niveles) {
    let cumplidos = 0, desviacion = 0;
    const desviados = [];
    profile.targets.forEach((t) => {
      const real = niveles[t.dim];
      if (real === t.nivel) {
        cumplidos++;
      } else {
        const d = distancia(real, t.nivel);
        desviacion += d;
        desviados.push({ dim: t.dim, esperado: t.nivel, real, distancia: d });
      }
    });
    return {
      profile,
      cumplidos,
      total: profile.targets.length,
      desviacion,
      desviados,
      score: cumplidos - desviacion * 0.5,
    };
  }

  // Top-N perfiles más cercanos cuando ninguno matchea (descendente por score).
  function perfilesCercanos(niveles, n) {
    if (n == null) n = 2;
    return profiles
      .map((p) => evaluarCercania(p, niveles))
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  // Evalúa un mapa de promedios y devuelve { scores, niveles, perfil, cercanos? }
  function evaluar(promedios) {
    const niveles = {};
    for (const d of Object.keys(promedios)) {
      niveles[d] = clasificar(promedios[d]);
    }
    for (const p of profiles) {
      if (matches(p, niveles)) {
        return { scores: promedios, niveles, perfil: p };
      }
    }
    return {
      scores: promedios,
      niveles,
      perfil: FALLBACK,
      cercanos: perfilesCercanos(niveles, 2),
    };
  }

  return {
    THRESHOLDS, clasificar, evaluar, profiles, FALLBACK,
    matches, evaluarCercania, perfilesCercanos, NIVEL_RANK,
  };
})();
