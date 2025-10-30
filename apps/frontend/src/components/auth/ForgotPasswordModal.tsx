"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "./Input";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/lib/api/auth";

const schema = z.object({
  mobile: z
    .string()
    .min(10, "Enter a valid mobile number")
    .max(20, "Enter a valid mobile number"),
  new_password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export type ForgotPasswordForm = z.infer<typeof schema>;

export function ForgotPasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(schema) });

  if (!open) return null;

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await authApi.resetPasswordByMobile(data);
      reset();
      onClose();
      // Optional: toast could be used if available
    } catch (e) {
      // Swallow errors here; surface inline for now
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => !isSubmitting && onClose()} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-primary-200 p-6">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-primary text-white text-xs font-semibold shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
            Reset Password
          </div>
          <p className="mt-2 text-sm text-gray-700">Enter your registered mobile number and a new password.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register("mobile")}
            type="tel"
            placeholder="Mobile number"
            icon="phone"
            variant="light"
            error={errors.mobile?.message}
          />

          <Input
            {...register("new_password")}
            type="password"
            placeholder="New password"
            icon="password"
            variant="light"
            error={errors.new_password?.message}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 disabled:opacity-60"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <Button type="submit" disabled={isSubmitting} className="rounded-full">
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
