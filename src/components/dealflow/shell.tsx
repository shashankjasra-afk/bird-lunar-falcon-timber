import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Activity, Bot, GitBranch, Inbox, ListChecks, ScrollText, SlidersHorizontal } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useDealflow } from "@/lib/dealflow/store";
import type { Role } from "@/lib/dealflow/types";

const NAV = [
  { to: "/", label: "Quotes", icon: ScrollText, search: undefined },
  { to: "/desk", label: "Approvals", icon: Inbox, search: undefined },
  { to: "/admin", label: "Golden set", icon: ListChecks, search: { tab: "golden" as const } },
  { to: "/admin", label: "Policy", icon: SlidersHorizontal, search: { tab: "book" as const } },
  { to: "/admin", label: "Agents", icon: Bot, search: { tab: "agents" as const } },
  { to: "/admin", label: "Flow", icon: GitBranch, search: { tab: "flow" as const } },
  { to: "/admin", label: "Langfuse", icon: Activity, search: { tab: "langfuse" as const } },
] as const;

const ROLES: { id: Role; label: string; href: "/" | "/desk" | "/admin" }[] = [
  { id: "seller", label: "Jordan Lee · Seller", href: "/" },
  { id: "desk", label: "Alex Okonkwo · Deal Desk", href: "/desk" },
  { id: "admin", label: "RevOps · Admin", href: "/admin" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const role = useDealflow((state) => state.role);
  const companyName = useDealflow((state) => state.settings.companyName);
  const setRole = useDealflow((state) => state.setRole);
  const navigate = useNavigate();

  useEffect(() => {
    void useDealflow.persist.rehydrate();
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-card">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-teal uppercase">
              {companyName} Quote
            </p>
            <p className="font-display text-3xl leading-none text-ink">DealFlow</p>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Three agents own the approval hop. They read the policy book through tools, write one label, and a guardrail checks that a note cannot approve the quote. Your CPQ still owns everything after Approved.
            </p>
          </div>
          <label className="block text-sm sm:min-w-64">
            <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">
              Viewing as
            </span>
            <select
              className="h-11 w-full rounded-md border border-line bg-paper px-3 text-sm"
              value={role}
              onChange={(event) => {
                const next = ROLES.find((item) => item.id === event.target.value);
                if (!next) return;
                setRole(next.id);
                void navigate({
                  to: next.href,
                  search: next.href === "/admin" ? { tab: "golden" } : {},
                });
              }}
            >
              {ROLES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <nav className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-3" aria-label="Workspace">
          {NAV.map((item) => {
            const onAdmin = pathname.startsWith("/admin");
            const currentTab = new URLSearchParams(searchStr).get("tab");
            const active =
              item.label === "Agents"
                ? onAdmin && currentTab === "agents"
                : item.label === "Flow"
                ? onAdmin && currentTab === "flow"
                : item.label === "Golden set"
                  ? onAdmin && (currentTab === "golden" || currentTab === null)
                  : item.label === "Langfuse"
                    ? onAdmin && currentTab === "langfuse"
                    : item.label === "Policy"
                      ? onAdmin &&
                        currentTab !== "langfuse" &&
                        currentTab !== "golden" &&
                        currentTab !== "flow" &&
                        currentTab !== "agents" &&
                        currentTab !== null
                      : item.to === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                search={item.search}
                className={cn(
                  "inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold",
                  active ? "bg-teal text-paper" : "bg-paper text-ink ring-1 ring-line",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}
