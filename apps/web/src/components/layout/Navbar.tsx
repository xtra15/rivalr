import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Avatar, CoinBalance, Icon, LogoMark, type IconName } from "@/components/ui";

const navItems: { to: string; label: string; icon: IconName }[] = [
  { to: "/dashboard", label: "Dashboard", icon: "grid" },
  { to: "/shop", label: "Shop", icon: "bag" },
  { to: "/profile", label: "Profile", icon: "user" },
];

const ADMIN_ENABLED = import.meta.env.VITE_ADMIN_ENABLED === "true";

const TAB_ROUTES = new Set(["/dashboard", "/shop", "/profile"]);

function isActivePath(locationPathname: string, to: string) {
  return locationPathname === to || (to !== "/dashboard" && locationPathname.startsWith(to));
}

export function Sidebar() {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const items = [...navItems];
  if (ADMIN_ENABLED && isAdmin) {
    items.push({ to: "/admin", label: "Admin", icon: "shield" });
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-field md:flex">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <LogoMark size={28} />
        <span className="font-display text-base uppercase tracking-wide">rivalr</span>
      </div>

      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        {items.map((item) => {
          const isActive = isActivePath(location.pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "text-ink" : "text-ink-muted hover:bg-overpanel hover:text-ink"
              }`}
            >
              {isActive ? (
                <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-[3px] rounded-full bg-volt" />
              ) : null}
              <Icon name={item.icon} size={18} strokeWidth={isActive ? 2.25 : 1.75} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar src={user.avatar_url} name={user.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
            <CoinBalance coins={user.coins} className="text-xs" />
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-overpanel hover:text-ink"
        >
          <Icon name="logout" size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (location.pathname !== "/admin" && !TAB_ROUTES.has(location.pathname)) return null;

  const items = [...navItems];
  if (ADMIN_ENABLED && isAdmin) {
    items.push({ to: "/admin", label: "Admin", icon: "shield" });
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-field/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isActive = isActivePath(location.pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              aria-label={item.label}
              className={`flex flex-col items-center gap-1 py-3.5 transition-colors ${
                isActive ? "text-volt" : "text-ink-muted"
              }`}
            >
              <Icon name={item.icon} size={22} strokeWidth={isActive ? 2.25 : 1.75} />
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}