import type { User, Database, MessageType } from './types';
import { StorageKeys } from './types';

// ==================== AUTH CHECK ====================

function checkAuth(): User | null {
  const isLoggedIn = localStorage.getItem(StorageKeys.LOGGED_IN);
  if (isLoggedIn !== 'true') {
    window.location.href = 'login.html';
    return null;
  }

  const userStr = localStorage.getItem(StorageKeys.CURRENT_USER);
  if (!userStr) {
    window.location.href = 'login.html';
    return null;
  }

  return JSON.parse(userStr) as User;
}

// ==================== SHOW MESSAGE ====================

function showMessage(text: string, type: MessageType): void {
  const messageDiv = document.getElementById('formMessage');
  if (!messageDiv) return;

  messageDiv.textContent = text;
  messageDiv.className = 'form-message ' + type + ' show';

  setTimeout(() => {
    messageDiv.classList.remove('show');
  }, 5000);
}

// ==================== HEADER ====================

function loadHeader(user: User): void {
  const headerName = document.getElementById('userNameHeader');
  const headerLevel = document.getElementById('userLevelHeader');
  const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement | null;

  if (headerName) headerName.textContent = user.nickname;
  if (headerLevel) headerLevel.textContent = user.level.toString();
  if (headerAvatar && user.avatar) headerAvatar.src = user.avatar;
}

// ==================== SEARCH ====================

function setupSearch(currentUser: User): void {
  const input = document.getElementById('searchInput') as HTMLInputElement;
  const results = document.getElementById('searchResults');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      results.classList.remove('open');
      results.innerHTML = '';
      return;
    }

    const dbStr = localStorage.getItem(StorageKeys.DATABASE);
    if (!dbStr) return;

    const db: Database = JSON.parse(dbStr);
    const found = db.users.filter(u =>
      u.id !== currentUser.id &&
      ((u.nickname && u.nickname.toLowerCase().includes(query)) ||
       (u.login && u.login.toLowerCase().includes(query)))
    ).slice(0, 8);

    if (found.length === 0) {
      results.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
    } else {
      results.innerHTML = found.map(u => `
        <a href="user-profile-view.html?id=${u.id}" class="search-result-item">
          <img src="${u.avatar || 'https://via.placeholder.com/40'}" alt="" class="search-result-avatar">
          <div class="search-result-info">
            <span class="search-result-name">${u.nickname}</span>
            ${u.login ? `<span class="search-result-login">@${u.login}</span>` : ''}
          </div>
          <span class="search-result-level">Ур. ${u.level}</span>
        </a>
      `).join('');
    }

    results.classList.add('open');
  });

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.nav-search')) {
      results.classList.remove('open');
    }
  });
}

// ==================== PROFILE DROPDOWN ====================

function setupProfileDropdown(user: User): void {
  const toggle = document.getElementById('userProfileToggle');
  const dropdown = document.getElementById('profileDropdown');
  if (!toggle || !dropdown) return;

  // Populate dropdown user info
  const dropdownAvatar = document.getElementById('dropdownAvatar') as HTMLImageElement;
  const dropdownUserName = document.getElementById('dropdownUserName');
  if (dropdownAvatar && user.avatar) dropdownAvatar.src = user.avatar;
  if (dropdownUserName) dropdownUserName.textContent = user.nickname;

  // Online status
  const settings = JSON.parse(localStorage.getItem('mesaSettings') || '{}');
  const isOnline = settings.onlineStatus !== false;

  const headerDot = document.getElementById('headerStatusDot');
  const dropdownDot = document.getElementById('dropdownStatusDot');
  const statusText = document.getElementById('dropdownStatusText');
  const checkbox = document.getElementById('onlineStatusCheckbox') as HTMLInputElement;
  const toggleIcon = document.querySelector('#onlineStatusToggle .dropdown-icon');

  function updateStatus(online: boolean): void {
    if (headerDot) headerDot.className = 'status-dot ' + (online ? 'online' : 'offline');
    if (dropdownDot) dropdownDot.className = 'status-dot ' + (online ? 'online' : 'offline');
    if (statusText) statusText.textContent = online ? 'В сети' : 'Не в сети';
    if (toggleIcon) toggleIcon.textContent = online ? '🟢' : '⚫';
    if (checkbox) checkbox.checked = online;
    const s = JSON.parse(localStorage.getItem('mesaSettings') || '{}');
    s.onlineStatus = online;
    localStorage.setItem('mesaSettings', JSON.stringify(s));
  }

  updateStatus(isOnline);

  if (checkbox) {
    checkbox.addEventListener('change', () => {
      updateStatus(checkbox.checked);
    });
  }

  // Prevent dropdown close when clicking status toggle
  const statusToggleRow = document.getElementById('onlineStatusToggle');
  if (statusToggleRow) {
    statusToggleRow.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  toggle.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.dropdown-item')) return;
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });

  document.getElementById('dropdownLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Вы уверены, что хотите выйти?')) {
      localStorage.removeItem(StorageKeys.LOGGED_IN);
      localStorage.removeItem(StorageKeys.CURRENT_USER);
      sessionStorage.clear();
      window.location.href = 'index.html';
    }
  });
}

// ==================== SETTINGS STORAGE ====================

interface UserSettings {
  language: string;
  theme: string;
  matchNotifications: boolean;
  tournamentNotifications: boolean;
  friendMessages: boolean;
  soundNotifications: boolean;
  profileVisibility: string;
  statsVisibility: string;
  onlineStatus: boolean;
}

const SETTINGS_KEY = 'mesaSettings';

function loadSettings(): UserSettings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    language: 'ru',
    theme: 'default',
    matchNotifications: true,
    tournamentNotifications: true,
    friendMessages: true,
    soundNotifications: false,
    profileVisibility: 'all',
    statsVisibility: 'all',
    onlineStatus: true,
  };
}

function saveSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ==================== APPLY SETTINGS TO FORM ====================

function applySettingsToForm(settings: UserSettings): void {
  const language = document.getElementById('settingLanguage') as HTMLSelectElement;
  const theme = document.getElementById('settingTheme') as HTMLSelectElement;
  const matchNotif = document.getElementById('settingMatchNotif') as HTMLInputElement;
  const tournamentNotif = document.getElementById('settingTournamentNotif') as HTMLInputElement;
  const friendMsg = document.getElementById('settingFriendMessages') as HTMLInputElement;
  const soundNotif = document.getElementById('settingSoundNotif') as HTMLInputElement;
  const profileVis = document.getElementById('settingProfileVisibility') as HTMLSelectElement;
  const statsVis = document.getElementById('settingStatsVisibility') as HTMLSelectElement;

  if (language) language.value = settings.language;
  if (theme) theme.value = settings.theme;
  if (matchNotif) matchNotif.checked = settings.matchNotifications;
  if (tournamentNotif) tournamentNotif.checked = settings.tournamentNotifications;
  if (friendMsg) friendMsg.checked = settings.friendMessages;
  if (soundNotif) soundNotif.checked = settings.soundNotifications;
  if (profileVis) profileVis.value = settings.profileVisibility;
  if (statsVis) statsVis.value = settings.statsVisibility;
}

function readSettingsFromForm(): UserSettings {
  return {
    language: (document.getElementById('settingLanguage') as HTMLSelectElement)?.value || 'ru',
    theme: (document.getElementById('settingTheme') as HTMLSelectElement)?.value || 'default',
    matchNotifications: (document.getElementById('settingMatchNotif') as HTMLInputElement)?.checked ?? true,
    tournamentNotifications: (document.getElementById('settingTournamentNotif') as HTMLInputElement)?.checked ?? true,
    friendMessages: (document.getElementById('settingFriendMessages') as HTMLInputElement)?.checked ?? true,
    soundNotifications: (document.getElementById('settingSoundNotif') as HTMLInputElement)?.checked ?? false,
    profileVisibility: (document.getElementById('settingProfileVisibility') as HTMLSelectElement)?.value || 'all',
    statsVisibility: (document.getElementById('settingStatsVisibility') as HTMLSelectElement)?.value || 'all',
    onlineStatus: JSON.parse(localStorage.getItem('mesaSettings') || '{}').onlineStatus ?? true,
  };
}

// ==================== THEME ====================

function applyTheme(theme: string): void {
  if (theme === 'default') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

// ==================== INIT ====================

function init(): void {
  const user = checkAuth();
  if (!user) return;

  loadHeader(user);
  setupProfileDropdown(user);
  setupSearch(user);

  // Load email
  const emailEl = document.getElementById('settingEmail');
  if (emailEl && user.email) {
    emailEl.textContent = user.email;
  }

  // Load settings into form
  const settings = loadSettings();
  applySettingsToForm(settings);
  applyTheme(settings.theme);

  // Live theme preview on select change
  const themeSelect = document.getElementById('settingTheme') as HTMLSelectElement;
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      applyTheme(themeSelect.value);
    });
  }

  // Save button
  document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
    const newSettings = readSettingsFromForm();
    saveSettings(newSettings);
    applyTheme(newSettings.theme);
    showMessage('Настройки сохранены!', 'success');
  });

  // Change email button
  document.getElementById('changeEmailBtn')?.addEventListener('click', () => {
    alert('Изменение email\n\nЭто демо-функция. В реальной версии откроется форма изменения email с подтверждением.');
  });

  // Change password button
  document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
    alert('Изменение пароля\n\nЭто демо-функция. В реальной версии откроется форма изменения пароля.');
  });

  // Delete account button
  document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите удалить аккаунт?\n\nЭто действие нельзя отменить!')) {
      if (confirm('Точно удалить? Все данные будут потеряны навсегда.')) {
        localStorage.removeItem(StorageKeys.LOGGED_IN);
        localStorage.removeItem(StorageKeys.CURRENT_USER);
        localStorage.removeItem(SETTINGS_KEY);
        sessionStorage.clear();
        window.location.href = 'index.html';
      }
    }
  });

  // Sidebar logout
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem(StorageKeys.LOGGED_IN);
        localStorage.removeItem(StorageKeys.CURRENT_USER);
        sessionStorage.clear();
        window.location.href = 'index.html';
      }
    });
  }

  console.log('Settings page loaded successfully');
}

// ==================== ENTRY POINT ====================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
