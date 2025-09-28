// App Constants
export const APP_NAME = 'Fantasy11';
export const APP_DESCRIPTION = 'The ultimate fantasy cricket platform';

// API Routes
export const API_ROUTES = {
  HEALTH: '/api/health',
  PLAYERS: '/api/players',
  MATCHES: '/api/matches',
  TEAMS: '/api/teams',
  LEADERBOARD: '/api/leaderboard',
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
  },
  CONTESTS: {
    LIST: '/api/contests',
    JOIN: '/api/contests/join',
    RESULTS: '/api/contests/results',
  },
} as const;

// Player Roles
export const PLAYER_ROLES = {
  BATSMAN: 'Batsman',
  BOWLER: 'Bowler',
  ALL_ROUNDER: 'All-rounder',
  WICKET_KEEPER: 'Wicket-keeper',
} as const;

// Team Formation Rules
export const TEAM_FORMATION = {
  TOTAL_PLAYERS: 11,
  MIN_BATSMEN: 3,
  MAX_BATSMEN: 6,
  MIN_BOWLERS: 3,
  MAX_BOWLERS: 6,
  MIN_ALL_ROUNDERS: 1,
  MAX_ALL_ROUNDERS: 4,
  MIN_WICKET_KEEPERS: 1,
  MAX_WICKET_KEEPERS: 2,
  MIN_PLAYERS_PER_TEAM: 4,
  MAX_PLAYERS_PER_TEAM: 7,
  CAPTAIN_MULTIPLIER: 2,
  VICE_CAPTAIN_MULTIPLIER: 1.5,
  TOTAL_BUDGET: 100,
} as const;

// Match Status
export const MATCH_STATUS = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Contest Types
export const CONTEST_TYPES = {
  HEAD_TO_HEAD: 'head_to_head',
  MEGA: 'mega',
  PRACTICE: 'practice',
  PRIVATE: 'private',
} as const;

// Points System
export const POINTS_SYSTEM = {
  BATTING: {
    RUN: 1,
    BOUNDARY: 1,
    SIX: 2,
    FIFTY: 8,
    CENTURY: 16,
    DUCK: -2,
  },
  BOWLING: {
    WICKET: 25,
    BONUS_LBW_BOWLED: 8,
    THREE_WICKETS: 4,
    FOUR_WICKETS: 8,
    FIVE_WICKETS: 16,
    MAIDEN_OVER: 12,
  },
  FIELDING: {
    CATCH: 8,
    THREE_CATCHES: 4,
    STUMPING: 12,
    RUN_OUT: 12,
  },
  ECONOMY: {
    BELOW_5: 6,
    BETWEEN_5_6: 4,
    BETWEEN_6_7: 2,
    ABOVE_10: -6,
    ABOVE_11: -4,
    ABOVE_12: -2,
  },
} as const;

// UI Constants
export const UI_CONSTANTS = {
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#10B981',
    SUCCESS: '#22C55E',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#06B6D4',
  },
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  },
} as const;

// Export types
export type PlayerRole = typeof PLAYER_ROLES[keyof typeof PLAYER_ROLES];
export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];
export type ContestType = typeof CONTEST_TYPES[keyof typeof CONTEST_TYPES];
export type ApiRoute = typeof API_ROUTES[keyof typeof API_ROUTES];
