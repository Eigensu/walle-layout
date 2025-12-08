# Team Viewer Enhancement - Pitch View Implementation Specification

## Overview

This document outlines the implementation plan for an enhanced Team Viewer component that displays teams in two views:

1. **Pitch View** - A visual representation on a cricket/football pitch background showing players in formation
2. **List View** - The current card-based list view (existing implementation)

The design is inspired by FPL (Fantasy Premier League) team visualization with the `ground.png` as the pitch background.

---

## Reference Design Analysis

Based on the provided FPL reference image, the pitch view includes:

### Header Stats Section

- **Average Points** - Season average per gameweek
- **Highest Points** - Best single gameweek score
- **Total Points** - Current gameweek/total points (highlighted in circle)
- **Rank** - Current standing (GW Rank in reference)
- **Transfers** - Number of transfers made

### Pitch Layout

- Green pitch background with perspective effect
- Goal area at top with goalposts
- Players arranged in formation rows by slot:
  - **Slot 1** (players at top - back row)
  - **Slot 2** (upper-middle row)
  - **Slot 3** (lower-middle row)
  - **Slot 4** (bottom row - front)

### Player Cards on Pitch

- Team jersey/kit image
- Player name below jersey
- Points badge below name
- Captain (C) and Vice-Captain (V) indicators on jersey

### Substitutes Bench

- Gray bench section at bottom
- Shows substitute players with slot labels (S1, S2, S3, S4)
- Same card format as pitch players

---

## Technical Implementation

### File Structure

```
apps/frontend/src/components/teamviewer/
├── atoms/
│   ├── PointsBadge.tsx (existing)
│   ├── ViewToggle.tsx (NEW)
│   ├── PitchPlayerCard.tsx (NEW)
│   └── StatBadge.tsx (NEW)
├── molecules/
│   ├── ActionModal.tsx (existing)
│   ├── ContestMetaBadges.tsx (existing)
│   ├── DangerActions.tsx (existing)
│   ├── HeroHeader.tsx (existing)
│   ├── TeamStatsHeader.tsx (NEW)
│   ├── SubstitutesBench.tsx (NEW)
│   └── PitchFormation.tsx (NEW)
├── organisms/
│   ├── TeamCard.tsx (existing - list view)
│   ├── PitchView.tsx (NEW)
│   └── TeamViewer.tsx (NEW - main wrapper)
├── index.ts
└── types.ts (NEW - shared types)
```

### 1. New Types Definition

**File:** `apps/frontend/src/components/teamviewer/types.ts`

```typescript
// View mode for team display
export type TeamViewMode = "pitch" | "list";

// Player slot (1-4 based system)
export type PlayerSlot = 1 | 2 | 3 | 4;

// Slot-based formation for team players
export interface SlotFormation {
  slot1: string[]; // Slot 1 players - Top row
  slot2: string[]; // Slot 2 players - Upper-middle row
  slot3: string[]; // Slot 3 players - Lower-middle row
  slot4: string[]; // Slot 4 players - Bottom row
}

// Stats displayed in header
export interface TeamStats {
  averagePoints?: number;
  highestPoints?: number;
  totalPoints: number;
  rank?: number;
  transfers?: number;
}

// Player data for pitch view
export interface PitchPlayer {
  id: string;
  name: string;
  team?: string;
  slot: number; // 1, 2, 3, or 4
  image?: string;
  points: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isSubstitute?: boolean;
}

// Props for main TeamViewer component
export interface TeamViewerProps {
  team: TeamBasic;
  players: PlayerBasic[];
  contestIdParam?: string;
  contestData?: ContestTeamData;
  enrollment?: TeamEnrollmentMeta;
  initialView?: TeamViewMode;
  onViewChange?: (view: TeamViewMode) => void;
  // ... existing props from TeamCard
}
```

### 2. ViewToggle Component (Atom)

**File:** `apps/frontend/src/components/teamviewer/atoms/ViewToggle.tsx`

**Purpose:** Toggle button between Pitch View and List View

```typescript
interface ViewToggleProps {
  currentView: TeamViewMode;
  onViewChange: (view: TeamViewMode) => void;
  className?: string;
}
```

**Design:**

- Two icon buttons side by side in a pill container
- Pitch icon (grid/layout icon) and List icon (lines icon)
- Active state with primary color highlight
- Smooth transition animation

**Visual:**

```
┌─────────────────────┐
│ [⊞ Pitch] [☰ List] │
└─────────────────────┘
```

### 3. StatBadge Component (Atom)

**File:** `apps/frontend/src/components/teamviewer/atoms/StatBadge.tsx`

**Purpose:** Display individual stat with label

```typescript
interface StatBadgeProps {
  value: number | string;
  label: string;
  variant?: "default" | "highlight" | "accent";
  size?: "sm" | "md" | "lg";
}
```

**Design:**

- Stack layout: value on top, label below
- Highlight variant for total points (circular badge)
- Arrow indicator for navigable stats

### 4. PitchPlayerCard Component (Atom)

**File:** `apps/frontend/src/components/teamviewer/atoms/PitchPlayerCard.tsx`

**Purpose:** Single player display on pitch

```typescript
interface PitchPlayerCardProps {
  player: PitchPlayer;
  onClick?: (playerId: string) => void;
  showPoints?: boolean;
  size?: "sm" | "md" | "lg";
}
```

**Design Elements:**

```
      ┌─────┐
      │ C/V │  ← Captain/VC badge (top right corner)
    ┌─┼─────┼─┐
    │ │ 🎽  │ │  ← Jersey/Avatar with team colors
    └─┼─────┼─┘
      └─────┘
    ┌─────────┐
    │ Haaland │  ← Player name (truncated if long)
    └─────────┘
    ┌───┐
    │28 │  ← Points badge (green bg for positive)
    └───┘
```

**Jersey/Avatar Logic:**

- If player has image, show it with jersey-like styling
- If no image, show stylized avatar with slot-based color gradient
- Slot-based color coding on the background

**Captain/Vice-Captain Badges:**

- Captain: Yellow/Gold "C" badge
- Vice-Captain: Silver "V" badge
- Position: Top-right corner of jersey

### 5. TeamStatsHeader Component (Molecule)

**File:** `apps/frontend/src/components/teamviewer/molecules/TeamStatsHeader.tsx`

**Purpose:** Stats bar above pitch

```typescript
interface TeamStatsHeaderProps {
  stats: TeamStats;
  teamName: string;
  contestName?: string;
  onClickStat?: (stat: keyof TeamStats) => void;
}
```

**Layout:**

```
┌───────────────────────────────────────────────────────────────────┐
│  58          138          ○70○        3,388,853        4          │
│ Average   Highest →    Total Pts      GW Rank →    Transfers     │
└───────────────────────────────────────────────────────────────────┘
│                    ★ Team of the Week →                          │
└───────────────────────────────────────────────────────────────────┘
```

**Features:**

- Responsive: stacks on mobile
- Click handlers for navigable stats (rank → leaderboard)
- Gradient background (purple/indigo like reference)

### 6. PitchFormation Component (Molecule)

**File:** `apps/frontend/src/components/teamviewer/molecules/PitchFormation.tsx`

**Purpose:** Arrange players on pitch by slot number

```typescript
interface PitchFormationProps {
  players: PitchPlayer[];
  captainId: string | null;
  viceCaptainId: string | null;
  formation?: SlotFormation;
  onPlayerClick?: (playerId: string) => void;
}
```

**Slot-Based Formation Logic:**

Players are arranged in 4 rows based on their slot number:

- **Slot 1:** Top row (like goalkeeper position)
- **Slot 2:** Upper-middle row
- **Slot 3:** Lower-middle row
- **Slot 4:** Bottom row (closest to viewer)

**Formation Calculation:**

```typescript
function calculateFormation(players: PitchPlayer[]): SlotFormation {
  const slot1 = players.filter((p) => p.slot === 1);
  const slot2 = players.filter((p) => p.slot === 2);
  const slot3 = players.filter((p) => p.slot === 3);
  const slot4 = players.filter((p) => p.slot === 4);

  return {
    slot1: slot1.map((p) => p.id),
    slot2: slot2.map((p) => p.id),
    slot3: slot3.map((p) => p.id),
    slot4: slot4.map((p) => p.id),
  };
}
```

**CSS Grid Layout:**

```css
.pitch-formation {
  display: grid;
  grid-template-rows: 1fr 1.2fr 1.2fr 1fr;
  gap: 1rem;
  height: 100%;
}

.formation-row {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
}
```

### 7. SubstitutesBench Component (Molecule)

**File:** `apps/frontend/src/components/teamviewer/molecules/SubstitutesBench.tsx`

**Purpose:** Display substitute players below pitch

```typescript
interface SubstitutesBenchProps {
  substitutes: PitchPlayer[];
  onPlayerClick?: (playerId: string) => void;
}
```

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│    S1           1. S2          2. S3          3. S4             │
│ ┌──────┐     ┌──────┐      ┌──────┐      ┌──────┐              │
│ │ 🎽   │     │ 🎽   │      │ 🎽   │      │ 🎽   │              │
│ │Player│     │Player│      │Player│      │Player│              │
│ │  5   │     │  3   │      │  2   │      │  1   │              │
│ └──────┘     └──────┘      └──────┘      └──────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**

- Horizontal scroll on mobile
- Slot labels above each player (S1, S2, S3, S4)
- Muted/dimmed appearance vs main squad
- Numbered order indicators

### 8. PitchView Component (Organism)

**File:** `apps/frontend/src/components/teamviewer/organisms/PitchView.tsx`

**Purpose:** Complete pitch visualization

```typescript
interface PitchViewProps {
  team: TeamBasic;
  players: PitchPlayer[];
  stats: TeamStats;
  enrollment?: TeamEnrollmentMeta;
  substitutes?: PitchPlayer[];
  onPlayerClick?: (playerId: string) => void;
  className?: string;
}
```

**Structure:**

```tsx
<div className="pitch-view">
  {/* Stats Header */}
  <TeamStatsHeader stats={stats} teamName={team.team_name} />

  {/* Pitch Container */}
  <div
    className="pitch-container"
    style={{
      backgroundImage: "url(/ground.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    {/* Goal/Sponsor Area */}
    <div className="goal-area">
      <div className="sponsor-banner">Fantasy</div>
    </div>

    {/* Formation Grid */}
    <PitchFormation
      players={mainSquad}
      captainId={team.captain_id}
      viceCaptainId={team.vice_captain_id}
      onPlayerClick={onPlayerClick}
    />
  </div>

  {/* Substitutes Bench */}
  {substitutes && substitutes.length > 0 && (
    <SubstitutesBench substitutes={substitutes} onPlayerClick={onPlayerClick} />
  )}
</div>
```

**Pitch Background Styling:**

```css
.pitch-container {
  position: relative;
  background-image: url("/ground.png");
  background-size: cover;
  background-position: center top;
  border-radius: 1rem;
  overflow: hidden;
  padding: 2rem 1rem;
  min-height: 500px;

  /* Overlay for better text visibility */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 100, 0, 0.1) 0%,
      rgba(0, 100, 0, 0.05) 50%,
      rgba(0, 100, 0, 0.1) 100%
    );
  }
}
```

### 9. TeamViewer Component (Main Wrapper)

**File:** `apps/frontend/src/components/teamviewer/organisms/TeamViewer.tsx`

**Purpose:** Main component with view toggle

```typescript
interface TeamViewerProps {
  team: TeamBasic;
  players: PlayerBasic[];
  contestIdParam?: string;
  contestData?: ContestTeamData;
  enrollment?: TeamEnrollmentMeta;
  enrollSuccess?: { contestId: string; contestName: string };

  // Editing / rename (same as TeamCard)
  isEditing: boolean;
  editingName: string;
  renaming: boolean;
  onEditingNameChange: (v: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onStartRename: () => void;

  // Actions
  onOpenDelete: () => void;
  deleting: boolean;
  onOpenPlayerActions: (playerId: string) => void;

  // Utilities
  roleToSlotLabel: (role: string) => string;
  getRoleAvatarGradient: (role: string) => string | undefined;

  // View mode
  initialView?: TeamViewMode;
  onViewChange?: (view: TeamViewMode) => void;
}

export function TeamViewer(props: TeamViewerProps) {
  const [viewMode, setViewMode] = useState<TeamViewMode>(
    props.initialView || 'list'
  );

  const handleViewChange = (view: TeamViewMode) => {
    setViewMode(view);
    props.onViewChange?.(view);
  };

  // Transform players for pitch view
  const pitchPlayers = useMemo(() => transformToPitchPlayers(
    props.players.filter(p => props.team.player_ids.includes(p.id)),
    props.team.captain_id,
    props.team.vice_captain_id,
    props.contestData
  ), [props.players, props.team, props.contestData]);

  // Calculate stats
  const stats = useMemo(() => calculateTeamStats(
    props.team,
    props.contestData
  ), [props.team, props.contestData]);

  return (
    <Card className="p-4 sm:p-6 border-2 border-gray-200 hover:border-primary-300">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <TeamHeader {...headerProps} />
        <ViewToggle
          currentView={viewMode}
          onViewChange={handleViewChange}
        />
      </div>

      {/* Conditional View Rendering */}
      {viewMode === 'pitch' ? (
        <PitchView
          team={props.team}
          players={pitchPlayers}
          stats={stats}
          enrollment={props.enrollment}
          onPlayerClick={props.onOpenPlayerActions}
        />
      ) : (
        <ExistingListView {...props} />
      )}

      {/* Common Actions */}
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={props.onOpenDelete}>
          Delete Team
        </Button>
      </div>
    </Card>
  );
}
```

---

## Styling Specifications

### Tailwind CSS Classes

**Pitch Background Container:**

```jsx
<div
  className={cn(
    "relative rounded-xl overflow-hidden",
    "bg-cover bg-center bg-no-repeat",
    "min-h-[500px] md:min-h-[600px]",
    "p-4 md:p-6"
  )}
  style={{ backgroundImage: "url('/ground.png')" }}
>
```

**Player Card on Pitch:**

```jsx
<div
  className={cn(
    "flex flex-col items-center",
    "transition-transform hover:scale-105",
    "cursor-pointer"
  )}
>
  {/* Jersey/Avatar */}
  <div
    className={cn(
      "relative w-12 h-14 md:w-16 md:h-18",
      "rounded-t-lg overflow-hidden",
      "shadow-md",
      getSlotGradient(player.slot)
    )}
  >
    {player.image ? (
      <Image src={player.image} alt={player.name} fill />
    ) : (
      <div className="flex items-center justify-center h-full">
        <span className="text-white font-bold text-lg">
          {getInitials(player.name)}
        </span>
      </div>
    )}

    {/* C/VC Badge */}
    {(player.isCaptain || player.isViceCaptain) && (
      <div
        className={cn(
          "absolute -top-1 -right-1",
          "w-5 h-5 rounded-full",
          "flex items-center justify-center",
          "text-xs font-bold",
          player.isCaptain
            ? "bg-warning-400 text-warning-900"
            : "bg-gray-200 text-gray-700"
        )}
      >
        {player.isCaptain ? "C" : "V"}
      </div>
    )}
  </div>

  {/* Name Badge */}
  <div
    className={cn(
      "px-2 py-0.5 mt-1",
      "bg-primary-600 text-white",
      "text-xs font-medium",
      "rounded-sm shadow",
      "max-w-[80px] truncate text-center"
    )}
  >
    {player.name}
  </div>

  {/* Points Badge */}
  <div
    className={cn(
      "px-2 py-0.5 mt-0.5",
      "text-xs font-bold",
      "rounded-sm",
      player.points >= 0
        ? "bg-success-100 text-success-700"
        : "bg-error-100 text-error-700"
    )}
  >
    {player.points}
  </div>
</div>
```

**Stats Header:**

```jsx
<div
  className={cn(
    "flex items-center justify-between",
    "bg-gradient-to-r from-purple-900 to-indigo-900",
    "rounded-t-xl px-4 py-3",
    "text-white"
  )}
>
  {stats.map((stat) => (
    <div key={stat.label} className="text-center">
      <div
        className={cn(
          "text-xl md:text-2xl font-bold",
          stat.highlight && "bg-cyan-400 rounded-full px-4 py-2"
        )}
      >
        {formatNumber(stat.value)}
      </div>
      <div className="text-xs text-gray-300">{stat.label}</div>
    </div>
  ))}
</div>
```

**Substitutes Bench:**

```jsx
<div
  className={cn(
    "flex items-center gap-4",
    "bg-gray-200 rounded-b-xl",
    "px-4 py-3",
    "overflow-x-auto"
  )}
>
  {substitutes.map((player, idx) => (
    <div key={player.id} className="flex flex-col items-center">
      <span className="text-xs text-gray-600 mb-1">
        {idx + 1}. S{player.slot}
      </span>
      <PitchPlayerCard player={player} size="sm" />
    </div>
  ))}
</div>
```

---

## Slot-Based System

Your app uses a slot-based system (Slot 1-4) for player categorization:

### Slot Mapping

| Slot   | Pitch Position | Display Row    |
| ------ | -------------- | -------------- |
| Slot 1 | Back row       | Top (furthest) |
| Slot 2 | Mid-back       | Upper-middle   |
| Slot 3 | Mid-front      | Lower-middle   |
| Slot 4 | Front row      | Bottom row     |

### Slot Abbreviations (for bench/labels)

- S1 = Slot 1
- S2 = Slot 2
- S3 = Slot 3
- S4 = Slot 4

### Color Coding by Slot

```typescript
const slotColors = {
  1: "from-amber-400 to-yellow-600", // Gold/Yellow
  2: "from-blue-500 to-indigo-600", // Blue
  3: "from-emerald-400 to-teal-600", // Green/Teal
  4: "from-purple-500 to-pink-600", // Purple/Pink
};

// Helper function
function getSlotGradient(slot: number): string {
  return `bg-gradient-to-br ${slotColors[slot] || slotColors[1]}`;
}
```

### Slot Label Helper

```typescript
function getSlotLabel(slot: number): string {
  return `Slot ${slot}`;
}

function getSlotAbbr(slot: number): string {
  return `S${slot}`;
}
```

---

## Responsive Design

### Breakpoints

| Screen              | Behavior                                                  |
| ------------------- | --------------------------------------------------------- |
| Mobile (<640px)     | Single column, smaller cards, horizontal scroll for bench |
| Tablet (640-1024px) | Full pitch view, medium cards                             |
| Desktop (>1024px)   | Full pitch view, large cards, all stats visible           |

### Mobile Optimizations

- Stack stats vertically or use horizontal scroll
- Reduce player card sizes
- Show abbreviated names
- Touch-friendly tap targets (min 44px)

---

## Animation & Interactions

### Transitions

```css
/* View mode toggle */
.view-transition {
  transition: opacity 300ms ease-in-out;
}

/* Player card hover */
.pitch-player-card {
  transition: transform 200ms ease;
}

.pitch-player-card:hover {
  transform: scale(1.05);
}

/* Points update */
@keyframes points-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.points-updated {
  animation: points-pulse 500ms ease;
}
```

### Click Interactions

- Player card click → Opens player action modal (existing)
- Rank stat click → Navigate to leaderboard
- Contest name click → Navigate to contest page

---

## Integration Steps

### Step 1: Create Type Definitions

1. Create `types.ts` with shared interfaces
2. Export types from `index.ts`

### Step 2: Create Atom Components

1. Implement `ViewToggle.tsx`
2. Implement `StatBadge.tsx`
3. Implement `PitchPlayerCard.tsx`
4. Update `index.ts` exports

### Step 3: Create Molecule Components

1. Implement `TeamStatsHeader.tsx`
2. Implement `PitchFormation.tsx`
3. Implement `SubstitutesBench.tsx`

### Step 4: Create PitchView Organism

1. Implement `PitchView.tsx` combining molecules
2. Add pitch background styling

### Step 5: Create TeamViewer Wrapper

1. Implement `TeamViewer.tsx` with view toggle
2. Maintain backward compatibility with existing props

### Step 6: Update Teams Page

1. Replace `TeamCardView` with `TeamViewer`
2. Add view persistence (localStorage)
3. Test all existing functionality

### Step 7: Testing & Polish

1. Test responsive layouts
2. Test with real player data
3. Add loading states
4. Performance optimization

---

## Estimated Implementation Time

| Component              | Effort        |
| ---------------------- | ------------- |
| Types & Setup          | 0.5 hours     |
| Atom Components        | 2 hours       |
| Molecule Components    | 3 hours       |
| PitchView Organism     | 2 hours       |
| TeamViewer Wrapper     | 1.5 hours     |
| Teams Page Integration | 1 hour        |
| Styling & Polish       | 2 hours       |
| Testing                | 2 hours       |
| **Total**              | **~14 hours** |

---

## Dependencies

### Required

- Existing UI components (Card, Button, Badge, Avatar)
- Tailwind CSS
- Next.js Image component
- `ground.png` in `/public` folder ✅

### Optional Enhancements

- Framer Motion for animations
- react-use for localStorage hook
- clsx/cn utility for class names

---

## Future Enhancements

1. **Player Comparison** - Click two players to compare stats
2. **Formation Editor** - Drag and drop players on pitch
3. **Live Points** - Real-time score updates with animations
4. **3D Pitch View** - WebGL enhanced visualization
5. **Share as Image** - Export team as shareable image
6. **Dark Mode** - Night pitch theme

---

## Notes

- The `ground.png` image is already present at `/public/ground.png`
- Slot-based system: Slot 1, 2, 3, 4 (no cricket-specific role names)
- Team size is variable but typically 11 players + substitutes
- Captain gets 2x points, Vice-Captain gets 1.5x points
- Existing `roleToSlotLabel` and `getRoleAvatarGradient` functions in `teams/page.tsx` map internal roles to slot labels
