"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Search, Trophy, Calendar } from "lucide-react";
import { adminContestsApi, Contest } from "@/lib/api/admin/contests";

export function ContestsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminContestsApi.list({ page_size: 6, search: searchQuery || undefined });
      setContests(res.contests);
    } catch (e: any) {
      setError(e?.message || "Failed to load contests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search contests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Link href="/admin/contests" className="px-3 py-2 rounded bg-orange-500 text-white text-sm hover:bg-orange-600">
                Open Contests Manager
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      {loading && <div className="text-gray-600 text-sm">Loading...</div>}

      {/* Contests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contests.map((contest) => (
          <Card key={contest.id} hover>
            <CardBody className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Trophy className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  {contest.status}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {contest.name}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(contest.start_at).toLocaleDateString()} - {new Date(contest.end_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <Link href={`/admin/contests/${contest.id}`} className="px-3 py-1 rounded border text-sm flex-1 text-center">
                  Manage
                </Link>
                <Link href={`/contests/${contest.id}`} className="px-3 py-1 rounded border text-sm flex-1 text-center">
                  View Public
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
        {!loading && contests.length === 0 && (
          <div className="text-gray-600">No contests yet.</div>
        )}
      </div>
    </div>
  );
}
