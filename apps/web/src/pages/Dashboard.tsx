import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, StatCard } from "@/components/ui";
import { Button } from "@/components/ui/Button";
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

    setGuilds(
      guildData.map((g) => ({
        ...(g as unknown as Guild),
        member_count: 0,
      })),
    );
    setLoading(false);
  }

  async function createGuild() {
    if (!user || !guildName.trim()) return;
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
  }

  async function joinGuild() {
    if (!user || !inviteCode.trim()) return;
    const guild = await firestore.guilds.getByCode(inviteCode.trim().toUpperCase());

    if (guild) {
      await firestore.guildMembers.add(guild.id, user.id);
      setShowJoin(false);
      navigate(`/guild/${guild.id}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-navy-400">Your study dashboard</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Guilds" value={guilds.length} />
        <StatCard label="Total XP" value={user?.xp ?? 0} />
        <StatCard label="Coins" value={user?.coins ?? 0} />
        <StatCard label="Level" value={1} />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Guilds</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Create Guild
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowJoin(true)}>
            Join Guild
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-navy-700 bg-navy-800 p-4 animate-slide-down">
          <h3 className="font-semibold mb-3">Create a Guild</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Guild name"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              className="flex-1 rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button size="sm" onClick={createGuild}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="mb-6 rounded-xl border border-navy-700 bg-navy-800 p-4 animate-slide-down">
          <h3 className="font-semibold mb-3">Join a Guild</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="flex-1 rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button size="sm" onClick={joinGuild}>Join</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowJoin(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : guilds.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-navy-400 mb-4">You haven't joined any guilds yet</p>
          <Button onClick={() => setShowCreate(true)}>Create your first guild</Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {guilds.map((guild) => (
            <Link key={guild.id} to={`/guild/${guild.id}`}>
              <Card hover>
                <h3 className="font-semibold">{guild.name}</h3>
                <p className="mt-1 text-sm text-navy-400">
                  {guild.member_count} members
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
