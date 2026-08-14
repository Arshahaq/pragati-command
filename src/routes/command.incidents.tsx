import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/incidents")({
  head: () => ({
    meta: [
      { title: "Incident Management · PRAGATI" },
      { name: "description", content: "Filterable incident register with detailed incident drawer, assignment and timeline." },
      { property: "og:title", content: "Incident Management · PRAGATI" },
      { property: "og:description", content: "Filterable incident register with detailed incident drawer, assignment and timeline." },
    ],
  }),
  component: CommandIncidents,
});

function CommandIncidents() {
  return (
    <AppShell role="government" title="Incident Management">
      <S.IncidentsView />
    </AppShell>
  );
}
