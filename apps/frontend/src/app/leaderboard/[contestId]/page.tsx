"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PillNavbar, MobileUserMenu } from "@/components/navigation";
import { LeaderboardCard, LeaderboardSkeleton } from "@/components/leaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { publicContestsApi, type Contest, type LeaderboardResponse as ContestLeaderboardResponse } from "@/lib/api/public/contests";
import type { LeaderboardEntry as SharedLeaderboardEntry } from "@/types/leaderboard";
import { Trophy, ArrowLeft } from "lucide-react";

export default function ContestLeaderboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50 to-gray-50">
      <PillNavbar
        activeId="leaderboard"
        mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
      />

      <div className="h-20" />

      <div className="py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push("/leaderboard")}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">All Contests</span>
              </button>
            </div>

            <div className="text-center mt-3">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600" />
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">
                  {contest?.name || "Contest Leaderboard"}
                </h1>
              </div>
              {contest && (
                <p className="text-xs sm:text-sm text-gray-600">
                  {new Date(contest.start_at).toLocaleDateString()} - {new Date(contest.end_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

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
            <div className="space-y-4 sm:space-y-8">
              {/** Normalize entries to shared type (convert null to undefined) */}
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
                  {/* Top 3 */}
                  {entries.length >= 3 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
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
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                      Complete Rankings
                    </h2>
                    <div className="space-y-2 sm:space-y-3">
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
      </div>
    </div>
  );
}
