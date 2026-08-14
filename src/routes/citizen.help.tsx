import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/citizen/help")({
  head: () => ({
    meta: [
      { title: "Find Help · PRAGATI" },
      { name: "description", content: "Submit an emergency request and see the safest recommended hospital." },
      { property: "og:title", content: "Find Help · PRAGATI" },
      { property: "og:description", content: "Submit an emergency request and see the safest recommended hospital." },
    ],
  }),
  component: CitizenHelp,
});

function CitizenHelp() {
  return (
    <AppShell role="citizen" title="Find Help">
      <div className="grid gap-4 lg:grid-cols-2"><S.HelpRequestForm /><S.SafeHospitalList compact /></div>
    </AppShell>
  );
}
