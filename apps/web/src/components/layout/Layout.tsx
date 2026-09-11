import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Sidebar, MobileTabBar } from "./Navbar";
import { LoadingScreen, LogoMark, CoinBalance } from "@/components/ui";

export function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <LoadingScreen label="Loading rivalr…" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-field md:flex-row">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-field/85 px-4 backdrop-blur-xl md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-display text-base uppercase tracking-wide">rivalr</span>
          </Link>
          <CoinBalance coins={user.coins} />
        </div>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-12 md:pt-8">
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}