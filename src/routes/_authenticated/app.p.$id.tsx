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
import { useOrg } from "@/components/app/useOrg";
import { MessagingEditor, ReviewEditor } from "@/components/app/PropertySettingsEditors";
import { QuestionScreen } from "@/components/app/PropertyQuestionScreen";
import {
  PropertyEditorScreen,
  PropertyInformationScreen,
} from "@/components/app/PropertyEditorScreen";
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
          onSave={saveFieldAnswer}
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

  return (
    <>
      {SavedBadge}
      <PropertyEditorScreen
        property={property}
        mode={mode}
        onModeChange={setMode}
        onBack={() => nav({ to: "/app" })}
        onPreview={() => window.open(`/l/${property.slug}`, "_blank", "noopener,noreferrer")}
        onRename={(name) => renameProperty(id, name)}
        onSaved={() => {
          flashSaved();
          void qc.invalidateQueries({ queryKey: ["property", id] });
          void qc.invalidateQueries({ queryKey: ["properties"] });
        }}
        backAction={
          <Link
            to="/app"
            className="inline-flex min-h-12 items-center rounded-xl border bg-card px-4 font-semibold text-primary shadow-sm transition hover:border-primary"
          >
            ← {t("app.myProperties")}
          </Link>
        }
        previewAction={
          <a
            href={`/l/${property.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary min-h-12 w-full @sm:w-auto"
          >
            {t("app.viewGuide")}
          </a>
        }
      >
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
            <PropertyInformationScreen
              fields={fields}
              onEdit={setEditing}
              onComplete={() => setStep(remaining ? "complete" : "ready")}
            />
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
              onSave={(enabled) => saveMessagingSetting(property.id, enabled)}
              initial={messagingEnabled}
              onSaved={() => {
                flashSaved();
                qc.invalidateQueries({ queryKey: ["property", id] });
              }}
            />
            <ReviewEditor
              onSave={(settings, links) => saveReviewConfiguration(property.id, settings, links)}
              initial={review}
              initialDestinations={destinations}
              onSaved={flashSaved}
            />
          </>
        )}
      </PropertyEditorScreen>
    </>
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
      onSave={saveFieldAnswer}
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
