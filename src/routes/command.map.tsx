import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/map")({
  head: () => ({
    meta: [
      { title: "Live Operations Map · PRAGATI" },
      { name: "description", content: "Interactive simulated GIS map of incidents, hospitals, resources, relief centres and road status." },
      { property: "og:title", content: "Live Operations Map · PRAGATI" },
      { property: "og:description", content: "Interactive simulated GIS map of incidents, hospitals, resources, relief centres and road status." },
    ],
  }),
  component: CommandMap,
});

function CommandMap() {
  return (
    <AppShell role="government" title="Live Operations Map">
      <MapCanvas className="min-h-[70vh]" />
    </AppShell>
  );
}
