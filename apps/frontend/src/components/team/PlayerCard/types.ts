export interface Player {
  id: string;
  name: string;
  role: string;
  team: string;
  points: number;
  price: number;
  image?: string;
  stats?: {
    matches: number;
    runs?: number;
    wickets?: number;
    average?: number;
  };
}

export interface PlayerCardProps {
  player: Player;
  isSelected: boolean;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  onSelect: (playerId: string) => void;
  onSetCaptain?: (playerId: string) => void;
  onSetViceCaptain?: (playerId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  displayRoleMap?: (role: string) => string;
  compactShowPrice?: boolean;
  disabled?: boolean;
}

export interface PlayerListProps {
  players: Player[];
  selectedPlayers: string[];
  captainId?: string;
  viceCaptainId?: string;
  onPlayerSelect: (playerId: string) => void;
  onSetCaptain?: (playerId: string) => void;
  onSetViceCaptain?: (playerId: string) => void;
  /** Overall maximum selection across all roles */
  maxSelections?: number;
  /** Optional per-role selection limits, e.g. { "Batsman": 4 } */
  roleLimits?: Record<string, number>;
  /** Optional active role filter. Use "All" or undefined for no filter */
  filterRole?: string;
  /** Optional active slot filter. If provided, overrides filterRole */
  filterSlot?: number;
  /** Sort players by role category order */
  sortByRole?: boolean;
  /** Called if a selection is blocked due to limits */
  onBlockedSelect?: (reason: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  /** Optional mapper to override the displayed role label for child cards */
  displayRoleMap?: (role: string) => string;
  /** When compact, show price instead of points on the right */
  compactShowPrice?: boolean;
  /** Function to determine if a player should be disabled */
  isPlayerDisabled?: (player: Player) => boolean;
}
