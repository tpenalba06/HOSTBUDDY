import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Cable,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDashed,
  CircleDollarSign,
  CircleX,
  ClipboardList,
  Eye,
  Home,
  MailPlus,
  MapPin,
  MoreHorizontal,
  Search,
  MessageCircle,
  PackageCheck,
  Pencil,
  Plus,
  QrCode,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { ambienceFor } from "@/components/guest/visual-library";
import { INTEGRATIONS } from "@/lib/integrations/registry";
import { DeletePropertyDialog } from "./DeletePropertyDialog";

export type ManagerPropertySummary = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  location?: string | null;
  coverUrl?: string | null;
  created_at?: string;
};

export type ManagerMetrics = {
  properties: number;
  published: number;
  unread: number;
  todayOrders: number;
  requestTotal: number;
  recentFeedback: { id: string; rating: number; created_at: string }[];
};

export type ManagerOrder = {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  requested_for: string | null;
  created_at: string;
  total_amount: number | string;
  guest_name: string | null;
  services?: { name: string } | null;
  properties?: { name: string } | null;
};

export type ManagerMessage = {
  id: string;
  sender_type: string;
  read_at: string | null;
  created_at: string;
  body: string;
};

export type ManagerConversation = {
  id: string;
  guest_display_name: string;
  last_message_at: string;
  status: string;
  properties?: { name: string } | null;
  messages: ManagerMessage[];
};

export type ManagerFeedback = {
  id: string;
  rating: number;
  comment: string;
  guest_name: string | null;
  created_at: string;
  is_read: boolean;
  properties?: { name: string } | null;
};

export type ManagerTeamMember = {
  user_id: string;
  email: string;
  role: "owner" | "admin" | "member";
  joined_at?: string;
};

function BackButton({ label, onBack }: { label: string; onBack?: (() => void) | undefined }) {
  if (!onBack) return null;
  return (
    <Button
      variant="ghost"
      className="mb-2 min-h-12 justify-start gap-2 px-0 text-primary hover:bg-transparent"
      onClick={onBack}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      {eyebrow && <p className="font-bold text-primary">{eyebrow}</p>}
      <h1 className="mt-1 text-3xl font-semibold leading-tight @sm:text-4xl">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground @sm:text-base">{description}</p>
      )}
    </div>
  );
}

export function ManagerPropertiesScreen({
  properties,
  role = "owner",
  onAdd,
  onEdit,
  onView,
  renderEdit,
  renderView,
  renderQr,
  onDelete,
  pendingDeletions = [],
}: {
  properties: ManagerPropertySummary[];
  pendingDeletions?: { property_id: string; confirmed_name: string }[];
  role?: "owner" | "admin" | "member";
  onAdd?: () => void;
  onEdit: (id: string) => void;
  onView: (slug: string) => void;
  renderEdit?: (property: ManagerPropertySummary, className: string, label: string) => ReactNode;
  renderView?: (property: ManagerPropertySummary, className: string, label: string) => ReactNode;
  renderQr: (property: ManagerPropertySummary) => ReactNode;
  onDelete?: (
    id: string,
    name: string,
  ) => Promise<{ cleanupPending: boolean; billingPending: boolean }>;
}) {
  const { t } = useI18n();
  const [qr, setQr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [sort, setSort] = useState<"az" | "za" | "newest" | "oldest">("newest");
  const shown = properties
    .filter(
      (property) =>
        (status === "all" || property.status === status) &&
        `${property.name} ${property.location ?? ""}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase().trim()),
    )
    .sort((a, b) => {
      if (sort === "az" || sort === "za") {
        const result = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        return sort === "az" ? result : -result;
      }
      const result = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      return sort === "oldest" ? result : -result;
    });

  return (
    <div className="manager-properties py-4 @sm:py-6">
      {(role === "owner" || role === "admin") &&
        onDelete &&
        pendingDeletions.map((job) => (
          <div key={job.property_id} className="mb-4 rounded-xl border p-4">
            <p>
              {job.confirmed_name} — {t("property.deleteCleanup")}
            </p>
            <Button
              variant="outline"
              onClick={() => setDeleting({ id: job.property_id, name: job.confirmed_name })}
            >
              {t("property.deleteRetry")}
            </Button>
          </div>
        ))}
      <div className="grid gap-4 @sm:grid-cols-[minmax(0,1fr)_auto] @sm:items-end">
        <PageHeading title={t("app.myProperties")} />
        <div className="manager-property-tools">
          <label className="manager-property-search">
            <Search size={16} />
            <input
              type="search"
              aria-label={t("manager.searchProperties")}
              placeholder={t("manager.searchProperties")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            className="manager-property-sort"
            aria-label={t("manager.sortLabel")}
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
          >
            <option value="az">{t("manager.sortAZ")}</option>
            <option value="za">{t("manager.sortZA")}</option>
            <option value="newest">{t("manager.sortNewest")}</option>
            <option value="oldest">{t("manager.sortOldest")}</option>
          </select>
        </div>
        {role !== "member" && onAdd && (
          <Button className="min-h-12 w-full @sm:w-auto" onClick={onAdd}>
            <Plus />
            {t("app.add")}
          </Button>
        )}
      </div>

      <div className="manager-property-filters" role="group" aria-label={t("app.myProperties")}>
        {(["all", "published", "draft"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => {
              setStatus(value);
              setQr(null);
            }}
            className={`min-h-12 rounded-full px-5 text-sm font-semibold ${status === value ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            {t(
              value === "all"
                ? "guide.all"
                : value === "draft"
                  ? "manager.drafts"
                  : "manager.published",
            )}{" "}
            <span className="ml-2 opacity-60">
              {properties.filter((p) => value === "all" || p.status === value).length}
            </span>
          </button>
        ))}
      </div>

      {properties.length ? (
        <div className="manager-property-grid">
          {!shown.length && <p className="text-muted-foreground">{t("manager.noResults")}</p>}
          {shown.map((property) => (
            <article
              key={property.id}
              className="manager-property-card surface min-w-0 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => onEdit(property.id)}
                aria-label={`${t(role === "member" ? "common.view" : "common.edit")} ${property.name}`}
                className="manager-property-photo relative block w-full overflow-hidden bg-warm"
              >
                <img
                  src={property.coverUrl || ambienceFor(property.name)}
                  alt={property.coverUrl ? property.name : t("media.ambience")}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    const image = event.currentTarget;
                    if (image.dataset["fallback"]) return;
                    image.dataset["fallback"] = "true";
                    image.src = ambienceFor(property.name);
                  }}
                />
              </button>
              <div className="px-4 pt-4 @sm:px-5">
                <h2 className="break-words text-2xl font-semibold leading-tight">
                  {property.name}
                </h2>
                {property.location && (
                  <p className="mt-2 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{property.location}</span>
                  </p>
                )}
              </div>

              <span
                className={`manager-property-status ${property.status === "published" ? "is-published" : "is-draft"}`}
              >
                {property.status === "published" ? t("app.published") : t("app.draft")}
              </span>
              <details className="manager-property-menu">
                <summary aria-label={t(role === "member" ? "common.view" : "common.edit")}>
                  <MoreHorizontal size={19} />
                </summary>
                <div className="manager-property-actions grid gap-2 p-3">
                  {renderEdit ? (
                    renderEdit(
                      property,
                      "btn btn-primary min-h-12",
                      role === "member" ? t("common.view") : t("common.edit"),
                    )
                  ) : (
                    <Button className="min-h-12" onClick={() => onEdit(property.id)}>
                      <Pencil />
                      {role === "member" ? t("common.view") : t("common.edit")}
                    </Button>
                  )}
                  {property.status === "published" ? (
                    <>
                      {renderView ? (
                        renderView(property, "btn btn-secondary min-h-12", t("common.view"))
                      ) : (
                        <Button
                          variant="outline"
                          className="min-h-12"
                          onClick={() => onView(property.slug)}
                        >
                          <Eye />
                          {t("common.view")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="min-h-12"
                        onClick={() => setQr(qr === property.id ? null : property.id)}
                      >
                        <QrCode />
                        QR
                      </Button>
                    </>
                  ) : (
                    <p className="self-center text-sm text-muted-foreground @sm:col-span-2">
                      {t("app.publishHint")}
                    </p>
                  )}
                  {(role === "owner" || role === "admin") && onDelete && (
                    <Button
                      variant="destructive"
                      className="min-h-12"
                      onClick={() => setDeleting(property)}
                    >
                      <Trash2 />
                      {t("property.delete")}
                    </Button>
                  )}
                </div>
              </details>
              {qr === property.id && (
                <div className="mx-4 mb-4 rounded-xl border bg-muted p-4 text-center">
                  {renderQr(property)}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed bg-card p-6 text-center">
          <Home className="mx-auto h-9 w-9 text-primary" />
          <p className="mt-3 font-semibold">{t("app.first")}</p>
        </div>
      )}
      {deleting && onDelete && (role === "owner" || role === "admin") && (
        <DeletePropertyDialog
          key={deleting.id}
          property={deleting}
          onDelete={onDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export function ManagerDashboardScreen({
  orgName,
  data,
  onAdd,
  onOrders,
}: {
  orgName: string;
  data: ManagerMetrics;
  onAdd: () => void;
  onOrders: () => void;
}) {
  const { t, locale } = useI18n();
  const cards = [
    {
      label: t("dashboard.properties"),
      value: data.properties,
      detail: `${data.published} ${t("dashboard.liveGuides")}`,
      icon: Building2,
    },
    {
      label: t("dashboard.unread"),
      value: data.unread,
      detail: t("dashboard.toHandle"),
      icon: MessageCircle,
    },
    {
      label: t("dashboard.activeOrders"),
      value: data.todayOrders,
      detail: t("dashboard.upcoming"),
      icon: ClipboardList,
    },
    {
      label: t("dashboard.requestTotal"),
      value: `${data.requestTotal.toFixed(2)} €`,
      detail: t("dashboard.notCollected"),
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="py-4 @sm:py-6">
      <PageHeading
        eyebrow={t("dashboard.owner")}
        title={t("dashboard.title")}
        description={`${t("dashboard.desc")} ${orgName}.`}
      />
      <div className="mt-6 grid gap-3 @sm:grid-cols-2 @xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="surface min-w-0 p-4 @sm:p-5">
            <card.icon className="h-6 w-6 text-primary" />
            <p className="mt-4 text-sm font-bold text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
          </article>
        ))}
      </div>
      <div className="mt-7 grid gap-3 @sm:grid-cols-2">
        <Button className="min-h-12" onClick={onAdd}>
          {t("app.add")}
          <ArrowRight />
        </Button>
        <Button variant="outline" className="min-h-12" onClick={onOrders}>
          {t("dashboard.viewOrders")}
          <ArrowRight />
        </Button>
      </div>
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">{t("dashboard.recent")}</h2>
        {data.recentFeedback.length ? (
          <div className="mt-3 space-y-2">
            {data.recentFeedback.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-4"
              >
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {item.rating}/5
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat(locale).format(new Date(item.created_at))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-muted-foreground">{t("dashboard.none")}</p>
        )}
      </section>
    </div>
  );
}

export function ManagerOrdersScreen({
  orders,
  onBack,
  onStatusChange,
}: {
  orders: ManagerOrder[];
  onBack?: () => void;
  onStatusChange: (id: string, status: "pending" | "confirmed" | "completed" | "cancelled") => void;
}) {
  const { t, locale } = useI18n();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = [
    {
      title: t("orders.today"),
      items: orders.filter(
        (x) =>
          x.status !== "completed" &&
          x.status !== "cancelled" &&
          new Date(x.requested_for ?? x.created_at).toDateString() === new Date().toDateString(),
      ),
    },
    {
      title: t("orders.upcoming"),
      items: orders.filter(
        (x) =>
          x.status !== "completed" &&
          x.status !== "cancelled" &&
          new Date(x.requested_for ?? x.created_at) > today &&
          new Date(x.requested_for ?? x.created_at).toDateString() !== new Date().toDateString(),
      ),
    },
    {
      title: t("orders.completed"),
      items: orders.filter((x) => x.status === "completed" || x.status === "cancelled"),
    },
  ];

  return (
    <div className="py-4 @sm:py-6">
      <BackButton label={t("ops.back")} onBack={onBack} />
      <PageHeading
        eyebrow={t("ops.operations")}
        title={t("orders.title")}
        description={t("orders.desc")}
      />
      {groups.map((group) => (
        <section key={group.title} className="mt-7">
          <h2 className="text-xl font-semibold @sm:text-2xl">
            {group.title}{" "}
            <span className="text-sm font-sans text-muted-foreground @sm:text-base">
              ({group.items.length})
            </span>
          </h2>
          {group.items.length ? (
            <div className="mt-3 grid gap-3 @lg:grid-cols-2">
              {group.items.map((order) => (
                <article key={order.id} className="surface min-w-0 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {order.services?.name ?? t("orders.service")}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.properties?.name} · {order.guest_name || t("orders.guest")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        order.status === "pending"
                          ? "bg-warning-soft"
                          : order.status === "confirmed"
                            ? "bg-success-soft text-success"
                            : "bg-muted"
                      }`}
                    >
                      {order.status === "pending"
                        ? t("orders.pending")
                        : order.status === "confirmed"
                          ? t("orders.confirmed")
                          : order.status === "completed"
                            ? t("orders.completed")
                            : t("orders.cancelled")}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 @sm:grid-cols-[minmax(0,1fr)_auto] @sm:items-center">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <CalendarClock className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(order.requested_for ?? order.created_at))}
                      </span>
                    </span>
                    <strong>{Number(order.total_amount).toFixed(2)} €</strong>
                  </div>
                  {order.status !== "completed" && order.status !== "cancelled" && (
                    <div className="mt-4 grid gap-2 @sm:grid-cols-2">
                      {order.status === "pending" ? (
                        <Button
                          className="min-h-12"
                          onClick={() => onStatusChange(order.id, "confirmed")}
                        >
                          <Check />
                          {t("orders.confirm")}
                        </Button>
                      ) : (
                        <Button
                          className="min-h-12"
                          onClick={() => onStatusChange(order.id, "completed")}
                        >
                          <PackageCheck />
                          {t("orders.finish")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="min-h-12"
                        onClick={() => onStatusChange(order.id, "cancelled")}
                      >
                        <CircleX />
                        {t("orders.cancel")}
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-muted p-4 text-muted-foreground">
              {t("orders.empty")}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

export function ManagerMessagesScreen({
  conversations,
  onBack,
  onOpen,
}: {
  conversations: ManagerConversation[];
  onBack?: () => void;
  onOpen: (id: string) => void;
}) {
  const { t } = useI18n();
  const unreadCount = conversations.filter((c) =>
    c.messages.some((m) => m.sender_type === "guest" && !m.read_at),
  ).length;

  return (
    <div className="py-4 @sm:py-6">
      <BackButton label={t("messages.back")} onBack={onBack} />
      <div className="grid gap-3 @sm:grid-cols-[minmax(0,1fr)_auto] @sm:items-end">
        <PageHeading eyebrow={t("messages.eyebrow")} title={t("nav.messages")} />
        <span className="w-fit rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
          {unreadCount} {t("messages.unread")}
        </span>
      </div>

      {conversations.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed bg-card p-8 text-center">
          <MessageCircle className="mx-auto h-9 w-9 text-success" />
          <h2 className="mt-3 text-xl font-semibold">{t("messages.empty")}</h2>
          <p className="mt-2 text-muted-foreground">{t("messages.emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-6 divide-y overflow-hidden rounded-xl border bg-card">
          {conversations.map((conversation) => {
            const latest = [...conversation.messages].sort((a, b) =>
              b.created_at.localeCompare(a.created_at),
            )[0];
            const unread = conversation.messages.some(
              (m) => m.sender_type === "guest" && !m.read_at,
            );
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onOpen(conversation.id)}
                className="grid min-h-24 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition hover:bg-muted"
              >
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-border"}`}
                />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <strong className="truncate">{conversation.guest_display_name}</strong>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(conversation.last_message_at).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="block truncate text-sm font-semibold text-success">
                    {conversation.properties?.name}
                  </span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {latest?.body}
                  </span>
                </span>
                {conversation.status === "resolved" && (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ManagerFeedbackScreen({
  feedback,
  onBack,
  onMarkRead,
}: {
  feedback: ManagerFeedback[];
  onBack?: () => void;
  onMarkRead: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="py-4 @sm:py-6">
      <BackButton label={t("ops.back")} onBack={onBack} />
      <PageHeading
        eyebrow={t("feedback.eyebrow")}
        title={t("feedback.managerTitle")}
        description={t("feedback.managerDesc")}
      />
      <div className="mt-6 grid gap-3 @lg:grid-cols-2">
        {feedback.map((item) => (
          <article
            key={item.id}
            className={`surface min-w-0 p-4 @sm:p-5 ${!item.is_read ? "border-l-4 border-l-primary" : ""}`}
          >
            <div className="grid gap-2 @sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p className="truncate font-bold">{item.properties?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.guest_name || t("feedback.anonymous")} ·{" "}
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    new Date(item.created_at),
                  )}
                </p>
              </div>
              <span className="flex gap-0.5" aria-label={`${item.rating} / 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${n <= item.rating ? "fill-primary text-primary" : "text-border"}`}
                  />
                ))}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-line leading-relaxed">
              {item.comment || t("feedback.noComment")}
            </p>
            {!item.is_read && (
              <Button
                variant="outline"
                className="mt-4 min-h-12 w-full @sm:w-auto"
                onClick={() => onMarkRead(item.id)}
              >
                <Check />
                {t("feedback.markRead")}
              </Button>
            )}
          </article>
        ))}
        {!feedback.length && (
          <div className="surface p-6 text-muted-foreground">{t("feedback.emptyManager")}</div>
        )}
      </div>
    </div>
  );
}

export function ManagerConnectionsScreen({
  onBack,
  guestyAction,
  guestyConnected = false,
}: {
  onBack?: () => void;
  guestyAction?: ReactNode;
  guestyConnected?: boolean;
}) {
  const { t } = useI18n();
  const priorities = INTEGRATIONS.filter(
    (item) => item.category === "pms" && item.id !== "guesty",
  ).slice(0, 3);
  return (
    <div className="py-4 @sm:py-6">
      <BackButton label={t("common.back")} onBack={onBack} />
      <Cable className="mt-2 h-9 w-9 text-primary @sm:mt-6" />
      <PageHeading title={t("connections.title")} description={t("connections.desc")} />

      <section className="mt-7">
        <h2 className="text-xl font-semibold @sm:text-2xl">{t("connections.connected")}</h2>
        <div className="mt-4 rounded-xl border border-dashed bg-card p-6 text-center">
          <p className="font-semibold">
            Guesty · {t(guestyConnected ? "provider.connected" : "provider.notConnected")}
          </p>
          {guestyAction}
          <p className="mt-1 text-sm text-muted-foreground">{t("connections.importHint")}</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold @sm:text-2xl">{t("connections.upcoming")}</h2>
        <div className="mt-4 grid gap-3 @sm:grid-cols-2">
          {priorities.map((item) => (
            <article className="rounded-xl border bg-card p-4" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">{item.name}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                  <CircleDashed className="h-3 w-3" />
                  {t("connections.planned")}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t("connections.bulkHint")}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ManagerTeamScreen({
  members,
  onBack,
  onInvite,
  onRoleChange,
  onRemove,
}: {
  members: ManagerTeamMember[];
  onBack?: () => void;
  onInvite: (email: string, role: "admin" | "member") => void | Promise<void>;
  onRoleChange: (userId: string, role: "admin" | "member") => void | Promise<void>;
  onRemove: (userId: string) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const change = async (task: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch {
      setError(t("team.error"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="py-4 @sm:py-6">
      <BackButton label={t("nav.properties")} onBack={onBack} />
      <PageHeading
        eyebrow={t("demo.ownerSpace")}
        title={t("nav.team")}
        description={t("demo.teamHint")}
      />
      <form
        className="surface mt-6 grid gap-3 p-4 @sm:p-5 @lg:grid-cols-[minmax(0,1fr)_180px_auto]"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || !email.trim()) return;
          setBusy(true);
          setNotice("");
          setError("");
          try {
            await onInvite(email.trim(), role);
            setEmail("");
            setNotice(t("team.notice"));
          } catch {
            setError(t("team.error"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="min-w-0">
          <span className="mb-1 block font-semibold">E-mail</span>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="prenom@entreprise.fr"
          />
        </label>
        <label>
          <span className="mb-1 block font-semibold">{t("team.role")}</span>
          <select
            className="field"
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
          >
            <option value="admin">{t("team.admin")}</option>
            <option value="member">{t("team.member")}</option>
          </select>
        </label>
        <Button className="min-h-12 self-end" disabled={busy}>
          <MailPlus />
          {busy ? t("team.adding") : t("team.add")}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warning-soft p-3">
          {error}
        </p>
      )}
      {notice && <p className="mt-3 rounded-xl bg-success-soft p-3 text-success">{notice}</p>}

      <div className="mt-8">
        <h2 className="text-xl font-semibold @sm:text-2xl">{t("team.active")}</h2>
        <div className="mt-3 space-y-3">
          {members.map((member) => (
            <article
              key={member.user_id}
              className="surface grid min-w-0 gap-3 p-4 @sm:grid-cols-[auto_minmax(0,1fr)] @lg:grid-cols-[auto_minmax(0,1fr)_180px_auto] @lg:items-center"
            >
              <Users className="hidden text-primary @sm:block" />
              <div className="min-w-0">
                <p className="truncate font-bold">{member.email}</p>
                <p className="text-sm text-muted-foreground">
                  {member.role === "owner"
                    ? t("team.owner")
                    : member.role === "admin"
                      ? t("team.admin")
                      : t("team.member")}
                </p>
              </div>
              {member.role !== "owner" && (
                <>
                  <select
                    aria-label={t("team.change")}
                    className="field"
                    disabled={busy}
                    value={member.role}
                    onChange={(event) =>
                      void change(() =>
                        onRoleChange(member.user_id, event.target.value as "admin" | "member"),
                      )
                    }
                  >
                    <option value="admin">{t("team.admin")}</option>
                    <option value="member">{t("team.member")}</option>
                  </select>
                  <Button
                    variant="ghost"
                    className="min-h-12 text-destructive"
                    disabled={busy}
                    onClick={() => void change(() => onRemove(member.user_id))}
                  >
                    <Trash2 />
                    {t("team.remove")}
                  </Button>
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ManagerNewPropertyScreen({
  onBack,
  onImportUrl,
  onPasteText,
  onManual,
}: {
  onBack?: () => void;
  onImportUrl: () => void;
  onPasteText: () => void;
  onManual: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="py-4 @sm:py-6">
      <BackButton label={t("app.myProperties")} onBack={onBack} />
      <PageHeading title={t("app.addTitle")} />
      <ManagerNewPropertyOptions
        onImportUrl={onImportUrl}
        onPasteText={onPasteText}
        onManual={onManual}
      />
    </div>
  );
}

export function ManagerNewPropertyOptions({
  onImportUrl,
  onPasteText,
  onManual,
}: {
  onImportUrl: () => void;
  onPasteText: () => void;
  onManual: () => void;
}) {
  const { t } = useI18n();
  const options = [
    {
      icon: "🔗",
      title: t("app.importUrl"),
      description: t("app.importUrlD"),
      onClick: onImportUrl,
      recommended: true,
    },
    {
      icon: "📝",
      title: t("app.paste"),
      description: t("app.pasteD"),
      onClick: onPasteText,
    },
    {
      icon: "✏️",
      title: t("app.manual"),
      description: t("app.manualD"),
      onClick: onManual,
    },
  ];

  return (
    <div className="mt-6 grid gap-3 @lg:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.title}
          type="button"
          onClick={option.onClick}
          className={`surface relative min-h-40 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${
            option.recommended ? "border-2 border-primary" : ""
          }`}
        >
          {option.recommended && (
            <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {t("app.recommended")}
            </span>
          )}
          <span className="text-3xl">{option.icon}</span>
          <h2 className="mt-3 text-xl font-semibold">{option.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}
