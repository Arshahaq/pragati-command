import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/drones")({
  head: () => ({
    meta: [
      { title: "Drone & Field Intelligence · PRAGATI" },
      { name: "description", content: "Simulated drone missions with mock computer-vision detection results." },
      { property: "og:title", content: "Drone & Field Intelligence · PRAGATI" },
      { property: "og:description", content: "Simulated drone missions with mock computer-vision detection results." },
    ],
  }),
  component: CommandDrones,
});

function CommandDrones() {
  return (
    <AppShell role="government" title="Drone & Field Intelligence">
      <S.DronesView />
    </AppShell>
  );
}
