import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/responder/resources")({
  head: () => ({
    meta: [
      { title: "Assigned Resources · PRAGATI" },
      { name: "description", content: "Resource availability and assignment for field operations." },
      { property: "og:title", content: "Assigned Resources · PRAGATI" },
      { property: "og:description", content: "Resource availability and assignment for field operations." },
    ],
  }),
  component: ResponderResources,
});

function ResponderResources() {
  return (
    <AppShell role="responder" title="Assigned Resources">
      <S.ResourcesView />
    </AppShell>
  );
}
