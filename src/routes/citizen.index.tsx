import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/citizen/")({
  head: () => ({
    meta: [
      { title: "How can PRAGATI help you? · PRAGATI" },
      { name: "description", content: "Citizen portal home with emergency actions, local disaster status and nearby resources." },
      { property: "og:title", content: "How can PRAGATI help you? · PRAGATI" },
      { property: "og:description", content: "Citizen portal home with emergency actions, local disaster status and nearby resources." },
    ],
  }),
  component: CitizenHome,
});

function CitizenHome() {
  return (
    <AppShell role="citizen" title="How can PRAGATI help you?">
      <S.CitizenHome />
    </AppShell>
  );
}
