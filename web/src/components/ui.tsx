import { useState, type ReactNode, type ButtonHTMLAttributes } from "react";

export function PageHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">{kicker}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-white/70 p-5 shadow-[0_1px_2px_rgba(35,32,27,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary:
      "bg-clay text-paper hover:bg-clay-deep disabled:bg-line disabled:text-ink-soft",
    secondary:
      "border border-ink/20 bg-transparent text-ink hover:border-clay hover:text-clay disabled:opacity-50",
    ghost: "text-clay hover:text-clay-deep disabled:opacity-50",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  );
}

/** Inline framework helper text — the methodology, right where it's used. */
export function FrameworkNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-2xl border border-pine/20 bg-pine-soft p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-pine">📖 {title}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-ink">{children}</div>
    </aside>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-2xl border border-gold/40 bg-gold-soft p-4 text-sm leading-relaxed text-ink">
      <span className="font-bold">⚠ 70–80% rule:</span> {children}
    </aside>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-ink-soft">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-clay" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-clay/40 bg-rust-soft px-4 py-3 text-sm text-clay-deep" role="alert">
      {message}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20";

export function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-pine">{label}</p>
        <button
          className="text-xs font-semibold text-clay hover:text-clay-deep"
          onClick={() => {
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>
    </div>
  );
}

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-slate-soft text-ink-soft" },
  messaged: { label: "Messaged", cls: "bg-gold-soft text-gold" },
  loom_sent: { label: "Loom sent", cls: "bg-rust-soft text-clay-deep" },
  replied: { label: "Replied", cls: "bg-pine-soft text-pine" },
  call_booked: { label: "Call booked", cls: "bg-pine text-paper" },
};

export function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
  );
}
