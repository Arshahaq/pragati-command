import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/simulator")({
  head: () => ({
    meta: [
      { title: "Scenario Simulator · PRAGATI" },
      { name: "description", content: "Activate the Bengaluru Flood scenario and apply what-if overrides across the platform." },
      { property: "og:title", content: "Scenario Simulator · PRAGATI" },
      { property: "og:description", content: "Activate the Bengaluru Flood scenario and apply what-if overrides across the platform." },
    ],
  }),
  component: CommandSim,
});

function CommandSim() {
  return (
    <AppShell role="government" title="Scenario Simulator">
      <S.ScenarioSimulator />
    </AppShell>
  );
}
