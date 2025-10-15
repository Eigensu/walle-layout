"use client";

import { useEffect, useMemo, useState } from "react";
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
import { NEXT_PUBLIC_API_URL } from "@/config/env";
import { createTeam } from "@/lib/api/teams";

type ApiPlayer = {
  id: string;
  name: string;
  team?: string;
  role?: string;
  price: number;
  slot: number;
  points?: number;
  image_url?: string | null;
};

export default function MyTeamPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<(Player & { slot: number })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>("");
  const [viceCaptainId, setViceCaptainId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [isStep1Collapsed, setIsStep1Collapsed] = useState(false);

  // Team submission states
  const [submitting, setSubmitting] = useState(false);
  const [teamName, setTeamName] = useState("");

  // Slots order for Step 1
  const SLOT_SEQUENCE = [1, 2, 3, 4] as const;

  const SLOT_LIMITS = useMemo(() => ({ 1: 4, 2: 4, 3: 4, 4: 4 }), []);

  const normalizeRole = (role: string): string => {
    const r = role.toLowerCase();
    if (r === "batsman" || r === "batsmen") return "Batsman";
    if (r === "bowler") return "Bowler";
    if (r === "all-rounder" || r === "allrounder") return "All-Rounder";
    if (r === "wicket-keeper" || r === "wicketkeeper") return "Wicket-Keeper";
    return role;
  };

  // Display-only: map canonical role to Slot label
  const roleToSlotLabel = (role: string): string => {
    const r = normalizeRole(role);
    if (r === "Batsman") return "Slot 1";
    if (r === "Bowler") return "Slot 2";
    if (r === "All-Rounder") return "Slot 3";
    if (r === "Wicket-Keeper") return "Slot 4";
    return r;
  };

  // Slot to internal canonical role mapping (for selection logic)
  const slotToRole = (slot: number): string => {
    if (slot === 1) return "Batsman";
    if (slot === 2) return "Bowler";
    if (slot === 3) return "All-Rounder";
    if (slot === 4) return "Wicket-Keeper";
    return "Batsman";
  };

  // Fetch players from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/players`);
        if (!res.ok) throw new Error(`Failed to load players (${res.status})`);
        const data: ApiPlayer[] = await res.json();
        const mapped: (Player & { slot: number })[] = data.map((p) => ({
          id: p.id,
          name: p.name,
          team: p.team || "",
          role: slotToRole(p.slot),
          price: Number(p.price) || 0,
          points: Number(p.points || 0),
          image: p.image_url || undefined,
          slot: p.slot,
          stats: { matches: 0 },
        }));
        if (!cancelled) setPlayers(mapped);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load players");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCountBySlot = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    selectedPlayers.forEach((id) => {
      const p = players.find((mp) => mp.id === id);
      if (!p) return;
      counts[p.slot] = (counts[p.slot] || 0) + 1;
    });
    return counts;
  }, [selectedPlayers, players]);

  const canNextForActiveSlot = useMemo(
    () => (selectedCountBySlot[activeSlot] || 0) >= 4,
    [selectedCountBySlot, activeSlot]
  );

  const goToNextSlot = () => {
    const idx = SLOT_SEQUENCE.indexOf(
      activeSlot as (typeof SLOT_SEQUENCE)[number]
    );
    const next = SLOT_SEQUENCE[Math.min(idx + 1, SLOT_SEQUENCE.length - 1)];
    setActiveSlot(next);
  };

  const goToPrevSlot = () => {
    const idx = SLOT_SEQUENCE.indexOf(
      activeSlot as (typeof SLOT_SEQUENCE)[number]
    );
    const prev = SLOT_SEQUENCE[Math.max(idx - 1, 0)];
    setActiveSlot(prev);
  };

  const isFirstSlot = useMemo(
    () =>
      SLOT_SEQUENCE.indexOf(activeSlot as (typeof SLOT_SEQUENCE)[number]) === 0,
    [activeSlot, SLOT_SEQUENCE]
  );

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

  const handleClearAll = () => {
    setSelectedPlayers([]);
    setCaptainId("");
    setViceCaptainId("");
    setCurrentStep(1);
    setActiveSlot(1);
    setIsStep1Collapsed(false);
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayers((prev) => {
      // If player is already selected, allow deselection
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }

      // Find the player to check their slot
      const player = players.find((p) => p.id === playerId);
      if (!player) return prev;

      // Check if the slot limit has been reached
      const currentSlotCount = prev.filter((id) => {
        const p = players.find((mp) => mp.id === id);
        return p?.slot === player.slot;
      }).length;

      const slotLimit =
        SLOT_LIMITS[player.slot as keyof typeof SLOT_LIMITS] || 4;

      // Prevent selection if limit reached (player will be disabled, so this is backup)
      if (currentSlotCount >= slotLimit) {
        return prev;
      }

      // Allow selection
      return [...prev, playerId];
    });
  };

  const handleSetCaptain = (playerId: string) => {
    setCaptainId(playerId);
    if (viceCaptainId === playerId) {
      setViceCaptainId("");
    }
  };

  const handleSetViceCaptain = (playerId: string) => {
    setViceCaptainId(playerId);
    if (captainId === playerId) {
      setCaptainId("");
    }
  };

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

      await createTeam(teamData, token);

      // Redirect to teams page
      router.push("/teams");
    } catch (err: any) {
      console.error("Failed to submit team:", err);
      alert(err.message || "Failed to submit team");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Header: Navbar */}
      <PillNavbar
        mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
      />

      {/* Spacer to prevent content from hiding under fixed navbar */}
      <div className="h-20 sm:h-29"></div>

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
                    {SLOT_SEQUENCE.map((slot) => {
                      const count = selectedCountBySlot[slot] || 0;
                      return (
                        <Badge
                          key={slot}
                          variant={count >= 4 ? "success" : "secondary"}
                          size="sm"
                          className="justify-center"
                        >
                          Slot {slot}: {count}/4
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
                  {SLOT_SEQUENCE.map((slot) => {
                    const limit = SLOT_LIMITS[slot as keyof typeof SLOT_LIMITS];
                    const count = selectedCountBySlot[slot] || 0;
                    const isActive = activeSlot === slot;
                    return (
                      <Button
                        key={slot}
                        variant={isActive ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setActiveSlot(slot)}
                        className="rounded-full flex-shrink-0"
                      >
                        {`Slot ${slot}`}
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
                    players={players as unknown as Player[]}
                    selectedPlayers={selectedPlayers}
                    onPlayerSelect={handlePlayerSelect}
                    maxSelections={16}
                    filterSlot={activeSlot}
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
                      const playerSlot = (player as any).slot;
                      const currentSlotCount = selectedPlayers.filter((id) => {
                        const p = players.find((mp) => mp.id === id);
                        return (p as any)?.slot === playerSlot;
                      }).length;
                      const slotLimit =
                        SLOT_LIMITS[playerSlot as keyof typeof SLOT_LIMITS] ||
                        4;
                      return currentSlotCount >= slotLimit;
                    }}
                  />
                )}

                {/* Bottom actions: Previous + (Next or Continue) centered */}
                {activeSlot === SLOT_SEQUENCE[SLOT_SEQUENCE.length - 1] ? (
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
                        disabled={
                          !((selectedCountBySlot[activeSlot] || 0) >= 1)
                        }
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
                        .map((player: Player & { slot: number }) => (
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
                        className={`${players.filter((p) => selectedPlayers.includes(p.id)).reduce((sum: number, p: Player & { slot: number }) => sum + p.price, 0) > 0 ? "bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200" : "bg-gray-50 border-gray-200"} rounded-xl p-4 border`}
                      >
                        <div
                          className={`text-2xl font-bold mb-1 ${players.filter((p) => selectedPlayers.includes(p.id)).reduce((sum: number, p: Player & { slot: number }) => sum + p.price, 0) > 0 ? "text-primary-700" : "text-gray-700"}`}
                        >
                          ₹
                          {Math.floor(
                            players
                              .filter((p) => selectedPlayers.includes(p.id))
                              .reduce(
                                (sum: number, p: Player & { slot: number }) =>
                                  sum + p.price,
                                0
                              )
                          )}
                        </div>
                        <div
                          className={`text-sm ${players.filter((p) => selectedPlayers.includes(p.id)).reduce((sum: number, p: Player & { slot: number }) => sum + p.price, 0) > 0 ? "text-primary-600" : "text-gray-500"}`}
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
                          .map((player: Player & { slot: number }) => (
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
              {submitting ? "Submitting..." : "Submit Team & Join Contest"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
