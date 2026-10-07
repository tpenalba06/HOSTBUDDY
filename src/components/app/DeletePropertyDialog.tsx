import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
export function DeletePropertyDialog({
  property,
  onDelete,
  onClose,
}: {
  property: { id: string; name: string };
  onDelete: (
    id: string,
    name: string,
  ) => Promise<{ cleanupPending: boolean; billingPending: boolean }>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [finished, setFinished] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>{t("property.delete")}</DialogTitle>
        <DialogDescription>{t("property.deleteWarning")}</DialogDescription>
        <p className="break-words font-semibold">{property.name}</p>
        <label className="grid gap-2">
          {t("property.deleteConfirm")}
          <input
            className="field"
            value={name}
            disabled={busy || deleted}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t("common.close")}
          </Button>
          {!finished && (
            <Button
              variant="destructive"
              disabled={busy || name !== property.name}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await onDelete(property.id, name);
                  setDeleted(true);
                  if (result.cleanupPending) setError(t("property.deleteCleanup"));
                  else if (result.billingPending) {
                    setFinished(true);
                    setError(t("property.deleteBilling"));
                  } else onClose();
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : t("property.deleteFailed"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? t("common.saving")
                : deleted
                  ? t("property.deleteRetry")
                  : t("property.delete")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
