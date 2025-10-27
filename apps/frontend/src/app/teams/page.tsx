"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PillNavbar, Card, Avatar, Badge, Button } from "@/components";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { MobileUserMenu } from "@/components/navigation/MobileUserMenu";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserTeams,
  deleteTeam,
  renameTeam,
  updateTeam,
  type TeamResponse,
} from "@/lib/api/teams";
import { API_BASE_URL, LS_KEYS, ROUTES } from "@/common/consts";
import {
  publicContestsApi,
  type Contest as PublicContest,
  type ContestTeamResponse,
} from "@/lib/api/public/contests";
import { ReplacePlayerModal } from "@/components/team/Edit/ReplacePlayerModal";

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

type Player = ApiPlayer & {
  image?: string;
  stats?: { matches: number };
};

export default function TeamsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contestIdParam = searchParams?.get("contest_id") || "";
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null);
  // In-place edit actions
  const [actionTeamId, setActionTeamId] = useState<string | null>(null);
  const [actionPlayerId, setActionPlayerId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [updatingTeamId, setUpdatingTeamId] = useState<string | null>(null);
  // Contests state for join action
  const [contests, setContests] = useState<PublicContest[]>([]);
  const [loadingContests, setLoadingContests] = useState(false);
  const [selectedContestByTeam, setSelectedContestByTeam] = useState<
    Record<string, string>
  >({});
  const [enrollingTeamId, setEnrollingTeamId] = useState<string | null>(null);
  const [enrollSuccessByTeam, setEnrollSuccessByTeam] = useState<
    Record<string, { contestId: string; contestName: string }>
  >({});
  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // Reusable alert dialog
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState<string | undefined>(undefined);
  const showAlert = (message: string, title?: string) => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertOpen(true);
  };
  // Joined contest to display beside Create New Team
  const [joinedContest, setJoinedContest] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // Map of team -> enrolled contest (for per-team display)
  const [enrollmentByTeam, setEnrollmentByTeam] = useState<
    Record<string, { contestId: string; contestName: string }>
  >({});
  // Per-contest data when contest_id is present in the URL
  const [contestDataByTeam, setContestDataByTeam] = useState<
    Record<string, ContestTeamResponse>
  >({});

  const normalizeRole = (role: string): string => {
    const r = role.toLowerCase();
    if (r === "batsman" || r === "batsmen") return "Batsman";
    if (r === "bowler") return "Bowler";
    if (r === "all-rounder" || r === "allrounder") return "All-Rounder";
    if (r === "wicket-keeper" || r === "wicketkeeper") return "Wicket-Keeper";
    return role;
  };

  const roleToSlotLabel = (role: string): string => {
    const r = normalizeRole(role);
    if (r === "Batsman") return "Slot 1";
    if (r === "Bowler") return "Slot 2";
    if (r === "All-Rounder") return "Slot 3";
    if (r === "Wicket-Keeper") return "Slot 4";
    return r;
  };

  const slotToRole = (slot: number): string => {
    if (slot === 1) return "Batsman";
    if (slot === 2) return "Bowler";
    if (slot === 3) return "All-Rounder";
    if (slot === 4) return "Wicket-Keeper";
    return "Batsman";
  };

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

  // Fetch players (respect contest_id to filter allowed teams for daily contests)
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const url = contestIdParam
          ? `${API_BASE_URL}/api/players?contest_id=${encodeURIComponent(contestIdParam)}`
          : `${API_BASE_URL}/api/players`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load players");
        const data: ApiPlayer[] = await res.json();
        const mapped: Player[] = data.map((p) => ({
          ...p,
          role: slotToRole(p.slot),
          image: p.image_url || undefined,
          stats: { matches: 0 },
        }));
        setPlayers(mapped);
      } catch (err: any) {
        console.error("Failed to load players:", err);
      }
    };

    fetchPlayers();
  }, [contestIdParam]);

  // Load per-team enrollments and resolve contest names
  useEffect(() => {
    let mounted = true;
    const loadPerTeamEnrollments = async () => {
      try {
        const enrollments = await publicContestsApi.myEnrollments();
        if (!Array.isArray(enrollments) || enrollments.length === 0) return;
        const byTeam: Record<string, string> = {};
        const uniqueContestIds = new Set<string>();
        for (const e of enrollments) {
          byTeam[e.team_id] = e.contest_id;
          uniqueContestIds.add(e.contest_id);
        }
        // Resolve contest names
        const idToName: Record<string, string> = {};
        for (const cid of Array.from(uniqueContestIds)) {
          try {
            const c = await publicContestsApi.getMe(cid);
            idToName[cid] = c.name;
          } catch (_) {
            try {
              const c = await publicContestsApi.get(cid);
              idToName[cid] = c.name;
            } catch {
              idToName[cid] = "Contest";
            }
          }
        }
        if (!mounted) return;
        const mapped: Record<
          string,
          { contestId: string; contestName: string }
        > = {};
        for (const [teamId, contestId] of Object.entries(byTeam)) {
          mapped[teamId] = {
            contestId,
            contestName: idToName[contestId] || "Contest",
          };
        }
        setEnrollmentByTeam(mapped);
      } catch (_) {
        // ignore
      }
    };
    loadPerTeamEnrollments();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!isAuthenticated) {
        router.push(ROUTES.LOGIN);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem(LS_KEYS.ACCESS_TOKEN);
        if (!token) {
          router.push(ROUTES.LOGIN);
          return;
        }

        const data = await getUserTeams(token);
        setTeams(data.teams);
      } catch (err: any) {
        setError(err.message || "Failed to load teams");
        console.error("Failed to load teams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [isAuthenticated, router]);

  // When contest_id is present, fetch contest-relative team/players points for ENROLLED teams only
  useEffect(() => {
    let mounted = true;
    const loadContestTeams = async () => {
      if (!contestIdParam || teams.length === 0) return;
      try {
        const results: Record<string, ContestTeamResponse> = {};
        // Filter to teams enrolled in this contest to avoid 404s
        const enrolledTeamIds = Object.entries(enrollmentByTeam)
          .filter(([_, v]) => v?.contestId === contestIdParam)
          .map(([tid]) => tid);
        const targetTeams = teams.filter((t) => enrolledTeamIds.includes(t.id));
        // Fetch sequentially to avoid API burst; can parallelize later if needed
        for (const t of targetTeams) {
          try {
            const data = await publicContestsApi.teamInContest(
              contestIdParam,
              t.id
            );
            results[t.id] = data;
          } catch (_) {
            // ignore if not enrolled
          }
        }
        if (!mounted) return;
        setContestDataByTeam(results);
      } catch (_) {
        // ignore
      }
    };
    loadContestTeams();
    return () => {
      mounted = false;
    };
  }, [contestIdParam, teams, enrollmentByTeam]);

  // Fetch public contests (open ones)
  useEffect(() => {
    const loadContests = async () => {
      try {
        setLoadingContests(true);
        const res = await publicContestsApi.list({ page_size: 100 });
        const open = res.contests.filter(
          (c) => c.status !== "completed" && c.status !== "archived"
        );
        setContests(open);
      } catch (e) {
        // ignore silently
      } finally {
        setLoadingContests(false);
      }
    };
    loadContests();
  }, []);

  // Detect a joined contest for the current user
  useEffect(() => {
    let mounted = true;
    const loadJoined = async () => {
      try {
        // Prefer enrollments endpoint
        const enrollments = await publicContestsApi.myEnrollments();
        if (Array.isArray(enrollments) && enrollments.length > 0) {
          enrollments.sort(
            (a, b) =>
              new Date(b.enrolled_at).getTime() -
              new Date(a.enrolled_at).getTime()
          );
          const latest = enrollments[0];
          try {
            const c = await publicContestsApi.getMe(latest.contest_id);
            if (mounted) setJoinedContest({ id: c.id, name: c.name });
            return;
          } catch (_) {
            try {
              const c = await publicContestsApi.get(latest.contest_id);
              if (mounted) setJoinedContest({ id: c.id, name: c.name });
              return;
            } catch {
              // continue to fallback
            }
          }
        }

        // Fallback: scan public contests' leaderboards for current user
        const res = await publicContestsApi.list({ page_size: 100 });
        const list = res.contests || [];
        for (const c of list) {
          try {
            const lb = await publicContestsApi.leaderboard(c.id, {
              skip: 0,
              limit: 1,
            });
            if (lb.currentUserEntry) {
              if (mounted) setJoinedContest({ id: c.id, name: c.name });
              break;
            }
          } catch (_) {
            // ignore
          }
        }
      } catch (_) {
        // ignore
      }
    };
    loadJoined();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectContest = (teamId: string, contestId: string) => {
    setSelectedContestByTeam((prev) => ({ ...prev, [teamId]: contestId }));
  };

  const handleJoinContest = async (team: TeamResponse) => {
    const contestId = selectedContestByTeam[team.id];
    if (!contestId) {
      showAlert("Please select a contest", "Selection required");
      return;
    }
    try {
      setEnrollingTeamId(team.id);
      await publicContestsApi.enroll(contestId, team.id);
      const contestName =
        contests.find((c) => c.id === contestId)?.name || "Contest";
      setEnrollSuccessByTeam((prev) => ({
        ...prev,
        [team.id]: { contestId, contestName },
      }));
      // Also update per-team enrollment map for immediate UI feedback
      setEnrollmentByTeam((prev) => ({
        ...prev,
        [team.id]: { contestId, contestName },
      }));
    } catch (e: any) {
      const message = e?.response?.data?.detail || e?.message || "Failed to enroll";
      showAlert(message, "Enrollment failed");
    } finally {
      setEnrollingTeamId(null);
    }
  };
  const handleDeleteTeam = async (teamId: string) => {
    try {
      setDeletingTeamId(teamId);
      const token = localStorage.getItem(LS_KEYS.ACCESS_TOKEN);
      if (!token) throw new Error("Not authenticated");

      await deleteTeam(teamId, token);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch (err: any) {
      showAlert(`Error: ${err.message || "Failed to delete team"}`, "Delete failed");
    } finally {
      setDeletingTeamId(null);
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
    }
  };

  const openDeleteDialog = (teamId: string) => {
    setDeleteTargetId(teamId);
    setShowDeleteDialog(true);
  };

  const handleStartRename = (team: TeamResponse) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.team_name);
  };

  const handleCancelRename = () => {
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const handleSaveRename = async (teamId: string) => {
    if (!editingTeamName.trim()) {
      showAlert("Team name cannot be empty", "Validation");
      return;
    }

    try {
      setRenamingTeamId(teamId);
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Not authenticated");

      const updatedTeam = await renameTeam(
        teamId,
        editingTeamName.trim(),
        token
      );
      setTeams((prev) => prev.map((t) => (t.id === teamId ? updatedTeam : t)));
      setEditingTeamId(null);
      setEditingTeamName("");
    } catch (err: any) {
      showAlert(`Error: ${err.message || "Failed to rename team"}`, "Rename failed");
    } finally {
      setRenamingTeamId(null);
    }
  };

  const handleCreateNewTeam = () => {
    router.push("/contests");
  };

  // Open player actions modal for a given team and player
  const openPlayerActions = (teamId: string, playerId: string) => {
    setActionTeamId(teamId);
    setActionPlayerId(playerId);
    setShowActionModal(true);
  };

  const closeModals = () => {
    setShowActionModal(false);
    setShowReplaceModal(false);
    setActionTeamId(null);
    setActionPlayerId(null);
  };

  const doMakeCaptain = async () => {
    if (!actionTeamId || !actionPlayerId) return;
    try {
      setUpdatingTeamId(actionTeamId);
      const token = localStorage.getItem(LS_KEYS.ACCESS_TOKEN) as string;
      const updated = await updateTeam(
        actionTeamId,
        { captain_id: actionPlayerId },
        token
      );
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e: any) {
      showAlert(e?.message || "Failed to set captain", "Update failed");
    } finally {
      setUpdatingTeamId(null);
      setShowActionModal(false);
    }
  };

  const doMakeViceCaptain = async () => {
    if (!actionTeamId || !actionPlayerId) return;
    try {
      setUpdatingTeamId(actionTeamId);
      const token = localStorage.getItem(LS_KEYS.ACCESS_TOKEN) as string;
      const updated = await updateTeam(
        actionTeamId,
        { vice_captain_id: actionPlayerId },
        token
      );
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e: any) {
      showAlert(e?.message || "Failed to set vice-captain", "Update failed");
    } finally {
      setUpdatingTeamId(null);
      setShowActionModal(false);
    }
  };

  const openReplace = () => {
    setShowActionModal(false);
    setShowReplaceModal(true);
  };

  const confirmReplace = async (newPlayerId: string) => {
    if (!actionTeamId || !actionPlayerId) return;
    const team = teams.find((t) => t.id === actionTeamId);
    if (!team) return;
    const newIds = team.player_ids.map((id) =>
      id === actionPlayerId ? newPlayerId : id
    );
    // If the replaced player was captain/VC, transfer to the new player
    const payload: Partial<{
      player_ids: string[];
      captain_id: string;
      vice_captain_id: string;
    }> = { player_ids: newIds } as any;
    if (team.captain_id === actionPlayerId)
      (payload as any).captain_id = newPlayerId;
    if (team.vice_captain_id === actionPlayerId)
      (payload as any).vice_captain_id = newPlayerId;
    try {
      setUpdatingTeamId(actionTeamId);
      const token = localStorage.getItem(LS_KEYS.ACCESS_TOKEN) as string;
      const updated = await updateTeam(actionTeamId, payload as any, token);
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setShowReplaceModal(false);
      setActionPlayerId(null);
      setActionTeamId(null);
    } catch (e: any) {
      showAlert(e?.message || "Failed to replace player", "Update failed");
    } finally {
      setUpdatingTeamId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
        <PillNavbar
          mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
        />
        <div className="h-20 sm:h-24"></div>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-500 py-12">
            Loading your teams...
            {/* Action Modal */}
            {showActionModal && actionTeamId && actionPlayerId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                  <div className="flex items-center justify-between px-5 py-3 border-b">
                    <h3 className="font-semibold text-gray-900">
                      Player Actions
                    </h3>
                    <button
                      onClick={closeModals}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Action Modal */}
                  {showActionModal && actionTeamId && actionPlayerId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-3 border-b">
                          <h3 className="font-semibold text-gray-900">
                            Player Actions
                          </h3>
                          <button
                            onClick={closeModals}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-5 space-y-3">
                          <Button
                            variant="secondary"
                            className="w-full"
                            onClick={openReplace}
                          >
                            Replace Player
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              className="flex-1"
                              onClick={doMakeCaptain}
                              disabled={updatingTeamId === actionTeamId}
                            >
                              {updatingTeamId === actionTeamId
                                ? "Saving..."
                                : "Make Captain"}
                            </Button>
                            <Button
                              variant="primary"
                              className="flex-1"
                              onClick={doMakeViceCaptain}
                              disabled={updatingTeamId === actionTeamId}
                            >
                              {updatingTeamId === actionTeamId
                                ? "Saving..."
                                : "Make V.Captain"}
                            </Button>
                          </div>
                        </div>
                        <div className="px-5 py-3 border-t flex justify-end">
                          <Button variant="ghost" onClick={closeModals}>
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Replace Modal */}
                  {showReplaceModal && actionTeamId && actionPlayerId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
                        <div className="flex items-center justify-between px-5 py-3 border-b">
                          <h3 className="font-semibold text-gray-900">
                            Replace Player
                          </h3>
                          <button
                            onClick={closeModals}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
                          {(() => {
                            const team = teams.find(
                              (t) => t.id === actionTeamId
                            );
                            const target = players.find(
                              (p) => p.id === actionPlayerId
                            );
                            if (!team || !target)
                              return (
                                <div className="text-gray-500">
                                  No player selected.
                                </div>
                              );
                            const sameSlotCandidates = players.filter(
                              (p) =>
                                p.slot === target.slot &&
                                !team.player_ids.includes(p.id)
                            );
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {sameSlotCandidates.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => confirmReplace(p.id)}
                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 text-left"
                                  >
                                    <Avatar name={p.name} size="sm" />
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">
                                        {p.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {roleToSlotLabel(p.role || "")} •{" "}
                                        {p.team}
                                      </div>
                                    </div>
                                    <div className="text-right text-sm text-success-600">
                                      {Math.floor(p.points || 0)} pts
                                    </div>
                                  </button>
                                ))}
                                {sameSlotCandidates.length === 0 && (
                                  <div className="text-sm text-gray-500">
                                    No available players in this slot.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="px-5 py-3 border-t flex justify-end">
                          <Button variant="ghost" onClick={closeModals}>
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Action Modal */}
                  {showActionModal && actionTeamId && actionPlayerId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-3 border-b">
                          <h3 className="font-semibold text-gray-900">
                            Player Actions
                          </h3>
                          <button
                            onClick={closeModals}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-5 space-y-3">
                          <Button
                            variant="secondary"
                            className="w-full"
                            onClick={openReplace}
                          >
                            Replace Player
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              className="flex-1"
                              onClick={doMakeCaptain}
                              disabled={updatingTeamId === actionTeamId}
                            >
                              {updatingTeamId === actionTeamId
                                ? "Saving..."
                                : "Make Captain"}
                            </Button>
                            <Button
                              variant="primary"
                              className="flex-1"
                              onClick={doMakeViceCaptain}
                              disabled={updatingTeamId === actionTeamId}
                            >
                              {updatingTeamId === actionTeamId
                                ? "Saving..."
                                : "Make V.Captain"}
                            </Button>
                          </div>
                        </div>
                        <div className="px-5 py-3 border-t flex justify-end">
                          <Button variant="ghost" onClick={closeModals}>
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Replace Modal */}
                  {showReplaceModal && actionTeamId && actionPlayerId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
                        <div className="flex items-center justify-between px-5 py-3 border-b">
                          <h3 className="font-semibold text-gray-900">
                            Replace Player
                          </h3>
                          <button
                            onClick={closeModals}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
                          {(() => {
                            const team = teams.find(
                              (t) => t.id === actionTeamId
                            );
                            const target = players.find(
                              (p) => p.id === actionPlayerId
                            );
                            if (!team || !target)
                              return (
                                <div className="text-gray-500">
                                  No player selected.
                                </div>
                              );
                            const sameSlotCandidates = players.filter(
                              (p) =>
                                p.slot === target.slot &&
                                !team.player_ids.includes(p.id)
                            );
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {sameSlotCandidates.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => confirmReplace(p.id)}
                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 text-left"
                                  >
                                    <Avatar name={p.name} size="sm" />
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">
                                        {p.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {roleToSlotLabel(p.role || "")} •{" "}
                                        {p.team}
                                      </div>
                                    </div>
                                    <div className="text-right text-sm text-success-600">
                                      {Math.floor(p.points || 0)} pts
                                    </div>
                                  </button>
                                ))}
                                {sameSlotCandidates.length === 0 && (
                                  <div className="text-sm text-gray-500">
                                    No available players in this slot.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="px-5 py-3 border-t flex justify-end">
                          <Button variant="ghost" onClick={closeModals}>
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={openReplace}
                    >
                      Replace Player
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={doMakeCaptain}
                        disabled={updatingTeamId === actionTeamId}
                      >
                        {updatingTeamId === actionTeamId
                          ? "Saving..."
                          : "Make Captain"}
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={doMakeViceCaptain}
                        disabled={updatingTeamId === actionTeamId}
                      >
                        {updatingTeamId === actionTeamId
                          ? "Saving..."
                          : "Make V.Captain"}
                      </Button>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t flex justify-end">
                    <Button variant="ghost" onClick={closeModals}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {/* Replace Modal */}
            {showReplaceModal && actionTeamId && actionPlayerId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
                  <div className="flex items-center justify-between px-5 py-3 border-b">
                    <h3 className="font-semibold text-gray-900">
                      Replace Player
                    </h3>
                    <button
                      onClick={closeModals}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
                    {(() => {
                      const team = teams.find((t) => t.id === actionTeamId);
                      const target = players.find(
                        (p) => p.id === actionPlayerId
                      );
                      if (!team || !target)
                        return (
                          <div className="text-gray-500">
                            No player selected.
                          </div>
                        );
                      const sameSlotCandidates = players.filter(
                        (p) =>
                          p.slot === target.slot &&
                          !team.player_ids.includes(p.id)
                      );
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {sameSlotCandidates.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => confirmReplace(p.id)}
                              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 text-left"
                            >
                              <Avatar name={p.name} size="sm" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {p.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {roleToSlotLabel(p.role || "")} • {p.team}
                                </div>
                              </div>
                              <div className="text-right text-sm text-success-600">
                                {Math.floor(p.points || 0)} pts
                              </div>
                            </button>
                          ))}
                          {sameSlotCandidates.length === 0 && (
                            <div className="text-sm text-gray-500">
                              No available players in this slot.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="px-5 py-3 border-t flex justify-end">
                    <Button variant="ghost" onClick={closeModals}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">

      <ConfirmDialog
        open={showDeleteDialog && !!deleteTargetId}
        title="Delete this team?"
        description="This action cannot be undone. The team will be permanently removed."
        confirmText={deletingTeamId === deleteTargetId ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        destructive
        loading={deletingTeamId === deleteTargetId}
        onCancel={() => { if (!deletingTeamId) { setShowDeleteDialog(false); setDeleteTargetId(null);} }}
        onConfirm={() => deleteTargetId && handleDeleteTeam(deleteTargetId)}
      />

      <AlertDialog
        open={alertOpen}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />
      <PillNavbar
        mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
      />
      <div className="h-20 sm:h-24"></div>

      {/* Hero Section */}
      <div className="px-4 sm:px-6 mb-6 sm:mb-8">
        <div className="text-center max-w-3xl mx-auto mt-4 sm:mt-6">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-primary leading-tight">
            My Fantasy Teams
          </h1>
          <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base md:text-lg">
            Manage and track your fantasy cricket teams
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-6xl">
        {error ? (
          <Card className="p-6 text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </Card>
        ) : teams.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl sm:text-8xl mb-4">🏏</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                No Teams Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first fantasy cricket team and start competing!
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleCreateNewTeam}
                className="shadow-glow"
              >
                Create Your First Team
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Create New Team Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                Your Teams ({teams.length})
              </h2>
              <div className="w-full sm:w-auto flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleCreateNewTeam}
                  className="shadow-md w-full sm:w-auto text-base"
                >
                  + Create New Team
                </Button>
              </div>
            </div>

            {/* Teams Grid */}
            <div className="space-y-4 sm:space-y-6">
              {teams.map((team) => {
                const teamPlayers = players.filter((p) =>
                  team.player_ids.includes(p.id)
                );
                const captain = players.find((p) => p.id === team.captain_id);
                const viceCaptain = players.find(
                  (p) => p.id === team.vice_captain_id
                );

                return (
                  <Card
                    key={team.id}
                    className="p-4 sm:p-6 border-2 border-gray-200 hover:border-primary-300 transition-all hover:shadow-lg"
                  >
                    {/* Team Header */}
                    <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-gray-200">
                      <div className="flex justify-between items-start gap-3">
                        {editingTeamId === team.id ? (
                          <div className="flex-1 flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={editingTeamName}
                              onChange={(e) =>
                                setEditingTeamName(e.target.value)
                              }
                              className="flex-1 px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Enter team name"
                              maxLength={100}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSaveRename(team.id)}
                                disabled={renamingTeamId === team.id}
                                className="flex-1 sm:flex-none"
                              >
                                {renamingTeamId === team.id
                                  ? "Saving..."
                                  : "Save"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelRename}
                                disabled={renamingTeamId === team.id}
                                className="flex-1 sm:flex-none"
                              >
                                Cancel
                              </Button>
                            </div>

                            {/* Enrollment success banner */}
                            {enrollSuccessByTeam[team.id] && (
                              <div className="mb-3 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm">
                                Joined{" "}
                                <span className="font-semibold">
                                  {enrollSuccessByTeam[team.id].contestName}
                                </span>
                                .{" "}
                                <Link
                                  href={`/contests/${enrollSuccessByTeam[team.id].contestId}`}
                                  className="underline"
                                >
                                  View contest
                                </Link>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                                {team.team_name}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                Created:{" "}
                                {new Date(team.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartRename(team)}
                              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 flex-shrink-0"
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
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {contestIdParam && contestDataByTeam[team.id] && (
                          <Badge
                            variant="secondary"
                            className="text-xs sm:text-sm"
                          >
                            Contest Pts:{" "}
                            {contestDataByTeam[team.id].contest_points.toFixed(
                              0
                            )}
                          </Badge>
                        )}
                        {team.total_points > 0 && (
                          <Badge
                            variant="warning"
                            className="text-xs sm:text-sm"
                          >
                            {team.total_points} pts
                          </Badge>
                        )}
                        {team.rank && (
                          <Badge
                            variant="secondary"
                            className="text-xs sm:text-sm"
                          >
                            Rank #{team.rank}
                          </Badge>
                        )}
                        {enrollmentByTeam[team.id] && (
                          <Link
                            href={`/contests/${enrollmentByTeam[team.id].contestId}/leaderboard`}
                            className="inline-flex"
                          >
                            <Badge
                              variant="success"
                              className="text-xs sm:text-sm"
                            >
                              Contest: {enrollmentByTeam[team.id].contestName}
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Squad Heading */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Squad ({teamPlayers.length} players)
                    </h4>

                    {/* Captain & Vice Captain */}
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {captain && (
                        <div className="flex items-center justify-between gap-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                          <Avatar
                            name={captain.name}
                            src={captain.image}
                            size="sm"
                            gradientClassName={getRoleAvatarGradient(
                              captain.role || ""
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                {captain.name}
                              </p>
                              <Badge
                                variant="warning"
                                size="sm"
                                className="text-xs whitespace-nowrap"
                              >
                                Captain (2x)
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
                              {roleToSlotLabel(captain.role || "")} •{" "}
                              {captain.team}
                            </p>
                          </div>
                          <div className="text-right text-xs sm:text-sm font-medium text-success-700 whitespace-nowrap">
                            {contestIdParam && contestDataByTeam[team.id]
                              ? (() => {
                                  const entry = contestDataByTeam[
                                    team.id
                                  ].players.find((p) => p.id === captain.id);
                                  return `${Math.floor(entry?.contest_points || 0)} pts`;
                                })()
                              : `${Math.floor(captain.points || 0)} pts`}
                          </div>
                        </div>
                      )}

                      {viceCaptain && (
                        <div className="flex items-center justify-between gap-3 p-3 bg-secondary-50 border border-secondary-200 rounded-lg">
                          <Avatar
                            name={viceCaptain.name}
                            src={viceCaptain.image}
                            size="sm"
                            gradientClassName={getRoleAvatarGradient(
                              viceCaptain.role || ""
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                {viceCaptain.name}
                              </p>
                              <Badge
                                variant="secondary"
                                size="sm"
                                className="text-xs whitespace-nowrap"
                              >
                                V.Captain (1.5x)
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
                              {roleToSlotLabel(viceCaptain.role || "")} •
                              {viceCaptain.team}
                            </p>
                          </div>
                          <div className="text-right text-xs sm:text-sm font-medium text-success-700 whitespace-nowrap">
                            {contestIdParam && contestDataByTeam[team.id]
                              ? (() => {
                                  const entry = contestDataByTeam[
                                    team.id
                                  ].players.find(
                                    (p) => p.id === viceCaptain.id
                                  );
                                  return `${Math.floor(entry?.contest_points || 0)} pts`;
                                })()
                              : `${Math.floor(viceCaptain.points || 0)} pts`}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Player List (exclude C/VC) */}
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teamPlayers
                          .filter(
                            (player) =>
                              player.id !== (team.captain_id || "") &&
                              player.id !== (team.vice_captain_id || "")
                          )
                          .map((player) => (
                            <div
                              key={player.id}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                              onClick={() =>
                                openPlayerActions(team.id, player.id)
                              }
                            >
                              <Avatar
                                name={player.name}
                                src={player.image}
                                size="sm"
                                gradientClassName={getRoleAvatarGradient(
                                  player.role || ""
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                  {player.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {player.team}
                                </p>
                              </div>
                              <div className="text-right text-xs sm:text-sm font-medium text-success-600 whitespace-nowrap">
                                {contestIdParam && contestDataByTeam[team.id]
                                  ? (() => {
                                      const entry = contestDataByTeam[
                                        team.id
                                      ].players.find((p) => p.id === player.id);
                                      return `${Math.floor(entry?.contest_points || 0)} pts`;
                                    })()
                                  : `${Math.floor(player.points || 0)} pts`}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                      {/* Join contest controls removed */}

                      {/* Danger actions */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(team.id)}
                        disabled={deletingTeamId === team.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                      >
                        {deletingTeamId === team.id
                          ? "Deleting..."
                          : "Delete Team"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Action Modal */}
      {showActionModal && actionTeamId && actionPlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Player Actions</h3>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={openReplace}
              >
                Replace Player
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={doMakeCaptain}
                  disabled={updatingTeamId === actionTeamId}
                >
                  {updatingTeamId === actionTeamId
                    ? "Saving..."
                    : "Make Captain"}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={doMakeViceCaptain}
                  disabled={updatingTeamId === actionTeamId}
                >
                  {updatingTeamId === actionTeamId
                    ? "Saving..."
                    : "Make V.Captain"}
                </Button>
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end">
              <Button variant="ghost" onClick={closeModals}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Modal (shows all players + search) */}
      <ReplacePlayerModal
        isOpen={showReplaceModal && !!actionTeamId && !!actionPlayerId}
        onClose={closeModals}
        targetPlayerId={actionPlayerId || undefined}
        players={players.map((p) => ({
          id: p.id,
          name: p.name,
          team: p.team,
          role: roleToSlotLabel(p.role || ""),
          points: p.points,
        }))}
        excludeIds={[]}
        onSelect={confirmReplace}
      />
    </div>
  );
}
