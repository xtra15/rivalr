import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { Layout, BareLayout } from "@/components/layout";
import { ToastProvider } from "@/components/ui";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import GuildHome from "@/pages/GuildHome";
import QuizLobby from "@/pages/QuizLobby";
import QuizScreen from "@/pages/QuizScreen";
import Results from "@/pages/Results";
import Profile from "@/pages/Profile";
import Shop from "@/pages/Shop";

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
          </Route>
          <Route element={<BareLayout />}>
            <Route path="/guild/:guildId/quiz/:quizId" element={<QuizScreen />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}