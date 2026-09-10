import { useState, type ReactNode } from "react";

interface TabsProps {
  tabs: { id: string; label: string }[];
  children: (activeTab: string) => ReactNode;
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, children, defaultTab, className = "" }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");

  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-navy-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              ${active === tab.id
                ? "border-indigo-500 text-white"
                : "border-transparent text-navy-400 hover:text-navy-200"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{children(active)}</div>
    </div>
  );
}
