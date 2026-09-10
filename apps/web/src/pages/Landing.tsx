import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button, Icon, LogoMark, GoogleLogo, type IconName } from "@/components/ui";

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "users", title: "Guilds", desc: "Private study groups with invite links" },
  { icon: "target", title: "Quizzes", desc: "AI-generated questions aligned to the SPM syllabus" },
  { icon: "trophy", title: "Leaderboards", desc: "Compete by subject, chapter, and difficulty" },
];

export default function Landing() {
  const { user, loading, error, signInWithGoogle, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 60%)" }}
        />
      </div>

      <div className="relative w-full max-w-lg text-center">
        <div className="mx-auto mb-8 flex flex-col items-center gap-4">
          <LogoMark size={64} className="shadow-pop" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            SPM study guilds
          </p>
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Study in guilds.
          <br />
          <span className="text-indigo-400">Climb the ranks.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-navy-300">
          Create a private study group, quiz your friends with AI-generated SPM questions,
          and compete on leaderboards.
        </p>

        <div className="mx-auto mt-9 max-w-sm">
          <Button size="lg" className="w-full" onClick={signInWithGoogle}>
            <GoogleLogo size={19} />
            Sign in with Google
          </Button>
          <p className="mt-4 text-[13px] text-navy-500">
            Free for Malaysian Form 4 &amp; 5 science stream students
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-signal-danger/25 bg-signal-danger/10 p-4 text-left animate-slide-down">
              <div className="flex items-start gap-3">
                <Icon name="info" size={18} className="mt-0.5 shrink-0 text-signal-danger" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-signal-danger">{error}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-navy-300">
                    If sign-in still fails, make sure{" "}
                    <code className="rounded bg-navy-800 px-1 py-0.5 font-mono text-[11px] text-navy-200">rivalr-phi.vercel.app</code>{" "}
                    is listed in Firebase Console → Authentication → Authorized domains, and that
                    the <code className="rounded bg-navy-800 px-1 py-0.5 font-mono text-[11px] text-navy-200">firestore.rules</code>{" "}
                    file has been published.
                  </p>
                </div>
                <button
                  onClick={clearError}
                  aria-label="Dismiss error"
                  className="ml-auto shrink-0 rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-800 hover:text-white"
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-3 text-left">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="surface-card p-4 transition-colors hover:border-navy-700"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <Icon name={f.icon} size={18} />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-navy-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}