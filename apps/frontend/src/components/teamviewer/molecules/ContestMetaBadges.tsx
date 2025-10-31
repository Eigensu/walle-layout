"use client";

import React from "react";
import { formatPoints } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components";

export interface ContestMetaBadgesProps {
  totalPoints?: number;
  rank?: number;
  contestName?: string;
  contestLink?: string;
  className?: string;
}

export function ContestMetaBadges({
  totalPoints,
  rank,
  contestName,
  contestLink,
  className = "",
}: ContestMetaBadgesProps) {
  return (
    <div className={"flex flex-wrap gap-2 " + className}>
      {typeof totalPoints === "number" && totalPoints > 0 && (
        <Badge variant="warning" className="text-xs sm:text-sm">
          {formatPoints(totalPoints)} pts
        </Badge>
      )}
      {typeof rank === "number" && (
        <Badge variant="secondary" className="text-xs sm:text-sm">
          Rank #{rank}
        </Badge>
      )}
      {contestName && contestLink && (
        <Link href={contestLink} className="inline-flex">
          <Badge variant="success" className="text-xs sm:text-sm">
            Contest: {contestName}
          </Badge>
        </Link>
      )}
    </div>
  );
}
