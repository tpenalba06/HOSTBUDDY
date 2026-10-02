import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { listConversations } from "@/lib/data/messages";
import { ManagerMessagesScreen } from "@/components/app/ManagerScreens";

const conversationsQuery = (orgId: string) =>
  queryOptions({ queryKey: ["conversations", orgId], queryFn: () => listConversations(orgId) });

export const Route = createFileRoute("/_authenticated/app/messages")({
  head: () => ({
    meta: [
      { title: "Messages — HostBuddy" },
      { name: "description", content: "Messages reçus depuis vos guides voyageurs." },
      { property: "og:title", content: "Messages — HostBuddy" },
      { property: "og:description", content: "Messages reçus depuis vos guides voyageurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    const org = await context.queryClient.ensureQueryData(orgQuery);
    await context.queryClient.ensureQueryData(conversationsQuery(org.id));
  },
  pendingComponent: Loading,
  errorComponent: FriendlyError,
  component: MessagesPage,
});

function MessagesPage() {
  const org = useOrg();
  const nav = useNavigate();
  const { data } = useSuspenseQuery(conversationsQuery(org.id));

  return (
    <ManagerMessagesScreen
      conversations={data}
      onBack={() => nav({ to: "/app" })}
      onOpen={(id) => nav({ to: "/app/messages/$id", params: { id } })}
    />
  );
}
