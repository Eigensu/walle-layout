"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StatBadge } from "../atoms/StatBadge";
import type { TeamStats } from "../types";

export interface TeamStatsHeaderProps {
  stats: TeamStats;
  teamName: string;
  contestName?: string;
  onClickRank?: () => void;
  className?: string;
}

export function TeamStatsHeader({
  stats,
  teamName,
  contestName,
  onClickRank,
  className,
}: TeamStatsHeaderProps) {
  const statItems = [
    stats.averagePoints !== undefined && {
      value: stats.averagePoints,
      label: "Average",
      variant: "default" as const,
    },
    stats.highestPoints !== undefined && {
      value: stats.highestPoints,
      label: "Highest",
      variant: "default" as const,
      showArrow: true,
    },
    {
      value: stats.totalPoints,
      label: "Total Pts",
      variant: "highlight" as const,
    },
    stats.rank !== undefined && {
      value: stats.rank,
      label: "Rank",
      variant: "default" as const,
      showArrow: true,
      onClick: onClickRank,
    },
    stats.transfers !== undefined && {
      value: stats.transfers,
      label: "Transfers",
      variant: "default" as const,
    },
  ].filter(Boolean) as Array<{
    value: number;
    label: string;
    variant: "default" | "highlight" | "accent";
    showArrow?: boolean;
    onClick?: () => void;
  }>;

  return (
    <div className={cn("w-full", className)}>
      {/* Team Name Banner */}
      <div
        className={cn(
          "flex items-center justify-center",
          "bg-gradient-to-r from-accent-800 via-accent-700 to-accent-800",
          "border-b border-accent-600/50",
          "rounded-t-2xl px-4 py-3",
          "text-primary-100"
        )}
      >
        <h3 className="text-lg font-bold tracking-wide">{teamName}</h3>
      </div>

      {/* Stats Bar */}
      <div
        className={cn(
          "flex items-center justify-around",
          "bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700",
          "px-4 py-4",
          "text-white",
          "shadow-lg"
        )}
      >
        {statItems.map((stat) => (
          <StatBadge
            key={stat.label}
            value={stat.value}
            label={stat.label}
            variant={stat.variant}
            showArrow={stat.showArrow}
            onClick={stat.onClick}
            size={stat.variant === "highlight" ? "md" : "sm"}
          />
        ))}
      </div>

      {/* Contest Name Banner */}
      {contestName && (
        <div
          className={cn(
            "flex items-center justify-center gap-2",
            "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600",
            "px-4 py-2",
            "text-amber-950 font-semibold text-sm",
            "shadow-inner"
          )}
        >
          <span>🏆</span>
          <span>{contestName}</span>
        </div>
      )}
    </div>
  );
}
