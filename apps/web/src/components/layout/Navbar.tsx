import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Avatar, Icon, LogoMark, type IconName } from "@/components/ui";

const navItems: { to: string; label: string; icon: IconName }[] = [
  { to: "/dashboard", label: "Dashboard", icon: "grid" },
  { to: "/shop", label: "Shop", icon: "bag" },
  { to: "/profile", label: "Profile", icon: "user" },
];

const TAB_ROUTES = new Set(["/dashboard", "/shop", "/profile"]);

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-field/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-lg uppercase tracking-wide">rivalr</span>
        </Link>

        <div className="mx-auto hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive || (item.to !== "/dashboard" && location.pathname.startsWith(item.to))
                    ? "bg-overpanel text-ink"
                    : "text-ink-muted hover:bg-overpanel/70 hover:text-ink"
                }`
              }
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-overpanel hover:text-ink"
          >
            <Icon name="logout" size={18} />
          </button>
          <Link to="/profile" title="Your profile" className="shrink-0">
            <Avatar src={user.avatar_url} name={user.name} size="sm" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function MobileTabBar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (!TAB_ROUTES.has(location.pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-field/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                isActive || (item.to !== "/dashboard" && location.pathname.startsWith(item.to))
                  ? "text-volt"
                  : "text-ink-muted"
              }`
            }
          >
            <Icon name={item.icon} size={22} strokeWidth={isActiveOrPath(location.pathname, item.to) ? 2.25 : 1.75} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function isActiveOrPath(pathname: string, to: string) {
  return pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
}