import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/responder/routes")({
  head: () => ({
    meta: [
      { title: "Field Routes · PRAGATI" },
      { name: "description", content: "Safe corridors to hospitals and relief centres for field units." },
      { property: "og:title", content: "Field Routes · PRAGATI" },
      { property: "og:description", content: "Safe corridors to hospitals and relief centres for field units." },
    ],
  }),
  component: ResponderRoutes,
});

function ResponderRoutes() {
  return (
    <AppShell role="responder" title="Field Routes">
      <S.RoutePlanner />
    </AppShell>
  );
}
