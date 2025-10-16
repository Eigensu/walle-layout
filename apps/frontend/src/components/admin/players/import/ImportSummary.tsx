import { ImportResponse } from "./usePlayerImport";

interface ImportSummaryProps {
  result: ImportResponse;
}

export function ImportSummary({ result }: ImportSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <p className="text-sm text-blue-600 font-medium">Total Rows</p>
        <p className="text-2xl font-bold text-blue-700">{result.total_rows}</p>
      </div>
      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
        <p className="text-sm text-green-600 font-medium">Valid</p>
        <p className="text-2xl font-bold text-green-700">{result.valid_rows}</p>
      </div>
      <div className="bg-red-50 rounded-lg p-4 border border-red-100">
        <p className="text-sm text-red-600 font-medium">Invalid</p>
        <p className="text-2xl font-bold text-red-700">{result.invalid_rows}</p>
      </div>
      {!result.dry_run && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <p className="text-sm text-purple-600 font-medium">Created</p>
          <p className="text-2xl font-bold text-purple-700">{result.created}</p>
        </div>
      )}
    </div>
  );
}
