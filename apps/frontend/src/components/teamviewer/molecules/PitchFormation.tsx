"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PitchPlayerCard } from "../atoms/PitchPlayerCard";
import type { PitchPlayer } from "../types";

export interface PitchFormationProps {
  players: PitchPlayer[];
  captainId?: string | null;
  viceCaptainId?: string | null;
  onPlayerClick?: (playerId: string) => void;
  className?: string;
}

// Oval field positions matching the cricket ground layout
// Each position is [left%, top%] representing percentage from top-left
// Adjusted for mobile (taller aspect ratio) - positions spread more vertically
const FIELD_POSITIONS = {
  // Top arc (boundary) - 3 positions spread along top curve
  topArc: [
    [25, 12], // top-left
    [50, 9], // top-center
    [75, 12], // top-right
  ],
  // Upper middle arc - 4 positions
  upperMiddle: [
    [12, 28], // far left
    [37, 24], // left of center
    [63, 24], // right of center
    [88, 28], // far right
  ],
  // Center (stumps area) - 2 positions for captain/VC
  stumps: [
    [40, 48], // left of stumps
    [60, 48], // right of stumps
  ],
  // Lower middle arc - 4 positions
  lowerMiddle: [
    [12, 68], // far left
    [37, 72], // left of center
    [63, 72], // right of center
    [88, 68], // far right
  ],
  // Bottom arc (boundary) - 3 positions spread along bottom curve
  bottomArc: [
    [25, 82], // bottom-left
    [50, 86], // bottom-center
    [75, 82], // bottom-right
  ],
};

export function PitchFormation({
  players,
  captainId,
  viceCaptainId,
  onPlayerClick,
  className,
}: PitchFormationProps) {
  // Filter out substitutes - use unique IDs to prevent duplicates
  const seenIds = new Set<string>();
  const mainSquadPlayers = players.filter((p) => {
    if (p.isSubstitute || seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  // Find captain and vice-captain for center stumps position
  const captain = mainSquadPlayers.find((p) => p.isCaptain);
  const viceCaptain = mainSquadPlayers.find((p) => p.isViceCaptain);
  const stumpsPlayers = [captain, viceCaptain].filter(Boolean) as PitchPlayer[];
  const stumpsPlayerIds = new Set(stumpsPlayers.map((p) => p.id));

  // Get remaining players (excluding captain/VC)
  const remainingPlayers = mainSquadPlayers.filter(
    (p) => !stumpsPlayerIds.has(p.id)
  );

  // Distribute remaining players across field positions
  // Order: top arc, upper middle sides, lower middle sides, bottom arc
  const allOutfieldPositions = [
    ...FIELD_POSITIONS.topArc,
    ...FIELD_POSITIONS.upperMiddle,
    ...FIELD_POSITIONS.lowerMiddle,
    ...FIELD_POSITIONS.bottomArc,
  ];

  // Assign players to positions evenly distributed
  const playerPositions: { player: PitchPlayer; left: number; top: number }[] =
    [];

  remainingPlayers.forEach((player, index) => {
    const posIndex = index % allOutfieldPositions.length;
    const [left, top] = allOutfieldPositions[posIndex];
    playerPositions.push({ player, left, top });
  });

  // Check if we have any players
  const hasPlayers = mainSquadPlayers.length > 0;

  // Show empty state if no players
  if (!hasPlayers) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center bg-white/95 text-accent-800 rounded-2xl px-8 py-6 shadow-xl border border-primary-300">
          <div className="text-4xl mb-3">🏏</div>
          <p className="text-lg font-bold">No players in squad</p>
          <p className="text-sm text-accent-600 mt-1">
            Add players to see them on the pitch
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Outfield players positioned absolutely in oval pattern */}
      {playerPositions.map(({ player, left, top }) => (
        <div
          key={player.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${left}%`,
            top: `${top}%`,
          }}
        >
          <PitchPlayerCard player={player} onClick={onPlayerClick} size="sm" />
        </div>
      ))}

      {/* Captain & Vice-Captain on stumps (center) */}
      {stumpsPlayers.map((player, index) => (
        <div
          key={player.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
          style={{
            left: `${FIELD_POSITIONS.stumps[index][0]}%`,
            top: `${FIELD_POSITIONS.stumps[index][1]}%`,
          }}
        >
          <PitchPlayerCard player={player} onClick={onPlayerClick} size="md" />
        </div>
      ))}
    </div>
  );
}
