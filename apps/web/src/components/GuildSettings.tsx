import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Button, Input, Icon, useToast } from "@/components/ui";

interface GuildSettingsProps {
  guildId: string;
  guildName: string;
  createdBy: string;
}

export function GuildSettings({ guildId, guildName, createdBy }: GuildSettingsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState(guildName);
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCreator = user?.id === createdBy;
  const trimmed = name.trim();
  const nameValid = trimmed.length >= 2 && trimmed.length <= 40 && trimmed !== guildName;

  if (!isCreator) return null;

  async function rename() {
    if (!nameValid || busy) return;
    setBusy(true);
    try {
      await firestore.guilds.update(guildId, { name: trimmed });
      toast("Guild renamed.", "success");
    } finally {
      setBusy(false);
    }
  }

  async function deleteGuild() {
    setBusy(true);
    try {
      const members = await firestore.guildMembers.getByGuild(guildId);
      for (const m of members) {
        await firestore.guildMembers.remove(guildId, m.user_id as string);
      }
      await firestore.guilds.delete(guildId);
      toast("Guild deleted.", "success");
      navigate("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h3 className="mb-4 font-display text-sm uppercase tracking-wide text-ink-soft">Settings</h3>

      <label htmlFor="guild-settings-name" className="mb-1.5 block text-sm font-medium text-ink-soft">
        Guild name
      </label>
      <div className="flex gap-2">
        <Input
          id="guild-settings-name"
          assistiveLabel="Guild name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        <Button size="md" disabled={!nameValid || busy} onClick={rename}>
          Save
        </Button>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        {!showDeleteConfirm ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Icon name="trash" size={14} />
            Delete guild
          </Button>
        ) : (
          <div className="animate-fade-in">
            <p className="mb-3 text-sm text-ink-soft">
              This will permanently delete <span className="font-semibold text-ink">{guildName}</span> and remove all members.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" disabled={busy} onClick={deleteGuild}>
                {busy ? "Deleting…" : "Yes, delete"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}