interface ConflictDetail {
  row: number;
  reason: string;
}

interface ImportConflictsProps {
  conflicts: ConflictDetail[];
}

export function ImportConflicts({ conflicts }: ImportConflictsProps) {
  if (conflicts.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        Conflicts ({conflicts.length})
      </h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {conflicts.map((conflict, idx) => (
          <div
            key={idx}
            className="bg-yellow-50 border border-yellow-200 rounded p-3"
          >
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Row {conflict.row}</span>:{" "}
              {conflict.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
