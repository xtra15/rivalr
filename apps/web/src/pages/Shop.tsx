import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Button, Badge } from "@/components/ui";
import type { ShopItem } from "@rivalr/shared";

const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: "Avatar Frames",
  sound_effect: "Sound Effects",
  quiz_theme: "Quiz Themes",
  taunt: "Taunt Stickers",
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
    <div className="mx-auto max-w-2xl px-4 py-8 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shop</h1>
        <Badge variant="info" className="text-sm px-3 py-1">
          💰 {user?.coins ?? 0} coins
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="mb-8">
            <h2 className="font-semibold mb-3">{CATEGORY_LABELS[cat] ?? cat}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items
                .filter((i) => i.category === cat)
                .map((item) => {
                  const owned = inventory.includes(item.id);
                  const isEquipped = equipped[cat] === item.id;
                  const canAfford = (user?.coins ?? 0) >= item.coin_cost;

                  return (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-navy-400 mt-0.5">{item.description}</p>
                          <div className="mt-2 text-xs text-navy-500">
                            {item.preview_data}
                          </div>
                        </div>
                        <span className="text-lg ml-2">
                          {item.category === "taunt" ? item.preview_data : ""}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {owned ? (
                          <>
                            <Button
                              size="sm"
                              variant={isEquipped ? "primary" : "secondary"}
                              onClick={() => equipItem(item)}
                            >
                              {isEquipped ? "Equipped" : "Equip"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!canAfford || buying === item.id}
                            onClick={() => buyItem(item)}
                          >
                            {buying === item.id ? "..." : `Buy · ${item.coin_cost} 💰`}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
