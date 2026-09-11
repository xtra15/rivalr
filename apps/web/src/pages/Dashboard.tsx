import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Icon, Input, Button, StatPill, EmptyState, ProgressBar, useToast, type IconName } from "@/components/ui";
import { GuildCreateModal } from "@/components/GuildCreateModal";
import { getLevel, formatCoins } from "@/utils/format";
import type { Guild } from "@rivalr/shared";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [guilds, setGuilds] = useState<(Guild & { member_count: number })[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchGuilds();
  }, [user]);

  async function fetchGuilds() {
    if (!user) return;
    const memberships = await firestore.guildMembers.getByUser(user.id);

    if (!memberships.length) {
      setLoading(false);
      return;
    }

    const guildIds = memberships.map((m) => m.guild_id as string);
    const guildData = await firestore.guilds.getByIds(guildIds);

    const withCounts = await Promise.all(
      guildData.map(async (g) => {
        const rows = await firestore.guildMembers.getByGuild(g.id);
        return { ...(g as unknown as Guild), member_count: rows.length };
      }),
    );

    setGuilds(withCounts);
    setLoading(false);
  }

  async function joinGuild() {
    if (!user || !inviteCode.trim() || busy) return;
    setBusy(true);
    setJoinError(null);
    try {
      const guild = await firestore.guilds.getByCode(inviteCode.trim().toUpperCase());

      if (guild) {
        await firestore.guildMembers.add(guild.id, user.id);
        setShowJoin(false);
        toast("Joined the guild.", "success");
        navigate(`/guild/${guild.id}`);
      } else {
        toast("No guild found with that invite code.", "error");
        setJoinError("No guild found with that invite code.");
      }
    } finally {
      setBusy(false);
    }
  }

  const level = getLevel(user?.xp ?? 0);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink-muted">Player</p>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
            {user?.name?.split(" ")[0] ?? "—"}
          </h1>
        </div>
      </div>

      <div className="surface-card mb-6 flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-volt/10 text-volt">
            <Icon name="star" size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-ink-muted">Level</p>
            <p className="font-display text-3xl uppercase tracking-wide text-ink sm:text-4xl">{level.level}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl tracking-wide tabular-nums text-volt sm:text-3xl">{level.currentXP}</p>
            <p className="text-sm text-ink-muted">of {level.nextLevelXP} XP</p>
          </div>
        </div>
        <ProgressBar value={level.currentXP} max={level.nextLevelXP} />
      </div>

      <div className="mb-9 flex flex-wrap gap-2">
        <StatPill value={String(guilds.length)} label={guilds.length === 1 ? "guild" : "guilds"} />
        <StatPill value={String(user?.xp ?? 0)} label="xp" />
        <StatPill value={formatCoins(user?.coins ?? 0)} label="coins" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl uppercase tracking-wide">Your Guilds</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Icon name="plus" size={16} />
            Create
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowJoin(true)}>
            Join
          </Button>
        </div>
      </div>

      <GuildCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => navigate(`/guild/${id}`)}
      />

      {showJoin && (
        <form
          className="surface-card mb-5 flex flex-col gap-3 p-4 animate-slide-down sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            joinGuild();
          }}
        >
          <div className="flex-1">
            <label htmlFor="invite-code" className="mb-1.5 block text-sm font-medium text-navy-200">
              Invite code
            </label>
            <Input
              id="invite-code"
              assistiveLabel="Invite code"
              placeholder="e.g. AB12CD"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                setJoinError(null);
              }}
              className="font-mono uppercase tracking-widest"
              autoFocus
            />
          </div>
          {joinError ? (
            <p className="text-sm text-danger sm:basis-full sm:-mt-2">{joinError}</p>
          ) : null}
          <div className="flex gap-2 sm:pt-6">
            <Button size="md" type="submit" disabled={busy || !inviteCode.trim()}>
              {busy ? "Joining…" : "Join"}
            </Button>
            <Button size="md" variant="ghost" type="button" onClick={() => setShowJoin(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : guilds.length === 0 ? (
        <EmptyState
          icon="users"
          title="No guilds yet"
          description="You're not in a guild. Create one or ask a friend for an invite link."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setShowCreate(true)}>
                <Icon name="plus" size={16} />
                Create a guild
              </Button>
              <Button variant="secondary" onClick={() => setShowJoin(true)}>
                Join with a link
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {guilds.map((guild) => (
            <Link key={guild.id} to={`/guild/${guild.id}`} className="group">
              <Card hover className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-overpanel text-volt">
                  <Icon name={(guild.icon as IconName) || "users"} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{guild.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {guild.member_count} member{guild.member_count === 1 ? "" : "s"}
                  </p>
                </div>
                <Icon
                  name="chevron-right"
                  size={18}
                  className="text-ink-muted transition-all group-hover:translate-x-0.5 group-hover:text-volt"
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}