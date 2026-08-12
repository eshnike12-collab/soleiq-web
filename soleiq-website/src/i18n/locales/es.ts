import type { Dictionary } from './en'

/**
 * Spanish (es) — neutral, usable in Spain and Latin America.
 *
 * "Screening" is kept as cribado, which is the term used in Spanish clinical
 * guidance for the diabetic foot; "detección" alone would read as diagnosis,
 * which is exactly the claim this site does not make.
 */
const es: Dictionary = {
  meta: {
    title: 'SoleIQ — cribado del pie diabético asistido por IA',
    description:
      'Cribado del pie diabético asistido por IA a partir de cuatro fotos guiadas con el móvil. Herramienta de cribado y apoyo a la decisión, no un dispositivo de diagnóstico.',
  },

  a11y: {
    skipToContent: 'Ir al contenido',
  },

  language: {
    label: 'Idioma',
    change: 'Cambiar idioma',
    loading: 'Cargando…',
  },

  nav: {
    howItWorks: 'Cómo funciona',
    research: 'Investigación',
    about: 'Quiénes somos',
    contact: 'Contacto',
    inPractice: 'En la práctica',
    app: 'App',
    dashboard: 'Panel',
    openApp: 'Abrir la app de SoleIQ',
    openDashboard: 'Abrir tu panel de SoleIQ',
    backToTop: 'SoleIQ Health, volver arriba',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    primary: 'Principal',
    primaryMobile: 'Principal, móvil',
    disclaimerShort:
      'Cribado y apoyo a la decisión para el pie diabético. No es un dispositivo de diagnóstico.',
  },

  hero: {
    slogan: 'Detección temprana, protección de por vida',
    body: 'Plataforma de salud pública con IA que identifica antes el deterioro, mejora la coordinación asistencial, llega a poblaciones diabéticas desatendidas y reduce amputaciones evitables y costes sanitarios.',
    startScreening: 'Iniciar un cribado',
    openDashboard: 'Abrir tu panel',
    scrollCue: 'Ver cómo funciona',
  },

  features: {
    heading: 'Qué hace SoleIQ',
    capture: {
      kicker: 'Captura guiada',
      headline: 'Lo difícil es hacer una foto utilizable. De eso se encarga la app.',
      body: 'El encuadre, el pulso y la iluminación se comprueban en el dispositivo antes de subir nada. Si una de las cuatro no sirve, solo repites esa.',
      label: 'App',
      visualLabel:
        'Representación en partículas de la captura guiada: un móvil sostenido sobre un pie, con las cuatro fotografías apareciendo en su pantalla.',
    },
    report: {
      kicker: 'Informe clínico',
      headline: 'Tu profesional abre un historial, no una fotografía.',
      body: 'Los hallazgos señalados sobre tus propias imágenes, toda la anamnesis que hay detrás (antecedentes, HbA1c, estado vascular, neuropatía, mapa del dolor) y un asistente limitado a ese único paciente.',
      careTeam: 'Tu equipo asistencial',
      patientRecord: 'Historial del paciente',
      visualLabel:
        'Representación en partículas del informe clínico: un panel que recibe el historial, con los hallazgos señalados sobre la fotografía del paciente.',
    },
    timeline: {
      kicker: 'Cronología compartida',
      headline: 'Un cribado es un dato. Una serie es una dirección.',
      body: 'Cada revisión se guarda como un conjunto fechado de fotos y niveles, de modo que un cambio demasiado lento para notarlo día a día resulta evidente al compararlos.',
      riskOverTime: 'Riesgo en el tiempo',
      visualLabel:
        'Representación en partículas de la cronología compartida: cribados fechados sobre un eje, con un marcador que recorre la curva descendente de riesgo y vuelve.',
    },
  },

  narrative: {
    problem: {
      kicker: 'El problema',
      headline: 'Empieza como algo que no puedes sentir.',
      body: 'La neuropatía diabética elimina la señal que normalmente te haría mirarte el pie. La presión, una ampolla, una grieta en la piel: nada de eso duele, así que nada lleva a revisarlo. Detectada pronto, una úlcera del pie suele ser manejable. Detectada tarde, a menudo no lo es.',
    },
    capture: {
      kicker: 'Captura',
      headline: 'Cuatro fotos guiadas. ≈4 minutos.',
      body: 'Ambos pies, dorso y planta, con el móvil que ya tienes. La app encuadra cada toma y te mantiene firme durante ella. Sin accesorios, sin soporte, sin cita.',
      app: 'App',
    },
    analysis: {
      kicker: 'Análisis',
      headline: 'Se comprueba en tu móvil y luego se lee junto a tu historial.',
      body: 'Los controles de calidad y la normalización de la luz se ejecutan en el dispositivo antes de subir nada. Un modelo de visión lee después las cuatro imágenes junto con tu anamnesis (antecedentes de diabetes, HbA1c, respuestas sobre EAP y estado vascular, neuropatía, historia del pie, mapa del dolor) y devuelve uno de cuatro niveles de cribado.',
      aiAnalysis: 'Análisis con IA',
      riskLevel: 'Nivel de riesgo',
    },
    handover: {
      kicker: 'Traspaso',
      headline: 'Tu profesional recibe el historial completo.',
      body: 'Cada campo de la anamnesis, los hallazgos señalados sobre tus propias fotografías y el historial completo, con un asistente limitado a ese historial. Tú decides a quién se envía.',
      careTeam: 'Tu equipo asistencial',
      patientRecord: 'Historial del paciente',
    },
    overTime: {
      kicker: 'Con el tiempo',
      headline: 'Un historial que se acumula y un riesgo que puede bajar.',
      body: 'Cada cribado se guarda como un conjunto fechado de fotos y niveles. Un cambio demasiado lento para notarlo día a día se vuelve evidente en una cronología, y también la dirección que lleva.',
      note: 'Ilustrativo. No son datos de pacientes.',
      riskOverTime: 'Riesgo en el tiempo',
    },
    close: {
      headline: 'SoleIQ',
      body: 'Cribado y apoyo a la decisión para el pie diabético. No es un dispositivo de diagnóstico.',
    },
    loading: 'Preparando la secuencia',
    loadingLong: 'Cargando la secuencia de desplazamiento de SoleIQ.',
  },

  journeys: {
    eyebrow: 'En la práctica',
    heading: 'Los mismos pies, dos entornos, y qué cambia cuando la revisión se hace en casa.',
    lede: 'Estos son los recorridos para los que SoleIQ está diseñado. Describen cómo se usa el producto. No son afirmaciones sobre resultados.',
    chooseSetting: 'Elegir un entorno',
    withoutTitle: 'Sin SoleIQ',
    withTitle: 'Con SoleIQ',
    changesHeading: 'Qué cambia realmente',
    cadence: 'Frecuencia',
    rural: {
      label: 'Rural',
      person:
        'Un agricultor con diabetes tipo 2 y sensibilidad reducida en ambos pies. La clínica del pie más cercana es un viaje, no un trayecto.',
      without: [
        'La presión se acumula bajo el antepié. Con neuropatía, no se siente nada.',
        'Nada lleva a mirar. Los pies no forman parte de la rutina diaria.',
        'Se descubre cuando un calcetín se pega, o cuando otra persona lo nota.',
        'Ir a la clínica supone transporte, gasto y un día de trabajo perdido.',
        'La visita ocurre cuando la herida ya es imposible de ignorar.',
        'La atención empieza en el punto en que atender es más difícil.',
      ],
      with: [
        'Un cribado en casa: cuatro fotos, hechas por un familiar si hace falta.',
        'Las fotos se comprueban en el móvil antes de subir nada.',
        'Vuelve un nivel de cribado con los hallazgos marcados sobre las fotos.',
        'El historial se envía por adelantado a la clínica o al agente de salud.',
        'El viaje se hace una vez, a propósito, con un historial ya en la mano.',
        'Entre visitas, la cronología sigue vigilando.',
      ],
      cadenceWithout: 'Revisado cuando alguien se fija por casualidad',
      cadenceWith: 'Revisado con una pauta fija, en casa',
      visualLabel:
        'Representación en partículas de una casa de campo entre árboles, con hojas en el aire.',
    },
    urban: {
      label: 'Urbano',
      person:
        'Una persona con diabetes tipo 2 que va a diario al trabajo y tiene un callo que reaparece. Hay cita de podología disponible, con el tiempo.',
      without: [
        'Un callo se engrosa y la piel alrededor cambia de color. Fácil de descartar.',
        'Pedir cita de podología significa entrar en una lista de espera.',
        'La cita llega, o se reprograma, o se pierde.',
        'En la consulta, el profesional ve el pie de hoy y nada anterior.',
        'Se dan indicaciones; el seguimiento depende de recordar cómo se veía.',
        'El siguiente cambio queda sin medir hasta la próxima cita.',
      ],
      with: [
        'Un cribado en casa lleva unos minutos, antes de ir a trabajar.',
        'Los hallazgos se marcan sobre las propias fotografías del paciente.',
        'El nivel dice si esto es revisar-en-una-semana o pedir-cita-ya.',
        'Las citas van a quienes su nivel indica que las necesitan.',
        'El profesional abre una serie fechada de fotos en vez de una hoja en blanco.',
        'El seguimiento se mide contra imágenes, no contra la memoria.',
      ],
      cadenceWithout: 'Revisado en las citas',
      cadenceWith: 'Revisado también entre citas',
      visualLabel:
        'Representación en partículas del perfil de una ciudad bajo un cielo que pasa del día a la noche.',
    },
    comparison: [
      {
        q: 'Quién lo nota primero',
        without: 'Quien se fije por casualidad, que con neuropatía suele ser nadie.',
        with: 'Una revisión rutinaria que no depende de poder sentirlo.',
      },
      {
        q: 'Qué ve el profesional',
        without: 'El pie tal como está hoy.',
        with: 'Una serie fechada, de modo que se ve hacia dónde va.',
      },
      {
        q: 'Qué motiva una visita',
        without: 'Una herida que ya se ha vuelto evidente.',
        with: 'Un nivel de cribado, con el motivo adjunto.',
      },
      {
        q: 'Cuánto cuesta un desplazamiento',
        without: 'Lo mismo, resulte necesario o no.',
        with: 'Lo mismo, pero hecho por un motivo que puedes señalar.',
      },
    ],
  },

  progression: {
    eyebrow: 'Progresión',
    heading: 'El recorrido completo, y la parte a la que llega una cámara.',
    lede: 'Una úlcera del pie diabético no aparece; progresa. Selecciona cualquier grado para ver qué ocurre en el pie en ese punto y qué puede y qué no puede establecer una fotografía.',
    gradesLabel: 'Grados de Wagner',
    grade: 'Grado',
    gradesRange: 'Grados {from}–{to}',
    whatPhotoShows: 'Qué muestra una foto',
    whatSoleIQDoes: 'Qué hace SoleIQ',
    trajectory: 'Trayectoria típica en el peor de los casos',
    play: 'Reproducir recorrido',
    pause: 'Pausar recorrido',
    windows: {
      soleiq: {
        title: 'Donde actúa SoleIQ',
        line: 'Detectarlo antes de que la piel llegue a romperse.',
      },
      standard: {
        title: 'Donde suele empezar la atención',
        line: 'Cuando duele o huele, el daño ya está hecho.',
      },
    },
    caveat:
      'Wagner gradúa la gravedad en un momento concreto; no es una secuencia temporal validada. Los intervalos anteriores describen una trayectoria en el peor de los casos en un pie no tratado o mal controlado. Muchas personas acuden ya en grado 2 o 3 y, con buena descarga, perfusión y control de la infección, alrededor del 60 al 80 por ciento de las úlceras cicatrizan en 12 a 20 semanas sin llegar a progresar. En un pie isquémico la misma secuencia puede reducirse a días. SoleIQ es una ayuda de seguimiento y triaje, no un dispositivo de diagnóstico, y no gradúa heridas.',
    stages: [
      {
        name: 'Sin lesión abierta',
        plain: 'Piel íntegra, pie de riesgo',
        what: 'La piel está intacta. Puede haber callo, deformidad o un punto de presión formándose debajo, y con neuropatía nada de ello se siente.',
        camera:
          'Aquí es donde una fotografía resulta más útil, porque no hay nada que sentir ni nada que nadie esté buscando. Lo que capta es una referencia: el callo, el color, la forma, con fecha.',
        soleiq:
          'Este es el grado para el que se creó SoleIQ. El cribado periódico establece qué aspecto tiene normalmente este pie, para que un cambio tenga respecto a qué ser un cambio.',
        whenLabel: 'Referencia',
        whenDetail: 'piel íntegra, pie de riesgo',
        toNext: 'Suceso desencadenante: de días a semanas',
      },
      {
        name: 'Úlcera superficial',
        plain: 'La piel se ha roto',
        what: 'Pérdida cutánea de espesor total que no ha llegado al tendón, la cápsula ni el hueso. A menudo indolora, que es justamente por lo que no se comunica.',
        camera:
          'Visible. Una rotura de la piel, sus bordes y el enrojecimiento alrededor son rasgos de superficie, y los rasgos de superficie son lo que una cámara lee bien.',
        soleiq:
          'Un cribado en este grado devuelve un nivel que dice que hay que hacérselo mirar, con el hallazgo marcado sobre la propia fotografía del paciente y las semanas anteriores al lado.',
        whenLabel: 'Mes 0',
        whenDetail: 'inicio de la úlcera, empieza el reloj',
        toNext: 'Unas 2 a 8 semanas',
      },
      {
        name: 'Úlcera profunda',
        plain: 'Hasta el tendón o el hueso',
        what: 'La úlcera se extiende hasta el tendón, la cápsula articular o el hueso, sin absceso ni osteomielitis.',
        camera:
          'La abertura es visible; la profundidad no. Ninguna fotografía dice hasta dónde llega una herida, y este es el grado en que ese límite empieza a importar.',
        soleiq:
          'Se marca como urgente y se traspasa con el historial adjunto. La profundidad es un hallazgo de sondaje, hecho por un profesional; el trabajo de la app es asegurarse de que alguien sostenga la sonda.',
        whenLabel: 'Mes 0,5 a 2',
        whenDetail: 'desde la primera rotura de la piel',
        toNext: 'De 1 a 3 meses aproximadamente',
      },
      {
        name: 'Osteítis o absceso',
        plain: 'La infección ha llegado al hueso',
        what: 'Infección profunda: absceso, osteomielitis o tendinitis infecciosa. Es el punto en que la pregunta deja de ser curar la herida y pasa a ser salvar el pie.',
        camera:
          'Fuera del alcance de una cámara. La afectación ósea se establece con sondaje, imagen y analítica, no mirando la piel.',
        soleiq:
          'Aquí ya nada es un problema de cribado. El valor que SoleIQ podía aportar a este grado se gastó meses antes, en los grados 0 y 1.',
        whenLabel: 'Mes 2 a 5',
        whenDetail: 'afectación ósea, sondaje hasta hueso',
        toNext: 'De 1 a 3 meses aproximadamente',
      },
      {
        name: 'Gangrena parcial',
        plain: 'Muerte tisular, amenaza para el miembro',
        what: 'Gangrena localizada, habitualmente en el antepié o los dedos. Las decisiones de revascularización y cirugía se toman contrarreloj.',
        camera:
          'Fuera del alcance de una cámara y del cribado. Esto es atención hospitalaria.',
        soleiq:
          'Fuera de alcance. Se incluye aquí porque el recorrido hay que mostrarlo entero para que se crea.',
        whenLabel: 'Mes 4 a 9',
        whenDetail: 'muerte tisular, amenaza para el miembro',
        toNext: 'De días a semanas',
      },
      {
        name: 'Gangrena extensa',
        plain: 'Todo el pie',
        what: 'Gangrena de todo el pie. Terreno de amputación mayor.',
        camera: 'Fuera del alcance de una cámara.',
        soleiq:
          'Fuera de alcance, y el desenlace que los dos primeros grados existen para evitar.',
        whenLabel: 'Mes 6 a 18',
        whenDetail: 'terreno de amputación mayor',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: 'Investigación',
    heading: 'El trabajo que hay detrás del cribado, y la literatura en la que se inscribe.',
    lede: 'Nuestro propio artículo está abajo. Debajo hay una búsqueda en vivo sobre la literatura publicada, mantenida aparte y claramente señalada, para que nunca se confundan.',
    advisors: 'SoleIQ ha contado con el asesoramiento de más de 50 investigadores, médicos y cirujanos que trabajan en inteligencia artificial, ingeniería biomédica y medicina clínica en todo el país.',
    searchHeading: 'Buscar en la literatura',
    searchPlaceholder: 'úlcera del pie diabético, descarga, cribado de neuropatía',
    searchHint:
      'Busca un tema, como úlcera del pie diabético, descarga o cribado de neuropatía, y los registros que coincidan aparecerán aquí.',
    searching: 'Buscando en Europe PMC',
    searchError: 'Algo ha fallado al ejecutar esa búsqueda.',
    noResults: 'Ningún registro coincide con «{query}». Prueba un término más amplio.',
    resultsFor: '{count} resultados para {query}',
    openAccess: 'Acceso abierto',
    readFullText: 'Leer el texto completo',
    abstract: 'Resumen',
    readFullAbstract: 'Leer el resumen completo',
    showLess: 'Mostrar menos',
    correspondingAuthor: 'Autor de correspondencia',
    topics: 'Temas',
    status: {
      published: 'Publicado',
      preprint: 'Preprint',
    },
  },

  about: {
    eyebrow: 'Quiénes somos',
    heading:
      'La mayoría de las úlceras del pie diabético se detectan tarde. No porque estén escondidas, sino porque nadie estaba mirando.',
    paragraphs: [
      'La neuropatía diabética elimina la señal que normalmente llevaría a alguien a mirarse el pie. La presión, una ampolla, una grieta en la piel: nada de eso duele, así que nada lleva a revisarlo. Cuando se examina el pie, la pregunta ha dejado de ser «¿esto es algo?» y ha pasado a ser «¿cuánto de esto se puede salvar?».',
      'Una exploración clínica del pie resuelve esto, y no es el cuello de botella que podemos arreglar. Las citas escasean, desplazarse es caro y el intervalo entre visitas es justo donde se desarrolla el problema.',
      'SoleIQ cierra ese intervalo con lo que todo paciente ya tiene: la cámara de un móvil y unos minutos. Cuatro fotos, leídas junto al historial que determina el riesgo, producen un nivel de cribado sobre el que una persona puede actuar y un registro en el que un profesional puede confiar lo bastante como para trabajar.',
      'Somos cuidadosos con lo que afirmamos. SoleIQ criba; no diagnostica. Está hecho para llevar a la gente a la atención antes y con mejor información, no para mantenerla alejada de ella.',
      'Esa restricción da forma al producto. El modelo nunca ve una foto que el móvil ha juzgado inservible. Los hallazgos se muestran sobre las propias imágenes del paciente, para que la persona vea lo que vio el sistema. Cada cribado permanece en una cronología, porque un solo fotograma es una señal más débil que una serie. Y el registro pertenece al paciente, que decide qué profesional lo ve.',
    ],
    team: 'Equipo',
    roles: {
      founder: 'Fundador y CEO, SoleIQ Health',
    },
    bios: {
      eshaan:
        'Dirige la plataforma de principio a fin: el modelo de cribado, el producto y el programa de investigación que hay detrás. Ha publicado sobre prevención guiada por IA para el pie diabético con el Dr. David G. Armstrong.',
    },
    onLinkedIn: '{name} en LinkedIn',
  },

  blog: {
    eyebrow: 'Escritos',
    heading: 'Notas de quienes lo están construyendo.',
    defaultCategory: 'Notas',
    readingTime: '{minutes} min',
    minutesShort: '{minutes} min',
    readMore: 'Leer',
    closeArticle: 'Cerrar artículo',
    originalLanguage: 'Los artículos se muestran en el idioma en que se escribieron.',
  },

  contact: {
    eyebrow: 'Contacto',
    heading: 'Ponte en contacto.',
    body: 'Alianzas clínicas, colaboración en investigación, prensa o una duda sobre el producto. Esto nos llega directamente.',
    orEmail: 'O escribe a',
    noMedicalDetails:
      'Por favor, no envíes datos médicos ni imágenes por este formulario. No es un canal clínico y no se vigila para problemas urgentes.',
    name: 'Nombre',
    email: 'Correo electrónico',
    message: 'Mensaje',
    send: 'Enviar mensaje',
    sending: 'Enviando…',
    sent: 'Mensaje enviado.',
    sentBody: 'Gracias. Te responderemos a {email}.',
    sendAnother: 'Enviar otro',
    errors: {
      name: 'Dinos tu nombre, por favor.',
      email: 'Añade una dirección de correo, por favor.',
      emailInvalid: 'Esa dirección de correo no parece correcta.',
      message: 'Incluye un mensaje, por favor.',
      failed: 'No se ha podido enviar. Escríbenos por correo.',
    },
  },

  footer: {
    heading: 'Pie de página',
    tagline:
      'Cribado del pie diabético asistido por IA a partir de cuatro fotos guiadas con el móvil.',
    openApp: 'Abrir la app',
    dashboard: 'Panel',
    emailUs: 'Escríbenos',
    privacy: 'Privacidad',
    terms: 'Condiciones',
    nav: 'Pie de página',
    onNetwork: 'SoleIQ Health en {network}',
    disclaimer:
      'SoleIQ es una herramienta de cribado y apoyo a la decisión. No es un dispositivo de diagnóstico, no proporciona consejo médico y no sustituye la valoración de un profesional cualificado. Si tienes una herida, una infección, dolor repentino o un cambio en el color o la temperatura de un pie, busca atención médica de inmediato.',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: 'Pie izquierdo, planta',
    fitFootInFrame: 'Encaja el pie dentro del marco',
    photoQuality: 'Calidad de la foto',
    wholeFootInFrame: 'Pie entero en el encuadre',
    sharpEnough: 'Bastante nítida para analizar',
    lightingNormalised: 'Iluminación normalizada',
    retakeTooDark: 'Repite el pie derecho, demasiado oscura',
    analysing: 'Analizando',
    inputs: 'Entradas',
    diabetesHistory: 'Antecedentes de diabetes',
    vascularAnswers: 'Respuestas vasculares',
    neuropathy: 'Neuropatía',
    painMap: 'Mapa del dolor',
    screeningLevel: 'Nivel de cribado',
    watch: 'Vigilar',
    resultBody:
      'Dos zonas que conviene vigilar. Repite la revisión en 7 días y pide cita si alguna cambia.',
    shareRecord: 'Compartir tu historial',
    podiatryClinic: 'Tu clínica de podología',
    fullHistory: 'Historial completo, cada foto, cada nivel de cribado.',
    sendRecord: 'Enviar historial',
    clinicianView: 'Vista del profesional',
    clinicalReport: 'Informe clínico',
    photoComparison: 'Comparación de fotos',
    perPatientAssistant: 'Asistente por paciente',
    yourTimeline: 'Tu cronología',
    today: 'Hoy',
    levels: {
      clear: 'Sin hallazgos',
      watch: 'Vigilar',
      soon: 'Pronto',
      urgent: 'Urgente',
    },
  },
}

export default es
