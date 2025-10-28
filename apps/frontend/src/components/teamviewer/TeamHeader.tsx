"use client";

import React from "react";
import { Button } from "@/components";
import { PointsBadge } from "@teamviewer/atoms/PointsBadge";
import { ContestMetaBadges } from "@teamviewer/molecules/ContestMetaBadges";

export interface TeamHeaderProps {
  teamName: string;
  createdAt: string | Date;
  displayPoints: number;
  onClickRename: () => void;
  totalPoints?: number;
  rank?: number;
  contestName?: string;
  contestLink?: string;
}

export function TeamHeader({
  teamName,
  createdAt,
  displayPoints,
  onClickRename,
  totalPoints,
  rank,
  contestName,
  contestLink,
}: TeamHeaderProps) {
  return (
    <div className="flex flex-col gap-2 mb-1">
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {teamName}
            </h3>
            <PointsBadge
              points={displayPoints}
              className="px-2 py-0.5 text-[14px] sm:text-[12px] leading-none"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClickRename}
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 flex-shrink-0"
              aria-label="Rename team"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Created:{" "}
            {new Date(createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <ContestMetaBadges
        totalPoints={totalPoints}
        rank={rank}
        contestName={contestName}
        contestLink={contestLink}
      />
    </div>
  );
}
