// Diagnóstico de Cultura de Innovación — perfiles y motor de evaluación
// Basado en el marco 6.2 del instrumento (documento ARREGLADO Aleatorio).
// Los ítems están reformulados en positivo: 5 = mayor cultura innovadora.

window.PROFILES = (function () {
  // Umbrales de clasificación de los promedios por dimensión.
  // Editables si la investigadora quiere calibrarlos.
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

  // Helpers para reglas
  const es = (nivel) => (v) => v === nivel;
  const esBajoOMedio = (v) => v === 'Bajo' || v === 'Medio';

  // Reglas en orden de prioridad: el primer match gana.
  // Orden = de más específico a más general.
  // Cada regla recibe el mapa { D1: 'Alto'|'Medio'|'Bajo', ... } y devuelve true/false.
  const profiles = [
    {
      id: 'cultura_abierta_presion',
      nombre: 'Cultura abierta con presión operativa',
      condicion: 'D1·D2·D3·D7·D8 Alto + D4 Bajo',
      descripcion: 'Hay aprendizaje colectivo, apertura a ideas, decisiones por datos y liderazgo que modela innovación. Sin embargo, la presión operativa consume el tiempo y los recursos disponibles para sostener iniciativas.',
      riesgo: 'Riesgo: la cultura está, pero las iniciativas se enfrían por falta de tiempo protegido. La transformación digital puede estancarse en proyectos piloto sin pasar a escala.',
      match: (n) => n.D1==='Alto' && n.D2==='Alto' && n.D3==='Alto' && n.D7==='Alto' && n.D8==='Alto' && n.D4==='Bajo',
    },
    {
      id: 'cultura_abierta',
      nombre: 'Cultura de innovación abierta',
      condicion: 'D1·D2·D3·D7·D8 Alto',
      descripcion: 'La organización muestra aprendizaje colectivo, tolerancia real al error, decisiones basadas en evidencia y liderazgo que modela comportamientos innovadores.',
      riesgo: 'Riesgo bajo para transformación digital; desafío: mantener y escalar la cultura al crecer.',
      match: (n) => n.D1==='Alto' && n.D2==='Alto' && n.D3==='Alto' && n.D7==='Alto' && n.D8==='Alto',
    },
    {
      id: 'cultura_abierta_rezago_digital',
      nombre: 'Cultura abierta con rezago digital',
      condicion: 'D1·D2·D7·D8 Alto + D6 Bajo/Medio',
      descripcion: 'La organización tiene una cultura sana de aprendizaje, ideas y liderazgo, pero la madurez digital y la relación con la IA aún están rezagadas.',
      riesgo: 'Riesgo: la cultura habilitaría la adopción digital, pero la falta de capacidades técnicas y de infraestructura puede dejar a la empresa rezagada frente a competidores.',
      match: (n) => n.D1==='Alto' && n.D2==='Alto' && n.D7==='Alto' && n.D8==='Alto' && esBajoOMedio(n.D6),
    },
    {
      id: 'aprendizaje_avanzado',
      nombre: 'Aprendizaje distribuido avanzado',
      condicion: 'D2·D6 Alto + D7 Alto, sin cumplir cultura abierta pura',
      descripcion: 'Existen capacidades distribuidas de innovación con buena colaboración interdepartamental y madurez digital, pero no se cumplen todos los pilares de la cultura abierta pura.',
      riesgo: 'Riesgo: si no se consolida la confianza en datos (D3) o el liderazgo (D8), las iniciativas pueden quedar dependientes de equipos puntuales.',
      match: (n) => n.D2==='Alto' && n.D6==='Alto' && n.D7==='Alto',
    },
    {
      id: 'aprendizaje_incipiente',
      nombre: 'Aprendizaje distribuido incipiente',
      condicion: 'D2 Alto + D6 Alto + D7 Medio',
      descripcion: 'Existen bolsas de innovación en distintos niveles. La cultura permite experimentación descentralizada, pero los silos aún limitan coordinación.',
      riesgo: 'Riesgo: el potencial de transformación existe, pero se pierde por falta de articulación interdepartamental.',
      match: (n) => n.D2==='Alto' && n.D6==='Alto' && n.D7==='Medio',
    },
    {
      id: 'aprendizaje_silos',
      nombre: 'Aprendizaje distribuido con silos',
      condicion: 'D2 Alto + D6 Alto + D7 Bajo',
      descripcion: 'Hay capacidades distribuidas para innovar, pero los silos departamentales son severos y bloquean iniciativas transversales.',
      riesgo: 'Riesgo: cada área avanza por su cuenta sin integración; los proyectos de transformación que cruzan equipos fracasan en la ejecución.',
      match: (n) => n.D2==='Alto' && n.D6==='Alto' && n.D7==='Bajo',
    },
    {
      id: 'burocracia_liderada',
      nombre: 'Burocracia innovadora liderada',
      condicion: 'D3 Alto + D8 Alto + D4 Bajo/Medio + D5 Bajo/Medio',
      descripcion: 'La organización combina procesos sólidos basados en datos con liderazgo activo en innovación, pero la rigidez estructural y la resistencia al cambio limitan la velocidad.',
      riesgo: 'Riesgo: el liderazgo impulsa, pero el sistema absorbe la energía. Se producen muchas iniciativas formales sin transformación real.',
      match: (n) => n.D3==='Alto' && n.D8==='Alto' && esBajoOMedio(n.D4) && esBajoOMedio(n.D5),
    },
    {
      id: 'reactiva_liderazgo',
      nombre: 'Cultura reactiva con liderazgo impulsor',
      condicion: 'D4 Bajo + D1 Bajo/Medio + D5 Bajo/Medio + D8 Alto',
      descripcion: 'El liderazgo intenta movilizar innovación, pero la organización opera en modo urgente, con poca tolerancia al error y baja apertura al cambio.',
      riesgo: 'Riesgo: el líder se desgasta empujando; la cultura no acompaña y las iniciativas se diluyen apenas baja la presión desde arriba.',
      match: (n) => n.D4==='Bajo' && esBajoOMedio(n.D1) && esBajoOMedio(n.D5) && n.D8==='Alto',
    },
    {
      id: 'burocracia_innovadora',
      nombre: 'Burocracia innovadora',
      condicion: 'D3 Alto + D4 Bajo + D5 Bajo',
      descripcion: 'La organización tiene procesos sólidos y usa datos, pero la rigidez estructural limita la velocidad de experimentación y apertura al cambio.',
      riesgo: 'Riesgo: transformación digital formal sin cambio conductual real; adopción tecnológica sin cambiar cultura subyacente.',
      match: (n) => n.D3==='Alto' && n.D4==='Bajo' && n.D5==='Bajo',
    },
    {
      id: 'reactiva_urgencia',
      nombre: 'Cultura reactiva de urgencia',
      condicion: 'D4 Bajo + D1 Bajo + D5 Bajo',
      descripcion: 'La organización puede ser eficiente operativamente, pero el corto plazo consume recursos, no hay tiempo protegido y la apertura al cambio es débil.',
      riesgo: 'Riesgo: iniciativas de transformación arrancan, pero mueren por falta de seguimiento; IA táctica sin integración estratégica.',
      match: (n) => n.D4==='Bajo' && n.D1==='Bajo' && n.D5==='Bajo',
    },
    {
      id: 'reactiva_datos',
      nombre: 'Cultura reactiva basada en datos',
      condicion: 'D4 Bajo + D1 Bajo/Medio + D5 Bajo/Medio + D3 Alto',
      descripcion: 'La organización usa datos, pero opera reactivamente. La urgencia y la baja apertura al cambio limitan que los datos se conviertan en transformación.',
      riesgo: 'Riesgo: hay diagnóstico pero no acción; los datos confirman problemas que la cultura no permite resolver.',
      match: (n) => n.D4==='Bajo' && esBajoOMedio(n.D1) && esBajoOMedio(n.D5) && n.D3==='Alto',
    },
    {
      id: 'burocracia_friccion',
      nombre: 'Burocracia innovadora con fricción adaptativa',
      condicion: 'D3 Alto + D4 Bajo/Medio + D5 Bajo/Medio',
      descripcion: 'Procesos sólidos con buen uso de datos, pero falta tiempo protegido y disposición al cambio para que las iniciativas se ejecuten con fluidez.',
      riesgo: 'Riesgo: transformación digital "documentada" sin cambio conductual real.',
      match: (n) => n.D3==='Alto' && esBajoOMedio(n.D4) && esBajoOMedio(n.D5),
    },
    {
      id: 'centralizada_transicion',
      nombre: 'Innovación centralizada en transición colaborativa',
      condicion: 'D8 Alto + D2 Bajo + D7 Medio',
      descripcion: 'El liderazgo impulsa innovación pero las ideas todavía no fluyen libremente desde otros niveles; la colaboración interdepartamental ya muestra avances incipientes.',
      riesgo: 'Riesgo: la innovación sigue dependiendo del líder; si la colaboración no se consolida, vuelve al modelo centralizado.',
      match: (n) => n.D8==='Alto' && n.D2==='Bajo' && n.D7==='Medio',
    },
    {
      id: 'centralizada_fragil',
      nombre: 'Innovación centralizada y frágil',
      condicion: 'D8 Alto + D2 Bajo + D7 Bajo',
      descripcion: 'La organización innova cuando el líder principal impulsa directamente; alta dependencia del caudillo organizacional. La innovación no se sostiene sin presencia activa del liderazgo.',
      riesgo: 'Riesgo: cambios en liderazgo paralizan innovación; adopción tecnológica bloqueada sin mandato explícito desde arriba.',
      match: (n) => n.D8==='Alto' && n.D2==='Bajo' && n.D7==='Bajo',
    },
  ];

  const FALLBACK = {
    id: 'mixto_transicion',
    nombre: 'Perfil mixto / en transición',
    condicion: 'No cumple ninguna combinación pura ni mixta definida',
    descripcion: 'La organización presenta una combinación de fortalezas y debilidades que no encaja con un perfil cultural definido. Es típico de organizaciones en transición o con dinámicas internas heterogéneas entre áreas.',
    riesgo: 'Riesgo variable: conviene revisar dimensión por dimensión cuáles son las palancas y cuáles los frenos para decidir dónde intervenir primero.',
  };

  // Evalúa un mapa de promedios y devuelve { scores, niveles, perfil }
  function evaluar(promedios) {
    const niveles = {};
    for (const d of Object.keys(promedios)) {
      niveles[d] = clasificar(promedios[d]);
    }
    for (const p of profiles) {
      if (p.match(niveles)) {
        return { scores: promedios, niveles, perfil: p };
      }
    }
    return { scores: promedios, niveles, perfil: FALLBACK };
  }

  return { THRESHOLDS, clasificar, evaluar, profiles, FALLBACK };
})();
