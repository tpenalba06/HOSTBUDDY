import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loading, FriendlyError } from "@/components/app/Friendly";
import { useOrg, orgQuery } from "@/components/app/useOrg";
import { listFeedback, markFeedbackRead } from "@/lib/data/operations";
import { ManagerFeedbackScreen } from "@/components/app/ManagerScreens";

const feedbackQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["feedback", orgId],
    queryFn: () => listFeedback(orgId),
    staleTime: 15_000,
  });

export const Route = createFileRoute("/_authenticated/app/feedback")({
  head: () => ({
    meta: [
      { title: "Retours voyageurs — HostBuddy" },
      { name: "description", content: "Retours privés de vos voyageurs." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    const org = await context.queryClient.ensureQueryData(orgQuery);
    await context.queryClient.ensureQueryData(feedbackQuery(org.id));
  },
  pendingComponent: Loading,
  errorComponent: FriendlyError,
  component: FeedbackPage,
});

function FeedbackPage() {
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(feedbackQuery(org.id));
  const mark = useMutation({
    mutationFn: markFeedbackRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback", org.id] }),
  });

  return (
    <ManagerFeedbackScreen
      feedback={data}
      onBack={() => nav({ to: "/app" })}
      onMarkRead={(id) => mark.mutate(id)}
    />
  );
}
