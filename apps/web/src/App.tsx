import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { Layout, BareLayout } from "@/components/layout";
import { ToastProvider, LoadingScreen } from "@/components/ui";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import GuildHome from "@/pages/GuildHome";
import QuizLobby from "@/pages/QuizLobby";
import QuizScreen from "@/pages/QuizScreen";
import Results from "@/pages/Results";
import Profile from "@/pages/Profile";
import Shop from "@/pages/Shop";

const ADMIN_ENABLED = import.meta.env.VITE_ADMIN_ENABLED === "true";
const AdminPage = ADMIN_ENABLED ? lazy(() => import("@/pages/Admin")) : null;

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/guild/:guildId" element={<GuildHome />} />
            <Route path="/guild/:guildId/quiz" element={<QuizLobby />} />
            <Route path="/guild/:guildId/quiz/:quizId/results" element={<Results />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/shop" element={<Shop />} />
            {AdminPage ? (
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<LoadingScreen label="Loading admin…" />}>
                    <AdminPage />
                  </Suspense>
                }
              />
            ) : null}
          </Route>
          <Route element={<BareLayout />}>
            <Route path="/guild/:guildId/quiz/:quizId" element={<QuizScreen />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}