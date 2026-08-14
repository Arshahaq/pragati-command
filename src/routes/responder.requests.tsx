import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/responder/requests")({
  head: () => ({
    meta: [
      { title: "Emergency Requests · PRAGATI" },
      { name: "description", content: "Prioritised emergency requests awaiting field response." },
      { property: "og:title", content: "Emergency Requests · PRAGATI" },
      { property: "og:description", content: "Prioritised emergency requests awaiting field response." },
    ],
  }),
  component: ResponderRequests,
});

function ResponderRequests() {
  return (
    <AppShell role="responder" title="Emergency Requests">
      <S.PriorityQueue />
    </AppShell>
  );
}
