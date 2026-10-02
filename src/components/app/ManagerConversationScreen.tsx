import { useId, useState } from "react";
import { ArrowLeft, CheckCircle2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { friendlyMessage } from "@/components/app/Friendly";
import { useI18n } from "@/lib/i18n";
import type { ManagerConversation } from "./ManagerScreens";

export function ManagerConversationScreen({
  conversation,
  onBack,
  onSend,
  onStatusChange,
}: {
  conversation: ManagerConversation & { guest_contact?: string | null };
  onBack: () => void;
  onSend: (body: string) => void | Promise<void>;
  onStatusChange: (status: "open" | "resolved") => void | Promise<void>;
}) {
  const { t } = useI18n();
  const replyId = useId();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="mt-4 flex min-h-96 flex-col">
      <Button
        variant="ghost"
        className="w-fit min-h-12 gap-2 px-0 font-semibold text-primary"
        onClick={onBack}
      >
        <ArrowLeft />
        {t("nav.messages")}
      </Button>
      <header className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{conversation.guest_display_name}</h1>
          <p className="text-sm font-semibold text-success">{conversation.properties?.name}</p>
          {conversation.guest_contact && (
            <p className="text-sm text-muted-foreground">{conversation.guest_contact}</p>
          )}
        </div>
        <Button
          variant="outline"
          className="min-h-12 rounded-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onStatusChange(conversation.status === "open" ? "resolved" : "open");
            } catch (reason) {
              setError(friendlyMessage(reason));
            } finally {
              setBusy(false);
            }
          }}
        >
          {conversation.status === "open" ? (
            <>
              <CheckCircle2 />
              {t("messages.resolve")}
            </>
          ) : (
            <>
              <RotateCcw />
              {t("messages.reopen")}
            </>
          )}
        </Button>
      </header>
      <div className="flex-1 space-y-3 py-5">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-lg p-4 ${message.sender_type === "manager" || message.sender_type === "host" ? "ml-auto bg-primary text-primary-foreground" : "bg-card border"}`}
          >
            <p className="whitespace-pre-wrap">{message.body}</p>
            <p
              className={`mt-1 text-xs ${message.sender_type === "manager" || message.sender_type === "host" ? "text-primary-foreground/80" : "text-muted-foreground"}`}
            >
              {new Date(message.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      <form
        className="sticky bottom-16 grid gap-2 border-t bg-background py-3 @sm:bottom-0 @sm:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setBusy(true);
          setError("");
          try {
            await onSend(body.trim());
            setBody("");
          } catch (err) {
            setError(friendlyMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="sr-only" htmlFor={replyId}>
          {t("messages.reply")}
        </label>
        <textarea
          id={replyId}
          className="field min-h-14 resize-none"
          rows={2}
          maxLength={2000}
          placeholder={t("messages.placeholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button className="min-h-14 rounded-full px-6" disabled={busy || !body.trim()}>
          <Send />
          {t("common.send")}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive @sm:col-span-2">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
