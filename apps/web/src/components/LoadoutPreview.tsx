import { UserCard, type EquippedSlots } from "@/components/UserCard";
import { Card } from "@/components/ui";

export function LoadoutPreview({
  name,
  avatarUrl,
  slots,
}: {
  name: string;
  avatarUrl: string | null;
  slots: EquippedSlots;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium">Your loadout</p>
      <p className="mt-0.5 text-xs text-ink-muted">That's you in guild activity.</p>
      <div className="mt-3">
        <UserCard name={name} avatarUrl={avatarUrl} slots={slots} showTauntOnAvatar size="lg" />
      </div>
    </Card>
  );
}