import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/citizen/safe-route")({
  head: () => ({
    meta: [
      { title: "Safe Route · PRAGATI" },
      { name: "description", content: "Compare fastest, safest and emergency routes based on simulated flood and closure risk." },
      { property: "og:title", content: "Safe Route · PRAGATI" },
      { property: "og:description", content: "Compare fastest, safest and emergency routes based on simulated flood and closure risk." },
    ],
  }),
  component: CitizenRoute,
});

function CitizenRoute() {
  return (
    <AppShell role="citizen" title="Safe Route">
      <S.RoutePlanner />
    </AppShell>
  );
}
