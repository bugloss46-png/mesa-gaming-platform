import type { PendingLogin, VerificationData, Database, MessageType } from './types';
import { StorageKeys } from './types';

// ==================== UTILITY FUNCTIONS ====================

function showMessage(text: string, type: MessageType): void {
  const messageDiv = document.getElementById('formMessage');
  if (!messageDiv) return;

  messageDiv.textContent = text;
  messageDiv.className = 'form-message ' + type + ' show';

  setTimeout(() => {
    messageDiv.classList.remove('show');
  }, 5000);
}

// ==================== INITIALIZATION ====================

function init(): void {
  // Check if there's a pending login
  const pendingLoginStr = sessionStorage.getItem(StorageKeys.PENDING_LOGIN);
  if (!pendingLoginStr) {
    window.location.href = 'login.html';
    return;
  }

  const loginData: PendingLogin = JSON.parse(pendingLoginStr);
  const emailDisplay = document.getElementById('emailDisplay');
  if (emailDisplay) {
    emailDisplay.textContent = `Введите код, отправленный на ${loginData.email}`;
  }

  setupCodeInputs();
  setupVerifyForm(loginData);
  setupResendButton(loginData);
}

// ==================== CODE INPUTS ====================

function setupCodeInputs(): void {
  const codeInputs = document.querySelectorAll('.code-input') as NodeListOf<HTMLInputElement>;

  codeInputs.forEach((input, index) => {
    // Auto-focus next input
    input.addEventListener('input', function(e) {
      const target = e.target as HTMLInputElement;
      if (target.value.length === 1 && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }
    });

    // Backspace to previous input
    input.addEventListener('keydown', function(e) {
      const target = e.target as HTMLInputElement;
      if (e.key === 'Backspace' && target.value === '' && index > 0) {
        codeInputs[index - 1].focus();
      }
    });

    // Only allow numbers
    input.addEventListener('input', function(e) {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/[^0-9]/g, '');
    });
  });
}

// ==================== VERIFY FORM ====================

function setupVerifyForm(loginData: PendingLogin): void {
  const verifyForm = document.getElementById('verifyForm') as HTMLFormElement | null;
  if (!verifyForm) return;

  verifyForm.addEventListener('submit', function(e: Event) {
    e.preventDefault();

    const codeInputs = document.querySelectorAll('.code-input') as NodeListOf<HTMLInputElement>;
    const code = Array.from(codeInputs).map(input => input.value).join('');

    if (code.length !== 6) {
      showMessage('Введите полный 6-значный код!', 'error');
      return;
    }

    // Get verification data
    const verificationDataStr = sessionStorage.getItem(StorageKeys.VERIFICATION);

    if (!verificationDataStr) {
      showMessage('Сессия истекла. Пожалуйста, войдите снова.', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }

    const verificationData: VerificationData = JSON.parse(verificationDataStr);

    // Check if code is expired
    if (Date.now() > verificationData.expiresAt) {
      sessionStorage.removeItem(StorageKeys.VERIFICATION);
      showMessage('Срок действия кода истёк!', 'error');
      return;
    }

    // Verify code
    if (verificationData.code !== code) {
      showMessage('Неверный код!', 'error');
      // Clear inputs
      codeInputs.forEach(input => input.value = '');
      codeInputs[0].focus();
      return;
    }

    // Get user from database
    const dbStr = localStorage.getItem(StorageKeys.DATABASE);
    if (!dbStr) {
      showMessage('Ошибка: база данных не найдена!', 'error');
      return;
    }

    const db: Database = JSON.parse(dbStr);
    const user = db.users.find(u => u.id === loginData.userId);

    if (!user) {
      showMessage('Ошибка: пользователь не найден!', 'error');
      return;
    }

    // Login successful
    localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(user));
    localStorage.setItem(StorageKeys.LOGGED_IN, 'true');

    // Clear session data
    sessionStorage.removeItem(StorageKeys.VERIFICATION);
    sessionStorage.removeItem(StorageKeys.PENDING_LOGIN);

    showMessage('Вход выполнен успешно! Перенаправление...', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  });
}

// ==================== RESEND CODE ====================

function setupResendButton(loginData: PendingLogin): void {
  const resendBtn = document.getElementById('resendBtn');
  if (!resendBtn) return;

  resendBtn.addEventListener('click', function() {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const verificationData: VerificationData = {
      email: loginData.email,
      code: verificationCode,
      expiresAt: Date.now() + (5 * 60 * 1000)
    };

    sessionStorage.setItem(StorageKeys.VERIFICATION, JSON.stringify(verificationData));

    alert(`📧 Новый код отправлен на ${loginData.email}\n\nВаш код: ${verificationCode}\n\n(В реальной версии код придёт на почту)`);

    showMessage('Код успешно отправлен!', 'success');

    // Clear inputs
    const codeInputs = document.querySelectorAll('.code-input') as NodeListOf<HTMLInputElement>;
    codeInputs.forEach(input => input.value = '');
    codeInputs[0].focus();
  });
}

// ==================== ENTRY POINT ====================

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
