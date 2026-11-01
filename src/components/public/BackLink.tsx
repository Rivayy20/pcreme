import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Tombol kembali berbentuk ikon (target sentuh 44px). `label` dibaca screen reader dan jadi tooltip. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border bg-card text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60"
    >
      <ArrowLeft className="size-5" aria-hidden />
    </Link>
  );
}
