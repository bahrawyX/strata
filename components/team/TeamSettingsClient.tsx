"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  Crown,
  Loader2,
  Mail,
  Plus,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import {
  createTeam,
  inviteToTeam,
  removeMember,
  revokeInvite,
  updateMemberRole,
  type TeamInviteRow,
  type TeamMemberRow,
  type TeamSummary,
} from "@/server/actions/teams";
import type { TeamRole } from "@/lib/validations";
import { cn } from "@/lib/utils";

type Props = {
  teams: TeamSummary[];
  activeTeamId: string | null;
  detail: {
    team: TeamSummary;
    members: TeamMemberRow[];
    invites: TeamInviteRow[];
  } | null;
  detailError: string | null;
};

const ROLE_OPTIONS: { value: Exclude<TeamRole, "owner">; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

export function TeamSettingsClient({
  teams,
  activeTeamId,
  detail,
  detailError,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim() || pending) return;
    setCreateError(null);
    startTransition(async () => {
      const res = await createTeam({ name: newName.trim() });
      if ("error" in res) {
        setCreateError(res.error);
        return;
      }
      setNewName("");
      router.push(`/settings/team?id=${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Team picker + create */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Your teams</span>
          <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px] text-foreground/80">
            {teams.length}
          </span>
        </div>

        {teams.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            You're not in any team yet. Create one below to get started.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {teams.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/settings/team?id=${t.id}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors",
                    activeTeamId === t.id
                      ? "border-[var(--accent)] bg-[var(--accent-muted)] text-foreground"
                      : "border-border bg-card hover:bg-muted/60"
                  )}
                >
                  {t.role === "owner" && (
                    <Crown className="h-3 w-3 text-amber-400" />
                  )}
                  <span>{t.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    · {t.memberCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="New team name"
            aria-label="New team name"
            maxLength={100}
            disabled={pending}
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending || !newName.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground,white)] hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Create
          </button>
        </div>
        {createError && (
          <p className="mt-2 text-[11px] text-destructive">{createError}</p>
        )}
      </div>

      {/* Selected team detail */}
      {detailError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {detailError}
        </div>
      ) : detail ? (
        <TeamDetail detail={detail} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Pick or create a team to manage members.
        </p>
      )}
    </div>
  );
}

function TeamDetail({
  detail,
}: {
  detail: {
    team: TeamSummary;
    members: TeamMemberRow[];
    invites: TeamInviteRow[];
  };
}) {
  const router = useRouter();
  const { team, members, invites } = detail;
  const canManage = team.role === "owner" || team.role === "admin";
  const [pending, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<TeamRole, "owner">>(
    "member"
  );
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleInvite() {
    if (!inviteEmail.trim() || pending) return;
    setInviteError(null);
    startTransition(async () => {
      const res = await inviteToTeam({
        teamId: team.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if ("error" in res) {
        setInviteError(res.error);
        return;
      }
      setInviteEmail("");
      router.refresh();
    });
  }

  // Inline confirm — second click on the same trash icon executes the
  // remove. Native confirm() is visually disconnected from the dark UI.
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);

  function handleRevoke(id: string) {
    setActionError(null);
    startTransition(async () => {
      const res = await revokeInvite(id);
      if ("error" in res) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRemoveMember(userId: string) {
    if (confirmingRemoveId !== userId) {
      setConfirmingRemoveId(userId);
      // Auto-revert after 5s so the destructive state doesn't linger.
      window.setTimeout(() => {
        setConfirmingRemoveId((cur) => (cur === userId ? null : cur));
      }, 5000);
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const res = await removeMember({ teamId: team.id, userId });
      if ("error" in res) {
        setActionError(res.error);
        return;
      }
      setConfirmingRemoveId(null);
      router.refresh();
    });
  }

  function handleRoleChange(
    userId: string,
    role: Exclude<TeamRole, "owner">
  ) {
    setActionError(null);
    startTransition(async () => {
      const res = await updateMemberRole({
        teamId: team.id,
        userId,
        role,
      });
      if ("error" in res) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function copyInviteLink(token: string, id: string) {
    const url = `${window.location.origin}/invite/${encodeURIComponent(
      token
    )}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">{team.name}</h2>
            <p className="text-[11px] text-muted-foreground">
              You're {team.role} · {team.memberCount} member
              {team.memberCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <ul>
          {members.map((m, i) => (
            <li
              key={m.userId}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm",
                i > 0 && "border-t border-border"
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-mono">
                {m.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground">{m.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {m.email}
                </p>
              </div>
              {m.role === "owner" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400">
                  <Crown className="h-3 w-3" />
                  Owner
                </span>
              ) : canManage ? (
                <RoleDropdown
                  value={m.role as Exclude<TeamRole, "owner">}
                  onChange={(role) => handleRoleChange(m.userId, role)}
                  disabled={pending}
                />
              ) : (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
                  {m.role}
                </span>
              )}
              {canManage && m.role !== "owner" && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(m.userId)}
                  disabled={pending}
                  aria-label={
                    confirmingRemoveId === m.userId
                      ? `Click again to confirm removing ${m.name}`
                      : `Remove ${m.name} from the team`
                  }
                  className={
                    confirmingRemoveId === m.userId
                      ? "rounded border border-destructive/40 bg-destructive/15 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/25"
                      : "rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  }
                  title={
                    confirmingRemoveId === m.userId
                      ? "Click again to confirm"
                      : "Remove member"
                  }
                >
                  {confirmingRemoveId === m.userId ? (
                    "Confirm"
                  ) : (
                    <UserMinus className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {canManage && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Invite a teammate</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              type="email"
              aria-label="Teammate email address"
              disabled={pending}
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
            <RoleDropdown
              value={inviteRole}
              onChange={setInviteRole}
              disabled={pending}
            />
            <button
              type="button"
              onClick={handleInvite}
              disabled={pending || !inviteEmail.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground,white)] hover:opacity-90 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Send invite
            </button>
          </div>
          {inviteError && (
            <p className="text-[11px] text-destructive">{inviteError}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Email delivery isn't wired up yet — copy the invite link from the
            list below and send it manually.
          </p>
        </div>
      )}

      {canManage && invites.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Pending invites</h2>
          </div>
          <ul>
            {invites.map((i, idx) => (
              <li
                key={i.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm",
                  idx > 0 && "border-t border-border"
                )}
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{i.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {i.role} · expires{" "}
                    {new Date(i.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyInviteLink(i.token, i.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-muted/60"
                  title="Copy invite link"
                >
                  {copiedId === i.id ? (
                    <>
                      <Check className="h-3 w-3 text-[var(--success)]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy link
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke(i.id)}
                  disabled={pending}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Revoke invite"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoleDropdown({
  value,
  onChange,
  disabled,
}: {
  value: Exclude<TeamRole, "owner">;
  onChange: (role: Exclude<TeamRole, "owner">) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value as Exclude<TeamRole, "owner">)
        }
        disabled={disabled}
        className="appearance-none rounded-md border border-border bg-card px-3 py-1.5 pr-7 text-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
