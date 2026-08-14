import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/resources")({
  head: () => ({
    meta: [
      { title: "Emergency Resources · PRAGATI" },
      { name: "description", content: "Ambulances, fire units, rescue teams, boats, drones and medical teams with live status." },
      { property: "og:title", content: "Emergency Resources · PRAGATI" },
      { property: "og:description", content: "Ambulances, fire units, rescue teams, boats, drones and medical teams with live status." },
    ],
  }),
  component: CommandResources,
});

function CommandResources() {
  return (
    <AppShell role="government" title="Emergency Resources">
      <S.ResourcesView />
    </AppShell>
  );
}
