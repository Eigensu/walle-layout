"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminContestsApi, Contest, ContestCreate } from "@/lib/api/admin/contests";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function AdminContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ContestCreate>({
    code: "",
    name: "",
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    visibility: "public",
    points_scope: "time_window",
    status: "draft",
  });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminContestsApi.list({ page_size: 100 });
      setContests(res.contests);
    } catch (e: any) {
      setError(e?.message || "Failed to load contests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      setCreating(true);
      if (!form.code.trim() || !form.name.trim()) {
        alert("Code and Name are required");
        return;
      }
      await adminContestsApi.create(form);
      setForm({ ...form, code: "", name: "" });
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to create contest");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete contest? If it has enrollments, use force delete.")) return;
    try {
      await adminContestsApi.delete(id);
      await load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail?.includes("active enrollments")) {
        if (confirm("Active enrollments found. Force delete?")) {
          await adminContestsApi.delete(id, true);
          await load();
          return;
        }
      }
      alert(e?.message || "Failed to delete");
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Admin · Contests</h1>
          <Link href="/admin" className="px-3 py-1 rounded border hover:bg-gray-50">Back</Link>
        </div>

        <div className="border rounded p-4 mb-6">
          <h2 className="text-lg font-medium mb-2">Create Contest</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-sm">Code</label>
              <input className="w-full border p-2 rounded" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm">Name</label>
              <input className="w-full border p-2 rounded" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm">Start</label>
              <input type="datetime-local" className="w-full border p-2 rounded" value={new Date(form.start_at).toISOString().slice(0,16)} onChange={(e) => setForm({ ...form, start_at: new Date(e.target.value).toISOString() })} />
            </div>
            <div>
              <label className="block text-sm">End</label>
              <input type="datetime-local" className="w-full border p-2 rounded" value={new Date(form.end_at).toISOString().slice(0,16)} onChange={(e) => setForm({ ...form, end_at: new Date(e.target.value).toISOString() })} />
            </div>
            <div>
              <label className="block text-sm">Visibility</label>
              <select className="w-full border p-2 rounded" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}>
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Status</label>
              <select className="w-full border p-2 rounded" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="completed">completed</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </div>
          <button className="mt-3 px-4 py-2 rounded bg-blue-600 text-white" disabled={creating} onClick={create}>
            {creating ? "Creating..." : "Create"}
          </button>
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}

        <div className="grid gap-3">
          {contests.map((c) => (
            <div key={c.id} className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-600">{c.code} · {c.status} · {c.visibility}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/contests/${c.id}`} className="px-3 py-1 rounded border">Manage</Link>
                  <button className="px-3 py-1 rounded border text-red-700" onClick={() => remove(c.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!loading && contests.length === 0 && (
            <div className="text-gray-600">No contests yet.</div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
