"use client";

import React, { useEffect, useState } from "react";
import { formatPoints } from "@/lib/utils";
import {
  ContestTeamResponse,
  publicContestsApi,
} from "@/lib/api/public/contests";

interface TeamDialogProps {
  open: boolean;
  contestId: string;
  teamId: string;
  onClose: () => void;
}

export const TeamDialog: React.FC<TeamDialogProps> = ({
  open,
  contestId,
  teamId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<ContestTeamResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await publicContestsApi.teamInContest(contestId, teamId);
        if (!active) return;
        setTeam(resp);
      } catch (e: any) {
        const msg =
          e?.response?.data?.detail || e?.message || "Failed to load team";
        setError(String(msg));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [open, contestId, teamId]);

  if (!open) return null;

  const grouped = (() => {
    const map: Record<
      string,
      {
        name: string;
        id: string;
        team?: string | null;
        contest_points: number;
      }[]
    > = {};
    if (!team?.players) return map;
    for (const p of team.players) {
      const slot = (p.slot || "Others").toString();
      if (!map[slot]) map[slot] = [];
      map[slot].push({
        name: p.name,
        id: p.id,
        team: p.team,
        contest_points: p.contest_points,
      });
    }
    return map;
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-3 overflow-y-auto"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative mt-6 sm:mt-0 w-full max-w-sm sm:max-w-lg md:max-w-3xl lg:max-w-4xl rounded-lg bg-white shadow-xl border border-primary-200 max-h-[78vh] sm:max-h-[86vh] md:max-h-[88vh] overflow-hidden">
        <div className="p-2 sm:p-4 overflow-y-auto max-h-[78vh] sm:max-h-[86vh] md:max-h-[88vh]">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                {team?.team_name || "Team"}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Points:{" "}
                {typeof team?.contest_points === "number"
                  ? formatPoints(team.contest_points)
                  : "-"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow"
            >
              Close
            </button>
          </div>

          {loading && <div className="text-gray-600">Loading team...</div>}
          {error && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && team && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {Object.entries(grouped).map(([slotKey, players], idx) => {
                const colors = [
                  {
                    border: "border-blue-200",
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                  },
                  {
                    border: "border-amber-200",
                    bg: "bg-amber-50",
                    text: "text-amber-700",
                  },
                  {
                    border: "border-emerald-200",
                    bg: "bg-emerald-50",
                    text: "text-emerald-700",
                  },
                  {
                    border: "border-purple-200",
                    bg: "bg-purple-50",
                    text: "text-purple-700",
                  },
                ];
                const tone = colors[idx % colors.length];
                return (
                  <div
                    key={slotKey}
                    className={`rounded-md border ${tone.border} p-2.5 ${tone.bg}`}
                  >
                    <div
                      className={`text-[12px] font-semibold mb-1 ${tone.text}`}
                    >
                      Slot {idx + 1}
                    </div>
                    <div className="space-y-1 leading-tight">
                      {players.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-[12px] leading-tight"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {p.name}
                            </div>
                            {p.team && (
                              <div className="text-[11px] text-gray-500 truncate">
                                {p.team}
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] font-semibold text-primary-600 ml-2 flex-shrink-0">
                            {formatPoints(p.contest_points)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
