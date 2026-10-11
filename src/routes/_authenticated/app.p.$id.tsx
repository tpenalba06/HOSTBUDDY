import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getProperty,
  publishProperty,
  renameProperty,
  saveFieldAnswer,
  saveMessagingSetting,
  saveReviewConfiguration,
  unpublishProperty,
  type PropertyField,
} from "@/lib/data/properties";
import { FriendlyError, Loading, friendlyMessage } from "@/components/app/Friendly";
import { QrCard } from "@/components/app/QrCard";
import { useI18n } from "@/lib/i18n";
import { GuideEditor } from "@/components/app/GuideEditor";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/components/app/useOrg";
import { ServicesEditor } from "@/components/app/ServicesEditor";

type Step = "review" | "complete" | "ready";
const propertyQuery = (id: string) =>
  queryOptions({ queryKey: ["property", id], queryFn: () => getProperty(id) });

export const Route = createFileRoute("/_authenticated/app/p/$id")({
  validateSearch: (s: Record<string, unknown>): { step?: Step } =>
    s["step"] === "complete" || s["step"] === "ready" || s["step"] === "review"
      ? { step: s["step"] }
      : {},
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(propertyQuery(params.id));
    if (!d) throw notFound();
  },
  pendingComponent: () => <Loading />,
  errorComponent: () => <FriendlyError />,
  notFoundComponent: () => <PropertyNotFound />,
  component: PropertyPage,
});

function PropertyNotFound() {
  const { t } = useI18n();
  return (
    <div className="mt-10 text-center">
      <h1 className="text-2xl font-semibold">{t("property.notFound")}</h1>
      <Link to="/app" className="btn btn-primary mt-6">
        {t("property.backProperties")}
      </Link>
    </div>
  );
}

const BADGE_CLASS = {
  found: "bg-success-soft text-success",
  to_verify: "bg-warning-soft text-warning",
  missing: "bg-muted text-muted-foreground",
} as const;

function useSaved() {
  const [saved, setSaved] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return [
    saved,
    () => {
      setSaved(true);
      clearTimeout(t.current);
      t.current = setTimeout(() => setSaved(false), 2200);
    },
  ] as const;
}

function PropertyPage() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const nav = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(propertyQuery(id));
  const org = useOrg();
  const { property, fields, review, destinations, sections, media, messagingEnabled } = data!;
  const step: Step = search.step ?? (property.status === "published" ? "ready" : "review");
  const setStep = (s: Step) => nav({ search: { step: s } });
  const [saved, flashSaved] = useSaved();
  const [editing, setEditing] = useState<PropertyField | null>(null);
  const [mode, setMode] = useState<"guide" | "details" | "services" | "reviews">("guide");

  const refresh = (f: PropertyField) => {
    qc.setQueryData(
      propertyQuery(id).queryKey,
      (old) => old && { ...old, fields: old.fields.map((x) => (x.id === f.id ? f : x)) },
    );
    flashSaved();
  };

  const todo = useMemo(() => fields.filter((f) => f.essential && f.status !== "found"), [fields]);
  const remaining = fields.filter((f) => f.status !== "found" && f.essential).length;
  if (org.role === "member")
    return (
      <div className="py-6">
        <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">
          ← {t("app.myProperties")}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">{property.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Vous pouvez consulter ce guide. Un Responsable ou le Patron peut modifier son contenu.
        </p>
        {property.status === "published" && (
          <a
            href={`/l/${property.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary mt-6"
          >
            Voir le guide voyageur
          </a>
        )}
      </div>
    );

  const SavedBadge = (
    <div
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 font-semibold text-ink-foreground shadow-phone transition ${saved ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      ✓ {t("common.saved")}
    </div>
  );

  if (editing) {
    return (
      <>
        {SavedBadge}
        <QuestionScreen
          field={editing}
          onBack={() => setEditing(null)}
          onSaved={(f) => {
            refresh(f);
            setEditing(null);
          }}
        />
      </>
    );
  }

  if (step === "complete") {
    return (
      <>
        {SavedBadge}
        <CompletionFlow fields={todo} onSaved={refresh} onDone={() => setStep("ready")} />
      </>
    );
  }

  if (step === "ready") {
    return (
      <>
        {SavedBadge}
        <ReadyScreen
          property={property}
          fields={fields}
          onEdit={() => setStep("review")}
          onPublished={() => {
            qc.invalidateQueries({ queryKey: ["property", id] });
            qc.invalidateQueries({ queryKey: ["properties"] });
          }}
        />
      </>
    );
  }

  const found = fields.filter((f) => f.status === "found");
  return (
    <div className="mt-6">
      {SavedBadge}
      <Link to="/app" className="inline-block min-h-12 py-3 font-semibold text-primary">
        ← {t("app.myProperties")}
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-bold text-primary">{t("app.editor")}</p>
          <h1 className="text-3xl font-semibold">{property.name}</h1>
        </div>
        {property.status === "published" && (
          <a
            href={`/l/${property.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            {t("app.viewGuide")}
          </a>
        )}
      </div>
      <NameEditor
        id={property.id}
        initial={property.name}
        onSaved={() => {
          flashSaved();
          qc.invalidateQueries({ queryKey: ["properties"] });
        }}
      />
      <div className="mt-6 grid grid-cols-2 rounded-lg bg-muted p-1 sm:grid-cols-4">
        <Button
          variant={mode === "guide" ? "default" : "ghost"}
          className="min-h-12 px-2"
          onClick={() => setMode("guide")}
        >
          {t("app.guide")}
        </Button>
        <Button
          variant={mode === "details" ? "default" : "ghost"}
          className="min-h-12 px-2"
          onClick={() => setMode("details")}
        >
          {t("app.information")}
        </Button>
        <Button
          variant={mode === "services" ? "default" : "ghost"}
          className="min-h-12 px-2"
          onClick={() => setMode("services")}
        >
          {t("app.services")}
        </Button>
        <Button
          variant={mode === "reviews" ? "default" : "ghost"}
          className="min-h-12 px-2"
          onClick={() => setMode("reviews")}
        >
          {t("app.reviews")}
        </Button>
      </div>
      {mode === "guide" && (
        <div className="mt-7">
          <GuideEditor
            data={{ property, fields, sections, media }}
            onChanged={() => qc.invalidateQueries({ queryKey: ["property", id] })}
            onPreview={() =>
              property.status === "published"
                ? window.open(`/l/${property.slug}`, "_blank")
                : setStep("ready")
            }
          />
        </div>
      )}
      {mode === "details" && (
        <>
          <p
            className={`mt-4 rounded-xl p-3 text-lg font-medium ${remaining ? "bg-warning-soft" : "bg-success-soft"}`}
          >
            {remaining
              ? `Il reste ${remaining} information${remaining > 1 ? "s" : ""} importante${remaining > 1 ? "s" : ""} à compléter`
              : "Les informations importantes sont complètes 👍"}
            {found.length > 0 && (
              <span className="block text-base font-normal">
                {found.length} information{found.length > 1 ? "s" : ""} déjà trouvée
                {found.length > 1 ? "s" : ""}.
              </span>
            )}
          </p>
          <button
            className="btn btn-primary mt-4 w-full text-lg"
            onClick={() => setStep(remaining ? "complete" : "ready")}
          >
            {remaining ? `${t("property.complete")} (${remaining})` : t("property.publishNext")}
          </button>
          <ul className="mt-8 space-y-3">
            {fields.map((f) => (
              <li key={f.id} className="surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {f.label}
                    {f.essential && (
                      <span className="text-muted-foreground"> · {t("property.important")}</span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${BADGE_CLASS[f.status]}`}
                  >
                    {t(`property.${f.status === "to_verify" ? "verify" : f.status}`)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line">
                  {f.value ?? <span className="text-muted-foreground">{t("property.none")}</span>}
                </p>
                <button
                  className="mt-2 min-h-12 font-semibold text-primary underline"
                  onClick={() => setEditing(f)}
                >
                  {f.value
                    ? f.status === "to_verify"
                      ? t("property.verify")
                      : t("common.edit")
                    : t("property.add")}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {mode === "services" && (
        <div className="mt-7">
          <ServicesEditor organizationId={property.organization_id} propertyId={property.id} />
        </div>
      )}
      {mode === "reviews" && (
        <>
          <MessagingEditor
            propertyId={property.id}
            initial={messagingEnabled}
            onSaved={() => {
              flashSaved();
              qc.invalidateQueries({ queryKey: ["property", id] });
            }}
          />
          <ReviewEditor
            propertyId={property.id}
            initial={review}
            initialDestinations={destinations}
            onSaved={flashSaved}
          />
        </>
      )}
    </div>
  );
}

function MessagingEditor({
  propertyId,
  initial,
  onSaved,
}: {
  propertyId: string;
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
              await saveMessagingSetting(propertyId, next);
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

function ReviewEditor({
  propertyId,
  initial,
  initialDestinations,
  onSaved,
}: {
  propertyId: string;
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
      await saveReviewConfiguration(
        propertyId,
        { title, message, isEnabled: enabled },
        destinations,
      );
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

function NameEditor({
  id,
  initial,
  onSaved,
}: {
  id: string;
  initial: string;
  onSaved: () => void;
}) {
  const { t: translate } = useI18n();
  const [name, setName] = useState(initial);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <label className="mt-4 block">
      <span className="mb-1 block font-medium">{translate("property.name")}</span>
      <input
        className="field text-lg"
        value={name}
        onChange={(e) => {
          const v = e.target.value;
          setName(v);
          clearTimeout(t.current);
          t.current = setTimeout(
            () =>
              renameProperty(id, v)
                .then(onSaved)
                .catch(() => {}),
            700,
          );
        }}
      />
    </label>
  );
}

function QuestionScreen({
  field,
  onSaved,
  onBack,
  onSkip,
  progress,
}: {
  field: PropertyField;
  onSaved: (f: PropertyField) => void;
  onBack?: () => void;
  onSkip?: () => void;
  progress?: { i: number; n: number };
}) {
  const [value, setValue] = useState(field.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setValue(field.value ?? "");
    setError("");
  }, [field.id, field.value]);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      onSaved(await saveFieldAnswer(field, value));
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-6">
      {onBack && (
        <button className="min-h-12 font-semibold text-primary" onClick={onBack}>
          ← Retour
        </button>
      )}
      {progress && (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(progress.i / progress.n) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-muted-foreground">
            Question {progress.i + 1} sur {progress.n}
          </p>
        </>
      )}
      <h1 className="mt-4 text-3xl font-semibold">{field.question ?? field.label}</h1>
      {field.status === "to_verify" && (
        <p className="mt-3 rounded-xl bg-warning-soft p-3">
          Nous avons trouvé ceci, mais ce n'est pas certain. Corrigez si besoin puis validez.
        </p>
      )}
      <textarea
        className="field mt-6 min-h-40 text-lg"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Écrivez ici…"
        autoFocus
      />
      {field.raw_value && field.raw_value !== value && (
        <details className="mt-2 text-muted-foreground">
          <summary className="min-h-12 cursor-pointer py-3">Voir le texte d'origine</summary>
          <p className="whitespace-pre-line">{field.raw_value}</p>
        </details>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warning-soft p-3">
          {error}
        </p>
      )}
      <button
        className="btn btn-primary mt-4 w-full text-lg"
        disabled={!value.trim() || busy}
        onClick={save}
      >
        {busy ? "Enregistrement…" : "Valider"}
      </button>
      {onSkip && (
        <button className="mt-2 min-h-12 w-full font-medium text-muted-foreground" onClick={onSkip}>
          Je compléterai plus tard
        </button>
      )}
    </div>
  );
}

function CompletionFlow({
  fields,
  onSaved,
  onDone,
}: {
  fields: PropertyField[];
  onSaved: (f: PropertyField) => void;
  onDone: () => void;
}) {
  const [queue] = useState(() => fields.map((f) => f.id));
  const [i, setI] = useState(0);
  const field = fields.find((f) => f.id === queue[i]) ?? null;
  useEffect(() => {
    if (i >= queue.length) onDone();
  }, [i, queue.length, onDone]);
  if (!field) return null;
  return (
    <QuestionScreen
      field={field}
      progress={{ i, n: queue.length }}
      onSaved={(f) => {
        onSaved(f);
        setI(i + 1);
      }}
      onSkip={() => setI(i + 1)}
    />
  );
}

function ReadyScreen({
  property,
  fields,
  onEdit,
  onPublished,
}: {
  property: { id: string; name: string; slug: string; status: string } & Parameters<
    typeof publishProperty
  >[0];
  fields: PropertyField[];
  onEdit: () => void;
  onPublished: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const published = property.status === "published";
  const pending = fields.filter((f) => f.status !== "found").length;
  const publish = async () => {
    setBusy(true);
    setError("");
    try {
      await publishProperty(property, fields);
      onPublished();
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (!published) {
    return (
      <div className="mt-6">
        <button className="min-h-12 font-semibold text-primary" onClick={onEdit}>
          ← Revoir les informations
        </button>
        <h1 className="mt-2 text-3xl font-semibold">Prêt à publier {property.name} ?</h1>
        <p className="mt-3 text-lg">{t("property.confirmed")}</p>
        {pending > 0 && (
          <p className="mt-3 rounded-xl bg-warning-soft p-3">
            {pending} information{pending > 1 ? "s" : ""} à vérifier ou manquante
            {pending > 1 ? "s" : ""} ne {pending > 1 ? "seront" : "sera"} pas affichée
            {pending > 1 ? "s" : ""}. Vous pourrez les ajouter plus tard.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-warning-soft p-3">
            {error}
          </p>
        )}
        <button className="btn btn-primary mt-6 w-full text-lg" disabled={busy} onClick={publish}>
          {busy ? "…" : t("property.publish")}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-8 text-center">
      <p className="text-5xl">🎉</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{t("property.ready")}</h1>
      <p className="mt-2 text-muted-foreground">{t("property.readyD")}</p>
      <div className="my-8">
        <QrCard slug={property.slug} name={property.name} />
      </div>
      <div className="mx-auto grid max-w-sm gap-3">
        <a
          href={`/l/${property.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary text-lg"
        >
          {t("property.viewGuide")}
        </a>
        <button className="btn btn-secondary" onClick={onEdit}>
          {t("property.customize")}
        </button>
        {error && (
          <p role="alert" className="rounded-xl bg-warning-soft p-3">
            {error}
          </p>
        )}
        <button
          className="min-h-12 font-medium text-destructive underline"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("Mettre ce guide hors ligne ?")) return;
            setBusy(true);
            try {
              await unpublishProperty(property.id);
              onPublished();
              onEdit();
            } catch (e) {
              setError(friendlyMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Mise hors ligne…" : "Mettre le guide hors ligne"}
        </button>
        <Link to="/app" className="min-h-12 py-3 font-medium text-muted-foreground">
          Retour à mes logements
        </Link>
      </div>
    </div>
  );
}
