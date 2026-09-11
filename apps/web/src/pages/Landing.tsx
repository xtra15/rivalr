import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button, Icon, LogoMark, type IconName } from "@/components/ui";

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
      <div className="relative w-full max-w-lg text-center">
        <div className="mx-auto mb-8 flex flex-col items-center gap-4">
          <LogoMark size={64} className="shadow-pop" />
          <p className="eyebrow text-volt">SPM study guilds</p>
        </div>

        <h1 className="font-display text-5xl uppercase leading-none tracking-wide sm:text-6xl">
          Study in guilds.
          <br />
          <span className="text-volt">Climb the ranks.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
          Create a private study group, quiz your friends with AI-generated SPM questions,
          and compete on leaderboards.
        </p>

        <div className="mx-auto mt-9 max-w-sm">
          <Button size="lg" className="w-full" onClick={signInWithGoogle}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-field">
              <span className="font-display text-sm leading-none text-volt">G</span>
            </span>
            Sign in with Google
          </Button>
          <p className="mt-4 text-[13px] text-ink-muted">
            Free for Malaysian Form 4 &amp; 5 science stream students
          </p>

          {error ? (
            <div className="mt-5 rounded-lg border border-danger/25 bg-danger/10 p-4 text-left animate-slide-down">
              <div className="flex items-start gap-3">
                <Icon name="info" size={18} className="mt-0.5 shrink-0 text-danger" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-danger">{error}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                    If sign-in still fails, make sure{" "}
                    <code className="rounded bg-overpanel px-1 py-0.5 font-mono text-[11px] text-ink">rivalr-phi.vercel.app</code>{" "}
                    is in the authorized domains list, and that
                    the{" "}
                    <code className="rounded bg-overpanel px-1 py-0.5 font-mono text-[11px] text-ink">firestore.rules</code>{" "}
                    file has been published.
                  </p>
                </div>
                <button
                  onClick={clearError}
                  aria-label="Dismiss error"
                  className="ml-auto shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-overpanel hover:text-ink"
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
              className="surface-card p-4 transition-colors hover:border-line-strong"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-volt/10 text-volt">
                <Icon name={f.icon} size={18} />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}