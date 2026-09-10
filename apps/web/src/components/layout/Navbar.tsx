import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";


const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/shop", label: "Shop" },
  { to: "/profile", label: "Profile" },
];

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-40 border-b border-navy-700 bg-navy-900/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-indigo-500">⚡</span>
          <span>rivalr</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors
                ${location.pathname === item.to
                  ? "text-white bg-navy-800"
                  : "text-navy-400 hover:text-navy-200 hover:bg-navy-800/50"
                }`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={signOut} className="text-sm text-navy-400 hover:text-navy-200 transition-colors">
            Sign out
          </button>
          <Link to="/profile">
            <Avatar src={user.avatar_url} name={user.name} size="sm" />
          </Link>
        </div>
      </div>
    </nav>
  );
}