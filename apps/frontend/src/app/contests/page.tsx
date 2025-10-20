"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicContestsApi, Contest } from '@/lib/api/public/contests';

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await publicContestsApi.list({ status: 'active', page_size: 50 });
        setContests(res.contests);
      } catch (e: any) {
        setError(e?.message || 'Failed to load contests');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Active Contests</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid gap-4">
        {contests.map((c) => (
          <Link key={c.id} href={`/contests/${c.id}`} className="block border rounded p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-medium">{c.name}</div>
                <div className="text-sm text-gray-600">Code: {c.code}</div>
              </div>
              <div className="text-sm text-gray-700">
                {new Date(c.start_at).toLocaleString()} – {new Date(c.end_at).toLocaleString()}
              </div>
            </div>
            {c.description && <p className="mt-2 text-gray-700 text-sm">{c.description}</p>}
          </Link>
        ))}
        {!loading && contests.length === 0 && (
          <div className="text-gray-600">No active contests.</div>
        )}
      </div>
    </div>
  );
}
