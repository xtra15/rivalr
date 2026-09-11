import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Navbar, MobileTabBar } from "./Navbar";
import { LoadingScreen } from "@/components/ui";

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
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:px-6 md:pb-12">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}