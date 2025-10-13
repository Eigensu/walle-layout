"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PillNavbar, Card, Avatar, Badge, Button } from "@/components";
import { MobileUserMenu } from "@/components/navigation/MobileUserMenu";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserTeams,
  deleteTeam,
  renameTeam,
  type TeamResponse,
} from "@/lib/api/teams";
import { NEXT_PUBLIC_API_URL } from "@/config/env";

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
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null);

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

  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/players`);
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
  }, []);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("access_token");
        if (!token) {
          router.push("/auth/login");
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

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team?")) {
      return;
    }

    try {
      setDeletingTeamId(teamId);
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Not authenticated");

      await deleteTeam(teamId, token);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch (err: any) {
      alert(`Error: ${err.message || "Failed to delete team"}`);
    } finally {
      setDeletingTeamId(null);
    }
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
      alert("Team name cannot be empty");
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
      alert(`Error: ${err.message || "Failed to rename team"}`);
    } finally {
      setRenamingTeamId(null);
    }
  };

  const handleCreateNewTeam = () => {
    router.push("/myteam");
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
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
              <Button
                variant="primary"
                onClick={handleCreateNewTeam}
                className="shadow-md w-full sm:w-auto text-base"
              >
                + Create New Team
              </Button>
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
                        <Badge variant="success" className="text-xs sm:text-sm">
                          {team.player_ids.length} Players
                        </Badge>
                        <Badge variant="primary" className="text-xs sm:text-sm">
                          ₹{Math.floor(team.total_value)}M
                        </Badge>
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
                      </div>
                    </div>

                    {/* Captain & Vice Captain */}
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {captain && (
                        <div className="flex items-center gap-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
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
                        </div>
                      )}

                      {viceCaptain && (
                        <div className="flex items-center gap-3 p-3 bg-secondary-50 border border-secondary-200 rounded-lg">
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
                              {roleToSlotLabel(viceCaptain.role || "")} •{" "}
                              {viceCaptain.team}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Player List */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Squad ({teamPlayers.length} players)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teamPlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id)}
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
    </div>
  );
}
