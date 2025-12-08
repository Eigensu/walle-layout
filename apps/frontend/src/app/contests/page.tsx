"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trophy, Star, Play } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import {
  publicContestsApi,
  Contest,
  type EnrollmentResponse,
} from "@/lib/api/public/contests";
import { formatIST, formatISTRange } from "@/lib/utils";
import { PillNavbar } from "@/components/navigation/PillNavbar";
import { MobileUserMenu } from "@/components/navigation/MobileUserMenu";
import { useAuth } from "@/contexts/AuthContext";

export default function ContestsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinedContestIds, setJoinedContestIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Fetch all public contests; we'll partition into Active vs Live
        const res = await publicContestsApi.list({ page_size: 100 });
        setContests(res.contests);
      } catch (e: any) {
        setError(e?.message || "Failed to load contests");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load user's contest enrollments to toggle Join/View Team
  useEffect(() => {
    (async () => {
      try {
        const mine: EnrollmentResponse[] =
          await publicContestsApi.myEnrollments();
        setJoinedContestIds(new Set(mine.map((e) => e.contest_id)));
      } catch {
        // ignore unauthenticated or unavailable endpoint
      }
    })();
  }, []);

  const handleJoin = (contestId: string) => {
    const target = `/contests/${contestId}/team`;
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  // Partition contests using status values
  const activeContests = contests.filter((c) => c.status === "ongoing");
  const liveContests = contests
    .filter((c) => c.status === "live")
    .sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50 to-gray-50">
      <PillNavbar
        activeId="contests"
        mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
      />
      <div className="h-24" />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-1 sm:pt-0">
        <h1 className="flex items-center justify-center gap-2 sm:gap-3 text-2xl sm:text-3xl font-extrabold mb-6 sm:mb-8 text-center bg-gradient-to-r from-primary-400 to-primary-700 bg-clip-text text-transparent">
          <Trophy className="w-7 h-7 text-primary-600" />
          <span>Contests</span>
        </h1>
        {loading && <div>Getting your contests...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <div className="grid gap-4 sm:gap-5">
          {/* Active/Ongoing Contests */}
          {activeContests.map((c) => (
            <div key={c.id} className="w-full">
              <div className="rounded-3xl bg-white/90 backdrop-blur shadow-md px-4 sm:px-6 py-5 sm:py-6 min-h-[160px] h-full">
                <div className="flex items-start justify-between gap-4 sm:gap-6 h-full">
                  <div className="min-w-0 flex flex-col h-full">
                    <button
                      onClick={() => router.push(`/contests/${c.id}`)}
                      className="text-xl sm:text-2xl font-bold text-gray-900 hover:underline block text-left leading-tight break-words whitespace-normal"
                    >
                      {c.name}
                    </button>
                    {/* Contest code hidden per request */}
                    {c.description && (
                      <p className="mt-1.5 sm:mt-2 text-gray-700 text-sm line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-snug">
                      {formatISTRange(c.start_at, c.end_at)}
                    </div>
                    <div className="mt-auto pt-3 flex items-center gap-2">
                      {joinedContestIds.has(c.id) ? (
                        <button
                          onClick={() => router.push(`/contests/${c.id}/team`)}
                          className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-2 rounded-xl border text-sm sm:text-base font-semibold text-primary-700 border-primary-200 hover:bg-primary-50 whitespace-nowrap"
                        >
                          View Team
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            router.push(`/contests/${c.id}/leaderboard`)
                          }
                          className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-2 rounded-xl border text-sm sm:text-base font-semibold text-gray-700 border-gray-200 hover:bg-gray-50 whitespace-nowrap"
                        >
                          View Leaderboard
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
                        ONGOING
                      </span>
                      {joinedContestIds.has(c.id) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          Joined
                        </span>
                      )}
                    </div>
                    <Image
                      src="/Contests/logo.png"
                      alt="Contest logo"
                      width={120}
                      height={32}
                      className="w-[120px] h-auto opacity-90"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Live Contests */}
          {liveContests.map((c) => (
            <div key={c.id} className="w-full">
              <div className="rounded-3xl bg-white/90 backdrop-blur shadow-md px-4 sm:px-6 py-5 sm:py-6 min-h-[160px] h-full">
                <div className="flex items-start justify-between gap-4 sm:gap-6 h-full">
                  <div className="min-w-0 flex flex-col h-full">
                    <button
                      onClick={() => router.push(`/contests/${c.id}`)}
                      className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight break-words hover:underline text-left whitespace-normal"
                    >
                      {c.name}
                    </button>
                    {/* Contest code hidden per request */}
                    {c.description && (
                      <p className="mt-1.5 sm:mt-2 text-gray-700 text-sm line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-snug">
                      Starts: {formatIST(c.start_at)} IST · Ends:{" "}
                      {formatIST(c.end_at)} IST
                    </div>
                    <div className="mt-auto pt-3 flex items-center gap-2">
                      {joinedContestIds.has(c.id) ? (
                        <button
                          onClick={() => handleJoin(c.id)}
                          className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border text-sm sm:text-base font-semibold text-primary-700 border-primary-200 hover:bg-primary-50 whitespace-nowrap"
                          title="View your team for this contest"
                        >
                          View Team
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoin(c.id)}
                          className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-primary text-white text-sm sm:text-base font-semibold shadow hover:opacity-95"
                          title="Join contest and open team builder"
                        >
                          Join Contest
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse"></span>
                        LIVE
                      </span>
                      {joinedContestIds.has(c.id) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          Joined
                        </span>
                      )}
                    </div>
                    <Image
                      src="/Contests/logo.png"
                      alt="Contest logo"
                      width={120}
                      height={32}
                      className="w-[120px] h-auto opacity-90"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!loading && activeContests.length === 0 && liveContests.length === 0 && (
            <EmptyState
              title="No contests available"
              description="There are currently no contests. Keep an eye on upcoming contests or explore other categories."
              icon={<Star className="w-10 h-10" />}
              primaryAction={{ label: "Explore Contests", href: "/contests" }}
            />
          )}
        </div>


      </div>
    </div>
  );
}
