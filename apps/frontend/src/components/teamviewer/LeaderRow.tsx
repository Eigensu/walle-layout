"use client";

import { formatPoints } from "@/lib/utils";
import React from "react";
import { Avatar, Badge } from "@/components";

export interface LeaderRowProps {
  name: string;
  team?: string;
  roleLabel: string;
  points: number;
  image?: string;
  gradientClassName?: string;
  variant: "captain" | "vice";
}

export function LeaderRow({
  name,
  team,
  roleLabel,
  points,
  image,
  gradientClassName,
  variant,
}: LeaderRowProps) {
  const isCaptain = variant === "captain";
  return (
    <div
      className={
        "flex items-center justify-between gap-3 p-3 rounded-lg border " +
        (isCaptain
          ? "bg-warning-50 border-warning-200"
          : "bg-secondary-50 border-secondary-200")
      }
    >
      <Avatar
        name={name}
        src={image}
        size="sm"
        gradientClassName={gradientClassName}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
            {name}
          </p>
          <Badge
            variant={isCaptain ? "warning" : "secondary"}
            size="sm"
            className="text-xs whitespace-nowrap"
          >
            {isCaptain ? "Captain (2x)" : "V.Captain (1.5x)"}
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
          {roleLabel} • {team}
        </p>
      </div>
      <div className="text-right text-xs sm:text-sm font-medium text-success-700 whitespace-nowrap">
        {formatPoints(points)} pts
      </div>
    </div>
  );
}

export function CaptainRow(props: Omit<LeaderRowProps, "variant">) {
  return <LeaderRow {...props} variant="captain" />;
}

export function ViceCaptainRow(props: Omit<LeaderRowProps, "variant">) {
  return <LeaderRow {...props} variant="vice" />;
}
