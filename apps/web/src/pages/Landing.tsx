import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button, Icon, LogoMark, SubjectPill, RankBadge, type IconName } from "@/components/ui";

const DEMO = [
  { name: "Aqil", accuracy: "92%", subject: "Chemistry", xp: 2480 },
  { name: "Hana", accuracy: "88%", subject: "Biology", xp: 2210 },
  { name: "Danial", accuracy: "84%", subject: "Physics", xp: 1975 },
  { name: "Syafiq", accuracy: "79%", subject: "Additional Mathematics", xp: 1640 },
  { name: "Nurul", accuracy: "76%", subject: "Chemistry", xp: 1420 },
];

const FEATURES: { stat: string; title: string; body: string; icon: IconName }[] = [
  { stat: "72", title: "chapters covered", body: "Every Form 4 and Form 5 chapter across the science stream.", icon: "book" },
  { stat: "4", title: "subjects", body: "Biology, Chemistry, Physics and Additional Mathematics.", icon: "target" },
  { stat: "1", title: "private guild", body: "Invite-only groups. Just you and your friends.", icon: "users" },
];

export default function Landing() {
  const { user, loading, error, signInWithGoogle, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-field">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex h-16 items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-lg uppercase tracking-wide">rivalr</span>
        </div>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[3fr_2fr] lg:py-20">
          <div>
            <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-wide sm:text-6xl">
              Your friends are already ahead.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
              Rivalr is where Form 4 and 5 students quiz by chapter, track each other's stats, and
              compete on leaderboards. Private groups only.
            </p>

            <div className="mt-8 max-w-sm">
              <Button size="lg" className="w-full" onClick={signInWithGoogle}>
                Sign in with Google
              </Button>
              <p className="mt-3 text-[13px] text-ink-faint">
                Free for Malaysian Form 4 and Form 5 science stream students.
              </p>

              {error ? (
                <div className="mt-5 rounded-lg border border-danger/25 bg-danger/10 p-4 text-left animate-slide-down">
                  <div className="flex items-start gap-3">
                    <Icon name="info" size={18} className="mt-0.5 shrink-0 text-danger" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-danger">{error}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                        If sign-in still fails, make sure{" "}
                        <code className="rounded bg-overpanel px-1 py-0.5 font-mono text-[11px] text-ink">rivalr-phi.vercel.app</code>{" "}
                        is in the authorized domains list, and that the{" "}
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
          </div>

          <DemoLeaderboard />
        </section>

        <section className="grid gap-8 border-t border-line py-12 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.stat}>
              <p className="font-display text-5xl leading-none text-volt">{f.stat}</p>
              <p className="mt-2 text-sm font-medium text-ink">{f.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </div>

      <footer className="border-t border-line px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-xs text-ink-faint">© 2025 Rivalr. Built for SPM students.</p>
        </div>
      </footer>
    </div>
  );
}

function DemoLeaderboard() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[13px] text-ink-muted">Biology · Chapter 6</p>
        <span className="flex items-center gap-2 rounded-md border border-line bg-field px-2.5 py-1">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-volt" />
          <span className="eyebrow text-volt">Live</span>
        </span>
      </div>
      <div className="divide-y divide-line">
        {DEMO.map((row, i) => (
          <div key={row.name} className="flex items-center gap-3 px-4 py-3">
            <RankBadge rank={i} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.name}</p>
              <div className="mt-0.5">
                <SubjectPill subject={row.subject} />
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm tabular-nums text-ink">{row.accuracy}</p>
              <p className="font-mono text-[11px] tabular-nums text-ink-muted">{row.xp} XP</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}