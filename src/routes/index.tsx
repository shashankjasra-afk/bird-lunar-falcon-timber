import { createFileRoute } from "@tanstack/react-router";
import { QuotesWorkspace } from "@/components/dealflow/quotes";
import { Shell } from "@/components/dealflow/shell";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <Shell>
      <QuotesWorkspace />
    </Shell>
  );
}
