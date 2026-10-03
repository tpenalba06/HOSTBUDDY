import { OfflineSaveButton } from "@/components/guest/OfflineSaveButton";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPublicGuide } from "@/lib/data/public-guide.functions";
import { useI18n } from "@/lib/i18n";
import { GuideView } from "@/components/guest/GuideView";
import { MessageDrawer, OrderDrawer, FeedbackDrawer } from "@/components/guest/GuestActions";
export const Route = createFileRoute("/l/$slug")({
  loader: async ({ params }) => {
    const guide = await getPublicGuide({ data: { slug: params.slug } });
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — HostBuddy` : "Guide unavailable — HostBuddy";
    const desc = loaderData ? `Guest guide for ${loaderData.name}.` : "This guide is unavailable.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: Unavailable,
  errorComponent: Unavailable,
  component: GuestPage,
});
function Unavailable() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-md px-5 py-16 text-center">
      <span className="text-5xl">🏡</span>
      <h1 className="mt-4 text-3xl font-semibold">{t("guest.unavailable")}</h1>
      <p className="mt-3 text-lg">{t("guest.unavailableD")}</p>
      <Link to="/" className="btn btn-secondary mt-8">
        {t("guest.discover")}
      </Link>
    </main>
  );
}
function GuestPage() {
  const guide = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [messageOpen, setMessageOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  return (
    <div className="hb-guide">
      <GuideView
        guide={guide}
        offlineAction={<OfflineSaveButton guide={guide} slug={slug} />}
        onRequest={setServiceId}
        onMessage={() => setMessageOpen(true)}
        onFeedback={() => setFeedbackOpen(true)}
      />
      {messageOpen && <MessageDrawer slug={slug} onClose={() => setMessageOpen(false)} />}
      {feedbackOpen && <FeedbackDrawer slug={slug} onClose={() => setFeedbackOpen(false)} />}
      {serviceId && (
        <OrderDrawer
          slug={slug}
          service={guide.services?.find((item) => item.id === serviceId)}
          onClose={() => setServiceId(null)}
        />
      )}
    </div>
  );
}
