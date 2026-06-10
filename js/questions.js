// Diagnóstico de Cultura de Innovación — datos del cuestionario
// 50 ítems Likert agrupados en 8 dimensiones (D1..D8)
// Algunas preguntas se completaron porque venían cortadas en el Excel original.

window.QUESTIONS = (function () {
  const demographics = [
    {
      id: 'email',
      type: 'email',
      label: 'Correo electrónico',
      required: true,
    },
    {
      id: 'tamano',
      type: 'select',
      label: 'Tamaño de la organización',
      required: true,
      options: [
        'Microempresa (1-10 empleados)',
        'Pequeña empresa (11-50 empleados)',
        'Mediana empresa (51-200 empleados)',
        'Grande empresa (más de 200 empleados)',
      ],
    },
    {
      id: 'sector',
      type: 'select',
      label: 'Sector principal de actividad',
      required: true,
      options: [
        'Agroindustria',
        'Comercio',
        'Construcción',
        'Educación',
        'Manufactura',
        'Salud',
        'Sector público',
        'Servicios financieros',
        'Servicios profesionales',
        'Tecnología',
        'Turismo y hospitalidad',
        'Otro',
      ],
    },
    {
      id: 'anios',
      type: 'select',
      label: 'Años de operación de la empresa',
      required: true,
      options: [
        'Menos de 5 años',
        '5 a 10 años',
        '11 a 25 años',
        'Más de 25 años',
      ],
    },
    {
      id: 'propiedad',
      type: 'select',
      label: 'Estructura de propiedad',
      required: true,
      options: [
        'Empresa familiar (más del 50% en manos de una familia)',
        'Empresa de capital privado no familiar',
        'Empresa pública / cotizada en bolsa',
        'Empresa estatal / gobierno',
        'Filial de multinacional',
        'Otro',
      ],
    },
    {
      id: 'escolaridad',
      type: 'select',
      label: 'Nivel de escolaridad predominante del equipo directivo',
      required: true,
      options: [
        'Secundaria',
        'Técnico / Universitario incompleto',
        'Universitario completo',
        'Maestría o especialización',
        'Doctorado',
      ],
    },
    {
      id: 'financiamiento',
      type: 'select',
      label: '¿La empresa ha recibido financiamiento público para innovación?',
      required: true,
      options: ['Sí', 'No', 'No sé'],
    },
    {
      id: 'posicion',
      type: 'select',
      label: 'Posición del respondente en la organización',
      required: true,
      options: [
        'Alta dirección (CEO, presidente, vicepresidente)',
        'Gerencia media (gerente, jefe de área, coordinador)',
        'Profesional / analista',
        'Operativo / asistente',
        'Otro',
      ],
    },
  ];

  // 8 dimensiones con título descriptivo (mostrado al encuestado sin revelar el código D#)
  // y feedback corto por nivel para mostrar en la sección de detalle del resultado.
  const dimensions = {
    D1: {
      title: 'Aprendizaje del fallo',
      subtitle: 'Cómo se gestionan los errores y proyectos fallidos',
      feedback: {
        Bajo:  'Tu organización penaliza el error y los proyectos fallidos tienden a silenciarse. Es difícil proponer ideas con incertidumbre sin temor reputacional, y no hay aprendizaje sistemático del fracaso.',
        Medio: 'La tolerancia al error existe de forma parcial: algunas áreas analizan los fallos para mejorar, mientras otras buscan culpables. La transparencia ante resultados no esperados es desigual.',
        Alto:  'Tu organización documenta los aprendizajes del fracaso, analiza errores como oportunidad de mejora y permite proponer ideas arriesgadas sin castigo desproporcionado.',
      },
    },
    D2: {
      title: 'Apertura a ideas y diversidad',
      subtitle: 'Cómo circulan las propuestas dentro de la organización',
      feedback: {
        Bajo:  'Las ideas están concentradas en la alta dirección. Cuando alguien de niveles medios u operativos propone algo nuevo, recibe poca respuesta o el cargo pesa más que la calidad de la idea.',
        Medio: 'Existen mecanismos para canalizar propuestas, pero su uso es desigual entre áreas y el visto bueno superior sigue siendo decisivo para que una idea avance.',
        Alto:  'Las ideas fluyen desde todos los niveles. Se evalúan por su calidad y aporte, no por la jerarquía de quien las propone, y existen canales reales para participar.',
      },
    },
    D3: {
      title: 'Decisiones basadas en datos',
      subtitle: 'Cómo se usan los datos para decidir',
      feedback: {
        Bajo:  'Las decisiones importantes dependen principalmente de la intuición o experiencia directiva. Los reportes disponibles no orientan la operación cotidiana ni corrigen decisiones ya tomadas.',
        Medio: 'Los datos se consideran en algunas decisiones, pero la experiencia y la intuición todavía dominan. La medición de impacto de los cambios es ocasional.',
        Alto:  'Tu organización fundamenta sus decisiones en datos concretos, mide sistemáticamente los resultados de los cambios y los reportes guían la operación diaria.',
      },
    },
    D4: {
      title: 'Tiempo y recursos para innovar',
      subtitle: 'Cómo se balancea operación con iniciativas de mejora',
      feedback: {
        Bajo:  'La urgencia operativa consume casi todo el tiempo y los recursos. No hay espacio protegido para experimentar y las iniciativas de largo plazo se diluyen ante las prioridades del día.',
        Medio: 'Existe algo de tiempo para mejora, pero es vulnerable a la presión operativa. La planificación anual orienta sólo parcialmente las decisiones.',
        Alto:  'Tu organización reserva tiempo concreto para experimentar y sostiene iniciativas estratégicas con seguimiento, incluso cuando surgen urgencias.',
      },
    },
    D5: {
      title: 'Disposición al cambio',
      subtitle: 'Cómo se cuestiona "lo de siempre"',
      feedback: {
        Bajo:  'La tradición se usa para mantener prácticas que deberían revisarse. Quienes cuestionan procesos establecidos son vistos como problemáticos en lugar de agentes de mejora.',
        Medio: 'Hay apertura parcial al cambio: algunas prácticas se actualizan, pero la costumbre todavía pesa en decisiones estratégicas y muchos procesos permanecen por inercia.',
        Alto:  'La trayectoria de tu empresa inspira mejoras, no las frena. La evidencia de que algo puede mejorar pesa más que la costumbre y los procesos se transforman cuando es necesario.',
      },
    },
    D6: {
      title: 'Madurez digital e IA',
      subtitle: 'Cómo se relaciona la organización con la tecnología',
      feedback: {
        Bajo:  'La comodidad con herramientas digitales es baja, los líderes comprenden poco las herramientas de IA disponibles y la reacción ante nueva tecnología tiende a ser resistencia o miedo.',
        Medio: 'La madurez digital es desigual entre áreas o generaciones. La IA genera curiosidad en algunos grupos y resistencia en otros, y la adopción se decide sin evaluar plenamente impactos laborales.',
        Alto:  'Los empleados usan herramientas digitales con comodidad, los líderes comprenden la IA aplicable al negocio y predomina apertura a explorar nuevas tecnologías.',
      },
    },
    D7: {
      title: 'Colaboración interdepartamental',
      subtitle: 'Cómo trabajan las áreas entre sí',
      feedback: {
        Bajo:  'Predominan los silos: la información no fluye entre áreas y las tensiones entre departamentos bloquean iniciativas transversales que beneficiarían a la empresa.',
        Medio: 'La colaboración entre áreas ocurre, pero suele depender de relaciones personales o de instrucciones superiores en lugar de ser una práctica fluida.',
        Alto:  'Las áreas colaboran con fluidez cuando un proyecto lo requiere, comparten información oportunamente y los conflictos se gestionan sin frenar iniciativas estratégicas.',
      },
    },
    D8: {
      title: 'Liderazgo que modela innovación',
      subtitle: 'Cómo se comportan los líderes en lo cotidiano',
      feedback: {
        Bajo:  'El liderazgo predica la innovación en el discurso pero rara vez la modela: los líderes no admiten desconocimiento en público, dedican poco tiempo visible a aprender y sostienen posiciones aun ante argumentos sólidos.',
        Medio: 'Algunos líderes modelan apertura y aprendizaje, pero no es una práctica extendida. El discurso y la práctica del liderazgo no siempre son coherentes.',
        Alto:  'Los líderes usan herramientas nuevas en primera persona, admiten desconocimiento públicamente, cambian de posición ante buenos argumentos y modelan en lo cotidiano los valores que exigen.',
      },
    },
  };

  // 50 ítems Likert (1 = Totalmente en desacuerdo, 5 = Totalmente de acuerdo)
  const likert = [
    { code: 'D1.1', dim: 'D1', text: 'Cuando un proyecto falla en mi empresa, el líder que lo propuso asume responsabilidades públicamente y continúa siendo considerado para roles importantes.' },
    { code: 'D1.2', dim: 'D1', text: 'En mi empresa se documentan formalmente los aprendizajes obtenidos de proyectos que no funcionaron como se esperaba.' },
    { code: 'D1.3', dim: 'D1', text: 'Cuando ocurre un error, en mi empresa se analiza primero cómo mejorar procesos, decisiones o formas de trabajo antes que señalar culpables.' },
    { code: 'D1.4', dim: 'D1', text: 'Puedo proponer una idea arriesgada sin preocuparme de que, si no funciona, eso afecte cómo me ven en la empresa.' },
    { code: 'D1.5', dim: 'D1', text: 'En mi empresa, los proyectos fallidos se reportan con transparencia a la alta dirección, incluyendo sus causas, aprendizajes y elementos de mejora.' },
    { code: 'D1.6', dim: 'D1', text: 'En mi empresa existe un espacio formal o informal donde se analiza por qué algo no salió bien.' },

    { code: 'D2.1', dim: 'D2', text: 'En mi empresa, las ideas de mejora o innovación pueden surgir de distintos niveles de la organización, no solo de la alta dirección o de los dueños.' },
    { code: 'D2.2', dim: 'D2', text: 'Cuando un empleado de niveles medios o bajos propone algo nuevo, recibe retroalimentación concreta, honesta y respetuosa.' },
    { code: 'D2.3', dim: 'D2', text: 'En mi empresa, las ideas se evalúan principalmente por su calidad, más que por el nivel jerárquico de quien las propone.' },
    { code: 'D2.4', dim: 'D2', text: 'En mi empresa existen mecanismos concretos (buzones, reuniones, plataformas) para que cualquier empleado proponga cambios.' },
    { code: 'D2.5', dim: 'D2', text: 'Los empleados más jóvenes tienen oportunidades reales de que sus ideas sean escuchadas y consideradas, independientemente de su edad o antigüedad en la empresa.' },
    { code: 'D2.6', dim: 'D2', text: 'Una idea nueva puede avanzar en la organización cuando demuestra valor, aunque no cuente con el visto bueno de la máxima autoridad.' },
    { code: 'D2.7', dim: 'D2', text: 'Las mujeres tienen las mismas oportunidades reales que los hombres para que sus ideas sean escuchadas y tomadas en cuenta.' },

    { code: 'D3.1', dim: 'D3', text: 'En mi empresa se toman decisiones importantes basadas en datos concretos antes que en la intuición del directivo.' },
    { code: 'D3.2', dim: 'D3', text: 'Cuando los datos contradicen una decisión que ya se había tomado, generalmente se revisa esa decisión.' },
    { code: 'D3.3', dim: 'D3', text: 'Los reportes e indicadores disponibles se utilizan de forma práctica para orientar las decisiones del día a día, incluso si no muestran los resultados esperados.' },
    { code: 'D3.4', dim: 'D3', text: 'En mi empresa, antes de tomar decisiones relevantes, se valoran más los datos en lugar de hacer caso a la opinión, "el olfato" o la intuición de la gerencia.' },
    { code: 'D3.5', dim: 'D3', text: 'Los equipos tienen acceso real y oportuno a los datos que necesitan para tomar decisiones en su área.' },
    { code: 'D3.6', dim: 'D3', text: 'En mi empresa se mide sistemáticamente si los cambios implementados produjeron los resultados esperados.' },

    { code: 'D4.1', dim: 'D4', text: 'En mi empresa existe tiempo protegido (reuniones, sprints, proyectos piloto) dedicado exclusivamente a experimentar con ideas nuevas.' },
    { code: 'D4.2', dim: 'D4', text: 'En mi empresa, las urgencias del día a día se gestionan sin impedir de forma recurrente que los equipos trabajen en proyectos de mejora o innovación.' },
    { code: 'D4.3', dim: 'D4', text: 'En mi empresa, los recursos (tiempo, dinero y personas) se asignan considerando tanto las necesidades urgentes como las iniciativas importantes para el futuro.' },
    { code: 'D4.4', dim: 'D4', text: 'La planificación anual de mi empresa es un ejercicio real que guía las decisiones durante el año.' },
    { code: 'D4.5', dim: 'D4', text: 'Las iniciativas de largo plazo cuentan con seguimiento y continuidad, aun cuando surgen prioridades operativas.' },
    { code: 'D4.6', dim: 'D4', text: 'Los líderes protegen activamente el tiempo de sus equipos para que puedan trabajar en proyectos de mejora.' },

    { code: 'D5.1', dim: 'D5', text: 'En mi empresa se escucha con genuina apertura a quien propone hacer las cosas de manera diferente.' },
    { code: 'D5.2', dim: 'D5', text: 'En mi empresa, la historia y la tradición se utilizan como fuente de aprendizaje para impulsar mejoras, no como argumento para evitar cambios necesarios.' },
    { code: 'D5.3', dim: 'D5', text: 'Los empleados que cuestionan procesos establecidos son vistos como posibles agentes de mejora, en lugar de problemáticos, siempre que presenten argumentos sólidos.' },
    { code: 'D5.4', dim: 'D5', text: 'Mi empresa ha cambiado procesos o prácticas que siempre habíamos hecho igual, cuando encontramos mejores formas.' },
    { code: 'D5.5', dim: 'D5', text: 'En las decisiones estratégicas, la evidencia de que algo puede mejorar pesa más que la costumbre de hacerlo "como siempre".' },
    { code: 'D5.6', dim: 'D5', text: 'El orgullo por la trayectoria de la empresa convive con una disposición real a revisar, actualizar o transformar prácticas cuando es necesario.' },

    { code: 'D6.1', dim: 'D6', text: 'La mayoría de los empleados de mi empresa se siente cómoda usando herramientas digitales en su trabajo diario.' },
    { code: 'D6.2', dim: 'D6', text: 'En mi empresa, las preocupaciones sobre la posible sustitución, reducción o transformación de puestos de trabajo por la automatización o la inteligencia artificial se discuten de manera abierta.' },
    { code: 'D6.3', dim: 'D6', text: 'Los líderes de mi empresa comprenden suficientemente las herramientas de inteligencia artificial disponibles para el negocio.' },
    { code: 'D6.4', dim: 'D6', text: 'Si mañana se introdujera una herramienta de IA en mi empresa, la reacción predominante sería de curiosidad y apertura.' },
    { code: 'D6.5', dim: 'D6', text: 'En mi empresa se toma en cuenta si automatizar ciertas tareas se considera inapropiado o incómodo, aunque sea técnicamente posible hacerlo.' },
    { code: 'D6.6', dim: 'D6', text: 'La infraestructura tecnológica de mi empresa (internet, dispositivos, software) permite trabajar de forma eficiente.' },
    { code: 'D6.7', dim: 'D6', text: 'Antes de adoptar una nueva tecnología, en mi empresa se pregunta cómo afectará a los puestos de trabajo actuales.' },

    { code: 'D7.1', dim: 'D7', text: 'En mi empresa, la innovación es responsabilidad compartida por todos los departamentos, no solo del área de tecnología o marketing.' },
    { code: 'D7.2', dim: 'D7', text: 'Los equipos de distintas áreas colaboran con fluidez cuando un proyecto lo requiere.' },
    { code: 'D7.3', dim: 'D7', text: 'En la práctica, los departamentos comparten información de manera oportuna y trabajan de forma coordinada entre sí cuando es necesario.' },
    { code: 'D7.4', dim: 'D7', text: 'Las diferencias o tensiones entre departamentos se gestionan de forma que no impidan avanzar iniciativas que benefician a la empresa en general.' },
    { code: 'D7.5', dim: 'D7', text: 'Cuando surge un problema que afecta a varias áreas, los equipos se coordinan rápido sin necesidad de que lo ordene la dirección.' },
    { code: 'D7.6', dim: 'D7', text: 'En mi empresa, cuando surgen conflictos interdepartamentales, se distingue si provienen de diferencias entre personas o de problemas en la estructura organizacional.' },

    { code: 'D8.1', dim: 'D8', text: 'Los líderes de mi empresa usan personalmente herramientas digitales nuevas y las recomiendan desde su propia experiencia.' },
    { code: 'D8.2', dim: 'D8', text: 'He visto a un líder de mi empresa admitir en público que no sabía algo y aprender de ello.' },
    { code: 'D8.3', dim: 'D8', text: 'Los líderes de mi empresa han cambiado de posición frente a una idea cuando les presentaron argumentos sólidos.' },
    { code: 'D8.4', dim: 'D8', text: 'El tiempo que los líderes dedican a aprender cosas nuevas es visible para el resto de la organización.' },
    { code: 'D8.5', dim: 'D8', text: 'En mi empresa, el liderazgo predica la innovación en el discurso y también experimenta con cosas nuevas en la práctica.' },
    { code: 'D8.6', dim: 'D8', text: 'Los directivos de mi empresa modelan con su comportamiento cotidiano los valores de apertura y aprendizaje que exigen a otros.' },
  ];

  const likertScale = [
    { value: 1, label: 'Totalmente en desacuerdo' },
    { value: 2, label: 'En desacuerdo' },
    { value: 3, label: 'Ni de acuerdo ni en desacuerdo' },
    { value: 4, label: 'De acuerdo' },
    { value: 5, label: 'Totalmente de acuerdo' },
  ];

  const openQuestions = [
    {
      id: 'P1',
      title: 'La última propuesta nueva',
      body: 'Describe la última vez que propusiste algo nuevo en tu empresa, o que viste a alguien proponer algo diferente. ¿Qué pasó? ¿Cómo reaccionó la organización? ¿Qué resultado tuvo esa iniciativa?',
    },
    {
      id: 'P3',
      title: 'La oportunidad que se dejó pasar',
      body: '¿En qué momento sentiste —o viste— que tu empresa dejó pasar una oportunidad de negocio, de mejora o de cambio por miedo, por no querer mover lo que estaba establecido, o por falta de capacidad? Describe lo que ocurrió.',
    },
    {
      id: 'P5',
      title: "Lo que aquí 'nunca' podría cambiar",
      body: 'En tu empresa, ¿qué proceso o práctica sientes que es prácticamente imposible cambiar, aunque todos supieran que mejoraría el funcionamiento? ¿Por qué crees que no cambia?',
    },
    {
      id: 'P6',
      title: 'Inteligencia artificial: el primer pensamiento',
      body: 'Si mañana la dirección de tu empresa anunciara que van a implementar herramientas de inteligencia artificial para apoyar el trabajo del equipo, ¿cuál sería tu primera reacción y la del equipo a tu alrededor?',
    },
    {
      id: 'P7',
      title: 'El líder que más recuerdas',
      body: 'Piensa en el líder de tu empresa (actual o pasado) que más ha influido en la forma en que se hacen las cosas. ¿Qué hacía o decía ese líder que marcó la cultura del equipo?',
    },
  ];

  return { demographics, dimensions, likert, likertScale, openQuestions };
})();
