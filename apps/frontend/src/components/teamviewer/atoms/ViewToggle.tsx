"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { TeamViewMode } from "../types";

export interface ViewToggleProps {
  currentView: TeamViewMode;
  onViewChange: (view: TeamViewMode) => void;
  className?: string;
}

export function ViewToggle({
  currentView,
  onViewChange,
  className,
}: ViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg bg-gray-100 p-1",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onViewChange("pitch")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
          currentView === "pitch"
            ? "bg-white text-primary-700 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
        aria-pressed={currentView === "pitch"}
      >
        {/* Pitch/Grid Icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 12h16M12 4v16"
          />
        </svg>
        <span className="hidden sm:inline">Pitch</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange("list")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
          currentView === "list"
            ? "bg-white text-primary-700 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
        aria-pressed={currentView === "list"}
      >
        {/* List Icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}
