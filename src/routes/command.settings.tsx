import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Integrations · PRAGATI" },
      { name: "description", content: "Service integration registry showing mocked providers and required environment variables." },
      { property: "og:title", content: "Settings & Integrations · PRAGATI" },
      { property: "og:description", content: "Service integration registry showing mocked providers and required environment variables." },
    ],
  }),
  component: CommandSettings,
});

function CommandSettings() {
  return (
    <AppShell role="government" title="Settings & Integrations">
      <S.ServiceRegistryView />
    </AppShell>
  );
}
