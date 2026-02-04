import type { User, Database } from './types';
import { StorageKeys } from './types';

// ==================== HELPER: LEVEL BADGE ====================

function getLevelBadgeClass(level: number): string {
  if (level <= 3) return 'level-1-3';
  if (level <= 6) return 'level-4-6';
  return 'level-7-10';
}

function renderFriendCard(user: User, actionHtml: string = ''): string {
  const levelClass = getLevelBadgeClass(user.level);
  return `
    <div class="friend-card">
      <a href="user-profile-view.html?id=${user.id}" class="friend-card-link">
        <img src="${user.avatar || 'https://via.placeholder.com/40'}" alt="" class="friend-avatar">
        <div class="friend-info">
          <span class="friend-name">${user.nickname}</span>
          ${user.login ? `<span class="friend-login">@${user.login}</span>` : ''}
        </div>
      </a>
      <span class="friend-level-badge ${levelClass}">${user.level}</span>
      ${actionHtml}
    </div>
  `;
}

function renderEmptyState(svgPath: string, title: string, hint: string): string {
  return `
    <div class="friends-empty">
      <div class="empty-icon-box">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="${svgPath}"/></svg>
      </div>
      <p>${title}</p>
      <span class="empty-hint">${hint}</span>
    </div>
  `;
}

// SVG paths for icons
const ICONS = {
  friends: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  groups: 'M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 000 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85A6.95 6.95 0 0020 14c-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z'
};

// ==================== AUTHENTICATION ====================

function checkAuth(): User | null {
  const isLoggedIn = localStorage.getItem(StorageKeys.LOGGED_IN);
  if (!isLoggedIn) {
    window.location.href = 'index.html';
    return null;
  }

  const userStr = localStorage.getItem(StorageKeys.CURRENT_USER);
  if (!userStr) {
    window.location.href = 'index.html';
    return null;
  }

  return JSON.parse(userStr);
}

// ==================== HEADER ====================

function loadHeader(user: User): void {
  const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement;
  const headerName = document.getElementById('userNameHeader');
  const headerLevel = document.getElementById('userLevelHeader');
  const dropdownAvatar = document.getElementById('dropdownAvatar') as HTMLImageElement;
  const dropdownName = document.getElementById('dropdownName');

  if (headerAvatar && user.avatar) headerAvatar.src = user.avatar;
  if (headerName) headerName.textContent = user.nickname;
  if (headerLevel) headerLevel.textContent = user.level.toString();
  if (dropdownAvatar && user.avatar) dropdownAvatar.src = user.avatar;
  if (dropdownName) dropdownName.textContent = user.nickname;
}

// ==================== PROFILE DROPDOWN ====================

function setupProfileDropdown(_user: User): void {
  const toggle = document.getElementById('userProfileToggle');
  const dropdown = document.getElementById('profileDropdown');
  if (!toggle || !dropdown) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('#userProfileToggle')) {
      dropdown.classList.remove('open');
    }
  });

  // Logout
  document.getElementById('dropdownLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Вы уверены, что хотите выйти?')) {
      localStorage.removeItem(StorageKeys.LOGGED_IN);
      localStorage.removeItem(StorageKeys.CURRENT_USER);
      window.location.href = 'index.html';
    }
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
      results.innerHTML = found.map(u => {
        const levelClass = getLevelBadgeClass(u.level);
        return `
          <a href="user-profile-view.html?id=${u.id}" class="search-result-item">
            <img src="${u.avatar || 'https://via.placeholder.com/40'}" alt="" class="search-result-avatar">
            <div class="search-result-info">
              <span class="search-result-name">${u.nickname}</span>
              ${u.login ? `<span class="search-result-login">@${u.login}</span>` : ''}
            </div>
            <span class="search-result-level ${levelClass}">${u.level}</span>
          </a>
        `;
      }).join('');
    }

    results.classList.add('open');
  });

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.nav-search')) {
      results.classList.remove('open');
    }
  });
}

// ==================== TABS ====================

function setupTabs(): void {
  const tabs = document.querySelectorAll('.friends-tab');
  const contents = document.querySelectorAll('[data-tab-content]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = (tab as HTMLElement).dataset.tab;
      if (!targetTab) return;

      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show target content
      contents.forEach(content => {
        if ((content as HTMLElement).dataset.tabContent === targetTab) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });
    });
  });
}

// ==================== LOAD LISTS ====================

function loadFriends(currentUser: User): void {
  const listEl = document.getElementById('friendsList');
  const countEl = document.getElementById('friendsCount');
  if (!listEl) return;

  const friends = currentUser.friends || [];
  if (countEl) countEl.textContent = friends.length.toString();

  if (friends.length === 0) {
    listEl.innerHTML = renderEmptyState(
      ICONS.friends,
      'У вас пока нет друзей',
      'Найдите игроков через поиск и добавьте их в друзья'
    );
    return;
  }

  const dbStr = localStorage.getItem(StorageKeys.DATABASE);
  if (!dbStr) return;
  const db: Database = JSON.parse(dbStr);

  const friendUsers = friends
    .map(id => db.users.find(u => u.id === id))
    .filter((u): u is User => u !== undefined);

  listEl.innerHTML = friendUsers.map(user =>
    renderFriendCard(user, `
      <button class="friend-action" data-user-id="${user.id}" data-action="remove-friend">
        Удалить
      </button>
    `)
  ).join('');

  // Bind remove buttons
  listEl.querySelectorAll('[data-action="remove-friend"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = (btn as HTMLElement).dataset.userId;
      if (userId) removeFriend(currentUser, userId);
    });
  });
}

function loadSubscribers(currentUser: User): void {
  const listEl = document.getElementById('subscribersList');
  const countEl = document.getElementById('subscribersCount');
  if (!listEl) return;

  const dbStr = localStorage.getItem(StorageKeys.DATABASE);
  if (!dbStr) return;
  const db: Database = JSON.parse(dbStr);

  // Find users who have currentUser in their subscriptions
  const subscribers = db.users.filter(u =>
    (u.subscriptions || []).includes(currentUser.id)
  );

  if (countEl) countEl.textContent = subscribers.length.toString();

  if (subscribers.length === 0) {
    listEl.innerHTML = renderEmptyState(
      ICONS.bell,
      'У вас пока нет подписчиков',
      'Когда кто-то подпишется на вас, они появятся здесь'
    );
    return;
  }

  listEl.innerHTML = subscribers.map(user => renderFriendCard(user)).join('');
}

function loadSubscriptions(currentUser: User): void {
  const listEl = document.getElementById('subscriptionsList');
  const countEl = document.getElementById('subscriptionsCount');
  if (!listEl) return;

  const subscriptions = currentUser.subscriptions || [];
  if (countEl) countEl.textContent = subscriptions.length.toString();

  if (subscriptions.length === 0) {
    listEl.innerHTML = renderEmptyState(
      ICONS.star,
      'Вы пока ни на кого не подписаны',
      'Подпишитесь на интересных игроков'
    );
    return;
  }

  const dbStr = localStorage.getItem(StorageKeys.DATABASE);
  if (!dbStr) return;
  const db: Database = JSON.parse(dbStr);

  const subUsers = subscriptions
    .map(id => db.users.find(u => u.id === id))
    .filter((u): u is User => u !== undefined);

  listEl.innerHTML = subUsers.map(user =>
    renderFriendCard(user, `
      <button class="friend-action" data-user-id="${user.id}" data-action="unsubscribe">
        Отписаться
      </button>
    `)
  ).join('');

  // Bind unsubscribe buttons
  listEl.querySelectorAll('[data-action="unsubscribe"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = (btn as HTMLElement).dataset.userId;
      if (userId) unsubscribe(currentUser, userId);
    });
  });
}

function loadGroups(currentUser: User): void {
  const listEl = document.getElementById('groupsList');
  const countEl = document.getElementById('groupsCount');
  if (!listEl) return;

  const groups = currentUser.groups || [];
  if (countEl) countEl.textContent = groups.length.toString();

  listEl.innerHTML = renderEmptyState(
    ICONS.groups,
    'Вы не состоите ни в одной группе',
    'Группы появятся в будущих обновлениях'
  );
}

// ==================== ACTIONS ====================

function removeFriend(currentUser: User, targetId: string): void {
  if (!confirm('Удалить из друзей?')) return;

  const friends = currentUser.friends || [];
  const idx = friends.indexOf(targetId);
  if (idx === -1) return;

  friends.splice(idx, 1);
  currentUser.friends = friends;

  // Save current user
  localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(currentUser));

  // Update database
  const dbStr = localStorage.getItem(StorageKeys.DATABASE);
  if (dbStr) {
    const db: Database = JSON.parse(dbStr);

    // Update current user in DB
    const currentIdx = db.users.findIndex(u => u.id === currentUser.id);
    if (currentIdx !== -1) db.users[currentIdx] = currentUser;

    // Also remove from target's friends
    const targetUser = db.users.find(u => u.id === targetId);
    if (targetUser && targetUser.friends) {
      const tIdx = targetUser.friends.indexOf(currentUser.id);
      if (tIdx !== -1) targetUser.friends.splice(tIdx, 1);
    }

    localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));
  }

  // Reload friends list
  loadFriends(currentUser);
}

function unsubscribe(currentUser: User, targetId: string): void {
  const subs = currentUser.subscriptions || [];
  const idx = subs.indexOf(targetId);
  if (idx === -1) return;

  subs.splice(idx, 1);
  currentUser.subscriptions = subs;

  // Save current user
  localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(currentUser));

  // Update database
  const dbStr = localStorage.getItem(StorageKeys.DATABASE);
  if (dbStr) {
    const db: Database = JSON.parse(dbStr);
    const currentIdx = db.users.findIndex(u => u.id === currentUser.id);
    if (currentIdx !== -1) db.users[currentIdx] = currentUser;
    localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));
  }

  // Reload subscriptions list
  loadSubscriptions(currentUser);
  // Also update subscribers count for others
  loadSubscribers(currentUser);
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
  const currentUser = checkAuth();
  if (!currentUser) return;

  // Apply theme first
  applyTheme();

  loadHeader(currentUser);
  setupProfileDropdown(currentUser);
  setupSearch(currentUser);
  setupTabs();

  // Load all lists
  loadFriends(currentUser);
  loadSubscribers(currentUser);
  loadSubscriptions(currentUser);
  loadGroups(currentUser);
}

// ==================== ENTRY POINT ====================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
