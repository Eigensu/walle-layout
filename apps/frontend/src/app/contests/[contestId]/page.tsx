"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { publicContestsApi, Contest, LeaderboardEntry } from '@/lib/api/public/contests';

export default function ContestDetailsPage() {
  const params = useParams<{ contestId: string }>();
  const contestId = params?.contestId as string;
  const [contest, setContest] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contestId) return;
    (async () => {
      try {
        setLoading(true);
        const [c, lb] = await Promise.all([
          publicContestsApi.get(contestId),
          publicContestsApi.leaderboard(contestId, { limit: 100 }),
        ]);
        setContest(c);
        setEntries(lb.entries);
      } catch (e: any) {
        setError(e?.message || 'Failed to load contest');
      } finally {
        setLoading(false);
      }
    })();
  }, [contestId]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Contest</h1>
        <Link className="text-blue-600 hover:underline" href="/contests">Back to Contests</Link>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {contest && (
        <div className="border rounded p-4 mb-6">
          <div className="text-xl font-medium">{contest.name}</div>
          <div className="text-sm text-gray-600">Code: {contest.code}</div>
          {contest.description && <p className="mt-2 text-gray-700">{contest.description}</p>}
          <div className="text-sm text-gray-700 mt-2">
            {new Date(contest.start_at).toLocaleString()} – {new Date(contest.end_at).toLocaleString()}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Leaderboard</h2>
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
            {entries.map((e) => (
              <tr key={`${e.rank}-${e.username}`} className="hover:bg-gray-50">
                <td className="p-2 border">{e.rank}</td>
                <td className="p-2 border">{e.displayName}</td>
                <td className="p-2 border">{e.teamName}</td>
                <td className="p-2 border">{e.points.toFixed(2)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td className="p-2 border text-gray-600" colSpan={4}>No entries yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
