import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/responder/")({
  head: () => ({
    meta: [
      { title: "Active Missions · PRAGATI" },
      { name: "description", content: "Field responder missions with receiving hospital, ETA and status updates." },
      { property: "og:title", content: "Active Missions · PRAGATI" },
      { property: "og:description", content: "Field responder missions with receiving hospital, ETA and status updates." },
    ],
  }),
  component: ResponderHome,
});

function ResponderHome() {
  return (
    <AppShell role="responder" title="Active Missions">
      <S.ResponderMissions />
    </AppShell>
  );
}
