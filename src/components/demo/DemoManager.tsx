import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ManagerShell, type ManagerArea } from "@/components/app/ManagerShell";
import {
  ManagerConnectionsScreen,
  ManagerDashboardScreen,
  ManagerFeedbackScreen,
  ManagerMessagesScreen,
  ManagerNewPropertyScreen,
  ManagerOrdersScreen,
  ManagerPropertiesScreen,
  ManagerTeamScreen,
} from "@/components/app/ManagerScreens";
import { ImportReview } from "@/components/app/ImportReview";
import { ManagerConversationScreen } from "@/components/app/ManagerConversationScreen";
import { QrCard } from "@/components/app/QrCard";
import { rulesExtractor } from "@/lib/import-engine/rules-extractor";
import { getImportUrlIssue, normalizeUrl } from "@/lib/import-engine/url-adapters";
import { demoImportFromAirbnbUrl } from "@/lib/import-engine/url-import.functions";
import { DemoPropertyEditor } from "./DemoPropertyEditor";
import { createDemoProperty, type DemoProperty } from "./demo-property";
import { villaMareOperations } from "./villa-mare-fixture";
import type { ExtractionResult } from "@/lib/import-engine/types";
import { useI18n } from "@/lib/i18n";

type DemoArea = ManagerArea | "editor";
type NewMode = "options" | "text" | "url" | "manual";

export function DemoManager({
  villa,
  onVillaChange,
  onPreview,
}: {
  villa: DemoProperty;
  onVillaChange: (update: (current: DemoProperty) => DemoProperty) => void;
  onPreview: () => void;
}) {
  const { t } = useI18n();
  const [area, setArea] = useState<DemoArea>("properties");
  const [previewProperty, setPreviewProperty] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("demo-villa-mare");
  const [properties, setProperties] = useState<DemoProperty[]>(() => {
    return [
      villa,
      {
        ...createDemoProperty("demo-maison-oliviers", {
          propertyName: "Maison Oliviers",
          fields: [],
        }),
        location: "Porto-Vecchio",
        coverUrl: "/demo-guide/pool.webp",
      },
      {
        ...createDemoProperty("demo-appartement-centre", {
          propertyName: "Appartement Centre",
          fields: [],
        }),
        location: "Bordeaux",
        coverUrl: "/hostbuddy-media/apartment.webp",
      },
    ];
  });
  const currentProperties = useMemo(
    () => properties.map((property) => (property.id === villa.id ? villa : property)),
    [properties, villa],
  );
  const propertyForEditor = currentProperties.find((property) => property.id === selectedProperty);
  const [initialOperations] = useState(() => villaMareOperations(villa));
  const [orders, setOrders] = useState(initialOperations.orders);
  const [conversations, setConversations] = useState(initialOperations.conversations);
  const [feedback, setFeedback] = useState(initialOperations.feedback);
  const [team, setTeam] = useState(initialOperations.team);
  const [openConversation, setOpenConversation] = useState<string | null>(null);
  const [newMode, setNewMode] = useState<NewMode>("options");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [manualName, setManualName] = useState("");
  const [candidate, setCandidate] = useState<ExtractionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const metrics = useMemo(
    () => ({
      properties: currentProperties.length,
      published: currentProperties.filter((property) => property.status === "published").length,
      unread: conversations.filter((conversation) =>
        conversation.messages.some(
          (message) => message.sender_type === "guest" && !message.read_at,
        ),
      ).length,
      todayOrders: orders.filter(
        (order) =>
          order.status !== "completed" &&
          order.status !== "cancelled" &&
          new Date(order.requested_for ?? order.created_at).getTime() >=
            new Date().setHours(0, 0, 0, 0),
      ).length,
      requestTotal: orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total_amount), 0),
      recentFeedback: feedback.map((item) => ({
        id: item.id,
        rating: item.rating,
        created_at: item.created_at,
      })),
    }),
    [conversations, feedback, orders, currentProperties],
  );

  const navigate = (next: ManagerArea) => {
    setArea(next);
    setOpenConversation(null);
    if (next !== "new") resetNewFlow();
  };

  const resetNewFlow = () => {
    setNewMode("options");
    setCandidate(null);
    setBusy(false);
    setError("");
    setText("");
    setUrl("");
    setManualName("");
  };

  const completeDemoImport = (result: ExtractionResult) => {
    const property = createDemoProperty(
      `demo-${crypto.randomUUID()}`,
      result,
      newMode === "text" ? "text" : newMode === "url" ? "airbnb" : "manual",
    );
    setProperties((items) => [property, ...items]);
    setCandidate(null);
    setNewMode("options");
    setArea("properties");
  };

  let screen: ReactNode;

  if (area === "editor" && propertyForEditor) {
    screen = (
      <DemoPropertyEditor
        key={propertyForEditor.id}
        property={propertyForEditor}
        initialPreview={previewProperty}
        onChange={(update) => {
          if (selectedProperty === villa.id) onVillaChange(update);
          else
            setProperties((items) =>
              items.map((item) => (item.id === selectedProperty ? update(item) : item)),
            );
        }}
        onBack={() => setArea("properties")}
        onPreview={onPreview}
      />
    );
  } else if (area === "properties") {
    screen = (
      <ManagerPropertiesScreen
        properties={currentProperties}
        onAdd={() => setArea("new")}
        onEdit={(id) => {
          setPreviewProperty(false);
          setSelectedProperty(id);
          setArea("editor");
        }}
        onView={(slug) => {
          const property = currentProperties.find((item) => item.slug === slug);
          if (property?.id === "demo-villa-mare") onPreview();
          else if (property) {
            setPreviewProperty(true);
            setSelectedProperty(property.id);
            setArea("editor");
          }
        }}
        renderQr={(property) => <QrCard slug={property.slug} name={property.name} path="/demo" />}
      />
    );
  } else if (area === "dashboard") {
    screen = (
      <ManagerDashboardScreen
        orgName="Conciergerie Azur"
        data={metrics}
        onAdd={() => setArea("new")}
        onOrders={() => setArea("orders")}
      />
    );
  } else if (area === "orders") {
    screen = (
      <ManagerOrdersScreen
        orders={orders}
        onBack={() => setArea("properties")}
        onStatusChange={(id, status) =>
          setOrders((items) => items.map((item) => (item.id === id ? { ...item, status } : item)))
        }
      />
    );
  } else if (area === "messages") {
    const conversation = conversations.find((item) => item.id === openConversation);
    screen = conversation ? (
      <ManagerConversationScreen
        key={conversation.id}
        conversation={conversation}
        onBack={() => setOpenConversation(null)}
        onStatusChange={(status) =>
          setConversations((items) =>
            items.map((item) => (item.id === conversation.id ? { ...item, status } : item)),
          )
        }
        onSend={(body) => {
          setConversations((items) =>
            items.map((item) =>
              item.id === conversation.id
                ? {
                    ...item,
                    last_message_at: new Date().toISOString(),
                    messages: [
                      ...item.messages,
                      {
                        id: `demo-message-${Date.now()}`,
                        sender_type: "manager",
                        read_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        body,
                      },
                    ],
                  }
                : item,
            ),
          );
        }}
      />
    ) : (
      <ManagerMessagesScreen
        conversations={conversations}
        onBack={() => setArea("properties")}
        onOpen={(id) => {
          setOpenConversation(id);
          setConversations((items) =>
            items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    messages: item.messages.map((message) =>
                      message.sender_type === "guest"
                        ? { ...message, read_at: message.read_at ?? new Date().toISOString() }
                        : message,
                    ),
                  }
                : item,
            ),
          );
        }}
      />
    );
  } else if (area === "feedback") {
    screen = (
      <ManagerFeedbackScreen
        feedback={feedback}
        onBack={() => setArea("properties")}
        onMarkRead={(id) =>
          setFeedback((items) =>
            items.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
          )
        }
      />
    );
  } else if (area === "connections") {
    screen = <ManagerConnectionsScreen onBack={() => setArea("properties")} />;
  } else if (area === "payments") {
    screen = (
      <section className="surface p-6">
        <h1 className="text-3xl">{t("nav.payments")}</h1>
        <p className="mt-4 text-muted-foreground">{t("payments.notConfigured")}</p>
      </section>
    );
  } else if (area === "team") {
    screen = (
      <ManagerTeamScreen
        members={team}
        onBack={() => setArea("properties")}
        onInvite={(email, role) =>
          setTeam((items) => [...items, { user_id: `demo-team-${Date.now()}`, email, role }])
        }
        onRoleChange={(userId, role) =>
          setTeam((items) =>
            items.map((item) => (item.user_id === userId ? { ...item, role } : item)),
          )
        }
        onRemove={(userId) => setTeam((items) => items.filter((item) => item.user_id !== userId))}
      />
    );
  } else {
    screen = renderNewProperty();
  }

  function renderNewProperty() {
    if (candidate) {
      return (
        <ImportReview
          value={candidate}
          onChange={setCandidate}
          busy={busy}
          onBack={() => setCandidate(null)}
          onConfirm={() => completeDemoImport(candidate)}
        />
      );
    }

    if (newMode === "options") {
      return (
        <ManagerNewPropertyScreen
          onBack={() => setArea("properties")}
          onImportUrl={() => setNewMode("url")}
          onPasteText={() => setNewMode("text")}
          onManual={() => setNewMode("manual")}
        />
      );
    }

    if (newMode === "text") {
      return (
        <DemoImportFrame
          title={t("import.textTitle")}
          description={t("import.textHelp")}
          onBack={() => resetNewFlow()}
          error={error}
        >
          <textarea
            className="field min-h-64 text-base"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Arrivée à 16h, Wi-Fi, parking, départ, contact…"
          />
          <Button
            className="mt-4 min-h-12 w-full"
            disabled={!text.trim() || busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setCandidate(await rulesExtractor.extract(text));
              } catch {
                setError("Le texte n’a pas pu être analysé.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Analyse…" : t("import.textAction")}
          </Button>
        </DemoImportFrame>
      );
    }

    if (newMode === "url") {
      return (
        <DemoImportFrame
          title={t("import.urlTitle")}
          description="Collez un lien Airbnb : la démo utilise le même moteur d’import que l’application."
          onBack={() => resetNewFlow()}
          error={error}
        >
          <input
            className="field text-base"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.airbnb.fr/rooms/..."
          />
          <Button
            className="mt-4 min-h-12 w-full"
            disabled={!url.trim() || busy}
            onClick={async () => {
              setError("");
              const issue = getImportUrlIssue(url);
              if (issue === "airbnb_search_without_single_listing") {
                setError("Cette page Airbnb ne permet pas d’identifier un logement unique.");
                return;
              }
              const clean = normalizeUrl(url);
              if (!clean) {
                setError("Ce lien ne semble pas valide.");
                return;
              }
              let host = "";
              try {
                host = new URL(clean).hostname.toLowerCase();
              } catch {
                setError("Ce lien ne semble pas valide.");
                return;
              }
              if (!/(^|\.)airbnb\./i.test(host)) {
                setError("La démo URL est actuellement limitée à Airbnb.");
                return;
              }
              setBusy(true);
              try {
                const outcome = await demoImportFromAirbnbUrl({ data: { url: clean } });
                if (!outcome.ok) {
                  setError(
                    outcome.reason === "blocked"
                      ? "Airbnb bloque temporairement la lecture automatique de cette annonce."
                      : "HostBuddy n’a pas pu récupérer assez d’informations depuis cette annonce.",
                  );
                  return;
                }
                setCandidate(outcome.result);
              } catch {
                setError("L’import n’a pas abouti. Essayez avec le texte de l’annonce.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Analyse…" : t("import.action")}
          </Button>
        </DemoImportFrame>
      );
    }

    return (
      <DemoImportFrame
        title={t("import.manualTitle")}
        description="Créez un logement manuellement comme dans le vrai espace gestionnaire."
        onBack={() => resetNewFlow()}
        error={error}
      >
        <input
          className="field text-lg"
          value={manualName}
          onChange={(event) => setManualName(event.target.value)}
          placeholder="Ex. : Villa des Oliviers"
        />
        <Button
          className="mt-4 min-h-12 w-full"
          disabled={!manualName.trim()}
          onClick={() => completeDemoImport({ propertyName: manualName.trim(), fields: [] })}
        >
          {t("common.continue")}
        </Button>
      </DemoImportFrame>
    );
  }

  return (
    <ManagerShell
      embedded
      orgName="Conciergerie Azur"
      role="owner"
      active={area === "editor" ? "properties" : area}
      viewKey={`${area}:${selectedProperty}:${openConversation ?? ""}:${newMode}`}
      onNavigate={navigate}
    >
      {screen}
    </ManagerShell>
  );
}

function DemoImportFrame({
  title,
  description,
  onBack,
  error,
  children,
}: {
  title: string;
  description: string;
  onBack: () => void;
  error: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="py-4 @sm:py-6">
      <Button variant="ghost" className="mb-3 min-h-12 px-0 text-primary" onClick={onBack}>
        ← {t("common.back")}
      </Button>
      <p className="font-bold text-primary">HostBuddy</p>
      <h1 className="mt-1 text-3xl font-semibold @sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      <div className="mt-6">
        {children}
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-warning-soft p-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
