export type LoginLanguage = "tj" | "ru" | "en";

export interface LoginStrings {
  languageName: string;
  headline: string;
  subheadline: string;
  features: { title: string; description: string }[];
  copyright: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  loginLabel: string;
  loginPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  rememberMe: string;
  forgotPassword: string;
  submit: string;
  submitting: string;
  or: string;
  qrLogin: string;
  secureTitle: string;
  secureDescription: string;
  loginRequired: string;
  passwordRequired: string;
  invalidCredentials: string;
  accountDeactivated: string;
  networkError: string;
  serverError: string;
}

export const LOGIN_LANGUAGES: { value: LoginLanguage; label: string }[] = [
  { value: "tj", label: "Тоҷикӣ" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

export const LOGIN_STRINGS: Record<LoginLanguage, LoginStrings> = {
  ru: {
    languageName: "Русский",
    headline: "Управляйте строительством эффективно",
    subheadline: "Контроль объектов, работ, бригад и финансов в одном месте",
    features: [
      { title: "Полный контроль", description: "Отслеживайте объекты, работы и сроки в реальном времени" },
      { title: "Управление бригадами", description: "Контроль посещаемости, назначений и производительности" },
      { title: "Аналитика и отчёты", description: "Актуальная аналитика по проектам, расходам и зарплатам" },
    ],
    copyright: "© 2026 BINOSOZ CRM. Все права защищены.",
    welcomeTitle: "Добро пожаловать!",
    welcomeSubtitle: "Войдите в систему, чтобы продолжить работу",
    loginLabel: "Телефон",
    loginPlaceholder: "Введите номер телефона",
    passwordLabel: "Пароль",
    passwordPlaceholder: "Введите пароль",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    rememberMe: "Запомнить меня",
    forgotPassword: "Забыли пароль?",
    submit: "Войти в систему",
    submitting: "Вход...",
    or: "или",
    qrLogin: "Войти через QR-код",
    secureTitle: "Безопасный доступ",
    secureDescription: "Все данные защищены и передаются по зашифрованному соединению",
    loginRequired: "Введите номер телефона",
    passwordRequired: "Введите пароль",
    invalidCredentials: "Неверный телефон или пароль",
    accountDeactivated: "Учётная запись отключена",
    networkError: "Не удалось подключиться к серверу. Проверьте соединение и попробуйте снова.",
    serverError: "Ошибка сервера. Попробуйте позже.",
  },
  tj: {
    languageName: "Тоҷикӣ",
    headline: "Сохтмонро самаранок идора кунед",
    subheadline: "Назорати объектҳо, корҳо, бригадаҳо ва маблағҳо дар як ҷой",
    features: [
      { title: "Назорати пурра", description: "Объектҳо, корҳо ва муҳлатҳоро дар вақти воқеӣ пайгирӣ кунед" },
      { title: "Идоракунии бригадаҳо", description: "Назорати ҳузур, таъйинот ва маҳсулнокии кормандон" },
      { title: "Таҳлил ва ҳисоботҳо", description: "Таҳлили актуалӣ аз рӯйи лоиҳаҳо, хароҷот ва маош" },
    ],
    copyright: "© 2026 BINOSOZ CRM. Ҳамаи ҳуқуқҳо ҳифз шудаанд.",
    welcomeTitle: "Хуш омадед!",
    welcomeSubtitle: "Барои идомаи кор ба система ворид шавед",
    loginLabel: "Телефон",
    loginPlaceholder: "Рақами телефонро ворид кунед",
    passwordLabel: "Рамз",
    passwordPlaceholder: "Рамзро ворид кунед",
    showPassword: "Рамзи намоён",
    hidePassword: "Пинҳон кардани рамз",
    rememberMe: "Маро дар хотир нигоҳ дор",
    forgotPassword: "Рамзро фаромӯш кардед?",
    submit: "Воридшавӣ ба система",
    submitting: "Воридшавӣ...",
    or: "ё",
    qrLogin: "Воридшавӣ тавассути QR-код",
    secureTitle: "Дастрасии бехатар",
    secureDescription: "Ҳамаи маълумот ҳифз шуда, тавассути пайвасти рамзгузоришуда интиқол дода мешавад",
    loginRequired: "Рақами телефонро ворид кунед",
    passwordRequired: "Рамзро ворид кунед",
    invalidCredentials: "Рақами телефон ё рамз нодуруст аст",
    accountDeactivated: "Ҳисоб ғайрифаъол карда шудааст",
    networkError: "Пайваст ба сервер имконнопазир аст. Пайвастшавиро санҷед ва аз нав кӯшиш кунед.",
    serverError: "Хатои сервер. Баъдтар кӯшиш кунед.",
  },
  en: {
    languageName: "English",
    headline: "Manage construction efficiently",
    subheadline: "Control projects, work, crews, and finances in one place",
    features: [
      { title: "Full control", description: "Track projects, work, and deadlines in real time" },
      { title: "Crew management", description: "Monitor attendance, assignments, and productivity" },
      { title: "Analytics and reports", description: "Up-to-date analytics for projects, expenses, and payroll" },
    ],
    copyright: "© 2026 BINOSOZ CRM. All rights reserved.",
    welcomeTitle: "Welcome!",
    welcomeSubtitle: "Sign in to continue working",
    loginLabel: "Phone",
    loginPlaceholder: "Enter your phone number",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    submit: "Sign in",
    submitting: "Signing in...",
    or: "or",
    qrLogin: "Sign in with QR code",
    secureTitle: "Secure access",
    secureDescription: "All data is protected and transmitted through an encrypted connection",
    loginRequired: "Enter your phone number",
    passwordRequired: "Enter your password",
    invalidCredentials: "Invalid phone number or password",
    accountDeactivated: "This account has been deactivated",
    networkError: "Couldn't reach the server. Check your connection and try again.",
    serverError: "Server error. Please try again later.",
  },
};
