import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { api } from "@/lib/api";
import { compressImage, CompressError } from "@/lib/compressImage";
import { Card, Button, Icon, useToast } from "@/components/ui";
import type { CustomTaunt } from "@rivalr/shared";

export function CustomTauntManager({ onChanged }: { onChanged?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taunt, setTaunt] = useState<CustomTaunt | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    firestore.customTaunts.get(user.google_id).then(setTaunt);
  }, [user]);

  async function handleFile(file: File | undefined) {
    if (!user || !file || busy) return;
    setBusy(true);
    try {
      const webp = await compressImage(file);
      const { asset_key } = await api.uploadTaunt(webp);
      const sha256 = asset_key.split("/").pop()!.split(".")[0]!;
      await firestore.customTaunts.set(user.google_id, { asset_key, sha256 });
      setTaunt({
        user_id: user.google_id,
        asset_key,
        sha256,
        is_equipped: true,
        created_at: new Date().toISOString(),
      });
      toast("Custom taunt uploaded.", "success");
      onChanged?.();
    } catch (e) {
      const msg = e instanceof CompressError || e instanceof Error ? e.message : "Upload failed — please try again.";
      toast(msg, "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await api.deleteTaunt();
      await firestore.customTaunts.remove(user.google_id);
      setTaunt(null);
      toast("Custom taunt deleted.", "info");
      onChanged?.();
    } catch {
      toast("Could not delete taunt.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Custom taunt</p>
        <span className="text-[11px] text-ink-faint">GIF → WebP · 512 KB max</span>
      </div>

      {taunt ? (
        <div className="flex flex-wrap items-center gap-3">
          <img
            src={api.tauntAssetUrl(user.google_id, `${taunt.sha256}.webp`)}
            alt="Custom taunt"
            className="h-16 w-16 rounded-lg border border-line bg-overpanel object-cover"
          />
          <div className="flex flex-1 flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={handleDelete}>
              <Icon name="trash" size={14} />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : "Upload your own"}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/gif,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-[11px] leading-relaxed text-ink-faint">
        Shown on all your scores in guild activity. Frame, glow and title still apply. Animated GIFs are shown as
        their first frame.
      </p>
    </Card>
  );
}