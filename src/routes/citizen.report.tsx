import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/citizen/report")({
  head: () => ({
    meta: [
      { title: "Report an Incident · PRAGATI" },
      { name: "description", content: "Report a disaster incident; it enters the command centre incident queue immediately." },
      { property: "og:title", content: "Report an Incident · PRAGATI" },
      { property: "og:description", content: "Report a disaster incident; it enters the command centre incident queue immediately." },
    ],
  }),
  component: CitizenReport,
});

function CitizenReport() {
  return (
    <AppShell role="citizen" title="Report an Incident">
      <S.HelpRequestForm />
    </AppShell>
  );
}
