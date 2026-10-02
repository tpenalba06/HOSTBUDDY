import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { getConversation, sendManagerReply, setConversationStatus } from "@/lib/data/messages";

import { ManagerConversationScreen } from "@/components/app/ManagerConversationScreen";

const threadQuery = (id: string) =>
  queryOptions({ queryKey: ["conversation", id], queryFn: () => getConversation(id) });
export const Route = createFileRoute("/_authenticated/app/messages/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — HostBuddy" },
      { name: "description", content: "Répondre à un voyageur." },
      { property: "og:title", content: "Conversation — HostBuddy" },
      { property: "og:description", content: "Répondre à un voyageur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(threadQuery(params.id));
    if (!d) throw notFound();
  },
  pendingComponent: Loading,
  errorComponent: FriendlyError,
  notFoundComponent: () => <FriendlyError message="Cette conversation est introuvable." />,
  component: ThreadPage,
});
function ThreadPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data } = useSuspenseQuery(threadQuery(id));
  if (!data) return null;
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["conversation", id] });
    await qc.invalidateQueries({ queryKey: ["conversations"] });
  };
  return (
    <ManagerConversationScreen
      key={id}
      conversation={{ ...data.conversation, messages: data.messages }}
      onBack={() => nav({ to: "/app/messages" })}
      onSend={async (body) => {
        await sendManagerReply(id, body);
        await refresh();
      }}
      onStatusChange={async (status) => {
        await setConversationStatus(id, status);
        await refresh();
      }}
    />
  );
}
