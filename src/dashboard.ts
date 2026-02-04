import type { User, Database } from './types';
import { StorageKeys } from './types';
import { BannerEditor } from './banner-editor';

// ==================== AUTHENTICATION ====================

function checkDashboardAuth(): boolean {
  const isLoggedIn = localStorage.getItem(StorageKeys.LOGGED_IN);

  if (isLoggedIn !== 'true') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// ==================== USER DATA ====================

function loadUserData(): User | null {
  const userDataStr = localStorage.getItem(StorageKeys.CURRENT_USER);

  if (!userDataStr) {
    window.location.href = 'login.html';
    return null;
  }

  const userData: User = JSON.parse(userDataStr);

  // Update profile banner
  const userNameElement = document.getElementById('userName');
  const userLevelElement = document.getElementById('userLevel');

  if (userNameElement) {
    userNameElement.textContent = userData.nickname || 'Player';
  }

  if (userLevelElement) {
    userLevelElement.textContent = userData.level.toString();
  }

  // Update header
  const userNameHeader = document.getElementById('userNameHeader');
  const userLevelHeader = document.getElementById('userLevelHeader');

  if (userNameHeader) {
    userNameHeader.textContent = userData.nickname || 'Player';
  }

  if (userLevelHeader) {
    userLevelHeader.textContent = userData.level.toString();
  }

  // Update avatar
  const avatarElements = document.querySelectorAll('.profile-avatar, .user-avatar-small');
  avatarElements.forEach(el => {
    if (userData.avatar) {
      (el as HTMLImageElement).src = userData.avatar;
    }
  });

  // Update bio
  const bioElement = document.getElementById('userSubtitle');
  if (bioElement && userData.bio) {
    bioElement.textContent = userData.bio;
  }

  // Update banner background (image, GIF URL, or video)
  const bannerBg = document.querySelector('.profile-banner-bg') as HTMLElement;
  if (bannerBg) {
    if (userData.bannerVideo) {
      const url = userData.bannerVideo;
      const isVideo = url.toLowerCase().endsWith('.mp4')
        || url.toLowerCase().endsWith('.webm')
        || url.toLowerCase().endsWith('.mov')
        || url.startsWith('data:video/');

      if (isVideo) {
        const video = document.createElement('video');
        video.src = url;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        bannerBg.appendChild(video);
      } else {
        // GIF URL — use as background-image
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.className = 'banner-bg-gif';
        bannerBg.appendChild(img);
      }
    } else if (userData.bannerImage) {
      bannerBg.style.backgroundImage = `url(${userData.bannerImage})`;
      bannerBg.style.backgroundSize = 'cover';
      bannerBg.style.backgroundPosition = 'center';
    }
  }

  return userData;
}

// ==================== SIDEBAR NAVIGATION ====================

function setupSidebar(): void {
  const sidebarItems = document.querySelectorAll('.sidebar-item');

  sidebarItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      // Skip for logout button
      if (target.classList.contains('logout-btn')) {
        e.preventDefault();
        logout();
        return;
      }

      // Remove active class from all items
      sidebarItems.forEach(i => i.classList.remove('active'));

      // Add active class to clicked item
      target.classList.add('active');
    });
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
    // Don't toggle if clicking a link inside dropdown
    if ((e.target as HTMLElement).closest('.dropdown-item')) return;
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  // Close on click outside
  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });

  // Logout from dropdown
  document.getElementById('dropdownLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
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

// ==================== LOGOUT ====================

function logout(): void {
  if (confirm('Вы уверены, что хотите выйти?')) {
    localStorage.removeItem(StorageKeys.LOGGED_IN);
    localStorage.removeItem(StorageKeys.CURRENT_USER);
    sessionStorage.clear();
    window.location.href = 'index.html';
  }
}

// ==================== GAME SELECTION ====================

function setupGameCards(): void {
  const gameCards = document.querySelectorAll('.game-card');

  gameCards.forEach(card => {
    card.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      gameCards.forEach(c => c.classList.remove('active'));
      target.classList.add('active');

      const gameName = target.querySelector('h3')?.textContent || 'Unknown';
      console.log('Selected game:', gameName);
      // Here you would load game-specific data
    });
  });
}

// ==================== PLAY OPTIONS ====================

function setupPlayOptions(): void {
  const playOptions = document.querySelectorAll('.play-option-btn');

  playOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const playType = target.querySelector('h3')?.textContent || '';

      if (playType.includes('Поиск игры')) {
        alert('Поиск игры начат!\n\nЭто демо-функция. В реальной версии здесь будет запущен матчмейкинг.');
      } else if (playType.includes('Турниры')) {
        window.location.href = 'index.html#tournaments';
      } else if (playType.includes('лобби')) {
        alert('Создание лобби\n\nЭто демо-функция. В реальной версии вы сможете создать свое лобби и пригласить друзей.');
      }
    });
  });
}

// ==================== STATS ====================

function generateMockStats(userData: User): void {
  // Calculate win rate
  const totalGames = userData.wins + userData.losses;
  const winRate = totalGames > 0 ? Math.round((userData.wins / totalGames) * 100) : 0;

  // Update stats in profile banner
  const profileStats = document.querySelectorAll('.stat-mini .stat-value');

  if (profileStats.length >= 3) {
    (profileStats[0] as HTMLElement).textContent = userData.elo.toString();
    (profileStats[1] as HTMLElement).textContent = userData.wins.toString();
    (profileStats[2] as HTMLElement).textContent = winRate + '%';
  }

  // Social stats
  const friendsEl = document.getElementById('statFriends');
  const subscribersEl = document.getElementById('statSubscribers');
  const groupsEl = document.getElementById('statGroups');

  if (friendsEl) friendsEl.textContent = (userData.friends?.length || 0).toString();
  if (groupsEl) groupsEl.textContent = (userData.groups?.length || 0).toString();

  // Subscribers = how many users in DB have this user in their subscriptions
  if (subscribersEl) {
    let subCount = 0;
    const dbStr = localStorage.getItem(StorageKeys.DATABASE);
    if (dbStr) {
      const db: Database = JSON.parse(dbStr);
      subCount = db.users.filter(u => (u.subscriptions || []).includes(userData.id)).length;
    }
    subscribersEl.textContent = subCount.toString();
  }
}

// ==================== NOTIFICATIONS ====================

function setupNotifications(currentUser: User): void {
  const btn = document.getElementById('notificationBtn');
  const dropdown = document.getElementById('notificationDropdown');
  const badge = document.getElementById('notificationBadge');
  const listEl = document.getElementById('notificationList');
  if (!btn || !dropdown || !badge || !listEl) return;

  function refreshNotifications(): void {
    // Re-read current user from DB to get latest notifications
    const userStr = localStorage.getItem(StorageKeys.CURRENT_USER);
    if (!userStr) return;
    const user: User = JSON.parse(userStr);
    const notifications = user.notifications || [];

    // Update badge
    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
      badge!.textContent = unreadCount.toString();
      badge!.style.display = '';
    } else {
      badge!.style.display = 'none';
    }

    // Render list
    if (notifications.length === 0) {
      listEl!.innerHTML = '<div class="notification-empty">Нет уведомлений</div>';
      return;
    }

    listEl!.innerHTML = notifications.map(n => {
      const avatar = n.fromUserAvatar || 'https://via.placeholder.com/40';
      let text = '';
      let actions = '';

      if (n.type === 'subscription') {
        text = `<strong>${n.fromUserName}</strong> подписался на вас`;
      } else if (n.type === 'friend_request') {
        text = `<strong>${n.fromUserName}</strong> хочет добавить вас в друзья`;
        actions = `
          <div class="notification-item-actions">
            <button class="btn-accept" data-action="accept" data-id="${n.id}" data-from="${n.fromUserId}">Добавить</button>
            <button class="btn-decline" data-action="decline" data-id="${n.id}">Отклонить</button>
          </div>
        `;
      } else if (n.type === 'friend_accepted') {
        text = `<strong>${n.fromUserName}</strong> принял вашу заявку в друзья`;
      }

      return `
        <div class="notification-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
          <img src="${avatar}" alt="" class="notification-item-avatar">
          <div class="notification-item-body">
            <div class="notification-item-text">${text}</div>
            <div class="notification-item-time">${formatTimeAgo(n.createdAt)}</div>
            ${actions}
          </div>
        </div>
      `;
    }).join('');

    // Bind accept/decline buttons
    listEl!.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const action = el.dataset.action;
        const notifId = el.dataset.id!;
        const fromUserId = el.dataset.from;

        handleNotificationAction(notifId, action!, fromUserId);
      });
    });
  }

  function handleNotificationAction(notifId: string, action: string, fromUserId?: string): void {
    const userStr = localStorage.getItem(StorageKeys.CURRENT_USER);
    if (!userStr) return;
    const user: User = JSON.parse(userStr);
    const dbStr = localStorage.getItem(StorageKeys.DATABASE);
    if (!dbStr) return;
    const db: Database = JSON.parse(dbStr);

    if (action === 'accept' && fromUserId) {
      // Add each other as friends
      if (!user.friends) user.friends = [];
      if (!user.friends.includes(fromUserId)) user.friends.push(fromUserId);

      // Add current user to the requester's friends too
      const requester = db.users.find(u => u.id === fromUserId);
      if (requester) {
        if (!requester.friends) requester.friends = [];
        if (!requester.friends.includes(user.id)) requester.friends.push(user.id);

        // Send "friend_accepted" notification to requester
        if (!requester.notifications) requester.notifications = [];
        requester.notifications.unshift({
          id: Date.now().toString() + '_acc',
          type: 'friend_accepted',
          fromUserId: user.id,
          fromUserName: user.nickname,
          fromUserAvatar: user.avatar,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Remove the notification
    user.notifications = (user.notifications || []).filter(n => n.id !== notifId);

    // Save
    localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(user));
    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx !== -1) db.users[idx] = user;
    localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));

    // Update current user reference
    currentUser.friends = user.friends;
    currentUser.notifications = user.notifications;

    refreshNotifications();
  }

  function markAllRead(): void {
    const userStr = localStorage.getItem(StorageKeys.CURRENT_USER);
    if (!userStr) return;
    const user: User = JSON.parse(userStr);
    if (!user.notifications || user.notifications.length === 0) return;

    let changed = false;
    for (const n of user.notifications) {
      if (!n.read) { n.read = true; changed = true; }
    }
    if (!changed) return;

    localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(user));
    const dbStr = localStorage.getItem(StorageKeys.DATABASE);
    if (dbStr) {
      const db: Database = JSON.parse(dbStr);
      const idx = db.users.findIndex(u => u.id === user.id);
      if (idx !== -1) { db.users[idx] = user; localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db)); }
    }

    currentUser.notifications = user.notifications;
    badge!.style.display = 'none';

    // Update unread styling
    listEl!.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
  }

  // Toggle dropdown
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    if (isOpen) {
      markAllRead();
    }
  });

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('#navNotifications')) {
      dropdown.classList.remove('open');
    }
  });

  refreshNotifications();
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}

// ==================== CHAT ====================

function setupChat(): void {
  const chatButtons = document.querySelectorAll('.btn-icon');

  chatButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const friendItem = target.closest('.friend-item');
      const friendName = friendItem?.querySelector('.friend-name')?.textContent || 'Unknown';
      alert(`Открыть чат с ${friendName}\n\nЭто демо-функция. В реальной версии откроется окно чата.`);
    });
  });
}

// ==================== TOURNAMENTS ====================

function setupTournaments(): void {
  const tournamentBtns = document.querySelectorAll('.tournament-item .btn-primary');

  tournamentBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const tournamentItem = target.closest('.tournament-item');
      const tournamentName = tournamentItem?.querySelector('h4')?.textContent || 'Unknown';

      if (confirm(`Присоединиться к турниру "${tournamentName}"?`)) {
        alert('Вы успешно зарегистрированы в турнире!');
      }
    });
  });
}

// ==================== MATCHES ====================

function setupMatches(): void {
  const matchDetailsBtns = document.querySelectorAll('.match-row');

  matchDetailsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const opponent = target.querySelector('.match-opponent')?.textContent || 'Unknown';
      const result = target.querySelector('.match-result')?.textContent || 'Unknown';
      alert(`Детали матча\n\nПротив: ${opponent}\nРезультат: ${result}\n\nЭто демо-функция. В реальной версии откроется полная статистика матча.`);
    });
  });
}

// ==================== MOBILE MENU ====================

function createMobileMenuToggle(): void {
  if (window.innerWidth <= 968) {
    const header = document.querySelector('.header .nav');
    let menuBtn = document.querySelector('.mobile-menu-btn') as HTMLButtonElement | null;

    if (!menuBtn && header) {
      menuBtn = document.createElement('button');
      menuBtn.className = 'mobile-menu-btn';
      menuBtn.innerHTML = '☰';
      menuBtn.style.cssText = 'background:none;border:none;font-size:24px;color:white;cursor:pointer;';

      header.insertBefore(menuBtn, header.firstChild);

      menuBtn.addEventListener('click', function() {
        const sidebar = document.querySelector('.dashboard-sidebar');
        sidebar?.classList.toggle('open');
      });
    }
  }
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

// ==================== INITIALIZATION ====================

function initDashboard(): void {
  if (!checkDashboardAuth()) return;

  // Apply theme first
  applyTheme();

  const userData = loadUserData();
  if (!userData) return;

  generateMockStats(userData);
  setupProfileDropdown(userData);
  setupSearch(userData);
  setupSidebar();
  setupGameCards();
  setupPlayOptions();
  setupNotifications(userData);
  setupChat();
  setupTournaments();
  setupMatches();
  createMobileMenuToggle();

  // Initialize banner editor (drag-and-drop profile customization)
  const bannerEditor = new BannerEditor(userData);
  bannerEditor.init();

  // Click on banner avatar navigates to profile view (only when NOT in edit mode)
  const bannerAvatar = document.getElementById('bannerEl-avatar');
  const profileBanner = document.getElementById('profileBanner');
  if (bannerAvatar && profileBanner) {
    bannerAvatar.style.cursor = 'pointer';
    bannerAvatar.addEventListener('click', (e) => {
      // Don't navigate if in edit mode
      if (profileBanner.classList.contains('edit-mode')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      window.location.href = 'user-profile-view.html';
    });
  }

  console.log('Dashboard loaded successfully');
}

// ==================== ENTRY POINT ====================

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

// Handle window resize
window.addEventListener('resize', createMobileMenuToggle);
