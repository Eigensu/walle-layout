"use client";

import React, { useEffect, useState } from "react";
import { PillNavbar, MobileUserMenu } from "@/components/navigation";
import { Trophy, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { publicContestsApi, type Contest } from "@/lib/api/public/contests";

export default function LeaderboardIndexPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [contests, setContests] = useState<Contest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch all contests (you can pass filters if needed)
        const res = await publicContestsApi.list();
        setContests(res.contests || []);
      } catch (err) {
        console.error("Failed to fetch contests:", err);
        setError("Failed to load contests. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchContests();
  }, []);

  const onSelectContest = (contestId: string) => {
    router.push(`/leaderboard/${contestId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50 to-gray-50">
      <PillNavbar
        activeId="leaderboard"
        mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
      />

      <div className="h-20" />

      <div className="py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-10">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600" />
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Contests
              </h1>
            </div>
            <p className="text-center text-sm sm:text-base text-gray-600">
              Select a contest to view its leaderboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-28 bg-white rounded-2xl shadow animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && !error && contests.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center shadow">
              <p className="text-gray-600">No contests available.</p>
            </div>
          )}

          {/* List */}
          {!isLoading && !error && contests.length > 0 && (
            <div className="space-y-3">
              {contests.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectContest(c.id)}
                  className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition flex items-center justify-between"
                
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">
                        {c.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        c.status === "active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : c.status === "completed"
                          ? "bg-gray-50 text-gray-700 border-gray-200"
                          : c.status === "paused"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>{c.status}</span>
                    </div>
                    {c.description && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {c.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(c.start_at).toLocaleDateString()} - {new Date(c.end_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
