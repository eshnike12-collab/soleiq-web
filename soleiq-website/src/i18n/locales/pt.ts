import type { Dictionary } from './en'

/** Portuguese (pt-BR). Brazilian spelling and vocabulary, which is where most
 *  Portuguese speakers are; "rastreamento" for screening, never "diagnóstico". */
const pt: Dictionary = {
  meta: {
    title: 'SoleIQ — rastreamento do pé diabético assistido por IA',
    description:
      'Rastreamento do pé diabético assistido por IA a partir de quatro fotos guiadas pelo celular. Ferramenta de rastreamento e apoio à decisão, não um dispositivo de diagnóstico.',
  },

  a11y: { skipToContent: 'Ir para o conteúdo' },

  language: { label: 'Idioma', change: 'Mudar de idioma', loading: 'Carregando…' },

  nav: {
    howItWorks: 'Como funciona',
    research: 'Pesquisa',
    about: 'Sobre',
    contact: 'Contato',
    inPractice: 'Na prática',
    app: 'App',
    dashboard: 'Painel',
    openApp: 'Abrir o app do SoleIQ',
    openDashboard: 'Abrir seu painel do SoleIQ',
    backToTop: 'SoleIQ Health, voltar ao topo',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    primary: 'Principal',
    primaryMobile: 'Principal, celular',
    disclaimerShort:
      'Rastreamento e apoio à decisão para o pé diabético. Não é um dispositivo de diagnóstico.',
  },

  hero: {
    slogan: 'Detecção precoce, proteção para a vida toda',
    body: 'Plataforma de saúde pública com IA que identifica a deterioração mais cedo, melhora a coordenação do cuidado, alcança populações diabéticas desassistidas e reduz amputações evitáveis e custos de saúde.',
    startScreening: 'Iniciar um rastreamento',
    openDashboard: 'Abrir seu painel',
    scrollCue: 'Veja como funciona',
  },

  features: {
    heading: 'O que o SoleIQ faz',
    capture: {
      kicker: 'Captura guiada',
      headline: 'O difícil é tirar uma foto utilizável. Por isso o app faz isso.',
      body: 'Enquadramento, estabilidade e iluminação são conferidos no aparelho antes de qualquer envio. Se uma das quatro não servir, você refaz só aquela.',
      label: 'App',
      visualLabel:
        'Representação em partículas da captura guiada: um celular sobre um pé, com as quatro fotos surgindo na tela.',
    },
    report: {
      kicker: 'Relatório clínico',
      headline: 'Seu profissional abre um prontuário, não uma foto.',
      body: 'Achados marcados nas suas próprias imagens, toda a anamnese por trás deles (histórico, HbA1c, estado vascular, neuropatia, mapa de dor) e um assistente restrito àquele único paciente.',
      careTeam: 'Sua equipe de cuidado',
      patientRecord: 'Prontuário do paciente',
      visualLabel:
        'Representação em partículas do relatório clínico: um painel recebendo o prontuário, com os achados marcados na foto do paciente.',
    },
    timeline: {
      kicker: 'Linha do tempo compartilhada',
      headline: 'Um rastreamento é um ponto. Uma série é uma direção.',
      body: 'Cada checagem fica guardada como um conjunto datado de fotos e níveis, de modo que uma mudança lenta demais para se notar no dia a dia fica evidente lado a lado.',
      riskOverTime: 'Risco ao longo do tempo',
      visualLabel:
        'Representação em partículas da linha do tempo compartilhada: rastreamentos datados ao longo de um eixo, com um marcador percorrendo a curva de risco decrescente e voltando.',
    },
  },

  narrative: {
    problem: {
      kicker: 'O problema',
      headline: 'Começa como algo que você não consegue sentir.',
      body: 'A neuropatia diabética elimina o sinal que normalmente faria você olhar o próprio pé. Pressão, uma bolha, uma rachadura na pele: nada disso dói, então nada leva a conferir. Encontrada cedo, uma úlcera no pé costuma ser manejável. Encontrada tarde, muitas vezes não é.',
    },
    capture: {
      kicker: 'Captura',
      headline: 'Quatro fotos guiadas. ≈4 minutos.',
      body: 'Os dois pés, dorso e planta, no celular que você já tem. O app enquadra cada foto e mantém você firme durante ela. Sem acessório, sem suporte, sem consulta.',
      app: 'App',
    },
    analysis: {
      kicker: 'Análise',
      headline: 'Conferido no seu celular e depois lido junto do seu histórico.',
      body: 'As checagens de qualidade e a normalização da luz rodam no aparelho antes de qualquer envio. Um modelo de visão então lê as quatro imagens junto da sua anamnese (histórico de diabetes, HbA1c, respostas vasculares e de DAP, neuropatia, histórico do pé, mapa de dor) e devolve um de quatro níveis de rastreamento.',
      aiAnalysis: 'Análise por IA',
      riskLevel: 'Nível de risco',
    },
    handover: {
      kicker: 'Encaminhamento',
      headline: 'Seu profissional recebe o prontuário inteiro.',
      body: 'Cada campo da anamnese, os achados marcados nas suas próprias fotos e o histórico completo, com um assistente restrito àquele prontuário. Você decide para quem vai.',
      careTeam: 'Sua equipe de cuidado',
      patientRecord: 'Prontuário do paciente',
    },
    overTime: {
      kicker: 'Ao longo do tempo',
      headline: 'Um registro que se acumula e um risco que pode cair.',
      body: 'Cada rastreamento fica guardado como um conjunto datado de fotos e níveis. Uma mudança lenta demais para se notar no dia a dia fica evidente numa linha do tempo — e a direção dela também.',
      note: 'Ilustrativo. Não são dados de pacientes.',
      riskOverTime: 'Risco ao longo do tempo',
    },
    close: {
      headline: 'SoleIQ',
      body: 'Rastreamento e apoio à decisão para o pé diabético. Não é um dispositivo de diagnóstico.',
    },
    loading: 'Preparando a sequência',
    loadingLong: 'Carregando a sequência de rolagem do SoleIQ.',
  },

  journeys: {
    eyebrow: 'Na prática',
    heading: 'Os mesmos pés, dois contextos, e o que muda quando a checagem acontece em casa.',
    lede: 'Estes são os percursos para os quais o SoleIQ foi desenhado. Eles descrevem como o produto é usado. Não são promessas de resultado.',
    chooseSetting: 'Escolha um contexto',
    withoutTitle: 'Sem o SoleIQ',
    withTitle: 'Com o SoleIQ',
    changesHeading: 'O que muda de fato',
    cadence: 'Frequência',
    rural: {
      label: 'Rural',
      person:
        'Um agricultor com diabetes tipo 2 e sensibilidade reduzida nos dois pés. A clínica do pé mais próxima é uma viagem, não um trajeto.',
      without: [
        'A pressão se acumula sob o antepé. Com a neuropatia, nada é sentido.',
        'Nada leva a olhar. Os pés não fazem parte da rotina diária.',
        'Descobre-se quando uma meia gruda, ou quando outra pessoa percebe.',
        'Ir à clínica significa transporte, custo e um dia de trabalho perdido.',
        'A visita acontece quando a ferida já é impossível de ignorar.',
        'O cuidado começa no ponto em que cuidar é mais difícil.',
      ],
      with: [
        'Um rastreamento em casa: quatro fotos, tiradas por um familiar se preciso.',
        'As fotos têm a qualidade conferida no celular antes de qualquer envio.',
        'Volta um nível de rastreamento com os achados marcados nas fotos.',
        'O prontuário é enviado antes para a clínica ou para o agente de saúde.',
        'A viagem é feita uma vez, de propósito, com o histórico já em mãos.',
        'Entre as visitas, a linha do tempo continua olhando.',
      ],
      cadenceWithout: 'Olhado quando alguém por acaso olha',
      cadenceWith: 'Olhado com regularidade, em casa',
      visualLabel: 'Representação em partículas de uma casa entre árvores, com folhas no ar.',
    },
    urban: {
      label: 'Urbano',
      person:
        'Uma pessoa com diabetes tipo 2 que faz o trajeto diário para o trabalho e tem um calo que sempre volta. Há consulta de podologia disponível — em algum momento.',
      without: [
        'Um calo engrossa e a pele em volta muda de cor. Fácil de descartar.',
        'Marcar podologia significa entrar numa fila.',
        'A consulta chega, ou é remarcada, ou é perdida.',
        'Na sala, o profissional vê o pé de hoje e nada de antes.',
        'Dá-se orientação; o acompanhamento depende de lembrar como estava.',
        'A próxima mudança fica sem medição até a próxima consulta.',
      ],
      with: [
        'Um rastreamento em casa leva poucos minutos, antes do trabalho.',
        'Os achados são marcados nas próprias fotos do paciente.',
        'O nível diz se é reavaliar em uma semana ou marcar agora.',
        'As vagas vão para quem o nível indica que precisa.',
        'O profissional abre uma série de fotos datadas em vez de uma folha em branco.',
        'O acompanhamento é medido em imagens, não em lembrança.',
      ],
      cadenceWithout: 'Olhado nas consultas',
      cadenceWith: 'Olhado também entre as consultas',
      visualLabel:
        'Representação em partículas de um horizonte urbano sob um céu que passa do dia à noite.',
    },
    comparison: [
      {
        q: 'Quem percebe primeiro',
        without: 'Quem por acaso olhar, o que com neuropatia costuma ser ninguém.',
        with: 'Uma checagem de rotina que não depende de conseguir sentir.',
      },
      {
        q: 'O que o profissional vê',
        without: 'O pé como está hoje.',
        with: 'Uma série datada, em que a direção fica visível.',
      },
      {
        q: 'O que motiva uma visita',
        without: 'Uma ferida que já ficou óbvia.',
        with: 'Um nível de rastreamento, com o motivo junto.',
      },
      {
        q: 'Quanto custa um deslocamento',
        without: 'O mesmo, sendo necessário ou não.',
        with: 'O mesmo, mas feito por um motivo que dá para apontar.',
      },
    ],
  },

  progression: {
    eyebrow: 'Progressão',
    heading: 'O caminho inteiro, e a parte dele que uma câmera alcança.',
    lede: 'Uma úlcera do pé diabético não aparece; ela progride. Selecione qualquer grau para ver o que é verdade sobre o pé naquele ponto, e o que uma foto pode e não pode estabelecer ali.',
    gradesLabel: 'Graus de Wagner',
    grade: 'Grau',
    gradesRange: 'Graus {from}–{to}',
    whatPhotoShows: 'O que uma foto mostra',
    whatSoleIQDoes: 'O que o SoleIQ faz',
    trajectory: 'Trajetória típica de pior caso',
    play: 'Reproduzir apresentação',
    pause: 'Pausar apresentação',
    windows: {
      soleiq: { title: 'Onde o SoleIQ atua', line: 'Pegar antes que a pele chegue a romper.' },
      standard: {
        title: 'Onde o cuidado costuma começar',
        line: 'Quando dói ou cheira, o dano já está feito.',
      },
    },
    caveat:
      'Wagner classifica a gravidade em um dado momento; não é uma sequência temporal validada. Os intervalos acima descrevem uma trajetória de pior caso em um pé não tratado ou mal controlado. Muitas pessoas chegam já em grau 2 ou 3 e, com bom alívio de pressão, perfusão e controle de infecção, cerca de 60 a 80 por cento das úlceras cicatrizam em 12 a 20 semanas sem nunca progredir. Em um pé isquêmico, a mesma sequência pode se comprimir em dias. O SoleIQ é um apoio de monitoramento e triagem, não um dispositivo de diagnóstico, e não classifica feridas.',
    stages: [
      {
        name: 'Sem lesão aberta',
        plain: 'Pele íntegra, pé em risco',
        what: 'A pele está inteira. Pode haver calo, deformidade ou um ponto de pressão se formando por baixo — e, com neuropatia, nada disso é sentido.',
        camera:
          'É aqui que uma foto é mais útil, porque não há nada a sentir e ninguém está procurando nada. O que ela registra é uma referência: o calo, a cor, o formato, com data.',
        soleiq:
          'Este é o grau para o qual o SoleIQ foi feito. O rastreamento regular estabelece como este pé normalmente é, para que uma mudança tenha em relação a que ser mudança.',
        whenLabel: 'Referência',
        whenDetail: 'pele íntegra, pé em risco',
        toNext: 'Evento desencadeante — dias a semanas',
      },
      {
        name: 'Úlcera superficial',
        plain: 'A pele se rompeu',
        what: 'Perda cutânea de espessura total que não atingiu tendão, cápsula ou osso. Muitas vezes indolor, e é exatamente por isso que não é relatada.',
        camera:
          'Visível. Um rompimento da pele, suas margens e a vermelhidão em volta são características de superfície, e características de superfície são o que uma câmera lê bem.',
        soleiq:
          'Um rastreamento neste grau devolve um nível que diz para levar isso a alguém, com o achado marcado na própria foto do paciente e as semanas anteriores ao lado.',
        whenLabel: 'Mês 0',
        whenDetail: 'início da úlcera, o relógio começa',
        toNext: 'Cerca de 2 a 8 semanas',
      },
      {
        name: 'Úlcera profunda',
        plain: 'Até tendão ou osso',
        what: 'A úlcera se estende até tendão, cápsula articular ou osso, sem abscesso ou osteomielite.',
        camera:
          'A abertura é visível; a profundidade não. Nenhuma foto diz até onde vai uma ferida, e este é o grau em que esse limite começa a pesar.',
        soleiq:
          'Sinalizado como urgente e encaminhado com o histórico junto. Profundidade é um achado de sondagem, feito por um profissional — o trabalho do app é garantir que alguém esteja com a sonda na mão.',
        whenLabel: 'Mês 0,5 a 2',
        whenDetail: 'desde o primeiro rompimento da pele',
        toNext: 'Cerca de 1 a 3 meses',
      },
      {
        name: 'Osteíte ou abscesso',
        plain: 'A infecção chegou ao osso',
        what: 'Infecção profunda: abscesso, osteomielite ou tendinite infecciosa. É aqui que a pergunta deixa de ser curar a ferida e passa a ser salvar o pé.',
        camera:
          'Além de uma câmera. O acometimento ósseo se estabelece por sondagem, imagem e exames de sangue — não olhando a pele.',
        soleiq:
          'Aqui nada mais é um problema de rastreamento. O valor que o SoleIQ podia somar neste grau foi gasto meses antes, nos graus 0 e 1.',
        whenLabel: 'Mês 2 a 5',
        whenDetail: 'acometimento ósseo, sondagem até o osso',
        toNext: 'Cerca de 1 a 3 meses',
      },
      {
        name: 'Gangrena parcial',
        plain: 'Morte tecidual, membro ameaçado',
        what: 'Gangrena localizada — comumente no antepé ou nos dedos. Decisões de revascularização e cirurgia são tomadas sob pressão de tempo.',
        camera: 'Além de uma câmera e além do rastreamento. Isto é cuidado hospitalar.',
        soleiq:
          'Fora de escopo. Incluído aqui porque o caminho precisa ser mostrado inteiro para ser acreditado.',
        whenLabel: 'Mês 4 a 9',
        whenDetail: 'morte tecidual, membro ameaçado',
        toNext: 'Dias a semanas',
      },
      {
        name: 'Gangrena extensa',
        plain: 'O pé inteiro',
        what: 'Gangrena do pé inteiro. Território de amputação maior.',
        camera: 'Além de uma câmera.',
        soleiq: 'Fora de escopo — e o desfecho que os dois primeiros graus existem para evitar.',
        whenLabel: 'Mês 6 a 18',
        whenDetail: 'território de amputação maior',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: 'Pesquisa',
    heading: 'O trabalho por trás do rastreamento, e a literatura em que ele se inscreve.',
    lede: 'Nosso próprio artigo está abaixo. Sob ele, uma busca ao vivo na literatura publicada, mantida à parte e claramente identificada, para que as duas nunca se confundam.',
    advisors:
      'O SoleIQ contou com a assessoria de mais de 50 pesquisadores, médicos e cirurgiões que atuam em inteligência artificial, engenharia biomédica e medicina clínica em todo o país.',
    searchHeading: 'Buscar na literatura',
    searchPlaceholder: 'diabetic foot ulcer, offloading, neuropathy screening',
    searchHint:
      'Busque um tema, como diabetic foot ulcer, offloading ou neuropathy screening, e os registros correspondentes aparecerão aqui.',
    searching: 'Buscando no Europe PMC',
    searchError: 'Algo deu errado ao executar essa busca.',
    noResults: 'Nenhum registro corresponde a “{query}”. Tente um termo mais amplo.',
    resultsFor: '{count} resultados para {query}',
    openAccess: 'Acesso aberto',
    readFullText: 'Ler o texto completo',
    abstract: 'Resumo',
    readFullAbstract: 'Ler o resumo completo',
    showLess: 'Mostrar menos',
    correspondingAuthor: 'Autor correspondente',
    topics: 'Temas',
    status: { published: 'Publicado', preprint: 'Preprint' },
  },

  about: {
    eyebrow: 'Sobre',
    heading:
      'A maioria das úlceras do pé diabético é encontrada tarde. Não porque estejam escondidas, mas porque ninguém estava olhando.',
    paragraphs: [
      'A neuropatia diabética elimina o sinal que normalmente faria alguém olhar o próprio pé. Pressão, uma bolha, uma rachadura na pele: nada disso dói, então nada leva a conferir. Quando o pé enfim é examinado, a pergunta em geral já deixou de ser “isso é alguma coisa?” e virou “quanto disso dá para salvar?”',
      'Um exame clínico do pé resolve isso, e não é o gargalo que podemos consertar. Consultas são escassas, deslocar-se é caro, e o intervalo entre as visitas é exatamente onde o problema se desenvolve.',
      'O SoleIQ fecha esse intervalo com o que todo paciente já tem: a câmera de um celular e alguns minutos. Quatro fotos, lidas junto do histórico que determina o risco, produzem um nível de rastreamento sobre o qual a pessoa pode agir e um registro em que um profissional confia o bastante para trabalhar.',
      'Somos cuidadosos com o que afirmamos. O SoleIQ rastreia; não diagnostica. Foi feito para levar as pessoas ao cuidado mais cedo e com melhor informação, não para mantê-las longe dele.',
      'Essa restrição molda o produto. O modelo nunca vê uma foto que o celular julgou inutilizável. Os achados são mostrados nas próprias imagens do paciente, para que a pessoa veja o que o sistema viu. Cada rastreamento permanece numa linha do tempo, porque um quadro isolado é um sinal mais fraco que uma série. E o registro pertence ao paciente, que decide qual profissional o vê.',
    ],
    team: 'Equipe',
    roles: { founder: 'Fundador e CEO, SoleIQ Health' },
    bios: {
      eshaan:
        'Conduz a plataforma de ponta a ponta: o modelo de rastreamento, o produto e o programa de pesquisa por trás dele. Publicou sobre prevenção guiada por IA para o pé diabético com o Dr. David G. Armstrong.',
    },
    onLinkedIn: '{name} no LinkedIn',
  },

  blog: {
    eyebrow: 'Textos',
    heading: 'Notas de quem está construindo.',
    defaultCategory: 'Notas',
    readingTime: '{minutes} min de leitura',
    minutesShort: '{minutes} min',
    readMore: 'Ler',
    closeArticle: 'Fechar artigo',
    originalLanguage: 'Os artigos são exibidos no idioma em que foram escritos.',
  },

  contact: {
    eyebrow: 'Contato',
    heading: 'Fale com a gente.',
    body: 'Parcerias clínicas, colaboração de pesquisa, imprensa ou uma dúvida sobre o produto. Isso chega direto até nós.',
    orEmail: 'Ou escreva para',
    noMedicalDetails:
      'Por favor, não envie dados médicos nem imagens por este formulário. Não é um canal clínico e não é monitorado para casos urgentes.',
    name: 'Nome',
    email: 'E-mail',
    message: 'Mensagem',
    send: 'Enviar mensagem',
    sending: 'Enviando…',
    sent: 'Mensagem enviada.',
    sentBody: 'Obrigado. Vamos responder para {email}.',
    sendAnother: 'Enviar outra',
    errors: {
      name: 'Diga seu nome, por favor.',
      email: 'Adicione um e-mail, por favor.',
      emailInvalid: 'Esse e-mail parece incorreto.',
      message: 'Inclua uma mensagem, por favor.',
      failed: 'Não foi possível enviar. Escreva para nós por e-mail.',
    },
  },

  footer: {
    heading: 'Rodapé do site',
    tagline:
      'Rastreamento do pé diabético assistido por IA a partir de quatro fotos guiadas pelo celular.',
    openApp: 'Abrir o app',
    dashboard: 'Painel',
    emailUs: 'Escreva para nós',
    privacy: 'Privacidade',
    terms: 'Termos',
    nav: 'Rodapé',
    onNetwork: 'SoleIQ Health no {network}',
    disclaimer:
      'O SoleIQ é uma ferramenta de rastreamento e apoio à decisão. Não é um dispositivo de diagnóstico, não fornece orientação médica e não substitui a avaliação de um profissional qualificado. Se você tiver uma ferida, uma infecção, dor súbita ou uma mudança na cor ou na temperatura de um pé, procure atendimento médico imediatamente.',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: 'Pé esquerdo, planta',
    fitFootInFrame: 'Encaixe o pé dentro do quadro',
    photoQuality: 'Qualidade da foto',
    wholeFootInFrame: 'Pé inteiro no quadro',
    sharpEnough: 'Nítida o bastante para analisar',
    lightingNormalised: 'Iluminação normalizada',
    retakeTooDark: 'Refaça o pé direito, escura demais',
    analysing: 'Analisando',
    inputs: 'Entradas',
    diabetesHistory: 'Histórico de diabetes',
    vascularAnswers: 'Respostas vasculares',
    neuropathy: 'Neuropatia',
    painMap: 'Mapa de dor',
    screeningLevel: 'Nível de rastreamento',
    watch: 'Observar',
    resultBody:
      'Duas áreas para acompanhar. Refaça a checagem em 7 dias e marque uma consulta se alguma mudar.',
    shareRecord: 'Compartilhar seu prontuário',
    podiatryClinic: 'Sua clínica de podologia',
    fullHistory: 'Histórico completo, cada foto, cada nível de rastreamento.',
    sendRecord: 'Enviar prontuário',
    clinicianView: 'Visão do profissional',
    clinicalReport: 'Relatório clínico',
    photoComparison: 'Comparação de fotos',
    perPatientAssistant: 'Assistente por paciente',
    yourTimeline: 'Sua linha do tempo',
    today: 'Hoje',
    levels: { clear: 'Sem achados', watch: 'Observar', soon: 'Em breve', urgent: 'Urgente' },
  },
}

export default pt
