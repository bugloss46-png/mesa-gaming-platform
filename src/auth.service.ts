import type {
  User,
  Database,
  VerificationData,
  PendingLogin,
  ValidationResult,
  CreateUserData,
  MessageType
} from './types';
import { StorageKeys } from './types';

// ==================== DATABASE FUNCTIONS ====================

export function initDatabase(): void {
  if (!localStorage.getItem(StorageKeys.DATABASE)) {
    const emptyDb: Database = {
      users: [],
      sessions: []
    };
    localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(emptyDb));
  }
}

export function getDatabase(): Database {
  const dbString = localStorage.getItem(StorageKeys.DATABASE);
  if (!dbString) {
    return { users: [], sessions: [] };
  }
  return JSON.parse(dbString) as Database;
}

export function saveDatabase(db: Database): void {
  localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));
}

export function findUserByEmail(email: string): User | undefined {
  const db = getDatabase();
  return db.users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

export function createUser(userData: CreateUserData): User {
  const db = getDatabase();
  const newUser: User = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    nickname: userData.nickname,
    email: userData.email.toLowerCase(),
    password: userData.password, // В реальном приложении должен быть хешированный
    level: 1,
    elo: 1000,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    registeredAt: new Date().toISOString(),
    emailVerified: false
  };

  db.users.push(newUser);
  saveDatabase(db);
  return newUser;
}

// ==================== VALIDATION FUNCTIONS ====================

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password: string): ValidationResult {
  // Проверка: только английские буквы, цифры и спецсимволы
  const englishOnlyRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;

  if (!englishOnlyRegex.test(password)) {
    return {
      valid: false,
      message: 'Пароль должен содержать только английские буквы, цифры и спецсимволы!'
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message: 'Пароль должен содержать минимум 8 символов!'
    };
  }

  // Проверка на наличие хотя бы одной буквы и одной цифры
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      message: 'Пароль должен содержать хотя бы одну букву и одну цифру!'
    };
  }

  return { valid: true };
}

// ==================== VERIFICATION CODE ====================

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function sendVerificationCode(email: string, code: string): boolean {
  console.log(`📧 Отправка кода на ${email}: ${code}`);

  // Сохраняем код в sessionStorage для проверки
  const verificationData: VerificationData = {
    email: email,
    code: code,
    expiresAt: Date.now() + (5 * 60 * 1000) // 5 минут
  };

  sessionStorage.setItem(StorageKeys.VERIFICATION, JSON.stringify(verificationData));

  // В реальном приложении здесь будет отправка через API
  alert(`📧 Код подтверждения отправлен на ${email}\n\nВаш код: ${code}\n\n(В реальной версии код придёт на почту)`);

  return true;
}

export function verifyCode(email: string, code: string): ValidationResult {
  const verificationDataStr = sessionStorage.getItem(StorageKeys.VERIFICATION);

  if (!verificationDataStr) {
    return { valid: false, message: 'Код подтверждения не найден!' };
  }

  const verificationData: VerificationData = JSON.parse(verificationDataStr);

  if (Date.now() > verificationData.expiresAt) {
    sessionStorage.removeItem(StorageKeys.VERIFICATION);
    return { valid: false, message: 'Срок действия кода истёк!' };
  }

  if (verificationData.email.toLowerCase() !== email.toLowerCase()) {
    return { valid: false, message: 'Неверный email!' };
  }

  if (verificationData.code !== code) {
    return { valid: false, message: 'Неверный код!' };
  }

  return { valid: true };
}

// ==================== AUTHENTICATION ====================

export function loginWithSteam(): void {
  initDatabase();

  const steamEmail = 'steam' + Math.floor(Math.random() * 10000) + '@steamcommunity.com';

  // Check if Steam user already exists
  let user = findUserByEmail(steamEmail);

  if (!user) {
    // Create new Steam user
    user = createUser({
      nickname: 'SteamPlayer' + Math.floor(Math.random() * 1000),
      email: steamEmail,
      password: 'steam_' + Math.random().toString(36).substr(2, 12)
    });
  }

  // Steam doesn't require 2FA for demo
  localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(user));
  localStorage.setItem(StorageKeys.LOGGED_IN, 'true');

  showMessage('Вход через Steam успешен! Перенаправление...', 'success');

  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1500);
}

export function checkAuth(): void {
  const isLoggedIn = localStorage.getItem(StorageKeys.LOGGED_IN);
  const currentPage = window.location.pathname.split('/').pop();

  if (isLoggedIn === 'true' && (currentPage === 'login.html' || currentPage === 'register.html')) {
    window.location.href = 'dashboard.html';
  }

  if (isLoggedIn !== 'true' && currentPage === 'dashboard.html') {
    window.location.href = 'login.html';
  }
}

// ==================== UTILITY FUNCTIONS ====================

export function showMessage(text: string, type: MessageType): void {
  let messageDiv = document.getElementById('formMessage');

  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'formMessage';
    messageDiv.className = 'form-message';
    const form = document.querySelector('.auth-form');
    if (form && form.parentNode) {
      form.parentNode.insertBefore(messageDiv, form);
    }
  }

  messageDiv.textContent = text;
  messageDiv.className = 'form-message ' + type + ' show';

  setTimeout(() => {
    messageDiv?.classList.remove('show');
  }, 5000);
}

// ==================== REGISTRATION ====================

export function handleRegistration(): void {
  const registerForm = document.getElementById('registerForm') as HTMLFormElement | null;

  if (!registerForm) return;

  registerForm.addEventListener('submit', function(e: Event) {
    e.preventDefault();

    const nickname = (document.getElementById('nickname') as HTMLInputElement).value.trim();
    const email = (document.getElementById('email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;
    const terms = (document.getElementById('terms') as HTMLInputElement).checked;

    // Validate nickname
    if (nickname.length < 3) {
      showMessage('Никнейм должен содержать минимум 3 символа!', 'error');
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      showMessage('Неверный формат email!', 'error');
      return;
    }

    // Check if user already exists
    if (findUserByEmail(email)) {
      showMessage('Пользователь с таким email уже существует!', 'error');
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      showMessage(passwordValidation.message || 'Ошибка валидации пароля', 'error');
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      showMessage('Пароли не совпадают!', 'error');
      return;
    }

    // Check terms
    if (!terms) {
      showMessage('Вы должны принять правила платформы!', 'error');
      return;
    }

    // Initialize database
    initDatabase();

    // Create user
    createUser({
      nickname: nickname,
      email: email,
      password: password
    });

    showMessage('Регистрация успешна! Перенаправление на вход...', 'success');

    // Redirect to login
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  });
}

// ==================== LOGIN ====================

export function handleLogin(): void {
  const loginForm = document.getElementById('loginForm') as HTMLFormElement | null;

  if (!loginForm) return;

  loginForm.addEventListener('submit', function(e: Event) {
    e.preventDefault();

    const email = (document.getElementById('email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password') as HTMLInputElement).value;

    // Initialize database
    initDatabase();

    // Find user
    const user = findUserByEmail(email);

    if (!user) {
      showMessage('Пользователь с таким email не найден!', 'error');
      return;
    }

    // Check password
    if (user.password !== password) {
      showMessage('Неверный пароль!', 'error');
      return;
    }

    // Generate and send verification code
    const verificationCode = generateVerificationCode();
    sendVerificationCode(email, verificationCode);

    // Save pending login data
    const pendingLogin: PendingLogin = {
      userId: user.id,
      email: email
    };
    sessionStorage.setItem(StorageKeys.PENDING_LOGIN, JSON.stringify(pendingLogin));

    showMessage('Код подтверждения отправлен на ваш email!', 'success');

    // Redirect to verification page
    setTimeout(() => {
      window.location.href = 'verify.html';
    }, 2000);
  });
}

// ==================== INITIALIZATION ====================

// Auto-run auth check
checkAuth();

console.log('🔐 Auth system with TypeScript loaded');
