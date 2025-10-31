"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/api/admin/players";
import { playersApi } from "@/lib/api/admin/players";
import {
  adminContestsApi,
  type Contest,
  type PlayerPointsResponseItem,
} from "@/lib/api/admin/contests";
import { getErrorMessage } from "@/lib/api/client";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Loader2, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EditPointsModal } from "../players/EditPointsModal";
import { formatPoints } from "@/lib/utils";

export function TeamsEditSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("");
  // Map of contest-scoped points for selected contest: player_id -> points
  const [contestPointsMap, setContestPointsMap] = useState<
    Record<string, number>
  >({});
  const [contestPointsLoading, setContestPointsLoading] = useState(false);

  // Contest selection state
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestsLoading, setContestsLoading] = useState<boolean>(false);
  const [selectedContestId, setSelectedContestId] = useState<string>("");
  const selectedContest = useMemo(
    () => contests.find((c) => c.id === selectedContestId) || null,
    [contests, selectedContestId]
  );

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageSize = 100; // backend enforces le=100
      let page = 1;
      let total = Infinity;
      const all: Player[] = [];
      const seen = new Set<string>();

      while (all.length < total) {
        const res = await playersApi.getPlayers({ page, page_size: pageSize });
        total = res.total;
        for (const p of res.players) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            all.push(p);
          }
        }
        if (res.players.length < pageSize) break; // no more pages
        page += 1;
        // Safety cap to prevent infinite loops
        if (page > 1000) break;
      }

      setPlayers(all);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load contests for selection
    (async () => {
      try {
        setContestsLoading(true);
        const res = await adminContestsApi.list({ page_size: 50 });
        setContests(res.contests);
      } catch (e) {
        // Non-blocking: show as empty and allow retry via reload
      } finally {
        setContestsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Only load players after a contest is selected
    if (!selectedContestId) return;
    fetchAll();
    // Load per-contest player points for the selected contest
    (async () => {
      try {
        setContestPointsLoading(true);
        const res: PlayerPointsResponseItem[] =
          await adminContestsApi.getPlayerPoints(selectedContestId);
        const map: Record<string, number> = {};
        res.forEach((r) => {
          map[r.player_id] = r.points ?? 0;
        });
        setContestPointsMap(map);
      } catch {
        setContestPointsMap({});
      } finally {
        setContestPointsLoading(false);
      }
    })();
  }, [selectedContestId]);

  const teams = useMemo(() => {
    const groups = new Map<string, Player[]>();
    for (const p of players) {
      const key = p.team || "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    // sort players by name within team
    Array.from(groups.values()).forEach((arr) =>
      arr.sort((a: Player, b: Player) => a.name.localeCompare(b.name))
    );
    // sort team names
    let entries = Array.from(groups.entries()).sort(
      (a: [string, Player[]], b: [string, Player[]]) => a[0].localeCompare(b[0])
    );
    // If a daily contest with allowed_teams is selected, filter to those
    if (
      selectedContest &&
      selectedContest.contest_type === "daily" &&
      selectedContest.allowed_teams?.length
    ) {
      const allowed = new Set(
        selectedContest.allowed_teams.map((t) => (t || "").trim())
      );
      entries = entries.filter(([teamName]) => allowed.has(teamName));
    }
    return entries;
  }, [players, selectedContest]);

  const visibleTeams = useMemo(() => {
    if (!teamFilter) return teams;
    return teams.filter(([name]) =>
      name.toLowerCase().includes(teamFilter.toLowerCase())
    );
  }, [teams, teamFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Edit Players by Teams</h2>
          </div>
          {/* Contest selector */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm text-gray-700 whitespace-nowrap">
                Select contest
              </label>
              <select
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
                className="flex-1 sm:flex-none min-w-[220px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                <option value="" disabled>
                  {contestsLoading ? "Loading contests..." : "Choose a contest"}
                </option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>
            <input
              placeholder="Filter teams..."
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={!selectedContest}
            />
          </div>
          {selectedContest && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Contest:</span>{" "}
              {selectedContest.name} ·{" "}
              {new Date(selectedContest.start_at).toLocaleString()} →{" "}
              {new Date(selectedContest.end_at).toLocaleString()} ·{" "}
              {selectedContest.contest_type}
              {selectedContest.contest_type === "daily" &&
              selectedContest.allowed_teams?.length ? (
                <span>
                  {" "}
                  · Allowed Teams: {selectedContest.allowed_teams.length}
                </span>
              ) : null}
            </div>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {!selectedContest ? (
            <div className="flex items-center justify-center py-12 text-gray-600">
              Please select a contest to edit player points by teams.
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="divide-y">
              {visibleTeams.map(([teamName, teamPlayers]) => (
                <div key={teamName} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">
                      {teamName}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {teamPlayers.length} players
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Player
                          </th>
                          <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Points
                          </th>
                          <th className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teamPlayers.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-3 text-sm text-gray-900">
                              {p.name}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                              {formatPoints(contestPointsMap[p.id] ?? 0)}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="primary"
                                className="px-2 py-1 text-xs sm:text-sm"
                                onClick={() => setEditingPlayer(p)}
                                disabled={!selectedContest}
                              >
                                <span className="hidden sm:inline">
                                  Edit Points
                                </span>
                                <span className="sm:hidden">Edit</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {visibleTeams.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No teams match your filter.
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {editingPlayer && (
        <EditPointsModal
          player={editingPlayer}
          contestId={selectedContestId}
          initialPoints={contestPointsMap[editingPlayer.id] ?? 0}
          onClose={() => setEditingPlayer(null)}
          onSaved={async () => {
            // Refresh the contest points after save
            if (!selectedContestId) return;
            try {
              const res: PlayerPointsResponseItem[] =
                await adminContestsApi.getPlayerPoints(selectedContestId);
              const map: Record<string, number> = {};
              res.forEach((r) => {
                map[r.player_id] = r.points ?? 0;
              });
              setContestPointsMap(map);
            } finally {
              // also refresh global list in case UI needs it
              fetchAll();
            }
          }}
        />
      )}
    </div>
  );
}
