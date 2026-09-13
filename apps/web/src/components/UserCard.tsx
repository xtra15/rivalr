import { useEffect, useState } from "react";
import { firestore } from "@/lib/firestore";
import { Avatar } from "@/components/ui";
import type { ShopItem } from "@rivalr/shared";

export interface EquippedSlots {
  frameColor?: string;
  glowColor?: string;
  title?: string;
  tauntPreview?: string | null;
}

export interface ItemWithCustomColor {
  item_id: string;
  is_equipped: boolean;
  custom_color?: string | null;
}

export function resolveEquipped(
  inventory: ItemWithCustomColor[],
  items: ShopItem[],
): EquippedSlots {
  const slots: EquippedSlots = {};
  let presetFrame: string | undefined;
  let customFrame: string | undefined;
  for (const inv of inventory) {
    if (!inv.is_equipped) continue;
    const item = items.find((s) => s.id === inv.item_id);
    if (!item) continue;
    if (item.category === "avatar_frame") {
      presetFrame = item.preview_data?.startsWith("#") ? item.preview_data : undefined;
    }
    if (item.category === "name_glow") {
      slots.glowColor = item.preview_data?.startsWith("#") ? item.preview_data : undefined;
    }
    if (item.category === "custom_frame_color") {
      customFrame = inv.custom_color?.startsWith("#")
        ? inv.custom_color
        : item.preview_data?.startsWith("#")
          ? item.preview_data
          : undefined;
    }
    if (item.category === "title") slots.title = item.preview_data ?? undefined;
    if (item.category === "taunt") slots.tauntPreview = item.preview_data;
  }
  slots.frameColor = customFrame ?? presetFrame;
  return slots;
}

interface UserCardProps {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  slots?: EquippedSlots;
  userId?: string;
  showTauntOnAvatar?: boolean;
}

function useSlots(userId: string | undefined, slots?: EquippedSlots) {
  const [loaded, setLoaded] = useState<EquippedSlots | null>(slots ?? null);
  useEffect(() => {
    if (slots || !userId) {
      setLoaded(slots ?? null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [inv, items] = await Promise.all([
          firestore.userInventory.getForUsers([userId]),
          firestore.shopItems.getAll() as Promise<ShopItem[]>,
        ]);
        if (alive) setLoaded(resolveEquipped(inv as unknown as ItemWithCustomColor[], items));
      } catch {
        if (alive) setLoaded({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, slots]);
  return loaded;
}

export function UserCard({ name, avatarUrl, size = "md", slots, userId, showTauntOnAvatar }: UserCardProps) {
  const resolved = useSlots(userId, slots);
  const frameColor = resolved?.frameColor;
  const glowColor = resolved?.glowColor;
  const title = resolved?.title;
  const taunt = resolved?.tauntPreview;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative shrink-0 rounded-full">
        <Avatar src={avatarUrl} name={name} size={size} frameColor={frameColor} />
        {showTauntOnAvatar && taunt ? (
          <span className="absolute -bottom-1 -right-1 text-base leading-none drop-shadow">{taunt}</span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className="truncate text-sm font-medium"
            style={glowColor ? { color: glowColor, textShadow: `0 0 8px ${glowColor}aa` } : undefined}
          >
            {name}
          </span>
          {title ? (
            <span className="inline-flex shrink-0 items-center rounded-md border border-volt/30 bg-volt/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-volt">
              {title}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
