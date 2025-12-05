"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StatBadgeProps {
  value: number | string;
  label: string;
  variant?: "default" | "highlight" | "accent";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showArrow?: boolean;
}

export function StatBadge({
  value,
  label,
  variant = "default",
  size = "md",
  onClick,
  showArrow = false,
}: StatBadgeProps) {
  const sizeClasses = {
    sm: "text-base",
    md: "text-xl md:text-2xl",
    lg: "text-2xl md:text-3xl",
  };

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "flex flex-col items-center text-center",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity"
      )}
    >
      <div
        className={cn(
          "font-bold",
          sizeClasses[size],
          variant === "highlight" &&
            "bg-primary-400 text-accent-900 rounded-full px-4 py-2 min-w-[60px]",
          variant === "accent" && "text-primary-400"
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="flex items-center gap-1 text-xs text-primary-200 mt-0.5">
        <span>{label}</span>
        {showArrow && (
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </div>
    </Component>
  );
}
