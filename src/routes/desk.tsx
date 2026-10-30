import { createFileRoute } from "@tanstack/react-router";
import { DeskWorkspace } from "@/components/dealflow/desk";
import { Shell } from "@/components/dealflow/shell";

export const Route = createFileRoute("/desk")({
  component: DeskPage,
});

function DeskPage() {
  return (
    <Shell>
      <DeskWorkspace />
    </Shell>
  );
}
