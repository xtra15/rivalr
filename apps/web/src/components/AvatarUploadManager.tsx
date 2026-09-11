import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { api, API_BASE } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { Button, Icon, useToast } from "@/components/ui";

export function AvatarUploadManager() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function handleFile(file: File | undefined) {
    if (!user || !file || busy) return;
    setBusy(true);
    try {
      const { asset_key } = await api.uploadAvatar(file);
      const filePart = asset_key.split("/").pop()!;
      await firestore.users.updateAvatar(user.id, api.avatarAssetUrl(user.google_id, filePart));
      await refreshUser();
      toast("Animated avatar uploaded.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Avatar upload failed — please try again.";
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
      await api.deleteAvatar();
      await firestore.users.updateAvatar(user.id, auth.currentUser?.photoURL ?? null);
      await refreshUser();
      toast("Avatar removed.", "info");
    } catch {
      toast("Could not remove avatar.", "error");
    } finally {
      setBusy(false);
    }
  }

  const hasCustom = user.avatar_url?.startsWith(API_BASE);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Icon name="upload" size={14} />
        {busy ? "Uploading…" : hasCustom ? "Change avatar" : "Upload avatar"}
      </Button>
      {hasCustom ? (
        <Button size="sm" variant="ghost" disabled={busy} onClick={handleDelete}>
          <Icon name="trash" size={14} />
          Remove
        </Button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/gif,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="w-full text-[11px] leading-relaxed text-ink-faint">
        GIF, PNG or JPEG. Animated GIFs stay animated everywhere.
      </p>
    </div>
  );
}