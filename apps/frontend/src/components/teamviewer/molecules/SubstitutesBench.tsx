"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PitchPlayerCard } from "../atoms/PitchPlayerCard";
import type { PitchPlayer } from "../types";

export interface SubstitutesBenchProps {
  substitutes: PitchPlayer[];
  onPlayerClick?: (playerId: string) => void;
  className?: string;
}

export function SubstitutesBench({
  substitutes,
  onPlayerClick,
  className,
}: SubstitutesBenchProps) {
  if (!substitutes || substitutes.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative",
        "bg-gradient-to-b from-accent-700/90 to-accent-800/95",
        "border-t-4 border-primary-500/50",
        "rounded-b-2xl",
        "px-6 py-4",
        "shadow-inner",
        className
      )}
    >
      {/* Bench Label */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 
                      bg-primary-600 text-primary-100 text-xs font-bold 
                      px-4 py-1 rounded-full shadow-md
                      border border-primary-400/50"
      >
        SUBSTITUTES
      </div>

      {/* Players */}
      <div
        className="flex items-center justify-center gap-4 md:gap-6 pt-2
                      overflow-x-auto scrollbar-thin scrollbar-thumb-primary-600"
      >
        {substitutes.map((player) => (
          <div key={player.id} className="flex-shrink-0">
            <PitchPlayerCard
              player={player}
              onClick={onPlayerClick}
              size="sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
