import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Button, Input, Icon, IconPicker, useToast } from "@/components/ui";

interface GuildSettingsProps {
  guildId: string;
  guildName: string;
  guildDescription?: string;
  guildIcon?: string;
  createdBy: string;
}

export function GuildSettings({
  guildId,
  guildName,
  guildDescription = "",
  guildIcon = "target",
  createdBy,
}: GuildSettingsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState(guildName);
  const [description, setDescription] = useState(guildDescription);
  const [icon, setIcon] = useState(guildIcon);
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCreator = user?.id === createdBy;
  const trimmed = name.trim();
  const nameValid = trimmed.length >= 2 && trimmed.length <= 40;
  const dirty = trimmed !== guildName || description !== guildDescription || icon !== guildIcon;

  if (!isCreator) return null;

  async function save() {
    if (!nameValid || !dirty || busy) return;
    setBusy(true);
    try {
      await firestore.guilds.update(guildId, {
        name: trimmed,
        description: description.trim(),
        icon,
      });
      toast("Guild settings saved.", "success");
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
    <div className="mb-6 rounded-lg border border-line bg-panel p-5">
      <h3 className="mb-4 font-display text-sm uppercase tracking-wide text-ink-soft">Settings</h3>

      <label htmlFor="guild-settings-name" className="mb-1.5 block text-sm font-medium text-ink-soft">
        Guild name
      </label>
      <Input
        id="guild-settings-name"
        assistiveLabel="Guild name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
      />

      <label className="mb-1.5 mt-4 block text-sm font-medium text-ink-soft">Icon</label>
      <IconPicker value={icon} onChange={setIcon} />

      <label htmlFor="guild-settings-description" className="mb-1.5 mt-4 block text-sm font-medium text-ink-soft">
        Description <span className="text-ink-faint">(optional)</span>
      </label>
      <textarea
        id="guild-settings-description"
        rows={2}
        maxLength={160}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full resize-none rounded-md border border-line-strong bg-field px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-volt/20"
      />

      <div className="mt-4">
        <Button size="md" disabled={!nameValid || !dirty || busy} onClick={save}>
          Save changes
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