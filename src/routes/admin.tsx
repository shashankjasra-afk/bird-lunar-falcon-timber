import { createFileRoute } from "@tanstack/react-router";
import { AdminWorkspace, type AdminTab } from "@/components/dealflow/admin";
import { Shell } from "@/components/dealflow/shell";

const TABS: AdminTab[] = [
  "golden",
  "harness",
  "input",
  "output",
  "economics",
  "prd",
  "judge",
  "hitl",
  "book",
  "onboard",
  "discount",
  "cash",
  "queues",
  "orch",
  "langfuse",
  "flow",
  "agents",
];

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { tab: AdminTab } => {
    const tab = typeof search.tab === "string" ? search.tab : "";
    return { tab: (TABS as string[]).includes(tab) ? (tab as AdminTab) : "golden" };
  },
  component: AdminPage,
});

function AdminPage() {
  const { tab } = Route.useSearch();
  return (
    <Shell>
      <AdminWorkspace tab={tab} />
    </Shell>
  );
}
