import { useI18n } from "@/lib/i18n";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { getTeam, inviteTeamMember, changeTeamRole, removeTeamMember } from "@/lib/team.functions";
import { ManagerTeamScreen, type ManagerTeamMember } from "@/components/app/ManagerScreens";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({
    meta: [
      { title: "Équipe — HostBuddy" },
      { name: "description", content: "Membres et rôles de votre équipe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    const org = await context.queryClient.ensureQueryData(orgQuery);
    if (org.role !== "owner") throw redirect({ to: "/app" });
  },
  component: TeamPage,
});

function TeamPage() {
  const { t } = useI18n();
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["team", org.id],
    queryFn: () => getTeam({ data: { organizationId: org.id } }) as Promise<ManagerTeamMember[]>,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["team", org.id] });

  if (query.isPending) return <p role="status">{t("common.loading")}</p>;
  if (query.isError)
    return (
      <div role="alert" className="space-y-3">
        <p>{t("team.loadFailed")}</p>
        <button type="button" className="btn-secondary" onClick={() => void query.refetch()}>
          {t("common.retry")}
        </button>
      </div>
    );

  return (
    <ManagerTeamScreen
      members={query.data ?? []}
      onBack={() => nav({ to: "/app" })}
      onInvite={async (email, role) => {
        await inviteTeamMember({ data: { organizationId: org.id, email, role } });
        await refresh();
      }}
      onRoleChange={async (userId, role) => {
        await changeTeamRole({
          data: { organizationId: org.id, userId, role },
        });
        await refresh();
      }}
      onRemove={async (userId) => {
        if (!window.confirm(t("team.removeConfirm"))) return;
        await removeTeamMember({ data: { organizationId: org.id, userId } });
        await refresh();
      }}
    />
  );
}
