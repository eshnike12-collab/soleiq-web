import type { Dictionary } from './en';

/**
 * Portuguese (pt) — Brazilian, which is where most speakers are, and the
 * variety the `pt-BR` html tag in config.ts declares.
 *
 * "Rastreamento" for screening, which is the term Brazilian clinical guidance
 * uses for the diabetic foot; "detecção" alone would read as diagnosis.
 */
const pt: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'Detecção precoce, proteção para toda a vida',
  },

  nav: {
    website: 'Site',
    websiteAria: 'Ir para soleiqhealth.com',
    home: 'Início',
    dashboard: 'Meu painel',
    clinical: 'SoleIQ Clínico',
    signOut: 'Sair',
    signedInAs: 'Conectado como {email}',
    yourAccount: 'sua conta',
    noMembership: 'sem vínculo hospitalar',
    feedback: 'Comentários',
    adminConsole: 'Console de administração',
    doctorDashboard: 'Painel do cuidador',
    footHealth: 'A saúde dos meus pés',
  },

  language: {
    label: 'Idioma',
    change: 'Mudar de idioma',
    loading: 'Carregando idioma…',
  },

  flow: {
    back: 'Voltar',
    backHint: 'Voltar (←)',
    continue: 'Continuar',
    skip: 'Pular',
    step: 'Etapa {current} de {total}',
    encouragementStart: 'Vamos começar',
    encouragementUnderway: 'Você está a caminho',
    encouragementGood: 'Bom progresso',
    encouragementAlmost: 'Quase lá',
    encouragementDone: 'Tudo pronto — muito bem!',
    disclaimer:
      'O SoleIQ é uma ferramenta de acompanhamento do bem-estar e não substitui o diagnóstico médico profissional.',
  },

  welcome: {
    intro:
      'Rastreamento do pé diabético assistido por IA — apoio à decisão clínica na atenção primária e na podologia.',
    start: 'Iniciar consulta do paciente',
    duration: '~4 minutos por paciente. Para uso clínico.',
  },

  auth: {
    welcome: 'Bem-vindo',
    chooseSubtitle: 'Diga-nos quem você é para prepararmos a experiência certa.',
    iAmPatient: 'Sou paciente',
    iAmPatientBody: 'Verifique seus pés com fotos guiadas e mantenha seus resultados em um só lugar.',
    iAmDoctor: 'Sou cuidador',
    iAmDoctorBody: 'Acompanhe as verificações dos pés dos seus pacientes, as linhas do tempo de fotos e os resumos de IA.',
    sendingReset: 'Enviando o link…',
    resetSent: 'Se existir uma conta para {email}, um link de redefinição está a caminho — confira também o spam. Abra-o neste dispositivo; o link expira em uma hora.',
    signIn: 'Entrar',
    createAccount: 'Criar conta',
    titlePatient: 'Entre no SoleIQ',
    titleDoctor: 'Acesso para cuidadores',
    subtitlePatient:
      'Suas verificações dos pés ficam salvas na sua conta, então estarão aqui na próxima vez.',
    subtitleDoctor: 'Seu painel mostra os pacientes atribuídos a você.',
    email: 'E-mail',
    password: 'Senha',
    showPassword: 'Mostrar a senha',
    hidePassword: 'Ocultar a senha',
    passwordHint: 'Mais de 6 caracteres, com pelo menos um número ou símbolo.',
    passwordOk: 'A senha atende aos requisitos.',
    forgot: 'Esqueceu a senha?',
    working: 'Processando…',
    signedIn: 'Login realizado com sucesso',
    redirecting: 'Levando você ao seu painel…',
    resend: 'Reenviar o e-mail de confirmação',
    resendSent:
      'E-mail de confirmação enviado — verifique sua caixa de entrada (e o spam).',
    accountCreated:
      'Conta criada — enviamos um e-mail de confirmação. Abra o link nele e depois entre aqui.',
    emailConfirmed: 'E-mail confirmado — entre abaixo.',
    staffNote:
      'O acesso de cuidadores e administradores vem apenas de um convite hospitalar com prazo. Novos cuidadores permanecem inativos até o hospital verificá-los.',
    patientNote:
      'Contas novas não escolhem uma função de equipe. O acesso hospitalar é acrescentado por convite ou pela vinculação ao prontuário do paciente.',
    errorEmailFirst: 'Informe seu e-mail primeiro.',
    errorForgotEmailFirst:
      'Informe seu e-mail primeiro e depois toque em "Esqueceu a senha?".',
    errorSignInFailed: 'Não foi possível entrar.',
    errorUnconfirmed:
      'Seu e-mail ainda não foi confirmado. Abra o link de confirmação que enviamos — ou reenvie-o abaixo.',
    errorStaffInviteOnly:
      'Contas de equipe são criadas a partir de um convite hospitalar. Peça um convite ao administrador do seu hospital.',
    errorSendFailed:
      'Nosso serviço de e-mail não conseguiu enviar a mensagem agora — tente de novo em alguns minutos.',
    errorRateLimited:
      'Muitos e-mails foram solicitados em pouco tempo. Espere um pouco e tente de novo.',
    errorRecoveryFailed: 'A solicitação de recuperação falhou.',
    errorResendFailed: 'Não foi possível reenviar o e-mail.',
  },

  reset: {
    title: 'Defina uma nova senha',
    subtitle: 'Escolha uma senha que você ainda não tenha usado nesta conta.',
    newPassword: 'Nova senha',
    confirmPassword: 'Confirme a nova senha',
    mismatch: 'As duas senhas não coincidem.',
    submit: 'Atualizar a senha',
    submitting: 'Atualizando…',
    done: 'Senha atualizada',
    doneBody: 'Agora você pode entrar com sua nova senha.',
    expired: 'Este link expirou',
    expiredBody:
      'Links de senha só podem ser usados uma vez e param de funcionar depois de uma hora. Solicite um novo e ele chegará em instantes.',
    requestNew: 'Enviar um novo link',
    backToSignIn: 'Voltar para o login',
    sameBrowser: 'Este link precisa ser aberto no mesmo navegador que o pediu. Peça um novo e-mail e abra-o neste dispositivo.',
    openFromEmail: 'Abra o link do seu e-mail para definir uma nova senha, ou peça outro na página de login.',
    samePassword: 'Essa já é a sua senha atual — escolha outra.',
    checking: 'Verificando seu link…',
  },

  screens: {
    consentEyebrow: 'Etapa 1',
    consentTitle: 'Consentimento do paciente',
    consentSubtitle:
      'Confirme com o paciente que ele concorda com cada um dos itens a seguir antes de continuar.',

    returningEyebrow: 'Bem-vindo de volta',
    returningTitle: 'Revise suas respostas',
    returningSubtitle:
      'Guardamos tudo da sua última verificação. Atualize o que mudou — o restante é mantido. As fotos são sempre tiradas de novo.',

    intakeEyebrow: 'Admissão do paciente',
    nameTitle: 'Nome do paciente',
    nameSubtitle: 'E o endereço do paciente, para as recomendações de encaminhamento.',

    demographicsTitle: 'Dados demográficos do paciente',
    demographicsSubtitle:
      'Usados para personalizar as priors populacionais e auditar a equidade do modelo.',

    claim: {
      eyebrow:
        'O seu registo',
      title:
        'Assuma o controlo do seu registo',
      intro:
        'Alguém criou um registo de saúde do pé SoleIQ para você e tem-no gerido em seu nome. O seu e-mail de convite indica quem.',
      whatHappens:
        'Se assumir o controlo, o registo passa a ser seu. Verá todo o histórico, incluindo o que foi registado antes de hoje, e decidirá quem mais pode consultá-lo.',
      canRemove:
        'Essa pessoa permanece no seu círculo de cuidados para continuar a ajudar — e pode removê-la em qualquer momento em Privacidade e acesso. Essa decisão é só sua.',
      signInPrompt:
        'Inicie sessão com o endereço de e-mail para onde este convite foi enviado. O link funciona apenas com essa conta.',
      signInCta:
        'Iniciar sessão ou criar conta',
      claimCta:
        'Assumir o controlo do meu registo',
      claiming:
        'A assumir o controlo…',
      successTitle:
        'Este registo já é seu',
      successBody:
        'Tudo o que contém está na sua aplicação, incluindo o que foi registado antes de hoje.',
      successCta:
        'Ir para a minha saúde do pé',
      expiredTitle:
        'Este link expirou',
      expiredBody:
        'Os links deixam de funcionar após {days} dias. Pode pedir um novo.',
      usedTitle:
        'Este link já foi utilizado',
      usedBody:
        'Se o registo já é seu, basta iniciar sessão. Caso contrário, peça um novo link.',
      mismatchTitle:
        'Este link é para outra pessoa',
      mismatchBody:
        'Inicie sessão com o endereço para onde o convite foi enviado. Se está a ajudar alguém, envie-lhe o link — só essa pessoa pode assumir o controlo do seu próprio registo.',
      linkedTitle:
        'A sua conta já tem um registo',
      linkedBody:
        'Esta conta já está ligada a outro registo de paciente. Dois historiais médicos nunca são combinados automaticamente — contacte a sua equipa de saúde.',
      unknownTitle:
        'Isso não funcionou',
      unknownBody:
        'Não foi possível usar o link. Pode pedir um novo.',
      requestNewCta:
        'Pedir um novo link',
      requestNewSent:
        'Pedido registado. Peça a quem criou o seu registo para enviar um novo link.',
    },

    historyEyebrow: 'Histórico de saúde',
    conditionsTitle: 'Condições médicas',
    conditionsSubtitle:
      'Selecione todas as que se aplicam. Toque no (?) para ver os detalhes clínicos de cada condição.',

    medications: {
      title: 'Medicamentos',
      subtitle:
        'Alguns medicamentos mudam a forma como a pele fica roxa, sangra e cicatriza, por isso conhecê-los ajuda-nos a ler as suas fotos corretamente.',
      newQuestion: 'Esta é uma pergunta nova que agora fazemos a todas as pessoas.',
      question: 'Está a tomar algum medicamento importante?',
      preferNotToSay: 'Prefiro não dizer',
      listTitle: 'Quais?',
      listHint: 'Escreva qualquer nome. Não precisa de corresponder às nossas sugestões.',
      inputPlaceholder: 'Comece a escrever o nome de um medicamento',
      suggestions: 'Sugestões',
      added: 'Adicionados',
      empty: 'Nenhum adicionado ainda. Pode continuar assim mesmo.',
      notesLabel: 'Mais alguma coisa que a sua equipa de saúde deva saber',
      notesPlaceholder: 'Doses, há quanto tempo os toma, alterações recentes',
      privacy: 'Só você e a sua equipa de saúde podem ver isto.',
      reviewNone: 'Nenhum medicamento importante',
      reviewHidden: 'Prefere não dizer',
      reviewUnanswered: 'Pergunta nova — responda, por favor',
      reviewRequiredCta: 'Responda a uma pergunta nova e depois tire as fotos',
      categories: {
        anticoagulant: 'Anticoagulante',
        antiplatelet: 'Antiagregante',
        corticosteroid: 'Corticoide',
        immunosuppressant: 'Imunossupressor',
        chemotherapy: 'Quimioterapia',
        insulin: 'Insulina',
        oral_diabetes: 'Comprimido para diabetes',
        statin: 'Colesterol (estatina)',
        antihypertensive: 'Tensão arterial',
        antibiotic: 'Antibiótico',
        other: 'Outro',
      },
    },

    vascularEyebrow: 'Rastreamento vascular',
    vascularTitle: 'Doença arterial periférica',
    vascularSubtitle:
      'A DAP está ligada de forma independente ao atraso na cicatrização e ao risco de amputação — nós a rastreamos separadamente da neuropatia.',

    diabetesTitle: 'Detalhes do diabetes',
    diabetesSubtitle: 'Tipo e ano do diagnóstico.',

    glucoseTitle: 'Marcadores de glicose',
    glucoseSubtitle:
      'HbA1c e a leitura mais recente do medidor de glicose. Ambos são opcionais.',

    footHistoryTitle: 'Histórico dos pés',
    footHistorySubtitle: 'Úlceras anteriores, amputações ou cirurgias recentes.',

    lifestyleTitle: 'Saúde e estilo de vida',
    lifestyleSubtitle:
      'Dormência nos pés, além de algumas perguntas sobre o estilo de vida.',

    sizingEyebrow: 'Numeração',
    sizingTitle: 'Seu número de calçado',

    painEyebrow: 'Sintomas',
    painTitle: 'Avaliação da dor',
    painSubtitle: 'Pergunte ao paciente: sente alguma dor nos pés agora?',

    captureEyebrow: 'Captura',
    captureTitle: 'Iniciar o exame dos pés',
    captureSubtitle:
      'Tire ou envie quatro fotos coloridas: o dorso e a sola de cada pé. Você pode refazer qualquer foto antes da verificação.',

    perfusionEyebrow: 'Opcional',
    perfusionTitle: 'Circulação do pé',
    perfusionSubtitle:
      'Verificações do fluxo sanguíneo de cada pé pela câmera. Podem ser puladas — o exame por fotos não depende delas.',
    perfusionPulse: 'Sinal de pulso',
    perfusionRefill: 'Enchimento capilar',

    leftFoot: 'Pé esquerdo',
    rightFoot: 'Pé direito',

    nextStepsEyebrow: 'Verificação concluída',
    nextStepsTitle: 'Salve sua verificação',
    nextStepsSubtitle:
      'Guarde-a no seu histórico privado para que você e sua equipe de cuidado possam acompanhar as mudanças ao longo do tempo.',

    productsEyebrow: 'Opções de terapia',
    productsTitle: 'Produtos complementares',

    timelineEyebrow: 'Histórico de fotos',
    timelineTitle: 'Suas verificações dos pés',
    timelineLoading: 'Carregando suas verificações salvas…',
    timelineCount: '{count} verificações salvas.',
    timelineCountOne: '1 verificação salva.',
  },

  common: {
    yes: 'Sim',
    no: 'Não',
    continue: 'Continuar',
    add: 'Adicionar',
    remove: 'Remover',
    save: 'Salvar',
    cancel: 'Cancelar',
    close: 'Fechar',
    retry: 'Tentar de novo',
    loading: 'Carregando…',
    required: 'Obrigatório',
    optional: 'Opcional',
    done: 'Concluído',
    somethingWentWrong: 'Algo deu errado.',
  },
};

export default pt;
