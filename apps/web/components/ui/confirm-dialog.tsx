"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";
import { useCallback, useState } from "react";

export type ConfirmDialogOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};

type PendingConfirm = ConfirmDialogOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  function ConfirmDialog() {
    if (!pending) {
      return null;
    }

    const {
      title,
      description,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      variant = "default"
    } = pending;

    return (
      <AlertDialog
        open
        onOpenChange={(open) => {
          if (!open) {
            close(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                {cancelLabel}
              </Button>
            </AlertDialogCancel>
            <Button
              type="button"
              variant="primary"
              className={cn(
                variant === "destructive" &&
                  "border-transparent bg-error text-white hover:bg-error/90 focus-visible:shadow-[0_0_0_1px_var(--error),0_0_24px_rgb(220_38_38_/_0.35)]"
              )}
              onClick={() => close(true)}
            >
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return { confirm, ConfirmDialog };
}
