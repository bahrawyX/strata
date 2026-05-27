import { Btn, Eyebrow } from "./primitives";

export function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section
      className="relative flex min-h-[100vh] items-center overflow-hidden pt-20"
      data-screen-label="01 Hero"
    >
        <div
          className="hero-glow absolute"
          style={{
            top: "35%",
            left: "50%",
            width: 800,
            height: 800,
            marginLeft: -400,
            marginTop: -400,
          }}
        />

      <div className="relative z-1 mx-auto flex w-full max-w-300 flex-col items-center gap-6 px-8 text-center">
        <div className="anim-fade-up" style={{ animationDelay: "0ms" }}>
          <Eyebrow>Your database. Your interface.</Eyebrow>
        </div>
        <h1
          className="font-display text-[clamp(40px,6.5vw,80px)] leading-[1.05] tracking-tight"
        >
          <span
            className="anim-line block"
            style={{ animationDelay: "120ms" }}
          >
            The layer between
          </span>
          <span
            className="anim-line block"
            style={{ animationDelay: "200ms" }}
          >
            <em>you and your data.</em>
          </span>
        </h1>
        <p
          className="anim-fade-up max-w-[540px] text-[18px] leading-[1.55] text-[var(--text-secondary)]"
          style={{ animationDelay: "320ms" }}
        >
          Connect any PostgreSQL database in seconds. Browse tables, run
          queries, and edit data — without ever leaving your workflow.
        </p>
        <div
          className="anim-fade-up mt-3 flex items-center gap-3"
          style={{ animationDelay: "460ms" }}
        >
          <Btn href={isAuthed ? "/connections" : "/signup"}>
            {isAuthed ? "Open dashboard" : "Start for free"}
          </Btn>
          <Btn href="#how" variant="ghost">
            See how it works
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Btn>
        </div>
        <div
          className="anim-fade-up mt-4 font-mono text-[13px] text-[var(--text-muted)]"
          style={{ animationDelay: "620ms" }}
        >
          Trusted by engineers at Neon, Supabase
          <span className="mx-2 text-[var(--text-disabled)]">·</span>
          200+ teams shipping production data
        </div>
      </div>
    </section>
  );
}
