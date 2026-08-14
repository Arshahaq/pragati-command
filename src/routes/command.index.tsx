import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/")({
  head: () => ({
    meta: [
      { title: "Command Center Overview · PRAGATI" },
      { name: "description", content: "Live simulated operational picture: KPIs, disaster map, AI guidance and incident priorities." },
      { property: "og:title", content: "Command Center Overview · PRAGATI" },
      { property: "og:description", content: "Live simulated operational picture: KPIs, disaster map, AI guidance and incident priorities." },
    ],
  }),
  component: CommandOverview,
});

function CommandOverview() {
  return (
    <AppShell role="government" title="Command Center Overview">
      <S.OverviewGrid />
    </AppShell>
  );
}
