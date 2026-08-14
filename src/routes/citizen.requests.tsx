import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/citizen/requests")({
  head: () => ({
    meta: [
      { title: "My Requests · PRAGATI" },
      { name: "description", content: "Track submitted emergency requests, assigned teams and status timeline." },
      { property: "og:title", content: "My Requests · PRAGATI" },
      { property: "og:description", content: "Track submitted emergency requests, assigned teams and status timeline." },
    ],
  }),
  component: CitizenRequests,
});

function CitizenRequests() {
  return (
    <AppShell role="citizen" title="My Requests">
      <S.MyRequests />
    </AppShell>
  );
}
