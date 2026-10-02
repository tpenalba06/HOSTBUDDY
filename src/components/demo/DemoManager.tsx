import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Cable,
  Check,
  ClipboardList,
  Eye,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  QrCode,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManagerShell, type ManagerArea } from "@/components/app/ManagerShell";
import { INTEGRATIONS } from "@/lib/integrations/registry";
import { useI18n } from "@/lib/i18n";
import { rulesExtractor } from "@/lib/import-engine/rules-extractor";
import type { ExtractionResult } from "@/lib/import-engine/types";
import { ImportReview } from "@/components/app/ImportReview";

export function DemoManager({ editor, onPreview }: { editor: ReactNode; onPreview: () => void }) {
  const { t } = useI18n();
  const [area, setArea] = useState<ManagerArea | "editor">("properties");
  const [thread, setThread] = useState(false);
  return (
    <ManagerShell
      embedded
      orgName="Conciergerie Azur"
      role="owner"
      active={area === "editor" ? "properties" : area}
      onNavigate={(next) => {
        setArea(next);
        setThread(false);
      }}
    >
      {area === "editor" ? (
        <div>
          <Button
            variant="ghost"
            className="mb-3 min-h-12 px-0 text-primary"
            onClick={() => setArea("properties")}
          >
            ← {t("nav.properties")}
          </Button>
          {editor}
        </div>
      ) : area === "properties" ? (
        <Properties
          t={t}
          onEdit={() => setArea("editor")}
          onAdd={() => setArea("new")}
          onPreview={onPreview}
        />
      ) : area === "messages" ? (
        <Messages t={t} thread={thread} setThread={setThread} />
      ) : area === "orders" ? (
        <Orders t={t} />
      ) : area === "feedback" ? (
        <Feedback t={t} />
      ) : area === "connections" ? (
        <Connections t={t} />
      ) : area === "dashboard" ? (
        <Dashboard t={t} />
      ) : area === "team" ? (
        <Team t={t} />
      ) : (
        <NewProperty t={t} />
      )}
    </ManagerShell>
  );
}

type T = (key: string) => string;
function Heading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <p className="font-bold text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-3xl font-semibold @sm:text-4xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
    </div>
  );
}
function Properties({
  t,
  onEdit,
  onAdd,
  onPreview,
}: {
  t: T;
  onEdit: () => void;
  onAdd: () => void;
  onPreview: () => void;
}) {
  const [qr, setQr] = useState(false);
  return (
    <div>
      <Heading
        eyebrow={t("demo.ownerSpace")}
        title={t("app.myProperties")}
        description={t("demo.propertiesHint")}
      />
      <Button className="mb-5 min-h-12 w-full @sm:w-auto" onClick={onAdd}>
        <Plus />
        {t("app.add")}
      </Button>
      <article className="surface overflow-hidden">
        <div className="h-28 bg-warm p-5">
          <p className="text-sm font-bold text-success">{t("app.published")}</p>
          <h3 className="mt-1 text-2xl font-semibold">Villa Mare</h3>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            Antibes
          </p>
        </div>
        <div className="grid gap-2 p-4 @sm:grid-cols-3">
          <Button onClick={onEdit}>
            <Pencil />
            {t("common.edit")}
          </Button>
          <Button variant="outline" onClick={onPreview}>
            <Eye />
            {t("common.view")}
          </Button>
          <Button variant="outline" onClick={() => setQr(!qr)}>
            <QrCode />
            QR
          </Button>
        </div>
        {qr && (
          <div className="mx-4 mb-4 rounded-lg bg-muted p-4 text-center font-semibold">
            ▦ &nbsp; hostbuddy.app/l/villa-mare
          </div>
        )}
      </article>
    </div>
  );
}
function Messages({
  t,
  thread,
  setThread,
}: {
  t: T;
  thread: boolean;
  setThread: (v: boolean) => void;
}) {
  return (
    <div>
      <Heading
        eyebrow={t("messages.eyebrow")}
        title={t("nav.messages")}
        description={t("messages.emptyDesc")}
      />
      {thread ? (
        <article className="surface p-5">
          <Button
            variant="ghost"
            className="mb-3 px-0 text-primary"
            onClick={() => setThread(false)}
          >
            ← {t("common.back")}
          </Button>
          <p className="font-bold">Sophie · Villa Mare</p>
          <div className="mt-5 space-y-3">
            <p className="max-w-md rounded-xl bg-muted p-3">{t("demo.messageGuest")}</p>
            <p className="ml-auto max-w-md rounded-xl bg-success-soft p-3 text-foreground">
              {t("demo.messageReply")}
            </p>
          </div>
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              className="field min-w-0"
              aria-label={t("common.send")}
              placeholder={t("demo.replyPlaceholder")}
            />
            <Button>
              <Mail />
              <span className="sr-only">{t("common.send")}</span>
            </Button>
          </div>
        </article>
      ) : (
        <button
          onClick={() => setThread(true)}
          className="surface grid min-h-24 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left"
        >
          <span className="h-3 w-3 rounded-full bg-primary" />
          <span className="min-w-0">
            <strong className="block truncate">Sophie · Villa Mare</strong>
            <span className="mt-1 block truncate text-sm text-muted-foreground">
              {t("demo.messageGuest")}
            </span>
          </span>
          <MessageCircle className="text-success" />
        </button>
      )}
    </div>
  );
}
function Orders({ t }: { t: T }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div>
      <Heading
        eyebrow={t("ops.operations")}
        title={t("orders.title")}
        description={t("orders.desc")}
      />
      <article className="surface p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div>
            <h3 className="text-xl font-semibold">{t("guest.breakfast")}</h3>
            <p className="text-sm text-muted-foreground">Villa Mare · Sophie</p>
          </div>
          <span
            className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${confirmed ? "bg-success-soft text-success" : "bg-warning-soft"}`}
          >
            {confirmed ? t("orders.confirmed") : t("orders.pending")}
          </span>
        </div>
        <p className="mt-4 font-bold">25,00 €</p>
        <Button
          className="mt-4 w-full @sm:w-auto"
          disabled={confirmed}
          onClick={() => setConfirmed(true)}
        >
          <Check />
          {confirmed ? t("orders.confirmed") : t("orders.confirm")}
        </Button>
      </article>
    </div>
  );
}
function Feedback({ t }: { t: T }) {
  const [read, setRead] = useState(false);
  return (
    <div>
      <Heading
        eyebrow={t("feedback.eyebrow")}
        title={t("feedback.managerTitle")}
        description={t("feedback.managerDesc")}
      />
      <article className={`surface p-5 ${read ? "" : "border-l-4 border-l-primary"}`}>
        <div className="flex justify-between gap-3">
          <strong>Villa Mare · Sophie</strong>
          <span className="flex text-primary">★★★★★</span>
        </div>
        <p className="mt-4">{t("demo.feedbackText")}</p>
        {!read && (
          <Button variant="outline" className="mt-4" onClick={() => setRead(true)}>
            <Check />
            {t("feedback.markRead")}
          </Button>
        )}
      </article>
    </div>
  );
}
function Connections({ t }: { t: T }) {
  const cards = INTEGRATIONS.filter((x) => x.category === "pms").slice(0, 4);
  return (
    <div>
      <Heading
        eyebrow="HostBuddy"
        title={t("connections.title")}
        description={t("connections.desc")}
      />
      <div className="grid gap-3 @sm:grid-cols-2">
        {cards.map((item) => (
          <article key={item.id} className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <strong>{item.name}</strong>
              <Cable className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("connections.bulkHint")}</p>
            <span className="mt-3 inline-block rounded-full bg-muted px-2 py-1 text-xs font-bold">
              {t("connections.planned")}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
function Dashboard({ t }: { t: T }) {
  const cards = [
    [Home, t("dashboard.properties"), "1"],
    [MessageCircle, t("dashboard.unread"), "1"],
    [ClipboardList, t("dashboard.activeOrders"), "1"],
    [Star, t("dashboard.requestTotal"), "115 €"],
  ] as const;
  return (
    <div>
      <Heading
        eyebrow={t("dashboard.owner")}
        title={t("dashboard.title")}
        description={t("dashboard.desc")}
      />
      <div className="grid gap-3 @sm:grid-cols-2">
        {cards.map(([Icon, label, value]) => (
          <article key={label} className="surface p-5">
            <Icon className="text-primary" />
            <p className="mt-3 text-sm font-bold text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
function Team({ t }: { t: T }) {
  const people = [
    ["TP", "Tristan Penalba", t("demo.roleOwner")],
    ["CM", "Claire Martin", t("demo.roleManager")],
    ["JL", "Julien Lopez", t("demo.roleEmployee")],
  ];
  return (
    <div>
      <Heading
        eyebrow={t("demo.administration")}
        title={t("nav.team")}
        description={t("demo.teamHint")}
      />
      <div className="space-y-3">
        {people.map(([initials, name, role]) => (
          <article
            key={name}
            className="surface grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-accent font-bold text-accent-foreground">
              {initials}
            </span>
            <span className="min-w-0">
              <strong className="block truncate">{name}</strong>
              <span className="text-sm text-muted-foreground">{role}</span>
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
function NewProperty({ t }: { t: T }) {
  const [mode, setMode] = useState<"options" | "text" | "url">("options");
  const [text, setText] = useState("");
  const [candidate, setCandidate] = useState<ExtractionResult | null>(null);
  const [busy, setBusy] = useState(false);

  if (candidate) {
    return (
      <ImportReview
        value={candidate}
        onChange={setCandidate}
        busy={busy}
        onBack={() => setCandidate(null)}
        onConfirm={() => {
          setBusy(true);
          window.setTimeout(() => {
            setBusy(false);
            setCandidate(null);
            setText("");
            setMode("options");
          }, 500);
        }}
      />
    );
  }

  if (mode === "text") {
    return (
      <div>
        <Button variant="ghost" className="mb-3 px-0 text-primary" onClick={() => setMode("options")}>
          ← {t("common.back")}
        </Button>
        <Heading eyebrow="HostBuddy" title={t("import.textTitle")} description={t("import.textHelp")} />
        <textarea
          className="field min-h-64 text-base"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Arrivée à 16h, Wi-Fi, parking, départ, contact…"
        />
        <Button
          className="mt-4 w-full"
          disabled={!text.trim() || busy}
          onClick={async () => {
            setBusy(true);
            try {
              setCandidate(await rulesExtractor.extract(text));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "…" : t("import.textAction")}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Démo réelle du parseur local HostBuddy — aucune information absente n’est inventée.
        </p>
      </div>
    );
  }

  if (mode === "url") {
    return (
      <div>
        <Button variant="ghost" className="mb-3 px-0 text-primary" onClick={() => setMode("options")}>
          ← {t("common.back")}
        </Button>
        <Heading
          eyebrow="HostBuddy"
          title={t("import.urlTitle")}
          description="Dans la démo publique, l’import réseau est désactivé pour éviter des requêtes anonymes vers des sites tiers. Le vrai parcours est disponible après connexion."
        />
        <Button className="w-full" onClick={() => setMode("text")}>
          {t("import.fallbackPrimary")}
        </Button>
      </div>
    );
  }

  const options = [
    ["🔗", t("app.importUrl"), t("app.importUrlD"), () => setMode("url" as const)],
    ["📝", t("app.paste"), t("app.pasteD"), () => setMode("text" as const)],
  ] as const;

  return (
    <div>
      <Heading eyebrow={t("nav.properties")} title={t("app.addTitle")} />
      <div className="grid gap-3">
        {options.map(([icon, title, desc, action], index) => (
          <button
            key={title}
            type="button"
            onClick={action}
            className={`surface p-5 text-left transition hover:-translate-y-0.5 ${index === 0 ? "border-2 border-primary" : ""}`}
          >
            <span className="text-2xl">{icon}</span>
            <h3 className="mt-2 text-xl font-semibold">{title}</h3>
            <p className="mt-1 text-muted-foreground">{desc}</p>
          </button>
        ))}
        <article className="surface p-5">
          <span className="text-2xl">✏️</span>
          <h3 className="mt-2 text-xl font-semibold">{t("app.manual")}</h3>
          <p className="mt-1 text-muted-foreground">{t("app.manualD")}</p>
        </article>
      </div>
    </div>
  );
}
