"use client";

import React from "react";
import { formatPoints } from "@/lib/utils";

export function PointsBadge({
  points,
  className = "",
}: {
  points: number;
  className?: string;
}) {
  return (
    <div
      className={
        "px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm sm:text-base font-bold shadow " +
        className
      }
      aria-label="Team points"
    >
      {formatPoints(points)} pts
    </div>
  );
}
