// ==================== USER & DATABASE TYPES ====================

export interface User {
  id: string;
  nickname: string;
  login?: string;
  email: string;
  password: string; // In production, this would be hashed
  level: number;
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  registeredAt: string;
  emailVerified: boolean;
  avatar?: string;
  bio?: string;
  bannerImage?: string;
  bannerVideo?: string; // URL to GIF or video for animated banner
  profileWidgets?: ProfileWidget[];
  bannerLayout?: BannerLayout;
  friends?: string[];       // array of user IDs
  subscriptions?: string[]; // array of user IDs
  groups?: string[];        // array of group IDs
  notifications?: UserNotification[];
  achievements?: string[];  // array of achievement IDs
}

// ==================== BANNER LAYOUT TYPES ====================

export interface BannerPosition {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
}

export interface TextStyle {
  color?: string;       // CSS color value
  fontFamily?: string;  // font-family name
  fontSize?: number;    // px value
}

export interface BannerElement {
  id: string;
  type: BannerElementType;
  position: BannerPosition;
  zIndex: number;
  visible: boolean;
  textStyle?: TextStyle;
}

export type BannerElementType = 'avatar' | 'username' | 'subtitle' | 'stats' | 'widget';

export interface BannerLayout {
  version: number;
  canvasHeight: number;
  elements: BannerElement[];
}

export const BANNER_FONTS = [
  'Inter, sans-serif',
  'Georgia, serif',
  'Courier New, monospace',
  'Impact, sans-serif',
  'Comic Sans MS, cursive',
  'Trebuchet MS, sans-serif',
  'Arial Black, sans-serif',
  'Palatino, serif',
];

export const DEFAULT_BANNER_LAYOUT: BannerLayout = {
  version: 1,
  canvasHeight: 400,
  elements: [
    { id: 'avatar', type: 'avatar', position: { x: 3, y: 35 }, zIndex: 10, visible: true },
    { id: 'username', type: 'username', position: { x: 18, y: 52 }, zIndex: 10, visible: true, textStyle: { fontSize: 32 } },
    { id: 'subtitle', type: 'subtitle', position: { x: 18, y: 62 }, zIndex: 10, visible: true, textStyle: { fontSize: 16 } },
    { id: 'stats', type: 'stats', position: { x: 3, y: 78 }, zIndex: 10, visible: true },
  ],
};

// ==================== PROFILE WIDGET TYPES ====================

export interface ProfileWidget {
  id: string;
  type: WidgetType;
  content: string; // text, gif URL, or sticker ID
  position: 'left' | 'right';
  canvasPosition?: BannerPosition;
  zIndex?: number;
  scale?: number;    // uniform scale factor (default 1)
  stretchX?: number; // horizontal stretch factor (default 1)
  stretchY?: number; // vertical stretch factor (default 1)
}

export type WidgetType = 'text' | 'gif' | 'sticker';

export const STICKERS: Record<string, string> = {
  trophy: '🏆',
  fire: '🔥',
  sword: '⚔️',
  star: '⭐',
  crown: '👑',
  lightning: '⚡',
  skull: '💀',
  rocket: '🚀',
  gem: '💎',
  shield: '🛡️',
  target: '🎯',
  medal: '🎖️',
  controller: '🎮',
  globe: '🌍',
  chess: '♟️',
  heart: '❤️'
};

export interface Database {
  users: User[];
  sessions: Session[];
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

// ==================== AUTHENTICATION TYPES ====================

export interface VerificationData {
  email: string;
  code: string;
  expiresAt: number;
}

export interface PendingLogin {
  userId: string;
  email: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface CreateUserData {
  nickname: string;
  email: string;
  password: string;
}

// ==================== NOTIFICATION TYPES ====================

export interface UserNotification {
  id: string;
  type: 'friend_request' | 'subscription' | 'friend_accepted';
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  read: boolean;
  createdAt: string;
}

// ==================== TOURNAMENT TYPES ====================

export interface Tournament {
  id: string;
  title: string;
  game: Game;
  status: TournamentStatus;
  prize: string;
  players: number;
  maxPlayers: number;
  startDate: string;
  format: string;
  entryFee?: string;
}

export type TournamentStatus = 'upcoming' | 'live' | 'registration';

export type Game = 'Warcraft III' | 'Star Wars: EaW' | 'Company of Heroes' | 'All';

// ==================== MATCH TYPES ====================

export interface Match {
  id: string;
  player1: string;
  player2: string;
  result: MatchResult;
  game: Game;
  date: string;
  score?: string;
}

export type MatchResult = 'win' | 'loss' | 'draw' | 'live';

// ==================== STATS TYPES ====================

export interface UserStats {
  elo: number;
  wins: number;
  losses: number;
  winRate: number;
  gamesPlayed: number;
  level: number;
}

// ==================== STORAGE KEYS ====================

export const StorageKeys = {
  DATABASE: 'mesaDatabase',
  CURRENT_USER: 'mesaCurrentUser',
  LOGGED_IN: 'mesaLoggedIn',
  VERIFICATION: 'mesaVerification',
  PENDING_LOGIN: 'mesaPendingLogin'
} as const;

// ==================== UTILITY TYPES ====================

export type MessageType = 'success' | 'error' | 'info';

export interface FormMessage {
  text: string;
  type: MessageType;
}
