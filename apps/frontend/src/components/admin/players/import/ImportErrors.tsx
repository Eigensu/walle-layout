interface RowError {
  row: number;
  field?: string;
  message: string;
}

interface ImportErrorsProps {
  errors: RowError[];
  hasMore: boolean;
}

export function ImportErrors({ errors, hasMore }: ImportErrorsProps) {
  if (errors.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        Errors ({errors.length}
        {hasMore && "+"})
      </h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {errors.map((err, idx) => (
          <div
            key={idx}
            className="bg-red-50 border border-red-200 rounded p-3"
          >
            <p className="text-sm text-red-800">
              <span className="font-medium">Row {err.row}</span>
              {err.field && (
                <span className="text-red-600"> • {err.field}</span>
              )}
              : {err.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
