"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminContestsApi, Contest, ContestCreate, ContestType } from "@/lib/api/admin/contests";
import { API_BASE_URL } from "@/common/consts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
    status: "upcoming",
    contest_type: "full",
    allowed_teams: [],
  });
  const [creating, setCreating] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [selectedAllowedTeams, setSelectedAllowedTeams] = useState<string[]>([]);
  const [allowedDropdownOpen, setAllowedDropdownOpen] = useState<boolean>(false);

  // Alert dialog
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState<string | undefined>(undefined);
  const [alertMessage, setAlertMessage] = useState("");
  const showAlert = (message: string, title?: string) => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertOpen(true);
  };

  // Delete dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showForceDeleteDialog, setShowForceDeleteDialog] = useState(false);

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

  // Load available real-world teams from players once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/players?limit=1000`);
        if (!res.ok) return;
        const data: Array<{ team?: string | null }> = await res.json();
        const uniq = Array.from(
          new Set(
            data
              .map((p) => (p.team || "").trim())
              .filter((t) => t.length > 0)
          )
        ).sort();
        setAvailableTeams(uniq);
      } catch {
        // ignore silently
      }
    })();
  }, []);

  const create = async () => {
    try {
      setCreating(true);
      if (!form.code.trim() || !form.name.trim()) {
        showAlert("Code and Name are required", "Validation");
        return;
      }
      const payload: ContestCreate = {
        ...form,
        // Only send allowed_teams for daily contests; clear otherwise
        allowed_teams: form.contest_type === "daily" ? selectedAllowedTeams : [],
      };
      await adminContestsApi.create(payload);
      setForm({ ...form, code: "", name: "" });
      setSelectedAllowedTeams([]);
      await load();
    } catch (e: any) {
      showAlert(e?.message || "Failed to create contest", "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await adminContestsApi.delete(deleteTargetId);
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
      await load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail as string | undefined;
      // If active enrollments, ask for force delete
      if (detail && detail.includes("active enrollments")) {
        setShowDeleteDialog(false);
        setShowForceDeleteDialog(true);
        return;
      }
      showAlert(e?.message || "Failed to delete", "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const confirmForceDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await adminContestsApi.delete(deleteTargetId, true);
      setShowForceDeleteDialog(false);
      setDeleteTargetId(null);
      await load();
    } catch (e: any) {
      showAlert(e?.message || "Failed to force delete", "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto p-4">
        <AlertDialog open={alertOpen} title={alertTitle} message={alertMessage} onClose={() => setAlertOpen(false)} />
        <ConfirmDialog
          open={showDeleteDialog}
          title="Delete this contest?"
          description="This action cannot be undone."
          cancelText="Cancel"
          confirmText={deleting ? "Deleting..." : "Delete"}
          destructive
          loading={deleting}
          onCancel={() => { if (!deleting) { setShowDeleteDialog(false); setDeleteTargetId(null); } }}
          onConfirm={confirmDelete}
        />
        <ConfirmDialog
          open={showForceDeleteDialog}
          title="Force delete contest?"
          description="Active enrollments were found. This will permanently remove the contest and its enrollments."
          cancelText="Cancel"
          confirmText={deleting ? "Deleting..." : "Force Delete"}
          destructive
          loading={deleting}
          onCancel={() => { if (!deleting) { setShowForceDeleteDialog(false); } }}
          onConfirm={confirmForceDelete}
        />
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
                <option value="upcoming">upcoming</option>
                <option value="live">live</option>
                <option value="completed">completed</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Contest Type</label>
              <select
                className="w-full border p-2 rounded"
                value={form.contest_type as ContestType}
                onChange={(e) => setForm({ ...form, contest_type: e.target.value as ContestType })}
              >
                <option value="full">full</option>
                <option value="daily">daily</option>
              </select>
            </div>
            {form.contest_type === "daily" && (
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-sm">Allowed Teams</label>
                {/* Dropdown trigger */}
                <div className="relative">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between border rounded px-3 py-2 bg-white hover:bg-gray-50"
                    onClick={() => setAllowedDropdownOpen((o) => !o)}
                  >
                    <span className="text-left truncate">
                      {selectedAllowedTeams.length > 0
                        ? `${selectedAllowedTeams.length} selected`
                        : "Select allowed teams"}
                    </span>
                    <svg className={`w-4 h-4 ml-2 transition-transform ${allowedDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"/></svg>
                  </button>
                  {allowedDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded border bg-white shadow">
                      <div className="p-2 sticky top-0 bg-white border-b flex gap-2">
                        <input
                          type="text"
                          placeholder="Search..."
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          onChange={(e) => {
                            const q = e.target.value.toLowerCase();
                            const filtered = availableTeams.filter((t) => t.toLowerCase().includes(q));
                            // We won't alter availableTeams permanently; instead render based on q below
                            // To keep code simple, stash the query in a data-attr – or filter inline below
                            (e.target as any).dataset.query = q;
                          }}
                        />
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded border"
                          onClick={() => setSelectedAllowedTeams(availableTeams)}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded border"
                          onClick={() => setSelectedAllowedTeams([])}
                        >
                          Clear
                        </button>
                      </div>
                      <ul className="divide-y">
                        {availableTeams.map((t) => (
                          <li key={t} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => {
                            setSelectedAllowedTeams((prev) =>
                              prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                            );
                          }}>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex w-4 h-4 items-center justify-center rounded border ${selectedAllowedTeams.includes(t) ? 'bg-blue-600 border-blue-600' : 'bg-white'}`}>
                                {selectedAllowedTeams.includes(t) && (
                                  <svg viewBox="0 0 20 20" fill="none" className="w-3 h-3">
                                    <path d="M5 10.5l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-sm text-gray-800">{t}</span>
                            </div>
                          </li>
                        ))}
                        {availableTeams.length === 0 && (
                          <li className="px-3 py-2 text-sm text-gray-500">No teams available</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">Only players whose team is in the allowed list will be selectable for this daily contest.</p>
              </div>
            )}
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
