"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlayerCard,
  PlayerList,
  StepCard,
  ProgressIndicator,
  Button,
  Badge,
  PillNavbar,
  Card,
  Avatar,
} from "@/components";
import type { Player } from "@/components";
import { MobileUserMenu } from "@/components/navigation/MobileUserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { createTeam, getUserTeams } from "@/lib/api/teams";
import { publicContestsApi, Contest as PublicContest } from "@/lib/api/public/contests";
import { useTeamBuilder } from "@/hooks/useTeamBuilder";

// Data fetching and selection logic moved to useTeamBuilder

export default function MyTeamPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const {
    // data
    slots,
    players,
    loading,
    error,

    // selection state
    selectedPlayers,
    captainId,
    viceCaptainId,
    currentStep,
    activeSlotId,
    isStep1Collapsed,

    // derived
    SLOT_LIMITS,
    selectedCountBySlot,
    canNextForActiveSlot,
    isFirstSlot,

    // handlers
    setCurrentStep,
    setIsStep1Collapsed,
    setActiveSlotId,
    handleClearAll,
    handlePlayerSelect,
    handleSetCaptain,
    handleSetViceCaptain,
    goToNextSlot,
    goToPrevSlot,
  } = useTeamBuilder();

  // Team submission states
  const [submitting, setSubmitting] = useState(false);
  const [teamName, setTeamName] = useState("");

  // Contest enrollment states
  const [contests, setContests] = useState<PublicContest[]>([]);
  const [loadingContests, setLoadingContests] = useState(false);
  const [selectedContestId, setSelectedContestId] = useState("");

  // Already-enrolled contest display
  const [enrolledContest, setEnrolledContest] = useState<{ id: string; name: string } | null>(null);
  const [loadingEnrollment, setLoadingEnrollment] = useState(false);

  // Display-only label (role already set by hook to slot name)
  const roleToSlotLabel = (role: string): string => role;

  // selectedCountBySlot and canNextForActiveSlot are provided by useTeamBuilder

  // goToPrevSlot provided by useTeamBuilder

  // isFirstSlot provided by useTeamBuilder

  const getRoleAvatarGradient = (role: string) => {
    const r = role.toLowerCase();
    if (r === "batsman" || r === "batsmen")
      return "bg-gradient-to-br from-amber-400 to-yellow-600";
    if (r === "bowler") return "bg-gradient-to-br from-blue-500 to-indigo-600";
    if (r === "all-rounder" || r === "allrounder")
      return "bg-gradient-to-br from-emerald-400 to-teal-600";
    if (r === "wicket-keeper" || r === "wicketkeeper")
      return "bg-gradient-to-br from-purple-500 to-pink-600";
    return undefined;
  };

  // All selection handlers provided by hook

  // Handle team submission
  const handleSubmitTeam = async () => {
    if (!isAuthenticated) return;
    if (!teamName.trim()) {
      alert("Please enter a team name");
      return;
    }
    if (!captainId) {
      alert("Please select a captain");
      return;
    }
    if (!viceCaptainId) {
      alert("Please select a vice-captain");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const teamData = {
        team_name: teamName,
        player_ids: selectedPlayers,
        captain_id: captainId,
        vice_captain_id: viceCaptainId,
      };

      const created = await createTeam(teamData, token);

      // If user selected a contest, enroll this team
      if (selectedContestId) {
        try {
          await publicContestsApi.enroll(selectedContestId, created.id);
        } catch (e: any) {
          // Show error but still proceed to redirect
          alert(e?.response?.data?.detail || e?.message || "Failed to enroll in contest");
        }
      }

      // Redirect to teams page
      router.push("/teams");
    } catch (err: any) {
      console.error("Failed to submit team:", err);
      alert(err.message || "Failed to submit team");
    } finally {
      setSubmitting(false);
    }
  };

  // Load available public contests (exclude completed/archived)
  useEffect(() => {
    const loadContests = async () => {
      try {
        setLoadingContests(true);
        const res = await publicContestsApi.list({ page_size: 100 });
        const open = res.contests.filter(c => c.status !== "completed" && c.status !== "archived");
        setContests(open);
      } catch (e) {
        // ignore silently
      } finally {
        setLoadingContests(false);
      }
    };
    loadContests();
  }, []);

  // Load enrollment: prefer dedicated enrollments endpoint (handles private contests),
  // then fall back to leaderboard scan and teams API.
  useEffect(() => {
    let mounted = true;
    const loadEnrollment = async () => {
      try {
        setLoadingEnrollment(true);
        let found: { id: string; name: string } | null = null;

        // 1) Primary: use myEnrollments to get user's active enrollments
        try {
          const enrollments = await publicContestsApi.myEnrollments();
          if (Array.isArray(enrollments) && enrollments.length > 0) {
            // Pick the most recent enrollment
            enrollments.sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());
            const latest = enrollments[0];
            try {
              const contest = await publicContestsApi.getMe(latest.contest_id);
              found = { id: contest.id, name: contest.name };
            } catch (_) {
              // fallback to public get if allowed
              try {
                const contest = await publicContestsApi.get(latest.contest_id);
                found = { id: contest.id, name: contest.name };
              } catch {
                // ignore and continue
              }
            }
          }
        } catch (_) {
          // ignore and try fallbacks
        }

        // 2) Fallback: scan public contests' leaderboards for current user entry
        if (!found) {
          try {
            const res = await publicContestsApi.list({ page_size: 100 });
            const contestsAll = res.contests || [];
            for (const c of contestsAll) {
              try {
                const lb = await publicContestsApi.leaderboard(c.id, { skip: 0, limit: 1 });
                if (lb.currentUserEntry) {
                  found = { id: c.id, name: c.name };
                  break;
                }
              } catch (_) {
                // ignore individual contest failures
              }
            }
          } catch (_) {
            // ignore
          }
        }

        if (!found) {
          // fallback: use teams API if any team has contest_id set
          const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
          if (token) {
            try {
              const list = await getUserTeams(token, 0, 50);
              const withContest = list.teams.filter((t) => !!t.contest_id);
              if (withContest.length > 0) {
                // pick most recently updated
                withContest.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                const latest = withContest[0];
                if (latest.contest_id) {
                  try {
                    const contest = await publicContestsApi.getMe(latest.contest_id);
                    found = { id: contest.id, name: contest.name };
                  } catch (_) {
                    const contest = await publicContestsApi.get(latest.contest_id);
                    found = { id: contest.id, name: contest.name };
                  }
                }
              }
            } catch (_) {
              // ignore
            }
          }
        }
        if (found && mounted) setEnrolledContest(found);
      } catch (e) {
        // silently ignore
      } finally {
        if (mounted) setLoadingEnrollment(false);
      }
    };
    loadEnrollment();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Header: Navbar */}
      <PillNavbar
        mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
      />

      {/* Spacer to prevent content from hiding under fixed navbar */}
      <div className="h-20 sm:h-29"></div>

      {/* Enrolled contest banner */}
      {enrolledContest && (
        <div className="px-4 sm:px-6 mb-3">
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="font-semibold">Enrolled Contest:</span> {enrolledContest.name}
            </div>
            <a
              href={`/leaderboard/${enrolledContest.id}`}
              className="text-sm text-green-700 hover:underline"
            >
              View Leaderboard
            </a>
          </div>
        </div>
      )}

      {/* Hero Section - More compact on mobile */}
      <div className="px-4 sm:px-6 mb-4 sm:mb-8 md:mb-10">
        <div className="text-center max-w-3xl mx-auto mt-2 sm:mt-5 md:mt-6">
          <h1 className="text-xl sm:text-3xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-primary leading-tight">
            Build Your Dream Team
          </h1>
          <p className="mt-1.5 sm:mt-2 text-gray-600 text-xs sm:text-base md:text-lg">
            Create the perfect fantasy cricket team and compete for glory!
          </p>
        </div>
      </div>

      <main className="container-responsive py-3 sm:py-8 px-4 sm:px-6">
        <div className="space-y-4 sm:space-y-8">
          {/* Progress Section with Clear All on right - More compact on mobile */}
          <div className="max-w-3xl mx-auto mb-4 sm:mb-8 md:mb-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 mr-2">
                <ProgressIndicator
                  currentStep={currentStep === 1 ? 0 : currentStep - 1}
                  totalSteps={3}
                  className=""
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleClearAll}
                className="flex-shrink-0 text-xs sm:text-sm px-2.5 sm:px-4"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Step 1: Player Selection */}
          <StepCard
            stepNumber={1}
            title="Select Players"
            description=""
            isActive={currentStep === 1}
            isCompleted={currentStep > 1}
          >
            {isStep1Collapsed && currentStep > 1 ? (
              // Collapsed view - compact mobile summary
              <div
                className="cursor-pointer hover:bg-gray-50 p-3 sm:p-4 rounded-lg transition-all duration-200"
                onClick={() => {
                  setCurrentStep(1);
                  setIsStep1Collapsed(false);
                }}
              >
                <div className="space-y-3">
                  {/* Slot badges in a grid */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    {slots.map((s) => {
                      const count = selectedCountBySlot[s.id] || 0;
                      const limit = SLOT_LIMITS[s.id] || 4;
                      return (
                        <Badge
                          key={s.id}
                          variant={count >= limit ? "success" : "secondary"}
                          size="sm"
                          className="justify-center"
                        >
                          {s.name}: {count}/{limit}
                        </Badge>
                      );
                    })}
                  </div>

                  {/* Player count and edit button */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm sm:text-base text-gray-600">
                      <span className="font-semibold text-gray-900">
                        {selectedPlayers.length} players
                      </span>{" "}
                      selected
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Edit Selection
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Full view - show all selection controls
              <div className="space-y-3 sm:space-y-4">
                {/* Header with counts */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                    Players Selected: {selectedPlayers.length}/16
                  </h4>
                  {/* Continue moved to bottom center */}
                </div>

                {/* Caution banner */}
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm">
                  Select at least 4 players in each Slot and press Next to
                  proceed.
                </div>

                {/* Slot Filter Tabs */}
                <div className="flex overflow-x-auto gap-2 mb-3 sm:mb-4 pb-2 -mx-2 px-2 scrollbar-hide">
                  {slots.map((s) => {
                    const limit = SLOT_LIMITS[s.id];
                    const count = selectedCountBySlot[s.id] || 0;
                    const isActive = activeSlotId === s.id;
                    return (
                      <Button
                        key={s.id}
                        variant={isActive ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setActiveSlotId(s.id)}
                        className="rounded-full flex-shrink-0"
                      >
                        {s.name}
                        {limit !== undefined && (
                          <span
                            className={`ml-2 text-xs ${isActive ? "text-white/90" : "text-gray-600"}`}
                          >
                            {count || 0}/{limit}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>

                {/* Player List with constraints */}
                {loading ? (
                  <div className="text-center text-gray-500 py-6">
                    Loading players...
                  </div>
                ) : error ? (
                  <div className="text-center text-red-600 py-6">{error}</div>
                ) : (
                  <PlayerList
                    players={players.filter((p) => p.slotId === activeSlotId) as unknown as Player[]}
                    selectedPlayers={selectedPlayers}
                    onPlayerSelect={handlePlayerSelect}
                    maxSelections={16}
                    /* filtering handled above using slotId */
                    sortByRole={true}
                    onBlockedSelect={(reason) => alert(reason)}
                    compact={true}
                    displayRoleMap={roleToSlotLabel}
                    compactShowPrice={true}
                    isPlayerDisabled={(player) => {
                      // Don't disable already selected players (allow deselection)
                      if (selectedPlayers.includes(player.id)) {
                        return false;
                      }
                      // Check if the player's slot has reached its limit
                      const playerSlotId = (players.find((p) => p.id === player.id) as any)?.slotId as string | undefined;
                      if (!playerSlotId) return false;
                      const currentSlotCount = selectedPlayers.filter((id) => {
                        const p = players.find((mp) => mp.id === id) as any;
                        return p?.slotId === playerSlotId;
                      }).length;
                      const slotLimit = SLOT_LIMITS[playerSlotId] || 4;
                      return currentSlotCount >= slotLimit;
                    }}
                  />
                )}

                {/* Bottom actions: Previous + (Next or Continue) centered */}
                {slots.findIndex((s) => s.id === activeSlotId) === slots.length - 1 ? (
                  <div className="flex items-center justify-center mt-6">
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={goToPrevSlot}
                        disabled={isFirstSlot}
                        className="flex-1 sm:flex-none"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setCurrentStep(2);
                          setIsStep1Collapsed(true);
                          // Scroll to top of page smoothly
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        disabled={!canNextForActiveSlot}
                        className="flex-1 sm:flex-none"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center mt-6">
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={goToPrevSlot}
                        disabled={isFirstSlot}
                        className="flex-1 sm:flex-none"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={goToNextSlot}
                        disabled={!canNextForActiveSlot}
                        className="flex-1 sm:flex-none"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </StepCard>

          {/* Step 2: Captain Selection */}
          <StepCard
            stepNumber={2}
            title="Choose Captain & Vice-Captain"
            description="Select captain (2x points) and vice-captain (1.5x points)"
            isActive={currentStep === 2}
            isCompleted={currentStep > 2}
          >
            {currentStep === 2 ? (
              <div className="space-y-4">
                {selectedPlayers.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {players
                        .filter((player) => selectedPlayers.includes(player.id))
                        .map((player: Player) => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            isSelected={true}
                            isCaptain={player.id === captainId}
                            isViceCaptain={player.id === viceCaptainId}
                            onSelect={() => {}}
                            onSetCaptain={handleSetCaptain}
                            onSetViceCaptain={handleSetViceCaptain}
                            showActions={true}
                            displayRoleMap={roleToSlotLabel}
                          />
                        ))}
                    </div>

                    <div className="flex justify-center mt-6">
                      <Button
                        variant="primary"
                        onClick={() => setCurrentStep(3)}
                        disabled={!captainId || !viceCaptainId}
                      >
                        Finalize Team
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Please select players first
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                Continue from Step 1 to configure Captain & Vice-Captain
              </div>
            )}
          </StepCard>

          {/* Step 3: Team Summary */}
          <StepCard
            stepNumber={3}
            title="Team Summary"
            description="Review your final team selection"
            isActive={currentStep === 3}
            isCompleted={false}
          >
            {currentStep === 3 ? (
              <div className="space-y-6">
                {selectedPlayers.length > 0 ? (
                  <>
                    {/* Team Name Input */}
                    <div className="mb-6">
                      <label
                        htmlFor="teamName"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Team Name
                      </label>
                      <input
                        type="text"
                        id="teamName"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter your team name"
                        maxLength={50}
                      />
                    </div>

                    {/* Contest Join (optional) */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Join a Contest (optional)</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        value={selectedContestId}
                        onChange={(e) => setSelectedContestId(e.target.value)}
                        disabled={loadingContests}
                      >
                        <option value="">-- Do not join a contest --</option>
                        {contests.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.status})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        If selected, your team will be enrolled after submission.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div
                        className={`${selectedPlayers.length > 0 ? "bg-gradient-to-br from-success-50 to-success-100 border-success-200" : "bg-gray-50 border-gray-200"} rounded-xl p-4 border`}
                      >
                        <div
                          className={`text-2xl font-bold mb-1 ${selectedPlayers.length > 0 ? "text-success-700" : "text-gray-700"}`}
                        >
                          {selectedPlayers.length}
                        </div>
                        <div
                          className={`text-sm ${selectedPlayers.length > 0 ? "text-success-600" : "text-gray-500"}`}
                        >
                          Players Selected
                        </div>
                      </div>

                      <div
                        className={`${captainId ? "bg-gradient-to-br from-warning-50 to-warning-100 border-warning-200" : "bg-gray-50 border-gray-200"} rounded-xl p-4 border`}
                      >
                        <div
                          className={`text-2xl font-bold mb-1 ${captainId ? "text-warning-700" : "text-gray-700"}`}
                        >
                          {captainId ? "1" : "0"}
                        </div>
                        <div
                          className={`text-sm ${captainId ? "text-warning-600" : "text-gray-500"}`}
                        >
                          Captain
                        </div>
                      </div>

                      <div
                        className={`${viceCaptainId ? "bg-gradient-to-br from-secondary-50 to-secondary-100 border-secondary-200" : "bg-gray-50 border-gray-200"} rounded-xl p-4 border`}
                      >
                        <div
                          className={`text-2xl font-bold mb-1 ${viceCaptainId ? "text-secondary-700" : "text-gray-700"}`}
                        >
                          {viceCaptainId ? "1" : "0"}
                        </div>
                        <div
                          className={`text-sm ${viceCaptainId ? "text-secondary-600" : "text-gray-500"}`}
                        >
                          Vice-Captain
                        </div>
                      </div>

                      <div
                        className={`${players.filter((p) => selectedPlayers.includes(p.id)).reduce((sum: number, p: any) => sum + (p.price || 0), 0) > 0 ? "bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200" : "bg-gray-50 border-gray-200"} rounded-xl p-4 border`}
                      >
                        <div
                          className={`text-2xl font-bold mb-1 ${players.filter((p) => selectedPlayers.includes(p.id)).reduce((sum: number, p: any) => sum + (p.price || 0), 0) > 0 ? "text-primary-700" : "text-gray-700"}`}
                        >
                          ₹
                          {Math.floor(
                            players
                              .filter((p) => selectedPlayers.includes(p.id))
                              .reduce((sum: number, p: any) => sum + (p.price || 0), 0)
                          )}
                        </div>
                        <div
                          className={`text-sm ${players.filter((p) => selectedPlayers.includes(p.id)).reduce((sum: number, p: any) => sum + (p.price || 0), 0) > 0 ? "text-primary-600" : "text-gray-500"}`}
                        >
                          Team Value
                        </div>
                      </div>
                    </div>

                    {/* Team Preview */}
                    <Card className="p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Your Dream Team
                      </h4>
                      <div className="space-y-3">
                        {players
                          .filter((player) =>
                            selectedPlayers.includes(player.id)
                          )
                          .map((player: Player) => (
                            <div
                              key={player.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar
                                  name={player.name}
                                  size="sm"
                                  gradientClassName={getRoleAvatarGradient(
                                    player.role
                                  )}
                                />
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {player.name}
                                    {player.id === captainId && (
                                      <Badge
                                        variant="warning"
                                        size="sm"
                                        className="ml-2"
                                      >
                                        Captain
                                      </Badge>
                                    )}
                                    {player.id === viceCaptainId && (
                                      <Badge
                                        variant="secondary"
                                        size="sm"
                                        className="ml-2"
                                      >
                                        Vice-Captain
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {roleToSlotLabel(player.role)} •{" "}
                                    {player.team}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-success-600">
                                  {player.points} pts
                                </div>
                                <div className="text-sm text-gray-500">
                                  ₹{Math.floor(player.price)}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No team selected
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                Finalize team in Step 2 to view summary
              </div>
            )}
          </StepCard>

          {/* Global Submit (always visible below steps) */}
          <div className="flex justify-center mt-6">
            <Button
              variant="primary"
              size="lg"
              className="shadow-glow"
              disabled={currentStep !== 3 || submitting}
              onClick={handleSubmitTeam}
            >
              {submitting ? "Submitting..." : "Submit Team"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
