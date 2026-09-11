import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface TabsProps {
  tabs: { id: string; label: string; icon?: IconName }[];
  children: (activeTab: string) => ReactNode;
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, children, defaultTab, className = "" }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");

  return (
    <div className={className}>
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-line [-webkit-overflow-scrolling:touch]"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={`relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
                ${isActive ? "text-ink" : "text-ink-muted hover:text-ink"}`}
            >
              {tab.icon ? <Icon name={tab.icon} size={16} /> : null}
              {tab.label}
              <span
                className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          );
        })}
      </div>
      <div className="pt-5">{children(active)}</div>
    </div>
  );
}