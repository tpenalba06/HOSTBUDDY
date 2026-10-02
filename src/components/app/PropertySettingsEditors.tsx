import { useState } from "react";
import { friendlyMessage } from "./Friendly";
import { useI18n } from "@/lib/i18n";

export function MessagingEditor({
  onSave,
  initial,
  onSaved,
}: {
  onSave: (enabled: boolean) => void | Promise<void>;
  initial: boolean;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="mt-8 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex min-h-14 items-center justify-between gap-4">
        <span>
          <span className="block text-xl font-semibold">Messages voyageurs</span>
          <span className="text-sm text-muted-foreground">
            Ajoutez « Envoyer un message » dans ce guide.
          </span>
        </span>
        <input
          aria-label="Activer les messages voyageurs"
          type="checkbox"
          className="h-6 w-6 shrink-0 accent-primary"
          checked={enabled}
          disabled={busy}
          onChange={async (e) => {
            const next = e.target.checked;
            setEnabled(next);
            setBusy(true);
            setError("");
            try {
              await onSave(next);
              onSaved();
            } catch (err) {
              setEnabled(!next);
              setError(friendlyMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-warning-soft p-3">
          {error}
        </p>
      )}
    </section>
  );
}

export function ReviewEditor({
  onSave,
  initial,
  initialDestinations,
  onSaved,
}: {
  onSave: (
    settings: { title: string; message: string; isEnabled: boolean },
    destinations: { label: string; url: string }[],
  ) => void | Promise<void>;
  initial: { title: string; message: string; is_enabled: boolean } | null;
  initialDestinations: { label: string; url: string }[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(initial?.is_enabled ?? false);
  const [title, setTitle] = useState(initial?.title ?? "Votre séjour vous a plu ?");
  const [message, setMessage] = useState(
    initial?.message ?? "Partagez votre expérience sur la plateforme de votre choix.",
  );
  const [destinations, setDestinations] = useState(
    initialDestinations.length ? initialDestinations : [{ label: "Google", url: "" }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (enabled && destinations.some((d) => d.url && !/^https:\/\//i.test(d.url)))
      return setError(t("review.invalid"));
    setBusy(true);
    setError("");
    try {
      await onSave({ title, message, isEnabled: enabled }, destinations);
      onSaved();
      setExpanded(false);
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-8 border-t pt-8">
      <button
        className="flex min-h-14 w-full items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span>
          <span className="block text-xl font-semibold">{t("review.title")}</span>
          <span className="text-sm text-muted-foreground">{t("review.description")}</span>
        </span>
        <span aria-hidden>{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="mt-5 space-y-4">
          <label className="flex min-h-12 items-center justify-between gap-4 rounded-lg bg-muted px-4">
            <span className="font-medium">{t("review.enable")}</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">{t("review.heading")}</span>
            <input
              className="field"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">{t("review.message")}</span>
            <textarea
              className="field min-h-28"
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          {destinations.map((destination, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[0.7fr_1.3fr]"
            >
              <input
                className="field"
                aria-label={t("review.label")}
                placeholder={t("review.label")}
                maxLength={80}
                value={destination.label}
                onChange={(e) =>
                  setDestinations(
                    destinations.map((item, i) =>
                      i === index ? { ...item, label: e.target.value } : item,
                    ),
                  )
                }
              />
              <input
                className="field"
                aria-label={t("review.url")}
                placeholder="https://…"
                inputMode="url"
                maxLength={1000}
                value={destination.url}
                onChange={(e) =>
                  setDestinations(
                    destinations.map((item, i) =>
                      i === index ? { ...item, url: e.target.value } : item,
                    ),
                  )
                }
              />
            </div>
          ))}
          {destinations.length < 5 && (
            <button
              className="min-h-12 font-semibold text-primary"
              onClick={() => setDestinations([...destinations, { label: "", url: "" }])}
            >
              + {t("review.add")}
            </button>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-warning-soft p-3">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full" onClick={save} disabled={busy}>
            {busy ? "…" : t("common.save")}
          </button>
        </div>
      )}
    </section>
  );
}
