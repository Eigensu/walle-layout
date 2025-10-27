"use client";

import React from "react";

export type AlertDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
};

export function AlertDialog({
  open,
  title = "Notice",
  message,
  buttonText = "OK",
  onClose,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-primary-200">
        <div className="p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-primary text-white text-xs font-semibold shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
            {title}
          </div>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{message}</p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-primary shadow hover:shadow-[0_0_20px_rgba(191,171,121,0.35)]"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
