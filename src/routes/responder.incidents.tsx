import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/responder/incidents")({
  head: () => ({
    meta: [
      { title: "Incidents · PRAGATI" },
      { name: "description", content: "Incident queue for field responders." },
      { property: "og:title", content: "Incidents · PRAGATI" },
      { property: "og:description", content: "Incident queue for field responders." },
    ],
  }),
  component: ResponderIncidents,
});

function ResponderIncidents() {
  return (
    <AppShell role="responder" title="Incidents">
      <S.IncidentsView compactFilters />
    </AppShell>
  );
}
