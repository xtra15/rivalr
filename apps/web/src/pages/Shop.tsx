import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Button, Badge, Icon, PageHeader, type IconName } from "@/components/ui";
import type { ShopItem } from "@rivalr/shared";

const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: "Avatar Frames",
  sound_effect: "Sound Effects",
  quiz_theme: "Quiz Themes",
  taunt: "Taunt Stickers",
};

const CATEGORY_ICONS: Record<string, IconName> = {
  avatar_frame: "user",
  sound_effect: "sparkles",
  quiz_theme: "target",
  taunt: "crown",
};

export default function Shop() {
  const { user, refreshUser } = useAuth();
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
    if (inventory.includes(item.id)) return;
    if ((user.coins ?? 0) < item.coin_cost) return;

    setBuying(item.id);

    await firestore.userInventory.add(user.id, item.id);
    await firestore.users.updateCoins(user.id, -item.coin_cost);

    setInventory([...inventory, item.id]);
    setBuying(null);
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
    } else {
      await firestore.userInventory.equip(user.id, item.id, equipped[item.category]);
      setEquipped((prev) => ({ ...prev, [item.category]: item.id }));
    }
  }

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader
        title="Shop"
        subtitle="Spend your coins on customization"
        actions={
          <Badge variant="info" className="px-3.5 py-1.5 text-sm font-semibold tabular-nums">
            <Icon name="coin" size={16} />
            {user?.coins ?? 0}
          </Badge>
        }
      />

      {loading ? (
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton h-5 w-32" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="skeleton h-32" />
                <div className="skeleton h-32" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        categories.map((cat) => (
          <section key={cat} className="mb-9">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-wash text-accent">
                <Icon name={CATEGORY_ICONS[cat] ?? "bag"} size={16} />
              </div>
              <h2 className="text-base font-semibold">{CATEGORY_LABELS[cat] ?? cat}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items
                .filter((i) => i.category === cat)
                .map((item) => {
                  const owned = inventory.includes(item.id);
                  const isEquipped = equipped[cat] === item.id;
                  const canAfford = (user?.coins ?? 0) >= item.coin_cost;

                  return (
                    <Card key={item.id} className="flex flex-col p-5">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-navy-400">{item.description}</p>
                        </div>
                        {cat === "taunt" && item.preview_data ? (
                          <span className="shrink-0 text-2xl leading-none">{item.preview_data}</span>
                        ) : null}
                      </div>

                      {isEquipped ? (
                        <div className="mt-3">
                          <Badge variant="success">
                            <Icon name="check" size={13} />
                            Equipped
                          </Badge>
                        </div>
                      ) : null}

                      <div className="mt-auto flex items-center gap-2 pt-4">
                        {owned ? (
                          <Button size="sm" variant={isEquipped ? "secondary" : "primary"} onClick={() => equipItem(item)}>
                            {isEquipped ? "Unequip" : "Equip"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!canAfford || buying === item.id}
                            onClick={() => buyItem(item)}
                          >
                            {buying === item.id ? (
                              "Buying…"
                            ) : (
                              <>
                                Buy
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Icon name="coin" size={15} />
                                  {item.coin_cost}
                                </span>
                              </>
                            )}
                          </Button>
                        )}
                        {!owned && !canAfford ? (
                          <span className="text-xs text-ink-muted">Not enough coins</span>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}