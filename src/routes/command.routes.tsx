import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/routes")({
  head: () => ({
    meta: [
      { title: "Route Planning · PRAGATI" },
      { name: "description", content: "Hazard-weighted fastest, safest and emergency route options on the simulated network." },
      { property: "og:title", content: "Route Planning · PRAGATI" },
      { property: "og:description", content: "Hazard-weighted fastest, safest and emergency route options on the simulated network." },
    ],
  }),
  component: CommandRoutes,
});

function CommandRoutes() {
  return (
    <AppShell role="government" title="Route Planning">
      <S.RoutePlanner />
    </AppShell>
  );
}
