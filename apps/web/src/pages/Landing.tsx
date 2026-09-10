import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function Landing() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="animate-fade-in max-w-lg text-center">
        <div className="mb-6 text-5xl">⚡</div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          rivalr
        </h1>
        <p className="mt-4 text-lg text-navy-300">
          Study guilds for SPM students. Create a group, quiz with friends, and
          compete on leaderboards.
        </p>

        <div className="mt-8 space-y-3">
          <Button size="lg" className="w-full" onClick={signInWithGoogle}>
            Sign in with Google
          </Button>
          <p className="text-xs text-navy-500">
            Free for Malaysian Form 4 & 5 science stream students
          </p>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 text-left">
          {[
            { icon: "👥", title: "Guilds", desc: "Private study groups with invite links" },
            { icon: "🎯", title: "Quizzes", desc: "AI-generated questions aligned to SPM syllabus" },
            { icon: "🏆", title: "Leaderboards", desc: "Compete by subject, chapter, and difficulty" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-navy-700 bg-navy-800 p-4">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-2 font-semibold text-sm">{f.title}</h3>
              <p className="mt-1 text-xs text-navy-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
