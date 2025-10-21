"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LeaderboardCard, LeaderboardSkeleton } from "@/components/leaderboard";
import { publicContestsApi, type Contest, type LeaderboardResponse as ContestLeaderboardResponse } from "@/lib/api/public/contests";
import type { LeaderboardEntry as SharedLeaderboardEntry } from "@/types/leaderboard";
import { Trophy, Crown } from "lucide-react";

export default function ContestLeaderboardTabPage() {
  const params = useParams();
  const contestId = Array.isArray((params as any)?.contestId)
    ? (params as any).contestId[0]
    : (params as any)?.contestId;

  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<ContestLeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contestId) return;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [c, lb] = await Promise.all([
          publicContestsApi.get(contestId),
          publicContestsApi.leaderboard(contestId),
        ]);
        setContest(c);
        setLeaderboard(lb);
      } catch (err) {
        console.error("Failed to load contest leaderboard", err);
        setError("Failed to load leaderboard. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [contestId]);

  return (
    <div className="py-1 sm:py-3">
      {/* Loading */}
      {isLoading && <LeaderboardSkeleton />}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && leaderboard && (
        <div className="space-y-1 sm:space-y-3">
          {(() => {
            const entries: SharedLeaderboardEntry[] = leaderboard.entries.map((e) => ({
              rank: e.rank,
              username: e.username,
              displayName: e.displayName,
              teamName: e.teamName,
              points: e.points,
              rankChange: e.rankChange ?? undefined,
            }));
            const currentUserEntry: SharedLeaderboardEntry | undefined = leaderboard.currentUserEntry
              ? {
                  rank: leaderboard.currentUserEntry.rank,
                  username: leaderboard.currentUserEntry.username,
                  displayName: leaderboard.currentUserEntry.displayName,
                  teamName: leaderboard.currentUserEntry.teamName,
                  points: leaderboard.currentUserEntry.points,
                  rankChange: leaderboard.currentUserEntry.rankChange ?? undefined,
                }
              : undefined;

            return (
              <div className="space-y-4 sm:space-y-8">
                {/* Page Heading with Crowns */}
                <div className="text-center -mt-1 sm:-mt-2">
                  <div className="relative inline-block mb-1">
                    <Crown className="w-7 h-7 text-primary-500/70 absolute -top-5 -left-8 hidden sm:block" />
                    <Crown className="w-7 h-7 text-primary-500/70 absolute -top-5 -right-8 hidden sm:block" />
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary-300 to-primary-700 bg-clip-text text-transparent px-2">
                      Leaderboard
                    </h1>
                  </div>
                </div>
                {/* Top 3 */}
                {entries.length >= 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-2 sm:mb-4">
                    <div className="sm:order-1 sm:mt-8">
                      <LeaderboardCard entry={entries[1]} showTopThree />
                    </div>
                    <div className="sm:order-2">
                      <LeaderboardCard entry={entries[0]} showTopThree />
                    </div>
                    <div className="sm:order-3 sm:mt-8">
                      <LeaderboardCard entry={entries[2]} showTopThree />
                    </div>
                  </div>
                )}

                {/* Full list */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-lg border border-primary-100">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Complete Rankings
                  </h2>
                  <div className="space-y-1 sm:space-y-2">
                    {entries.map((entry) => (
                      <LeaderboardCard
                        key={entry.rank}
                        entry={entry}
                        isCurrentUser={currentUserEntry?.username === entry.username}
                      />
                    ))}
                  </div>
                </div>

                {/* Current user pinned */}
                {currentUserEntry && currentUserEntry.rank > 8 && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      Your Team
                    </h3>
                    <LeaderboardCard entry={currentUserEntry} isCurrentUser />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {!isLoading && !error && leaderboard?.entries.length === 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-lg">
          <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            No Rankings Yet
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            Be the first to join and compete for the top spot!
          </p>
        </div>
      )}
    </div>
  );
}
