import type { Dictionary } from './en';

/**
 * Spanish (es) — neutral, usable in Spain and Latin America.
 *
 * "Screening" is cribado, the term Spanish clinical guidance uses for the
 * diabetic foot; "detección" alone would read as diagnosis, which is exactly
 * the claim this app does not make. The patient is addressed as usted.
 */
const es: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'Detección temprana, protección de por vida',
  },

  nav: {
    website: 'Sitio web',
    websiteAria: 'Ir a soleiqhealth.com',
    home: 'Inicio',
    dashboard: 'Mi panel',
    clinical: 'SoleIQ Clínico',
    signOut: 'Cerrar sesión',
    signedInAs: 'Sesión iniciada como {email}',
    yourAccount: 'su cuenta',
    noMembership: 'sin vinculación hospitalaria',
    feedback: 'Comentarios',
    adminConsole: 'Consola de administración',
    doctorDashboard: 'Panel del médico',
    footHealth: 'La salud de mis pies',
  },

  language: {
    label: 'Idioma',
    change: 'Cambiar de idioma',
    loading: 'Cargando idioma…',
  },

  flow: {
    back: 'Atrás',
    backHint: 'Atrás (←)',
    continue: 'Continuar',
    skip: 'Omitir',
    step: 'Paso {current} de {total}',
    encouragementStart: 'Empecemos',
    encouragementUnderway: 'Va por buen camino',
    encouragementGood: 'Buen avance',
    encouragementAlmost: 'Ya casi',
    encouragementDone: 'Listo. ¡Muy bien!',
    disclaimer:
      'SoleIQ es una herramienta de seguimiento del bienestar y no sustituye el diagnóstico médico profesional.',
  },

  welcome: {
    intro:
      'Cribado del pie diabético asistido por IA: apoyo a la decisión clínica en atención primaria y podología.',
    start: 'Iniciar visita del paciente',
    duration: '~4 minutos por paciente. Para uso clínico.',
  },

  auth: {
    welcome: 'Bienvenido',
    chooseSubtitle: 'Díganos quién es para preparar la experiencia adecuada.',
    iAmPatient: 'Soy paciente',
    iAmPatientBody: 'Revise sus pies con fotos guiadas y conserve sus resultados en un solo lugar.',
    iAmDoctor: 'Soy médico o cuidador',
    iAmDoctorBody: 'Siga las revisiones de los pies de sus pacientes, sus cronologías de fotos y los resúmenes de IA.',
    sendingReset: 'Enviando el enlace…',
    resetSent: 'Si existe una cuenta para {email}, el enlace de restablecimiento va en camino; revise también el correo no deseado. Ábralo en este dispositivo; el enlace caduca en una hora.',
    signIn: 'Iniciar sesión',
    createAccount: 'Crear cuenta',
    titlePatient: 'Inicie sesión en SoleIQ',
    titleDoctor: 'Acceso para médicos y cuidadores',
    subtitlePatient:
      'Sus revisiones de los pies se guardan en su cuenta, así que estarán aquí la próxima vez.',
    subtitleDoctor: 'Su panel muestra los pacientes que tiene asignados.',
    email: 'Correo electrónico',
    password: 'Contraseña',
    showPassword: 'Mostrar la contraseña',
    hidePassword: 'Ocultar la contraseña',
    passwordHint: 'Más de 6 caracteres, con al menos un número o símbolo.',
    passwordOk: 'La contraseña cumple los requisitos.',
    forgot: '¿Olvidó su contraseña?',
    working: 'Procesando…',
    signedIn: 'Sesión iniciada correctamente',
    redirecting: 'Le llevamos a su panel…',
    resend: 'Reenviar el correo de confirmación',
    resendSent:
      'Correo de confirmación enviado: revise su bandeja de entrada (y el correo no deseado).',
    accountCreated:
      'Cuenta creada. Le hemos enviado un correo de confirmación: abra el enlace y luego inicie sesión aquí.',
    emailConfirmed: 'Correo confirmado. Inicie sesión abajo.',
    staffNote:
      'El acceso de médicos y administradores solo se concede mediante una invitación hospitalaria con caducidad. Los nuevos médicos permanecen inactivos hasta que el hospital los verifique.',
    patientNote:
      'Las cuentas nuevas no eligen un rol de personal. El acceso hospitalario se añade mediante una invitación o al vincular la historia del paciente.',
    errorEmailFirst: 'Introduzca primero su correo electrónico.',
    errorForgotEmailFirst:
      'Introduzca primero su correo y luego pulse "¿Olvidó su contraseña?".',
    errorSignInFailed: 'No se pudo iniciar sesión.',
    errorUnconfirmed:
      'Su correo aún no está confirmado. Abra el enlace de confirmación que le enviamos, o reenvíelo abajo.',
    errorStaffInviteOnly:
      'Las cuentas de personal se crean a partir de una invitación hospitalaria. Solicite una invitación al administrador de su hospital.',
    errorSendFailed:
      'Nuestro servicio de correo no ha podido enviar el mensaje ahora mismo. Inténtelo de nuevo en unos minutos.',
    errorRateLimited:
      'Se han solicitado demasiados correos en poco tiempo. Espere un momento y vuelva a intentarlo.',
    errorRecoveryFailed: 'No se pudo procesar la solicitud de recuperación.',
    errorResendFailed: 'No se pudo reenviar el correo.',
  },

  reset: {
    title: 'Establezca una contraseña nueva',
    subtitle: 'Elija una contraseña que no haya usado antes en esta cuenta.',
    newPassword: 'Contraseña nueva',
    confirmPassword: 'Confirme la contraseña nueva',
    mismatch: 'Las dos contraseñas no coinciden.',
    submit: 'Actualizar la contraseña',
    submitting: 'Actualizando…',
    done: 'Contraseña actualizada',
    doneBody: 'Ya puede iniciar sesión con su contraseña nueva.',
    expired: 'Este enlace ha caducado',
    expiredBody:
      'Los enlaces de contraseña solo se pueden usar una vez y dejan de funcionar al cabo de una hora. Solicite uno nuevo y llegará en un momento.',
    requestNew: 'Enviar un enlace nuevo',
    backToSignIn: 'Volver al inicio de sesión',
    sameBrowser: 'Este enlace debe abrirse en el mismo navegador desde el que se pidió. Solicite un correo nuevo y ábralo en este dispositivo.',
    openFromEmail: 'Abra el enlace de su correo para establecer una contraseña nueva, o pida otro desde la página de inicio de sesión.',
    samePassword: 'Esa ya es su contraseña actual: elija una distinta.',
    checking: 'Comprobando su enlace…',
  },

  screens: {
    consentEyebrow: 'Paso 1',
    consentTitle: 'Consentimiento del paciente',
    consentSubtitle:
      'Confirme con el paciente que acepta cada uno de los siguientes puntos antes de continuar.',

    returningEyebrow: 'Bienvenido de nuevo',
    returningTitle: 'Revise sus respuestas',
    returningSubtitle:
      'Hemos guardado todo lo de su última revisión. Actualice lo que haya cambiado; el resto se mantiene. Las fotos siempre se toman de nuevo.',

    intakeEyebrow: 'Admisión del paciente',
    nameTitle: 'Nombre del paciente',
    nameSubtitle: 'Y el domicilio del paciente, para las recomendaciones de derivación.',

    demographicsTitle: 'Datos demográficos del paciente',
    demographicsSubtitle:
      'Se usan para personalizar los datos previos de población y auditar la equidad del modelo.',

    historyEyebrow: 'Antecedentes de salud',
    conditionsTitle: 'Enfermedades',
    conditionsSubtitle:
      'Seleccione todas las que correspondan. Pulse (?) para ver los detalles clínicos de cualquier enfermedad.',

    vascularEyebrow: 'Cribado vascular',
    vascularTitle: 'Enfermedad arterial periférica',
    vascularSubtitle:
      'La EAP se asocia de forma independiente al retraso en la cicatrización y al riesgo de amputación, por lo que la cribamos aparte de la neuropatía.',

    diabetesTitle: 'Detalles de la diabetes',
    diabetesSubtitle: 'Tipo y año del diagnóstico.',

    glucoseTitle: 'Marcadores de glucosa',
    glucoseSubtitle:
      'HbA1c y la última lectura del medidor de glucosa. Ambos son opcionales.',

    footHistoryTitle: 'Antecedentes del pie',
    footHistorySubtitle: 'Úlceras previas, amputaciones o cirugías recientes.',

    lifestyleTitle: 'Salud y estilo de vida',
    lifestyleSubtitle:
      'Entumecimiento en los pies, más un par de preguntas sobre su estilo de vida.',

    sizingEyebrow: 'Talla',
    sizingTitle: 'Su talla de calzado',

    painEyebrow: 'Síntomas',
    painTitle: 'Evaluación del dolor',
    painSubtitle: 'Pregunte al paciente: ¿le duelen los pies ahora mismo?',

    captureEyebrow: 'Captura',
    captureTitle: 'Comenzar la exploración del pie',
    captureSubtitle:
      'Haga o suba cuatro fotos en color: el dorso y la planta de cada pie. Puede repetir cualquier foto antes de la revisión.',

    perfusionEyebrow: 'Opcional',
    perfusionTitle: 'Circulación del pie',
    perfusionSubtitle:
      'Comprobaciones del flujo sanguíneo de cada pie con la cámara. Se pueden omitir: la exploración con fotos no depende de ellas.',
    perfusionPulse: 'Señal de pulso',
    perfusionRefill: 'Relleno capilar',

    leftFoot: 'Pie izquierdo',
    rightFoot: 'Pie derecho',

    nextStepsEyebrow: 'Revisión completada',
    nextStepsTitle: 'Guarde su revisión',
    nextStepsSubtitle:
      'Consérvela en su historial privado para que usted y su equipo asistencial puedan seguir los cambios con el tiempo.',

    productsEyebrow: 'Opciones terapéuticas',
    productsTitle: 'Productos complementarios',

    timelineEyebrow: 'Historial de fotos',
    timelineTitle: 'Sus revisiones de los pies',
    timelineLoading: 'Cargando sus revisiones guardadas…',
    timelineCount: '{count} revisiones guardadas.',
    timelineCountOne: '1 revisión guardada.',
  },

  common: {
    yes: 'Sí',
    no: 'No',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    retry: 'Volver a intentar',
    loading: 'Cargando…',
    required: 'Obligatorio',
    optional: 'Opcional',
    done: 'Hecho',
    somethingWentWrong: 'Algo ha salido mal.',
  },
};

export default es;
