"use client";

import { useState, useEffect } from "react";
import { Player, playersApi } from "@/lib/api/admin/players";
import { adminContestsApi } from "@/lib/api/admin/contests";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { formatPoints } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

interface EditPointsModalProps {
  player: Player | null;
  contestId?: string; // when set, edit per-contest points
  initialPoints?: number; // initial contest points to prefill
  onClose: () => void;
  onSaved: () => void; // caller should refresh list
}

export function EditPointsModal({
  player,
  contestId,
  initialPoints,
  onClose,
  onSaved,
}: EditPointsModalProps) {
  const [points, setPoints] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // prefill based on context: contest points if provided else global player points
    if (contestId != null && initialPoints != null) {
      setPoints(formatPoints(initialPoints));
    } else {
      setPoints(
        player?.points != null ? formatPoints(player.points) : formatPoints(0)
      );
    }
  }, [contestId, initialPoints, player]);

  const submit = async () => {
    setError(null);
    if (!player) return; // Type guard: ensure player is present before proceeding
    const value = Number(points);
    if (Number.isNaN(value)) {
      setError("Please enter a valid number");
      return;
    }
    setSaving(true);
    try {
      if (contestId) {
        await adminContestsApi.upsertPlayerPoints(contestId, {
          updates: [{ player_id: player.id, points: value }],
        });
      } else {
        await playersApi.updatePlayer(player.id, { points: value });
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!player) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Points</h3>
          <p className="text-sm text-gray-500">{player.name}</p>
        </CardHeader>
        <CardBody className="p-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Points
            <input
              type="number"
              step="0.001"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </label>
          {error && (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
