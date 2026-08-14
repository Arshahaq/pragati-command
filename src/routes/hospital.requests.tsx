import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/hospital/requests")({
  head: () => ({
    meta: [
      { title: "Emergency Requests · PRAGATI" },
      { name: "description", content: "Incoming simulated casualties routed to this facility." },
      { property: "og:title", content: "Emergency Requests · PRAGATI" },
      { property: "og:description", content: "Incoming simulated casualties routed to this facility." },
    ],
  }),
  component: HospitalRequests,
});

function HospitalRequests() {
  return (
    <AppShell role="hospital" title="Emergency Requests">
      <S.HospitalConsole view="requests" />
    </AppShell>
  );
}
