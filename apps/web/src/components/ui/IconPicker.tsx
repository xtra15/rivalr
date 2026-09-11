import { Icon, type IconName } from "@/components/ui";

const GUILD_ICONS: IconName[] = [
  "users",
  "target",
  "trophy",
  "flame",
  "book",
  "zap",
  "crown",
  "shield",
  "medal",
  "star",
  "coin",
  "sparkles",
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className = "" }: IconPickerProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {GUILD_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          aria-label={`Icon ${icon}`}
          onClick={() => onChange(icon)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
            value === icon
              ? "border-volt bg-volt/15 text-volt"
              : "border-line bg-field text-ink-muted hover:border-line-strong hover:text-ink"
          }`}
        >
          <Icon name={icon} size={18} />
        </button>
      ))}
    </div>
  );
}