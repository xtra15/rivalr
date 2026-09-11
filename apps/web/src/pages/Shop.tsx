import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Button, Tabs, Icon, CoinBalance, useToast } from "@/components/ui";
import { formatCoins } from "@/utils/format";
import type { ShopItem } from "@rivalr/shared";

const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: "Avatar Frames",
  sound_effect: "Sound Effects",
  quiz_theme: "Quiz Themes",
  taunt: "Taunt Stickers",
};

const CATEGORY_ICONS: Record<string, "user" | "play" | "target" | "flame"> = {
  avatar_frame: "user",
  sound_effect: "play",
  quiz_theme: "target",
  taunt: "flame",
};

export default function Shop() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadShop();
  }, [user]);

  async function loadShop() {
    if (!user) return;

    const shopItems = (await firestore.shopItems.getAll()) as unknown as ShopItem[];
    setItems(shopItems);

    const inv = (await firestore.userInventory.get(user.id)) as unknown as {
      id: string;
      item_id: string;
      is_equipped: boolean;
    }[];
    setInventory(inv.map((i) => i.item_id));

    const eq: Record<string, string> = {};
    for (const i of inv) {
      if (i.is_equipped) {
        const item = shopItems.find((s) => s.id === i.item_id);
        if (item) eq[item.category] = i.item_id;
      }
    }
    setEquipped(eq);
    setLoading(false);
  }

  async function buyItem(item: ShopItem) {
    if (!user || buying) return;
    if ((user.coins ?? 0) < item.coin_cost) {
      toast("Not enough coins.", "error");
      return;
    }

    setBuying(item.id);
    await firestore.userInventory.add(user.id, item.id);
    await firestore.users.updateCoins(user.id, -item.coin_cost);

    setInventory([...inventory, item.id]);
    setBuying(null);
    toast(`Purchased ${item.name}.`, "success");
    await refreshUser();
  }

  async function equipItem(item: ShopItem) {
    if (!user) return;
    const isCurrentlyEquipped = equipped[item.category] === item.id;

    if (isCurrentlyEquipped) {
      await firestore.userInventory.unequip(user.id, item.id);
      setEquipped((prev) => {
        const next = { ...prev };
        delete next[item.category];
        return next;
      });
      toast(`Unequipped ${item.name}.`, "info");
    } else {
      await firestore.userInventory.equip(user.id, item.id, equipped[item.category]);
      setEquipped((prev) => ({ ...prev, [item.category]: item.id }));
      toast(`Equipped ${item.name}.`, "success");
    }
  }

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide">Shop</h1>
          <p className="mt-1 text-sm text-ink-muted">Spend your coins on customization</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5">
          <CoinBalance coins={user?.coins ?? 0} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton h-5 w-32" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="skeleton h-48" />
                <div className="skeleton h-48" />
                <div className="skeleton h-48" />
              </div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-overpanel text-ink-muted">
            <Icon name="bag" size={26} />
          </div>
          <p className="text-base font-semibold">The shop is still being stocked</p>
          <p className="mt-1.5 text-sm text-ink-muted">Check back later for frames, themes and taunts.</p>
        </div>
      ) : (
        <Tabs
          tabs={categories.map((c) => ({
            id: c,
            label: CATEGORY_LABELS[c] ?? c,
            icon: CATEGORY_ICONS[c],
          }))}
        >
          {(activeCat) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
              {items
                .filter((i) => i.category === activeCat || categories.length === 1)
                .map((item) => {
                  const owned = inventory.includes(item.id);
                  const isEquipped = equipped[item.category] === item.id;
                  const canAfford = (user?.coins ?? 0) >= item.coin_cost;

                  return (
                    <Card key={item.id} className="flex flex-col">
                      <Preview item={item} />
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{item.name}</p>
                          <span className="inline-flex items-center gap-1 font-mono text-[13px] tabular-nums text-volt">
                            <Icon name="coin" size={14} />
                            {formatCoins(item.coin_cost)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{item.description}</p>
                        <div className="mt-auto pt-4">
                          {owned ? (
                            <Button size="sm" className="w-full" variant={isEquipped ? "primary" : "secondary"} onClick={() => equipItem(item)}>
                              {isEquipped ? "Equipped" : "Equip"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={!canAfford || buying === item.id}
                              onClick={() => buyItem(item)}
                            >
                              {buying === item.id ? "Buying…" : "Buy"}
                            </Button>
                          )}
                          {!owned && !canAfford ? (
                            <p className="mt-1.5 text-center text-[11px] text-ink-faint">
                              Need {formatCoins(item.coin_cost - (user?.coins ?? 0))} more
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </Tabs>
      )}
    </div>
  );
}

function Preview({ item }: { item: ShopItem }) {
  const isColor = item.preview_data?.startsWith("#");
  return (
    <div className="flex h-20 items-center justify-center rounded-t-lg border-b border-line bg-overpanel/60">
      {item.category === "avatar_frame" ? (
        <div className="rounded-full p-1 ring-2 ring-volt">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel text-xs font-semibold text-ink-muted">
            <Icon name="user" size={16} />
          </div>
        </div>
      ) : item.category === "sound_effect" ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-panel text-volt">
          <Icon name="play" size={16} fill />
        </div>
      ) : item.category === "quiz_theme" && isColor ? (
        <div
          className="h-8 w-16 rounded-md border border-line"
          style={{ backgroundColor: item.preview_data ?? "#C9F73A" }}
        />
      ) : item.category === "quiz_theme" ? (
        <div className="flex gap-1.5">
          <span className="h-6 w-6 rounded-full bg-volt" />
          <span className="h-6 w-6 rounded-full bg-success" />
          <span className="h-6 w-6 rounded-full bg-subject-phys" />
        </div>
      ) : item.category === "taunt" ? (
        item.preview_data ? (
          <span className="text-2xl leading-none">{item.preview_data}</span>
        ) : (
          <span className="text-volt">
            <Icon name="flame" size={24} />
          </span>
        )
      ) : (
        <span className="text-xs text-ink-muted">{item.category}</span>
      )}
    </div>
  );
}