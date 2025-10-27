"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { adminContestsApi, Contest, EnrollmentResponse } from "@/lib/api/admin/contests";
import { adminUsersApi, UsersWithTeamsResponse, AdminUserTeamsResponse } from "@/lib/api/admin/users";
import { publicContestsApi, LeaderboardEntry } from "@/lib/api/public/contests";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function AdminManageContestPage() {
  const params = useParams<{ contestId: string }>();
  const router = useRouter();
  const contestId = params?.contestId as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // user search and selection
  const [search, setSearch] = useState("");
  const [userList, setUserList] = useState<UsersWithTeamsResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userTeams, setUserTeams] = useState<AdminUserTeamsResponse | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Record<string, boolean>>({});
  const [enrolling, setEnrolling] = useState(false);

  // Alert dialog state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState<string | undefined>(undefined);
  const [alertMessage, setAlertMessage] = useState("");
  const showAlert = (message: string, title?: string) => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertOpen(true);
  };

  // Unenroll confirmation state
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
  const [unenrollTeamId, setUnenrollTeamId] = useState<string | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);

  const loadContest = async () => {
    const c = await adminContestsApi.get(contestId);
    setContest(c);
  };

  const [toggling, setToggling] = useState(false);
  const toggleContestStatus = async () => {
    if (!contest) return;
    const current = contest.status;
    const next = current === "live" ? "upcoming" : "live";
    try {
      setToggling(true);
      const updated = await adminContestsApi.update(contest.id, { status: next });
      setContest(updated);
      // Reload leaderboard state accordingly
      await loadLeaderboard();
    } catch (e: any) {
      showAlert(e?.message || "Failed to toggle contest status", "Update failed");
    } finally {
      setToggling(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await publicContestsApi.leaderboard(contestId, { limit: 100 });
      setLeaderboard(res.entries);
    } catch {
      // If contest is private, public endpoint 404s; ignore leaderboard
      setLeaderboard([]);
    }
  };

  const searchUsers = async () => {
    const res = await adminUsersApi.usersWithTeams({ search, page_size: 20 });
    setUserList(res);
  };

  const loadUserTeams = async (uid: string) => {
    const res = await adminUsersApi.getUserTeams(uid, { contest_id: contestId, page_size: 100 });
    setUserTeams(res);
    // pre-select not-enrolled teams? leave unchecked by default
    setSelectedTeamIds({});
  };

  const toggleTeam = (tid: string) => {
    setSelectedTeamIds((prev) => ({ ...prev, [tid]: !prev[tid] }));
  };

  const enrollSelected = async () => {
    const team_ids = Object.keys(selectedTeamIds).filter((k) => selectedTeamIds[k]);
    if (team_ids.length === 0) {
      showAlert("Select at least one team", "Validation");
      return;
    }
    try {
      setEnrolling(true);
      await adminContestsApi.enrollTeams(contestId, { team_ids });
      await loadUserTeams(selectedUserId);
      await loadLeaderboard();
      showAlert("Enrolled successfully", "Success");
    } catch (e: any) {
      showAlert(e?.message || "Failed to enroll teams", "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  const unenrollTeam = async (teamId: string) => {
    setUnenrollTeamId(teamId);
    setShowUnenrollDialog(true);
  };

  const confirmUnenroll = async () => {
    if (!unenrollTeamId) return;
    try {
      setUnenrolling(true);
      await adminContestsApi.unenroll(contestId, { team_ids: [unenrollTeamId] });
      await loadUserTeams(selectedUserId);
      await loadLeaderboard();
      setShowUnenrollDialog(false);
      setUnenrollTeamId(null);
    } catch (e: any) {
      showAlert(e?.message || "Failed to unenroll", "Unenroll failed");
    } finally {
      setUnenrolling(false);
    }
  };

  useEffect(() => {
    if (!contestId) return;
    (async () => {
      try {
        setLoading(true);
        await loadContest();
        await loadLeaderboard();
      } catch (e: any) {
        setError(e?.message || "Failed to load contest");
      } finally {
        setLoading(false);
      }
    })();
  }, [contestId]);

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <AlertDialog open={alertOpen} title={alertTitle} message={alertMessage} onClose={() => setAlertOpen(false)} />
        <ConfirmDialog
          open={showUnenrollDialog}
          title="Unenroll this team?"
          description="This will remove the team from this contest."
          cancelText="Cancel"
          confirmText={unenrolling ? "Unenrolling..." : "Unenroll"}
          destructive
          loading={unenrolling}
          onCancel={() => { if (!unenrolling) { setShowUnenrollDialog(false); setUnenrollTeamId(null); } }}
          onConfirm={confirmUnenroll}
        />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin · Manage Contest</h1>
          <Link className="text-blue-600 hover:underline" href="/admin/contests">Back to Contests</Link>
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {contest && (
          <div className="border rounded p-4">
            <div className="text-xl font-medium">{contest.name}</div>
            <div className="text-sm text-gray-600">{contest.code} · {contest.status === 'live' ? 'closed' : contest.status === 'upcoming' ? 'open' : contest.status} · {contest.visibility} · {contest.contest_type}</div>
            <div className="mt-2">
              <button
                className={`px-3 py-1 rounded border text-sm ${contest.status === 'live' ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'}`}
                onClick={toggleContestStatus}
                disabled={toggling}
                title="Toggle contest ON/OFF"
              >
                {toggling
                  ? 'Toggling...'
                  : contest.status === 'live'
                  ? 'Set Upcoming (Open)'
                  : 'Set Live (Close)'}
              </button>
            </div>
            <div className="text-sm text-gray-700 mt-1">{new Date(contest.start_at).toLocaleString()} – {new Date(contest.end_at).toLocaleString()}</div>
            {contest.description && <p className="mt-2 text-gray-700">{contest.description}</p>}
            {contest.contest_type === 'daily' && (
              <div className="mt-2 text-sm text-gray-700">
                <div className="font-medium">Allowed Teams</div>
                <div className="text-gray-700">{(contest.allowed_teams || []).length > 0 ? contest.allowed_teams.join(', ') : 'None'}</div>
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded p-4">
            <h2 className="text-lg font-medium mb-2">Leaderboard (Top 100)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-2 border">Rank</th>
                    <th className="p-2 border">User</th>
                    <th className="p-2 border">Team</th>
                    <th className="p-2 border">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((e) => (
                    <tr key={`${e.rank}-${e.username}`} className="hover:bg-gray-50">
                      <td className="p-2 border">{e.rank}</td>
                      <td className="p-2 border">{e.displayName}</td>
                      <td className="p-2 border">{e.teamName}</td>
                      <td className="p-2 border">{e.points.toFixed(2)}</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td className="p-2 border text-gray-600" colSpan={4}>No entries yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border rounded p-4">
            <h2 className="text-lg font-medium mb-2">Eligibility · Enroll Teams</h2>
            <div className="flex gap-2 mb-3">
              <input className="border rounded p-2 flex-1" placeholder="Search users (username/full name)" value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="px-3 py-2 rounded border" onClick={searchUsers}>Search</button>
            </div>

            {userList && (
              <div className="border rounded divide-y mb-3">
                {userList.users.map(u => (
                  <div key={u.user_id} className="p-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{u.username}</div>
                      <div className="text-xs text-gray-600">Teams: {u.team_count}</div>
                    </div>
                    <button className="px-3 py-1 rounded border" onClick={() => { setSelectedUserId(u.user_id); loadUserTeams(u.user_id); }}>Select</button>
                  </div>
                ))}
                {userList.users.length === 0 && (
                  <div className="p-2 text-gray-600">No users found.</div>
                )}
              </div>
            )}

            {userTeams && (
              <div>
                <div className="mb-2 text-sm text-gray-700">User: {userTeams.user.username}</div>
                <div className="border rounded divide-y max-h-64 overflow-y-auto">
                  {userTeams.teams.map(t => (
                    <div key={t.team_id} className="p-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t.team_name}</div>
                        <div className="text-xs text-gray-600">Points: {t.total_points}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.enrolled ? (
                          <button className="px-3 py-1 rounded border text-red-700" onClick={() => unenrollTeam(t.team_id)}>Unenroll</button>
                        ) : (
                          <input type="checkbox" checked={!!selectedTeamIds[t.team_id]} onChange={() => toggleTeam(t.team_id)} />
                        )}
                      </div>
                    </div>
                  ))}
                  {userTeams.teams.length === 0 && (
                    <div className="p-2 text-gray-600">No teams for this user.</div>
                  )}
                </div>
                <button className="mt-3 px-4 py-2 rounded bg-blue-600 text-white" disabled={enrolling} onClick={enrollSelected}>
                  {enrolling ? "Enrolling..." : "Enroll Selected Teams"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
