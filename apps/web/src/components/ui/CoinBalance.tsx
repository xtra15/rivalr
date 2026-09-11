import { Icon } from "./Icon";
import { formatCoins } from "@/utils/format";

export function CoinBalance({ coins, className = "" }: { coins: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-sm font-medium tabular-nums text-ink ${className}`}
    >
      <Icon name="coin" size={15} className="text-volt" />
      {formatCoins(coins)}
    </span>
  );
}