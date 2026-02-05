import type { User, Database, BannerLayout, BannerElement, ProfileWidget, TextStyle, MatchResult, Game } from './types';
import { StorageKeys, DEFAULT_BANNER_LAYOUT, STICKERS } from './types';

// ==================== MOCK MATCH DATA ====================

interface MockMatch {
  id: string;
  opponent: string;
  result: MatchResult;
  game: Game;
  eloChange: number;
  date: string;
  score: string;
  duration: string;
}

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

// ==================== HEADER ====================

function loadHeader(user: User): void {
  const headerName = document.getElementById('userNameHeader');
  const headerLevel = document.getElementById('userLevelHeader');
  const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement | null;

  if (headerName) headerName.textContent = user.nickname;
  if (headerLevel) headerLevel.textContent = user.level.toString();
  if (headerAvatar && user.avatar) headerAvatar.src = user.avatar;
}

// ==================== BANNER RENDERING ====================

function renderBanner(user: User): void {
  const bannerBg = document.getElementById('viewBannerBg');
  const canvas = document.getElementById('viewBannerCanvas');
  if (!bannerBg || !canvas) return;

  // 1. Background (video/GIF/image)
  if (user.bannerVideo) {
    const url = user.bannerVideo;
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
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.className = 'banner-bg-gif';
      bannerBg.appendChild(img);
    }
  } else if (user.bannerImage) {
    bannerBg.style.backgroundImage = `url(${user.bannerImage})`;
    bannerBg.style.backgroundSize = 'cover';
    bannerBg.style.backgroundPosition = 'center';
  }

  // 2. Load layout
  const layout: BannerLayout = (user.bannerLayout && user.bannerLayout.version)
    ? JSON.parse(JSON.stringify(user.bannerLayout))
    : JSON.parse(JSON.stringify(DEFAULT_BANNER_LAYOUT));

  // 3. Render core elements
  for (const el of layout.elements) {
    if (!el.visible) continue;
    const domEl = createBannerElement(el, user);
    domEl.style.position = 'absolute';
    domEl.style.left = `${el.position.x}%`;
    domEl.style.top = `${el.position.y}%`;
    domEl.style.zIndex = el.zIndex.toString();
    canvas.appendChild(domEl);
  }

  // 4. Render widgets
  const widgets = user.profileWidgets || [];
  for (const widget of widgets) {
    const widgetEl = createWidgetElement(widget);
    const pos = widget.canvasPosition || { x: 50, y: 50 };
    widgetEl.style.position = 'absolute';
    widgetEl.style.left = `${pos.x}%`;
    widgetEl.style.top = `${pos.y}%`;
    widgetEl.style.zIndex = (widget.zIndex || 20).toString();
    canvas.appendChild(widgetEl);
  }
}

function createBannerElement(el: BannerElement, user: User): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'banner-element';
  wrapper.dataset.elementId = el.id;

  switch (el.type) {
    case 'avatar': {
      const container = document.createElement('div');
      container.className = 'profile-avatar-container';

      const img = document.createElement('img');
      img.src = user.avatar || 'https://via.placeholder.com/120';
      img.alt = 'Avatar';
      img.className = 'profile-avatar';
      container.appendChild(img);

      const badge = document.createElement('div');
      badge.className = 'profile-level-badge';
      const levelNum = document.createElement('span');
      levelNum.className = 'level-number';
      levelNum.textContent = user.level.toString();
      badge.appendChild(levelNum);
      container.appendChild(badge);

      wrapper.appendChild(container);
      break;
    }
    case 'username': {
      const h1 = document.createElement('h1');
      h1.className = 'profile-name';
      h1.textContent = user.nickname || 'Player';
      if (el.textStyle) applyTextStyle(h1, el.textStyle);
      wrapper.appendChild(h1);
      break;
    }
    case 'subtitle': {
      const p = document.createElement('p');
      p.className = 'profile-subtitle';
      p.textContent = user.bio || 'Warcraft III Player';
      if (el.textStyle) applyTextStyle(p, el.textStyle);
      wrapper.appendChild(p);
      break;
    }
    case 'stats': {
      const totalGames = user.wins + user.losses;
      const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

      // Count subscribers from DB
      let subscriberCount = 0;
      const dbStr2 = localStorage.getItem(StorageKeys.DATABASE);
      if (dbStr2) {
        const db2: Database = JSON.parse(dbStr2);
        subscriberCount = db2.users.filter(u => (u.subscriptions || []).includes(user.id)).length;
      }

      const statsDiv = document.createElement('div');
      statsDiv.className = 'profile-stats-mini';

      statsDiv.innerHTML = `
        <div class="stat-mini">
          <span class="stat-value">${user.elo.toLocaleString()}</span>
          <span class="stat-label">Рейтинг ELO</span>
        </div>
        <div class="stat-mini">
          <span class="stat-value">${user.wins}</span>
          <span class="stat-label">Побед</span>
        </div>
        <div class="stat-mini">
          <span class="stat-value">${winRate}%</span>
          <span class="stat-label">Винрейт</span>
        </div>
        <div class="stat-mini-separator"></div>
        <div class="stat-mini">
          <span class="stat-value">${user.friends?.length || 0}</span>
          <span class="stat-label">Друзья</span>
        </div>
        <div class="stat-mini">
          <span class="stat-value">${subscriberCount}</span>
          <span class="stat-label">Подписчики</span>
        </div>
        <div class="stat-mini">
          <span class="stat-value">${user.groups?.length || 0}</span>
          <span class="stat-label">Группы</span>
        </div>
      `;

      wrapper.appendChild(statsDiv);
      break;
    }
  }

  return wrapper;
}

function applyTextStyle(el: HTMLElement, style: TextStyle): void {
  if (style.color) {
    el.classList.add('custom-color');
    el.style.color = style.color;
  }
  if (style.fontFamily) {
    el.style.fontFamily = style.fontFamily;
  }
  if (style.fontSize) {
    el.style.fontSize = `${style.fontSize}px`;
  }
}

function createWidgetElement(widget: ProfileWidget): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'banner-element';
  wrapper.dataset.elementId = `widget-${widget.id}`;

  const content = document.createElement('div');
  content.className = 'profile-widget';

  switch (widget.type) {
    case 'text':
      content.classList.add('widget-text');
      content.textContent = widget.content;
      break;
    case 'sticker':
      content.classList.add('widget-sticker');
      content.textContent = STICKERS[widget.content] || widget.content;
      break;
    case 'gif': {
      content.classList.add('widget-gif');
      const img = document.createElement('img');
      img.src = widget.content;
      img.alt = 'GIF';
      content.appendChild(img);
      break;
    }
  }

  // Apply scale + stretch transforms
  const scale = widget.scale || 1;
  const sx = widget.stretchX || 1;
  const sy = widget.stretchY || 1;
  if (scale !== 1 || sx !== 1 || sy !== 1) {
    content.style.transform = `scale(${scale * sx}, ${scale * sy})`;
    content.style.transformOrigin = 'center center';
  }

  wrapper.appendChild(content);
  return wrapper;
}

// ==================== STATS ====================

// Games data with SVG icons
const GAMES_DATA = [
  { id: 'warcraft3', name: 'Warcraft III', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5H5l7 8 7-8h-1.92l-5.08 5.8L6.92 5zM5 19h14v-2H5v2z"/></svg>' },
  { id: 'starwars', name: 'Star Wars: EaW', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>' },
  { id: 'coh', name: 'Company of Heroes', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
];

function loadStats(user: User): void {
  // Account stats
  const levelEl = document.getElementById('statLevel');
  const friendsEl = document.getElementById('statFriends');
  const subscribersEl = document.getElementById('statSubscribers');
  const groupsEl = document.getElementById('statGroups');
  const regEl = document.getElementById('statRegisteredAt');
  const achievementsEl = document.getElementById('statAchievements');

  if (levelEl) levelEl.textContent = user.level.toString();

  // Friends count
  if (friendsEl) friendsEl.textContent = (user.friends?.length || 0).toString();

  // Subscribers count (users who have this user in their subscriptions)
  if (subscribersEl) {
    let subscriberCount = 0;
    const dbStr = localStorage.getItem(StorageKeys.DATABASE);
    if (dbStr) {
      const db: Database = JSON.parse(dbStr);
      subscriberCount = db.users.filter(u => (u.subscriptions || []).includes(user.id)).length;
    }
    subscribersEl.textContent = subscriberCount.toString();
  }

  // Groups count
  if (groupsEl) groupsEl.textContent = (user.groups?.length || 0).toString();

  // Registration date
  if (regEl && user.registeredAt) {
    const date = new Date(user.registeredAt);
    regEl.textContent = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // Achievements count (mock for now)
  if (achievementsEl) {
    const achievementCount = user.achievements?.length || 0;
    achievementsEl.textContent = achievementCount.toString();
  }

  // Load games played list
  loadGamesPlayedList(user);

  // Setup game selector
  setupGameSelector(user);
}

function loadGamesPlayedList(user: User): void {
  const listEl = document.getElementById('gamesPlayedList');
  if (!listEl) return;

  // Helper function to generate rank medal SVG
  const getRankMedalSVG = (rankClass: string) => {
    const colors: { [key: string]: { bronze: string; gold: string; stroke: string; } } = {
      bronze: {
        bronze: 'linear-gradient(135deg, #b8862f 0%, #d4a854 50%, #b8862f 100%)',
        gold: 'linear-gradient(135deg, #fffef0 0%, #f5d794 50%, #d4a854 100%)',
        stroke: '#8b6530'
      },
      silver: {
        bronze: 'linear-gradient(135deg, #a8a8a8 0%, #c0c0c0 50%, #a8a8a8 100%)',
        gold: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 50%, #c0c0c0 100%)',
        stroke: '#909090'
      },
      gold: {
        bronze: 'linear-gradient(135deg, #d4a017 0%, #ffd700 50%, #d4a017 100%)',
        gold: 'linear-gradient(135deg, #fffef0 0%, #ffe55c 50%, #ffd700 100%)',
        stroke: '#b8860b'
      },
      platinum: {
        bronze: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #0284c7 100%)',
        gold: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 50%, #38bdf8 100%)',
        stroke: '#0369a1'
      }
    };

    const color = colors[rankClass];
    return `
      <svg viewBox="0 0 200 200" style="width: 32px; height: 32px;">
        <defs>
          <linearGradient id="${rankClass}-bronze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${rankClass === 'bronze' ? '#b8862f' : rankClass === 'silver' ? '#a8a8a8' : rankClass === 'gold' ? '#d4a017' : '#0284c7'}"/>
            <stop offset="50%" style="stop-color:${rankClass === 'bronze' ? '#d4a854' : rankClass === 'silver' ? '#c0c0c0' : rankClass === 'gold' ? '#ffd700' : '#0ea5e9'}"/>
            <stop offset="100%" style="stop-color:${rankClass === 'bronze' ? '#b8862f' : rankClass === 'silver' ? '#a8a8a8' : rankClass === 'gold' ? '#d4a017' : '#0284c7'}"/>
          </linearGradient>
          <linearGradient id="${rankClass}-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${rankClass === 'bronze' ? '#fffef0' : rankClass === 'silver' ? '#f0f0f0' : rankClass === 'gold' ? '#fffef0' : '#e0f2fe'}"/>
            <stop offset="50%" style="stop-color:${rankClass === 'bronze' ? '#f5d794' : rankClass === 'silver' ? '#e0e0e0' : rankClass === 'gold' ? '#ffe55c' : '#7dd3fc'}"/>
            <stop offset="100%" style="stop-color:${rankClass === 'bronze' ? '#d4a854' : rankClass === 'silver' ? '#c0c0c0' : rankClass === 'gold' ? '#ffd700' : '#38bdf8'}"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#${rankClass}-bronze)" stroke="${color.stroke}" stroke-width="1"/>
        <circle cx="100" cy="100" r="93" fill="#4a3d1f" stroke="url(#${rankClass}-gold)" stroke-width="2.5"/>
        <circle cx="100" cy="100" r="91" fill="none" stroke="${color.stroke}" stroke-width="0.8" opacity="0.6"/>
        <circle cx="100" cy="100" r="89.5" fill="none" stroke="url(#${rankClass}-gold)" stroke-width="1.5" opacity="0.8"/>
        <circle cx="100" cy="100" r="87" fill="none" stroke="${color.stroke}" stroke-width="1"/>
        <circle cx="100" cy="100" r="83" fill="url(#${rankClass}-bronze)"/>
        <g transform="translate(100, 100)">
          <polygon points="0,-32 10,-10 34,-10 15,5 22,28 0,14 -22,28 -15,5 -34,-10 -10,-10" fill="url(#${rankClass}-bronze)" stroke="${color.stroke}" stroke-width="2"/>
          <polygon points="0,-28 8.5,-8 29,-8 13,4 19,24 0,12 -19,24 -13,4 -29,-8 -8.5,-8" fill="url(#${rankClass}-gold)" stroke="#fffef0" stroke-width="1.5"/>
          <polygon points="0,-22 7,-6.5 23,-6.5 10.5,3 15,19 0,9.5 -15,19 -10.5,3 -23,-6.5 -7,-6.5" fill="#fffef0" opacity="0.9"/>
          <polygon points="0,-16 5,-4.5 16.5,-4.5 7.5,2 10.5,13.5 0,7 -10.5,13.5 -7.5,2 -16.5,-4.5 -5,-4.5" fill="#fff"/>
          <circle cx="0" cy="0" r="3" fill="#fff"/>
        </g>
      </svg>
    `;
  };

  // Helper function to get rank info based on ELO
  const getRankInfo = (elo: number) => {
    if (elo >= 2000) return { name: 'Платиновый', icon: getRankMedalSVG('platinum'), class: 'platinum' };
    if (elo >= 1500) return { name: 'Золотой', icon: getRankMedalSVG('gold'), class: 'gold' };
    if (elo >= 1000) return { name: 'Серебряный', icon: getRankMedalSVG('silver'), class: 'silver' };
    return { name: 'Бронзовый', icon: getRankMedalSVG('bronze'), class: 'bronze' };
  };

  // Generate mock stats for each game with extended info
  const gameStats = GAMES_DATA.map((game) => {
    const elo = user.elo + Math.floor(Math.random() * 200 - 100);
    const rank = getRankInfo(elo);

    // Random start dates (between 1-36 months ago)
    const monthsAgo = Math.floor(Math.random() * 36) + 1;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsAgo);
    const startMonth = startDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    // Random hours played
    const hoursPerDay = (Math.random() * 5 + 0.5).toFixed(1);
    const hoursPerWeek = (parseFloat(hoursPerDay) * 7).toFixed(0);
    const hoursPerMonth = (parseFloat(hoursPerDay) * 30).toFixed(0);

    return {
      ...game,
      elo,
      rank,
      startedPlaying: startMonth,
      hoursPerDay,
      hoursPerWeek,
      hoursPerMonth,
    };
  });

  listEl.innerHTML = gameStats.map(game => `
    <div class="favorite-game-card" data-game="${game.id}">
      <div class="favorite-game-header">
        <div class="favorite-game-icon">${game.icon}</div>
        <div class="favorite-game-title-info">
          <span class="favorite-game-name">${game.name}</span>
          <span class="favorite-game-started">Играю с ${game.startedPlaying}</span>
        </div>
        <div class="favorite-game-rank ${game.rank.class}">
          <span class="rank-icon">${game.rank.icon}</span>
          <span class="rank-name">${game.rank.name}</span>
        </div>
      </div>
      <div class="favorite-game-stats">
        <div class="favorite-stat">
          <div class="favorite-stat-label">Часов в день</div>
          <div class="favorite-stat-value">${game.hoursPerDay}ч</div>
        </div>
        <div class="favorite-stat">
          <div class="favorite-stat-label">Часов в неделю</div>
          <div class="favorite-stat-value">${game.hoursPerWeek}ч</div>
        </div>
        <div class="favorite-stat">
          <div class="favorite-stat-label">Часов в месяц</div>
          <div class="favorite-stat-value">${game.hoursPerMonth}ч</div>
        </div>
        <div class="favorite-stat highlight">
          <div class="favorite-stat-label">Рейтинг</div>
          <div class="favorite-stat-value">${game.elo.toLocaleString()}</div>
        </div>
      </div>
    </div>
  `).join('');

  // Click handlers for game items
  listEl.querySelectorAll('.favorite-game-card').forEach(item => {
    item.addEventListener('click', () => {
      const gameId = (item as HTMLElement).dataset.game;
      if (gameId) selectGame(gameId, user);
    });
  });
}

function setupGameSelector(user: User): void {
  const btn = document.getElementById('gameSelectorBtn');
  const dropdown = document.getElementById('gameSelectorDropdown');
  if (!dropdown || !btn) return;

  // Toggle dropdown on button click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdown.classList.remove('show');
  });

  // Handle option selection
  dropdown.querySelectorAll('.game-option').forEach(option => {
    option.addEventListener('click', () => {
      const gameId = (option as HTMLElement).dataset.game;
      if (gameId) {
        selectGame(gameId, user);
        dropdown.classList.remove('show');
      }
    });
  });
}

function selectGame(gameId: string, user: User): void {
  const selectorText = document.getElementById('gameSelectorText');
  const accountStats = document.getElementById('statsAccount');
  const gameStats = document.getElementById('statsGame');
  const dropdown = document.getElementById('gameSelectorDropdown');

  // Update dropdown active state
  dropdown?.querySelectorAll('.game-option').forEach(opt => {
    opt.classList.remove('active');
    if ((opt as HTMLElement).dataset.game === gameId) {
      opt.classList.add('active');
    }
  });

  if (gameId === 'account') {
    // Show account stats
    if (selectorText) selectorText.textContent = 'Аккаунт';
    accountStats?.classList.remove('hidden');
    gameStats?.classList.add('hidden');
  } else {
    // Show game-specific stats
    const game = GAMES_DATA.find(g => g.id === gameId);
    if (selectorText && game) selectorText.textContent = game.name;
    accountStats?.classList.add('hidden');
    gameStats?.classList.remove('hidden');

    // Load game-specific stats
    loadGameStats(gameId, user);
  }
}

function loadGameStats(gameId: string, user: User): void {
  const gameStats = document.getElementById('statsGame');
  if (!gameStats) return;

  const game = GAMES_DATA.find(g => g.id === gameId);
  if (!game) return;

  // Mock game-specific stats
  const games = Math.floor(user.gamesPlayed / GAMES_DATA.length) + Math.floor(Math.random() * 10);
  const wins = Math.floor(games * 0.52);
  const losses = games - wins;
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
  const elo = user.elo + Math.floor(Math.random() * 200 - 100);

  gameStats.innerHTML = `
    <div class="game-stats-header">
      <div class="game-stats-icon">${game.icon}</div>
      <span class="game-stats-name">${game.name}</span>
    </div>
    <div class="game-stats-grid">
      <div class="game-stat-card elo">
        <div class="game-stat-value">${elo.toLocaleString()}</div>
        <div class="game-stat-label">Рейтинг ELO</div>
      </div>
      <div class="game-stat-card wins">
        <div class="game-stat-value">${wins}</div>
        <div class="game-stat-label">Побед</div>
      </div>
      <div class="game-stat-card losses">
        <div class="game-stat-value">${losses}</div>
        <div class="game-stat-label">Поражений</div>
      </div>
      <div class="game-stat-card winrate">
        <div class="game-stat-value">${winRate}%</div>
        <div class="game-stat-label">Винрейт</div>
      </div>
    </div>
    <button class="back-to-account-btn" onclick="document.querySelector('.game-option[data-game=account]')?.click()">
      ← Назад к аккаунту
    </button>
  `;
}

// ==================== BIO ====================

function loadBio(user: User): void {
  const bioEl = document.getElementById('viewBio');
  const levelEl = document.getElementById('viewLevel');

  if (bioEl) {
    bioEl.textContent = user.bio || 'Нет описания';
  }
  if (levelEl) {
    levelEl.textContent = user.level.toString();
  }
}

// ==================== MATCH HISTORY ====================

function generateMockMatchHistory(_user: User): MockMatch[] {
  const opponents = ['Grubby', 'Happy', 'Lyn', 'TH000', 'Moon', 'Infi', 'Foggy', 'Hitman', 'Lawliet', 'Sok', 'ReMinD', 'Chaemiko'];
  const games: Game[] = ['Warcraft III', 'Star Wars: EaW', 'Company of Heroes'];
  const dates = ['Только что', '30 минут назад', '2 часа назад', '5 часов назад', 'Вчера', 'Вчера', '2 дня назад', '3 дня назад', '4 дня назад', '5 дней назад', 'На прошлой неделе', 'На прошлой неделе'];
  const scores = ['2-0', '2-1', '1-2', '0-2', '3-1', '1-3', '2-0', '2-1'];
  const durations = ['12 мин', '18 мин', '22 мин', '24 мин', '28 мин', '31 мин', '35 мин', '38 мин', '42 мин', '45 мин'];

  const matches: MockMatch[] = [];

  for (let i = 0; i < 12; i++) {
    const isWin = i % 3 !== 2; // roughly 2/3 wins
    const eloChange = isWin
      ? Math.floor(Math.random() * 20) + 15
      : -(Math.floor(Math.random() * 16) + 12);

    matches.push({
      id: (i + 1).toString(),
      opponent: opponents[i % opponents.length],
      result: isWin ? 'win' : 'loss',
      game: games[i % games.length],
      eloChange,
      date: dates[i],
      score: isWin ? scores[i % 4] : scores[(i % 4) + 4] || '1-2',
      duration: durations[i % durations.length],
    });
  }

  return matches;
}

function renderMatchHistory(matches: MockMatch[]): void {
  const list = document.getElementById('matchHistoryList');
  const countEl = document.getElementById('matchHistoryCount');
  if (!list) return;

  if (countEl) {
    countEl.textContent = `${matches.length} матчей`;
  }

  for (const match of matches) {
    const row = document.createElement('div');
    row.className = `match-history-row ${match.result}`;

    const eloSign = match.eloChange > 0 ? '+' : '';

    row.innerHTML = `
      <div class="match-history-result">${match.result === 'win' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</div>
      <div class="match-history-info">
        <span class="match-history-game">${match.game} · ${match.score}</span>
        <span class="match-history-opponent">vs ${match.opponent}</span>
      </div>
      <div class="match-history-meta">
        <span class="match-history-duration">${match.duration}</span>
        <span class="match-history-date">${match.date}</span>
      </div>
      <div class="match-history-elo">${eloSign}${match.eloChange}</div>
    `;

    list.appendChild(row);
  }
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

// ==================== SIDEBAR ====================

function setupSidebar(): void {
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

// ==================== SHARE BUTTON ====================

function setupShareButton(): void {
  const btn = document.getElementById('shareProfileBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        alert('Ссылка на профиль скопирована!');
      }).catch(() => {
        alert('Ссылка: ' + url);
      });
    });
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
    const userStr = localStorage.getItem(StorageKeys.CURRENT_USER);
    if (!userStr) return;
    const user: User = JSON.parse(userStr);
    const notifications = user.notifications || [];

    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
      badge!.textContent = unreadCount.toString();
      badge!.style.display = '';
    } else {
      badge!.style.display = 'none';
    }

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

    listEl!.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        handleNotificationAction(el.dataset.id!, el.dataset.action!, el.dataset.from);
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
      if (!user.friends) user.friends = [];
      if (!user.friends.includes(fromUserId)) user.friends.push(fromUserId);

      const requester = db.users.find(u => u.id === fromUserId);
      if (requester) {
        if (!requester.friends) requester.friends = [];
        if (!requester.friends.includes(user.id)) requester.friends.push(user.id);
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

    user.notifications = (user.notifications || []).filter(n => n.id !== notifId);
    localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(user));
    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx !== -1) db.users[idx] = user;
    localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));

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
    listEl!.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    if (isOpen) markAllRead();
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

// ==================== ACTIONS BAR ====================

function setupActionsBar(currentUser: User, profileUser: User): void {
  const actionsDiv = document.getElementById('profileActions');
  if (!actionsDiv) return;

  const isOwnProfile = currentUser.id === profileUser.id;

  if (isOwnProfile) {
    actionsDiv.innerHTML = `
      <a href="profile.html" class="btn-primary">
        ✏️ Редактировать профиль
      </a>
      <button class="btn-secondary" id="shareProfileBtn">
        🔗 Поделиться
      </button>
    `;
    setupShareButton();
  } else {
    const isFriend = (currentUser.friends || []).includes(profileUser.id);
    const isSubscribed = (currentUser.subscriptions || []).includes(profileUser.id);

    // Check if friend request is already pending
    const hasPendingRequest = (profileUser.notifications || []).some(
      n => n.type === 'friend_request' && n.fromUserId === currentUser.id
    );

    let friendBtnClass = 'btn-friend';
    let friendBtnText = '➕ Добавить в друзья';
    if (isFriend) {
      friendBtnClass = 'btn-friend added';
      friendBtnText = '✓ В друзьях';
    } else if (hasPendingRequest) {
      friendBtnClass = 'btn-friend added';
      friendBtnText = '⏳ Запрос отправлен';
    }

    actionsDiv.innerHTML = `
      <button class="${friendBtnClass}" id="friendBtn">
        ${friendBtnText}
      </button>
      <button class="btn-subscribe ${isSubscribed ? 'subscribed' : ''}" id="subscribeBtn">
        ${isSubscribed ? '✓ Вы подписаны' : '🔔 Подписаться'}
      </button>
      <button class="btn-secondary" id="shareProfileBtn">
        🔗 Поделиться
      </button>
    `;
    setupShareButton();

    // Friend button
    const friendBtn = document.getElementById('friendBtn');
    if (friendBtn) {
      friendBtn.addEventListener('click', () => {
        // Re-read DB for fresh data
        const dbStr = localStorage.getItem(StorageKeys.DATABASE);
        if (!dbStr) return;
        const db: Database = JSON.parse(dbStr);
        const targetUser = db.users.find(u => u.id === profileUser.id);
        if (!targetUser) return;

        const friends = currentUser.friends || [];

        if (friends.includes(profileUser.id)) {
          // Remove friend
          const idx = friends.indexOf(profileUser.id);
          friends.splice(idx, 1);
          currentUser.friends = friends;
          updateCurrentUser(currentUser);

          // Also remove from target's friends
          if (targetUser.friends) {
            const tIdx = targetUser.friends.indexOf(currentUser.id);
            if (tIdx !== -1) targetUser.friends.splice(tIdx, 1);
          }
          const dbIdx = db.users.findIndex(u => u.id === profileUser.id);
          if (dbIdx !== -1) db.users[dbIdx] = targetUser;
          localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));

          friendBtn.className = 'btn-friend';
          friendBtn.textContent = '➕ Добавить в друзья';
        } else {
          // Check if request already pending
          const alreadyPending = (targetUser.notifications || []).some(
            n => n.type === 'friend_request' && n.fromUserId === currentUser.id
          );
          if (alreadyPending) return;

          // Send friend request notification to target user
          if (!targetUser.notifications) targetUser.notifications = [];
          targetUser.notifications.unshift({
            id: Date.now().toString() + '_fr',
            type: 'friend_request',
            fromUserId: currentUser.id,
            fromUserName: currentUser.nickname,
            fromUserAvatar: currentUser.avatar,
            read: false,
            createdAt: new Date().toISOString(),
          });

          const dbIdx = db.users.findIndex(u => u.id === profileUser.id);
          if (dbIdx !== -1) db.users[dbIdx] = targetUser;
          localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));

          friendBtn.className = 'btn-friend added';
          friendBtn.textContent = '⏳ Запрос отправлен';
        }
      });
    }

    // Subscribe button
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) {
      subscribeBtn.addEventListener('click', () => {
        const subs = currentUser.subscriptions || [];
        const idx = subs.indexOf(profileUser.id);

        if (idx === -1) {
          subs.push(profileUser.id);
          subscribeBtn.className = 'btn-subscribe subscribed';
          subscribeBtn.textContent = '✓ Вы подписаны';

          // Send subscription notification to target user
          const dbStr = localStorage.getItem(StorageKeys.DATABASE);
          if (dbStr) {
            const db: Database = JSON.parse(dbStr);
            const targetUser = db.users.find(u => u.id === profileUser.id);
            if (targetUser) {
              if (!targetUser.notifications) targetUser.notifications = [];
              targetUser.notifications.unshift({
                id: Date.now().toString() + '_sub',
                type: 'subscription',
                fromUserId: currentUser.id,
                fromUserName: currentUser.nickname,
                fromUserAvatar: currentUser.avatar,
                read: false,
                createdAt: new Date().toISOString(),
              });
              const dbIdx = db.users.findIndex(u => u.id === profileUser.id);
              if (dbIdx !== -1) db.users[dbIdx] = targetUser;
              localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));
            }
          }
        } else {
          subs.splice(idx, 1);
          subscribeBtn.className = 'btn-subscribe';
          subscribeBtn.textContent = '🔔 Подписаться';
        }

        currentUser.subscriptions = subs;
        updateCurrentUser(currentUser);
      });
    }
  }
}

function updateCurrentUser(user: User): void {
  localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(user));

  const dbStr = localStorage.getItem(StorageKeys.DATABASE);
  if (dbStr) {
    const db: Database = JSON.parse(dbStr);
    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      db.users[idx] = user;
      localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));
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

// ==================== INIT ====================

function init(): void {
  const currentUser = checkAuth();
  if (!currentUser) return;

  // Apply theme first
  applyTheme();

  loadHeader(currentUser);
  setupProfileDropdown(currentUser);
  setupSearch(currentUser);
  setupNotifications(currentUser);

  // Determine which profile to show
  const params = new URLSearchParams(window.location.search);
  const viewId = params.get('id');

  let profileUser: User = currentUser;

  if (viewId && viewId !== currentUser.id) {
    // Load another user's profile from database
    const dbStr = localStorage.getItem(StorageKeys.DATABASE);
    if (dbStr) {
      const db: Database = JSON.parse(dbStr);
      const found = db.users.find(u => u.id === viewId);
      if (found) {
        profileUser = found;
      }
    }
  }

  renderBanner(profileUser);
  loadStats(profileUser);
  loadBio(profileUser);
  setupActionsBar(currentUser, profileUser);

  const matches = generateMockMatchHistory(profileUser);
  renderMatchHistory(matches);

  setupSidebar();
}

// ==================== ENTRY POINT ====================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
