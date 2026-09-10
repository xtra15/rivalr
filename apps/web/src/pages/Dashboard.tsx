import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Icon, Input, Button, StatCard, PageHeader, EmptyState } from "@/components/ui";
import { getLevel } from "@/utils/format";
import type { Guild } from "@rivalr/shared";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<(Guild & { member_count: number })[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [guildName, setGuildName] = useState("");
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

  async function createGuild() {
    if (!user || !guildName.trim() || busy) return;
    setBusy(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const guild = await firestore.guilds.create({
        name: guildName.trim(),
        invite_code: code,
        created_by: user.id,
      });

      if (guild) {
        await firestore.guildMembers.add(guild.id, user.id);
        setShowCreate(false);
        navigate(`/guild/${guild.id}`);
      }
    } finally {
      setBusy(false);
    }
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
        navigate(`/guild/${guild.id}`);
      } else {
        setJoinError("No guild found with that invite code.");
      }
    } finally {
      setBusy(false);
    }
  }

  const level = getLevel(user?.xp ?? 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0]}`}
        subtitle="Your study dashboard"
      />

      <div className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Guilds" value={guilds.length} icon="users" />
        <StatCard label="Total XP" value={user?.xp ?? 0} icon="zap" tint="accent" />
        <StatCard label="Coins" value={user?.coins ?? 0} icon="coin" tint="warning" />
        <StatCard label="Level" value={level.level} icon="star" tint="success" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Your Guilds</h2>
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

      {showCreate && (
        <form
          className="surface-card mb-5 flex flex-col gap-3 p-4 animate-slide-down sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            createGuild();
          }}
        >
          <div className="flex-1">
            <label htmlFor="guild-name" className="mb-1.5 block text-sm font-medium text-navy-200">
              Guild name
            </label>
            <Input
              id="guild-name"
              assistiveLabel="Guild name"
              placeholder="e.g. Form 5 Biology Squad"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2 sm:pt-6">
            <Button size="md" type="submit" disabled={busy || !guildName.trim()}>
              {busy ? "Creating…" : "Create"}
            </Button>
            <Button size="md" variant="ghost" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

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
            <p className="text-sm text-signal-danger sm:basis-full sm:-mt-2">{joinError}</p>
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
          description="Create your first study guild and invite your friends."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Icon name="plus" size={16} />
              Create your first guild
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {guilds.map((guild) => (
            <Link key={guild.id} to={`/guild/${guild.id}`} className="group">
              <Card hover className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-indigo-300 ring-1 ring-inset ring-white/5">
                  <Icon name="users" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{guild.name}</h3>
                  <p className="mt-0.5 text-sm text-navy-400">
                    {guild.member_count} member{guild.member_count === 1 ? "" : "s"}
                  </p>
                </div>
                <Icon
                  name="chevron-right"
                  size={18}
                  className="text-navy-600 transition-all group-hover:translate-x-0.5 group-hover:text-navy-300"
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}