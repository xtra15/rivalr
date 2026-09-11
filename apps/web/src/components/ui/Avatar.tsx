interface AvatarProps {
  src: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl",
};

const hueFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ring-1 ring-line ${sizes[size]} ${className}`}
      />
    );
  }

  const hue = hueFor(name || "?");
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-line select-none ${sizes[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 55% 40%), hsl(${(hue + 40) % 360} 60% 30%))`,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}