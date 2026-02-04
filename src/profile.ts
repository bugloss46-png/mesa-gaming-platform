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

// ==================== FILE TO BASE64 ====================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== LOAD PROFILE ====================

function loadProfile(user: User): void {
  // Header
  const headerName = document.getElementById('userNameHeader');
  const headerLevel = document.getElementById('userLevelHeader');
  const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement | null;

  if (headerName) headerName.textContent = user.nickname;
  if (headerLevel) headerLevel.textContent = user.level.toString();
  if (headerAvatar && user.avatar) headerAvatar.src = user.avatar;

  // Form fields
  const nicknameInput = document.getElementById('nickname') as HTMLInputElement;
  const loginInput = document.getElementById('userLogin') as HTMLInputElement;
  const bioInput = document.getElementById('bio') as HTMLTextAreaElement;

  if (nicknameInput) nicknameInput.value = user.nickname;
  if (loginInput) loginInput.value = user.login || '';
  if (bioInput) {
    bioInput.value = user.bio || '';
    updateBioCounter();
  }

  // Avatar preview
  const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
  if (avatarPreview && user.avatar) {
    avatarPreview.src = user.avatar;
  }

  // Banner preview
  const bannerPreview = document.getElementById('bannerPreview') as HTMLElement;
  const bannerPreviewVideo = document.getElementById('bannerPreviewVideo') as HTMLVideoElement | null;
  const bannerUrlInput = document.getElementById('bannerUrlInput') as HTMLInputElement | null;

  if (bannerPreview) {
    if (user.bannerVideo) {
      // Animated banner (URL to GIF or video)
      if (isVideoUrl(user.bannerVideo)) {
        if (bannerPreviewVideo) {
          bannerPreviewVideo.src = user.bannerVideo;
          bannerPreviewVideo.style.display = '';
        }
        bannerPreview.style.backgroundImage = '';
      } else {
        // GIF URL — use as background-image
        bannerPreview.style.backgroundImage = `url(${user.bannerVideo})`;
        bannerPreview.style.backgroundSize = 'cover';
        bannerPreview.style.backgroundPosition = 'center';
        if (bannerPreviewVideo) bannerPreviewVideo.style.display = 'none';
      }
      if (bannerUrlInput) bannerUrlInput.value = user.bannerVideo;
    } else if (user.bannerImage) {
      bannerPreview.style.backgroundImage = `url(${user.bannerImage})`;
      bannerPreview.style.backgroundSize = 'cover';
      bannerPreview.style.backgroundPosition = 'center';
      if (bannerPreviewVideo) bannerPreviewVideo.style.display = 'none';
    }
  }
}

// ==================== HELPERS ====================

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')
    || lower.includes('video/mp4') || lower.includes('video/webm');
}

// ==================== BIO COUNTER ====================

function updateBioCounter(): void {
  const bio = document.getElementById('bio') as HTMLTextAreaElement;
  const counter = document.getElementById('bioCounter');
  if (bio && counter) {
    counter.textContent = bio.value.length.toString();
  }
}

// ==================== SAVE PROFILE ====================

function saveProfile(user: User, updates: Partial<User>): User {
  const updatedUser: User = { ...user, ...updates };

  // Update current user in localStorage
  localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(updatedUser));

  // Update user in database
  const dbStr = localStorage.getItem(StorageKeys.DATABASE);
  if (dbStr) {
    const db: Database = JSON.parse(dbStr);
    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      db.users[idx] = updatedUser;
      localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));
    }
  }

  return updatedUser;
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

// ==================== THEME ====================

function applyTheme(): void {
  const stored = localStorage.getItem('mesaSettings');
  if (stored) {
    const settings = JSON.parse(stored);
    if (settings.theme && settings.theme !== 'default') {
      document.documentElement.dataset.theme = settings.theme;
    }
  }
}

// ==================== INIT ====================

function init(): void {
  let user = checkAuth();
  if (!user) return;

  // Apply theme first
  applyTheme();

  loadProfile(user);
  setupProfileDropdown(user);
  setupSearch(user);

  // Bio counter
  const bioInput = document.getElementById('bio') as HTMLTextAreaElement;
  if (bioInput) {
    bioInput.addEventListener('input', updateBioCounter);
  }

  // Avatar upload
  const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
  const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;

  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showMessage('Аватар не должен превышать 2MB!', 'error');
        return;
      }

      const base64 = await fileToBase64(file);
      if (avatarPreview) avatarPreview.src = base64;
      user = saveProfile(user!, { avatar: base64 });
      showMessage('Аватар обновлён!', 'success');
    });
  }

  // Banner upload (image or video file)
  const bannerInput = document.getElementById('bannerInput') as HTMLInputElement;
  const bannerPreview = document.getElementById('bannerPreview') as HTMLElement;
  const bannerPreviewVideo = document.getElementById('bannerPreviewVideo') as HTMLVideoElement | null;

  if (bannerInput) {
    bannerInput.addEventListener('change', async () => {
      const file = bannerInput.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        showMessage('Файл не должен превышать 10MB!', 'error');
        return;
      }

      if (file.type.startsWith('video/')) {
        // Video file — store as base64 (or object URL for preview)
        const base64 = await fileToBase64(file);
        if (bannerPreviewVideo) {
          bannerPreviewVideo.src = base64;
          bannerPreviewVideo.style.display = '';
        }
        if (bannerPreview) bannerPreview.style.backgroundImage = '';
        user = saveProfile(user!, { bannerVideo: base64, bannerImage: undefined });
        showMessage('Видео-шапка установлена!', 'success');
      } else {
        // Image file (including GIF)
        const base64 = await fileToBase64(file);
        if (bannerPreview) {
          bannerPreview.style.backgroundImage = `url(${base64})`;
          bannerPreview.style.backgroundSize = 'cover';
          bannerPreview.style.backgroundPosition = 'center';
        }
        if (bannerPreviewVideo) bannerPreviewVideo.style.display = 'none';
        user = saveProfile(user!, { bannerImage: base64, bannerVideo: undefined });
        showMessage('Шапка обновлена!', 'success');
      }
    });
  }

  // Banner URL input (GIF or video URL)
  const bannerUrlApply = document.getElementById('bannerUrlApply');
  const bannerUrlInput = document.getElementById('bannerUrlInput') as HTMLInputElement | null;

  if (bannerUrlApply && bannerUrlInput) {
    const applyUrl = () => {
      const url = bannerUrlInput.value.trim();
      if (!url) return;

      if (isVideoUrl(url)) {
        if (bannerPreviewVideo) {
          bannerPreviewVideo.src = url;
          bannerPreviewVideo.style.display = '';
        }
        if (bannerPreview) bannerPreview.style.backgroundImage = '';
      } else {
        // GIF or image URL
        if (bannerPreview) {
          bannerPreview.style.backgroundImage = `url(${url})`;
          bannerPreview.style.backgroundSize = 'cover';
          bannerPreview.style.backgroundPosition = 'center';
        }
        if (bannerPreviewVideo) bannerPreviewVideo.style.display = 'none';
      }

      user = saveProfile(user!, { bannerVideo: url, bannerImage: undefined });
      showMessage('Шапка обновлена!', 'success');
    };

    bannerUrlApply.addEventListener('click', applyUrl);
    bannerUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applyUrl(); }
    });
  }

  // Remove banner
  const removeBannerBtn = document.getElementById('removeBanner');
  if (removeBannerBtn) {
    removeBannerBtn.addEventListener('click', () => {
      if (bannerPreview) bannerPreview.style.backgroundImage = '';
      if (bannerPreviewVideo) { bannerPreviewVideo.src = ''; bannerPreviewVideo.style.display = 'none'; }
      if (bannerUrlInput) bannerUrlInput.value = '';
      user = saveProfile(user!, { bannerImage: undefined, bannerVideo: undefined });
      showMessage('Шапка сброшена', 'info');
    });
  }

  // Form submit
  const form = document.getElementById('profileForm') as HTMLFormElement;
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nickname = (document.getElementById('nickname') as HTMLInputElement).value.trim();
      const login = (document.getElementById('userLogin') as HTMLInputElement).value.trim().toLowerCase();
      const bio = (document.getElementById('bio') as HTMLTextAreaElement).value.trim();

      if (nickname.length < 3) {
        showMessage('Никнейм минимум 3 символа!', 'error');
        return;
      }

      // Validate login
      if (login) {
        if (login.length < 3) {
          showMessage('Логин минимум 3 символа!', 'error');
          return;
        }
        if (!/^[a-z0-9_]+$/.test(login)) {
          showMessage('Логин может содержать только латиницу, цифры и _', 'error');
          return;
        }

        // Check uniqueness
        const dbStr = localStorage.getItem(StorageKeys.DATABASE);
        if (dbStr) {
          const db: Database = JSON.parse(dbStr);
          const taken = db.users.find(u => u.login === login && u.id !== user!.id);
          if (taken) {
            showMessage('Этот логин уже занят!', 'error');
            return;
          }
        }
      }

      user = saveProfile(user!, { nickname, login: login || undefined, bio });
      showMessage('Профиль сохранён!', 'success');

      // Update header
      const headerName = document.getElementById('userNameHeader');
      if (headerName) headerName.textContent = nickname;
    });
  }

  // Logout
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
