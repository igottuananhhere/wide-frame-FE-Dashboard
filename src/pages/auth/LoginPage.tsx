import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { MOCK_AUTH_USERS } from "../../data/mock/authUsers";
import { useAuthStore } from "../../features/auth/authStore";
import ICSLogo from "../../components/common/ICSLogo";
import { useLoginTransitionStore } from "../../features/auth/loginTransitionStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const beginTransition = useLoginTransitionStore((state) => state.begin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedLogin, setHasSubmittedLogin] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated && !hasSubmittedLogin) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isExiting) return;

    setError(null);
    setIsSubmitting(true);
    setHasSubmittedLogin(true);
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    const result = login(username, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError("Invalid username or password. Check your credentials and try again.");
      return;
    }

    setIsExiting(true);
    beginTransition();
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => navigate("/dashboard/overview", { replace: true }), reduceMotion ? 0 : 260);
  };

  return (
    <main className={`login-page${isExiting ? " login-page--exiting" : ""}`}>
      <div aria-hidden="true" className="login-edge-lines login-edge-lines--left" />
      <div aria-hidden="true" className="login-edge-lines login-edge-lines--right" />
      <div aria-hidden="true" className="auth-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 -top-48 size-[34rem] rounded-full bg-accent/10 blur-[120px]"
      />

      <div className="login-shell">
        <section className="hidden flex-col justify-between px-12 py-10 lg:flex xl:px-20">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
              <Building2 aria-hidden="true" size={23} />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.14em]">ICS DIGITAL TWIN</p>
              <p className="mt-1 text-xs text-text-secondary">Building Operations Platform</p>
            </div>
          </div>

          <div className="max-w-xl py-16">
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              <span className="h-px w-8 bg-accent" />
              ICS Headquarters · Floors 1–2
            </p>
            <h1 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
              A clearer view of the building around you.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-text-secondary">
              One trusted place to understand building operations, spaces, and connected assets.
            </p>

            <div className="relative mt-12 h-52 max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-surface/70 p-5">
              <div aria-hidden="true" className="auth-grid absolute inset-0 opacity-60" />
              <svg
                aria-hidden="true"
                className="relative h-full w-full"
                fill="none"
                viewBox="0 0 520 180"
              >
                <path d="M34 28h150v52h-62v67H34z" stroke="#527086" strokeWidth="1.5" />
                <path d="M184 28h117v52h-55v67H122V80h62z" stroke="#527086" strokeWidth="1.5" />
                <path d="M301 28h183v119H246V80h55z" stroke="#527086" strokeWidth="1.5" />
                <path d="M184 80h117M122 114h124M301 80h99" stroke="#30485d" strokeWidth="1" />
                <circle cx="88" cy="57" r="5" fill="#22d3ee" />
                <circle cx="211" cy="110" r="5" fill="#34d399" />
                <circle cx="356" cy="57" r="5" fill="#22d3ee" />
                <circle cx="438" cy="119" r="5" fill="#fbbf24" />
                <path d="M88 57h42m81 53h51m94-53h46m36 62h-30" stroke="#22d3ee" strokeDasharray="3 5" strokeOpacity=".6" />
              </svg>
              <div className="absolute bottom-4 left-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                <span className="size-1.5 rounded-full bg-accent" />
                Digital Twin · Floors 1–2
              </div>
            </div>
          </div>

          <p className="text-xs text-text-muted">
            PHASE 1 ACCESS · MOCK AUTHENTICATION FOR DEVELOPMENT
          </p>
        </section>

        <section aria-label="ICS Digital Twin sign in" className="login-panel">
          <div className="w-full max-w-md">
            <div className="login-brand">
              <ICSLogo className="login-brand-logo" />
            </div>
            <div className="mb-7 flex items-center justify-between gap-4 lg:justify-end">
              <div className="flex items-center gap-2 lg:hidden">
                <Building2 aria-hidden="true" className="text-accent" size={21} />
                <span className="text-xs font-semibold tracking-[0.14em]">ICS DIGITAL TWIN</span>
              </div>
              <div
                className="inline-flex items-center gap-2 rounded-full border border-status-normal/25 bg-status-normal/10 px-3 py-1.5 text-xs font-medium text-status-normal"
                role="status"
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-status-normal" />
                Platform Online
              </div>
            </div>

            <div className={`login-card${isExiting ? " login-card--exit" : ""}`}>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  ICS DIGITAL TWIN
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Welcome back</h2>
                <p className="mt-2 text-sm text-text-secondary">Building Operations Platform</p>
              </div>

              <div className="mb-6 flex items-start gap-3 rounded-xl border border-status-warning/25 bg-status-warning/5 px-4 py-3">
                <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-status-warning" />
                <p className="text-xs leading-5 text-text-secondary">
                  <span className="font-semibold text-status-warning">Mock only.</span>{" "}
                  Development authentication; credentials are stored in frontend mock data.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="username">
                    Username
                  </label>
                  <input
                    autoComplete="username"
                    className="min-h-12 w-full rounded-lg border border-border bg-background px-4 text-sm text-text-primary outline-none transition placeholder:text-text-muted/80 focus:border-accent focus:ring-2 focus:ring-accent/20"
                    id="username"
                    name="username"
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your username"
                    required
                    value={username}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      autoComplete="current-password"
                      className="min-h-12 w-full rounded-lg border border-border bg-background py-3 pl-4 pr-12 text-sm text-text-primary outline-none transition placeholder:text-text-muted/80 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      id="password"
                      name="password"
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError(null);
                      }}
                      placeholder="Enter your password"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-text-secondary outline-none transition hover:text-text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      onClick={() => setShowPassword((visible) => !visible)}
                      type="button"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p aria-live="assertive" className="rounded-lg border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting || !username.trim() || !password}
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight aria-hidden="true" size={17} />
                    </>
                  )}
                </button>
              </form>

              <details className="group mt-6 border-t border-border pt-5">
                <summary className="cursor-pointer list-none text-xs font-medium text-text-secondary outline-none marker:hidden hover:text-text-primary focus-visible:rounded focus-visible:ring-2 focus-visible:ring-accent">
                  Show mock test accounts
                </summary>
                <div className="mt-4 space-y-2">
                  {MOCK_AUTH_USERS.map((account) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-surface-secondary px-3 py-2.5 text-xs"
                      key={account.username}
                    >
                      <span className="font-semibold text-text-primary">{account.role}</span>
                      <code className="text-text-secondary">
                        {account.username} / {account.password}
                      </code>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-text-muted">
              Access is for the ICS Headquarters Floors 1–2 simulation.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
