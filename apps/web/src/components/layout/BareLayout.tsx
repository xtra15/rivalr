import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { LoadingScreen } from "@/components/ui";

export function BareLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <LoadingScreen label="Loading rivalr…" />;
  }

  return (
    <div className="min-h-screen bg-field">
      <Outlet />
    </div>
  );
}