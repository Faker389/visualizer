"use client";

import { useState } from "react";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { roleInfo, type TeamMember, type TeamRole } from "@/components/settings-store";
import { cn } from "@/lib/cn";

const assignable: TeamRole[] = ["admin", "editor", "viewer"];
const label = (r: TeamRole) => r.charAt(0).toUpperCase() + r.slice(1);
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function TeamSettings({ team, onChange, seatLimit }: { team: TeamMember[]; onChange: (team: TeamMember[]) => void; seatLimit: number | null }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [error, setError] = useState("");
  const full = seatLimit !== null && team.length >= seatLimit;

  const invite = () => {
    const address = email.trim().toLowerCase();
    if (!emailOk(address)) return setError("Enter a valid email address");
    if (team.some((m) => m.email.toLowerCase() === address)) return setError("This person is already on the team");
    onChange([...team, { id: crypto.randomUUID(), email: address, name: "", role, status: "invited" }]);
    setEmail("");
    setError("");
  };

  return (
    <div>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {team.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {(m.name || m.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {m.name || m.email}
                {m.status === "invited" && (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">Invited</span>
                )}
              </p>
              {m.name && <p className="truncate text-xs text-slate-500">{m.email}</p>}
            </div>
            {m.role === "owner" ? (
              <span className="text-sm font-medium text-slate-500">Owner</span>
            ) : (
              <>
                <select
                  value={m.role}
                  aria-label={`Role for ${m.email}`}
                  title={roleInfo[m.role]}
                  onChange={(e) => onChange(team.map((x) => (x.id === m.id ? { ...x, role: e.target.value as TeamRole } : x)))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {assignable.map((r) => (
                    <option key={r} value={r}>
                      {label(r)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onChange(team.filter((x) => x.id !== m.id))}
                  aria-label={m.status === "invited" ? `Cancel invite for ${m.email}` : `Remove ${m.name || m.email}`}
                  className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex flex-wrap items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          invite();
        }}
      >
        <div className="relative min-w-[14rem] flex-1">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="colleague@company.com"
            aria-label="Email to invite"
            aria-invalid={!!error}
            disabled={full}
            className={cn(
              "h-10 w-full rounded-xl border bg-white pl-10 pr-3.5 text-sm shadow-sm focus:outline-none focus:ring-4 disabled:bg-slate-50",
              error ? "border-rose-400 focus:ring-rose-500/15" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/15",
            )}
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
          aria-label="Role for new member"
          disabled={full}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
        >
          {assignable.map((r) => (
            <option key={r} value={r}>
              {label(r)}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" className="h-10" disabled={full}>
          <UserPlus className="size-4" aria-hidden /> Invite
        </Button>
      </form>
      <p className={cn("mt-2 text-xs", error ? "text-rose-600" : "text-slate-500")}>
        {error || (full ? `Your plan includes ${seatLimit} seats. Upgrade to invite more people.` : `${label(role)}: ${roleInfo[role].toLowerCase()}.`)}
      </p>
    </div>
  );
}
