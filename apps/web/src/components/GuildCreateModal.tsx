import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Button, Icon, Input, IconPicker, useToast } from "@/components/ui";

interface GuildCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (guildId: string) => void;
}

export function GuildCreateModal({ open, onClose, onCreated }: GuildCreateModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("target");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 40;

  async function create() {
    if (!user || !valid || busy) return;
    setBusy(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const guild = await firestore.guilds.create({
        name: trimmed,
        invite_code: code,
        created_by: user.id,
        description: description.trim(),
        icon,
      });
      if (guild) {
        await firestore.guildMembers.add(guild.id, user.id);
        toast("Guild created.", "success");
        onCreated(guild.id);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-fade-in">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-pop animate-scale-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide">Create guild</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-overpanel hover:text-ink">
            <Icon name="x" size={18} />
          </button>
        </div>
        <label htmlFor="guild-name" className="mb-1.5 block text-sm font-medium text-ink-soft">
          Guild name
        </label>
        <Input
          id="guild-name"
          assistiveLabel="Guild name"
          placeholder="e.g. Form 5 Bio Squad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={40}
        />
        <p className="mt-1 text-right text-[11px] text-ink-faint">
          {trimmed.length}/40
        </p>

        <label className="mb-1.5 mt-4 block text-sm font-medium text-ink-soft">
          Icon
        </label>
        <IconPicker value={icon} onChange={setIcon} />

        <label htmlFor="guild-description" className="mb-1.5 mt-4 block text-sm font-medium text-ink-soft">
          Description <span className="text-ink-faint">(optional)</span>
        </label>
        <textarea
          id="guild-description"
          rows={2}
          maxLength={160}
          placeholder="e.g. Form 5 Biology revision squad. We grind KBAT every night."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-md border border-line-strong bg-field px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-volt/20"
        />

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={create}>
            {busy ? "Creating…" : "Create guild"}
          </Button>
        </div>
      </div>
    </div>
  );
}