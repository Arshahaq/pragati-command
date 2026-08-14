import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts Center · PRAGATI" },
      { name: "description", content: "Critical, warning and information alerts with acknowledgement." },
      { property: "og:title", content: "Alerts Center · PRAGATI" },
      { property: "og:description", content: "Critical, warning and information alerts with acknowledgement." },
    ],
  }),
  component: CommandAlerts,
});

function CommandAlerts() {
  return (
    <AppShell role="government" title="Alerts Center">
      <S.AlertsView />
    </AppShell>
  );
}
