import { Check, CheckCircle2, Sparkles } from "lucide-react";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FlavorVisualMeta {
  key: "vanilla" | "stroberi" | "cokelat" | "mix" | "custom";
  nama: string;
  inisial: string;
  tag: string;
  karakter: string;
  deskripsi: string;
  /** Kelas warna area visual atas */
  headerBgClass: string;
  /** Kelas warna badge inisial */
  monogramBgClass: string;
  monogramTextClass: string;
  /** Kelas warna dekorasi lingkaran abstrak */
  decor1Class: string;
  decor2Class: string;
  /** Warna dot/swatch untuk indikator Mix */
  swatchHex: string;
  swatchBorderHex: string;
  /** Kelas aksen ketika kartu dipilih */
  selectedBorderClass: string;
  selectedBgClass: string;
}

const FLAVOR_MAP: Record<"vanilla" | "stroberi" | "cokelat" | "mix", FlavorVisualMeta> = {
  vanilla: {
    key: "vanilla",
    nama: "Vanilla",
    inisial: "V",
    tag: "Soft & Creamy",
    karakter: "Warm Ivory",
    deskripsi: "Kelembutan pudding vanilla klasik dengan aroma harum yang creamy dan manis ringan.",
    headerBgClass: "bg-linear-to-br from-[#FFFDF9] via-[#FAF1E2] to-[#F2E2C9]",
    monogramBgClass: "bg-[#FFFDF9] border-[#DFC8AC] shadow-2xs",
    monogramTextClass: "text-[#704329]",
    decor1Class: "bg-[#E6D2B8]/55",
    decor2Class: "bg-[#D5B895]/35",
    swatchHex: "#F5E4C8",
    swatchBorderHex: "#C8AD8D",
    selectedBorderClass: "border-[#704329] ring-2 ring-[#704329]/20",
    selectedBgClass: "bg-[#FFFDF9]",
  },
  stroberi: {
    key: "stroberi",
    nama: "Stroberi",
    inisial: "S",
    tag: "Fresh & Sweet",
    karakter: "Strawberry Pink",
    deskripsi: "Perpaduan rasa stroberi segar dengan sentuhan manis-asam lembut yang menyegarkan.",
    headerBgClass: "bg-linear-to-br from-[#FFF7F9] via-[#FDE6EC] to-[#F7CED9]",
    monogramBgClass: "bg-[#FFF9FA] border-[#E7B2C0] shadow-2xs",
    monogramTextClass: "text-[#9E3B56]",
    decor1Class: "bg-[#F2BAC9]/50",
    decor2Class: "bg-[#E293A8]/30",
    swatchHex: "#F7C6D4",
    swatchBorderHex: "#D47A92",
    selectedBorderClass: "border-[#704329] ring-2 ring-[#704329]/20",
    selectedBgClass: "bg-[#FFFBFD]",
  },
  cokelat: {
    key: "cokelat",
    nama: "Cokelat",
    inisial: "C",
    tag: "Rich & Elegant",
    karakter: "Cocoa Mocha",
    deskripsi: "Rasa cokelat pekat dan lembut yang memanjakan pecinta dessert cokelat sejati.",
    headerBgClass: "bg-linear-to-br from-[#F7EFEA] via-[#EBDAD0] to-[#DBC0B0]",
    monogramBgClass: "bg-[#5A341E] border-[#704329] shadow-2xs",
    monogramTextClass: "text-[#FFF9EF]",
    decor1Class: "bg-[#8C583A]/25",
    decor2Class: "bg-[#5A341E]/20",
    swatchHex: "#7A492D",
    swatchBorderHex: "#522F1B",
    selectedBorderClass: "border-[#704329] ring-2 ring-[#704329]/20",
    selectedBgClass: "bg-[#FDF9F6]",
  },
  mix: {
    key: "mix",
    nama: "Mix (Campur Rasa)",
    inisial: "MIX",
    tag: "Playful & Versatile",
    karakter: "Trio Signature",
    deskripsi: "Gabungkan 2 hingga 3 rasa sekaligus dalam satu cup sesuai kombinasi favoritmu.",
    headerBgClass: "bg-linear-to-r from-[#FAF0DF] via-[#FDE5EC] to-[#E9D5C8]",
    monogramBgClass: "bg-card/95 border-[#DFC8AC] shadow-2xs",
    monogramTextClass: "text-[#704329]",
    decor1Class: "bg-[#F2BAC9]/40",
    decor2Class: "bg-[#8C583A]/20",
    swatchHex: "#E8C5B0",
    swatchBorderHex: "#704329",
    selectedBorderClass: "border-[#704329] ring-2 ring-[#704329]/20",
    selectedBgClass: "bg-[#FFFCF8]",
  },
};

export function getFlavorVisual(nama: string): FlavorVisualMeta {
  const lower = nama.trim().toLowerCase();
  if (lower.startsWith("vanil")) {
    return { ...FLAVOR_MAP.vanilla, nama };
  }
  if (lower.startsWith("stro") || lower.startsWith("straw")) {
    return { ...FLAVOR_MAP.stroberi, nama };
  }
  if (lower.startsWith("cok") || lower.startsWith("choc")) {
    return { ...FLAVOR_MAP.cokelat, nama };
  }
  if (lower.startsWith("mix") || lower.includes("campur")) {
    return { ...FLAVOR_MAP.mix, nama };
  }
  return {
    ...FLAVOR_MAP.vanilla,
    key: "custom",
    nama,
    inisial: nama.trim().charAt(0).toUpperCase() || "P",
    tag: "Signature Flavor",
    karakter: "Artisanal",
    deskripsi: `Varian rasa ${nama} lembut khas P'crème yang disajikan dingin dengan es krim.`,
  };
}

export const DAFTAR_FLAVOR_PREVIEW: FlavorVisualMeta[] = [
  FLAVOR_MAP.vanilla,
  FLAVOR_MAP.stroberi,
  FLAVOR_MAP.cokelat,
  FLAVOR_MAP.mix,
];

interface FlavorCardProps {
  meta: FlavorVisualMeta;
  hargaPerCup: number;
  maksTopping: number;
  /** Jika diberikan, kartu bersifat selectable (digunakan pada Checkout) */
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}

/**
 * Minimalist Flavor Card berbasis identitas warna (tanpa pengulangan foto produk).
 */
export function FlavorCard({
  meta,
  hargaPerCup,
  maksTopping,
  selected = false,
  onSelect,
  compact = false,
}: FlavorCardProps) {
  const isInteractive = typeof onSelect === "function";
  const isMix = meta.key === "mix";

  const content = (
    <>
      {/* Area Visual Berbasis Warna & Geometri Minimalis */}
      <div
        className={cn(
          "relative overflow-hidden border-b border-[#E9DDCE]/70 transition-colors",
          compact ? "h-20 p-3 sm:h-24 sm:p-3.5" : "h-24 p-3.5 sm:h-28 sm:p-4",
          meta.headerBgClass,
        )}
      >
        {/* Elemen Dekorasi Geometris Abstrak */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-5 -top-5 size-20 rounded-full transition-transform duration-300 group-hover:scale-110 sm:size-24",
            meta.decor1Class,
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -bottom-6 right-8 size-14 rounded-full transition-transform duration-300 group-hover:scale-105 sm:size-16",
            meta.decor2Class,
          )}
        />

        <div className="relative z-10 flex h-full items-center justify-between gap-2">
          {/* Inisial / Simbol Visual Rasa */}
          {isMix ? (
            <div className="flex items-center gap-1.5">
              <div
                aria-hidden
                className="flex items-center -space-x-2 rounded-2xl border border-[#DFC8AC] bg-card/90 px-2.5 py-1.5 shadow-2xs backdrop-blur-xs sm:py-2"
              >
                <span
                  className="size-4 rounded-full border border-[#C8AD8D] shadow-2xs sm:size-5"
                  style={{ backgroundColor: FLAVOR_MAP.vanilla.swatchHex }}
                  title="Vanilla"
                />
                <span
                  className="size-4 rounded-full border border-[#D47A92] shadow-2xs sm:size-5"
                  style={{ backgroundColor: FLAVOR_MAP.stroberi.swatchHex }}
                  title="Stroberi"
                />
                <span
                  className="size-4 rounded-full border border-[#522F1B] shadow-2xs sm:size-5"
                  style={{ backgroundColor: FLAVOR_MAP.cokelat.swatchHex }}
                  title="Cokelat"
                />
              </div>
            </div>
          ) : (
            <div
              aria-hidden
              className={cn(
                "flex shrink-0 items-center justify-center rounded-2xl border font-heading font-extrabold tracking-tight transition-transform duration-200 group-hover:scale-105",
                compact ? "size-10 text-base sm:size-11 sm:text-lg" : "size-11 text-lg sm:size-12 sm:text-xl",
                meta.monogramBgClass,
                meta.monogramTextClass,
              )}
            >
              {meta.inisial}
            </div>
          )}

          {/* Badge Karakter & Indikator Selected */}
          <div className="flex min-w-0 flex-col items-end gap-1">
            {isInteractive && (
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all sm:size-6",
                  selected
                    ? "border-[#704329] bg-[#704329] text-[#FFF9EF] shadow-2xs"
                    : "border-[#D5C3B0] bg-white/80 text-transparent",
                )}
                aria-hidden
              >
                <Check className="size-3 stroke-[2.75] sm:size-3.5" />
              </span>
            )}
            <span className="truncate rounded-full border border-[#E9DDCE] bg-white/85 px-2.5 py-0.5 text-[10px] font-semibold text-[#5A3A28] backdrop-blur-xs sm:text-[11px]">
              {meta.tag}
            </span>
          </div>
        </div>
      </div>

      {/* Area Konten & Informasi Varian */}
      <div className={cn("flex min-w-0 flex-1 flex-col justify-between", compact ? "p-3 sm:p-3.5" : "p-3.5 sm:p-4")}>
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="min-w-0 wrap-break-word font-heading text-sm font-bold leading-snug text-foreground sm:text-base">
              {meta.nama}
            </h4>
            <span className="shrink-0 font-heading text-xs font-bold tabular-nums text-primary sm:text-sm">
              {rupiah(hargaPerCup)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{meta.deskripsi}</p>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-[#E9DDCE]/70 pt-2 text-[11px] sm:mt-3 sm:pt-2.5">
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            <span>Maks. {maksTopping} topping</span>
          </span>
          {isInteractive && (
            <span
              className={cn(
                "font-semibold",
                selected ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              {selected ? "✓ Terpilih" : "Pilih rasa"}
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "group flex h-full min-w-0 w-full cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
          selected
            ? cn(meta.selectedBorderClass, meta.selectedBgClass, "shadow-xs")
            : "border-border bg-card hover:border-primary/45 hover:shadow-2xs",
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <article className="group flex h-full min-w-0 w-full flex-col overflow-hidden rounded-3xl border bg-card shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
      {content}
    </article>
  );
}

/**
 * Visualisasi kombinasi rasa untuk mode Mix (menampilkan proporsi warna dari 2–3 rasa yang dipilih).
 */
export function MixCombinationPreview({
  rasaOptions,
  selectedMix,
  onToggleRasa,
}: {
  rasaOptions: string[];
  selectedMix: string[];
  onToggleRasa: (rasa: string, checked: boolean) => void;
}) {
  const valid = selectedMix.length >= 2;

  return (
    <div className="space-y-3 rounded-2xl border border-[#E5C5CE] bg-linear-to-br from-[#FFFDF9] via-[#FFF6F8] to-[#F7EFEA] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <p className="text-xs font-semibold text-foreground sm:text-sm">
            Pilih kombinasi rasa Mix (minimal 2 rasa, maksimal 3 rasa):
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums",
            valid
              ? "border-emerald-300 bg-emerald-100/90 text-emerald-950"
              : "border-amber-300 bg-amber-100/90 text-amber-950",
          )}
        >
          {selectedMix.length}/3 rasa dipilih
        </span>
      </div>

      {/* Pilihan Rasa untuk Digabungkan */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        {rasaOptions.map((rasa) => {
          const meta = getFlavorVisual(rasa);
          const terpilih = selectedMix.includes(rasa);
          return (
            <button
              key={`mix-opt-${rasa}`}
              type="button"
              onClick={() => onToggleRasa(rasa, !terpilih)}
              aria-pressed={terpilih}
              className={cn(
                "flex items-center justify-between gap-2.5 rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                terpilih
                  ? "border-[#704329] bg-card font-semibold text-foreground shadow-2xs ring-2 ring-[#704329]/15"
                  : "border-border bg-card/75 text-muted-foreground hover:border-primary/40 hover:bg-card hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border font-heading text-xs font-bold shadow-2xs"
                  style={{
                    backgroundColor: meta.swatchHex,
                    borderColor: meta.swatchBorderHex,
                    color: meta.key === "cokelat" ? "#FFF9EF" : "#35251E",
                  }}
                >
                  {meta.inisial}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold text-foreground sm:text-sm">
                    {rasa}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {meta.tag}
                  </span>
                </div>
              </div>
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  terpilih
                    ? "border-[#704329] bg-[#704329] text-[#FFF9EF]"
                    : "border-[#D5C3B0] bg-background text-transparent",
                )}
              >
                <Check className="size-3 stroke-[2.75]" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Bar Visualisasi Kombinasi Warna Mix */}
      <div className="space-y-1.5 rounded-xl border border-[#E9DDCE] bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Visualisasi Cup Mix:</span>
          <span className="wrap-break-word font-heading font-bold text-primary">
            {selectedMix.length >= 2
              ? `Mix (${selectedMix.join(" + ")})`
              : selectedMix.length === 1
                ? `${selectedMix[0]} + (pilih minimal 1 rasa lagi)`
                : "Pilih minimal 2 rasa di atas"}
          </span>
        </div>
        <div
          aria-hidden
          className="flex h-3.5 w-full overflow-hidden rounded-full border border-[#DFC8AC] bg-secondary p-0.5"
        >
          {selectedMix.length > 0 ? (
            selectedMix.map((rasa) => {
              const m = getFlavorVisual(rasa);
              return (
                <div
                  key={`bar-${rasa}`}
                  className="h-full flex-1 transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                  style={{ backgroundColor: m.swatchHex }}
                  title={rasa}
                />
              );
            })
          ) : (
            <div className="h-full w-full rounded-full bg-muted" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== TOPPING VISUALIZATION ==================== */

export interface ToppingVisualMeta {
  key: "oreo" | "nyam" | "choco" | "sprinkle" | "custom";
  nama: string;
  tagline: string;
  deskripsi: string;
  badgeBgClass: string;
}

export function getToppingVisual(nama: string): ToppingVisualMeta {
  const lower = nama.trim().toLowerCase();
  if (lower.includes("oreo")) {
    return {
      key: "oreo",
      nama,
      tagline: "Crunchy cookies",
      deskripsi: "Remahan biskuit cokelat hitam renyah dengan krim vanila.",
      badgeBgClass: "bg-[#F3ECE6] border-[#D8C7B8]",
    };
  }
  if (lower.includes("nyam")) {
    return {
      key: "nyam",
      nama,
      tagline: "Sweet chocolate",
      deskripsi: "Rice crispy renyah berpadu saus cokelat manis favorit.",
      badgeBgClass: "bg-[#FBF1E3] border-[#E4CCA8]",
    };
  }
  if (lower.includes("choco") || lower.includes("crunch")) {
    return {
      key: "choco",
      nama,
      tagline: "Chocolate crunch",
      deskripsi: "Sereal cokelat ekstra renyah dengan rasa kokoa yang kaya.",
      badgeBgClass: "bg-[#F2E4DA] border-[#D6B8A3]",
    };
  }
  if (lower.includes("sprinkle") || lower.includes("meses")) {
    return {
      key: "sprinkle",
      nama,
      tagline: "Colorful topping",
      deskripsi: "Taburan sprinkle warna-warni pastel yang manis dan ceria.",
      badgeBgClass: "bg-[#FDEBF0] border-[#EDC2CE]",
    };
  }
  return {
    key: "custom",
    nama,
    tagline: "Special topping",
    deskripsi: `Topping ${nama} pilihan untuk melengkapi pudding P'crème.`,
    badgeBgClass: "bg-secondary border-border",
  };
}

/** Ilustrasi CSS/SVG minimalis untuk masing-masing topping (tanpa foto). */
function ToppingIllustration({ tipe }: { tipe: ToppingVisualMeta["key"] }) {
  if (tipe === "oreo") {
    return (
      <span
        aria-hidden
        className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#D8C7B8] bg-[#F5EFEA]"
      >
        <span className="flex size-6 items-center justify-center rounded-full border-2 border-[#2A1E19] bg-[#3B2A23] shadow-2xs">
          <span className="size-2 rounded-full bg-[#FFF9EF]" />
        </span>
        <span className="absolute bottom-1 right-1 size-2 rounded-full bg-[#2A1E19]" />
      </span>
    );
  }

  if (tipe === "nyam") {
    return (
      <span
        aria-hidden
        className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#E4CCA8] bg-[#FBF2E4]"
      >
        <span className="grid grid-cols-2 gap-0.5">
          <span className="size-2.5 rounded-full border border-[#8C583A] bg-[#E8C594]" />
          <span className="size-2.5 rounded-full border border-[#5A341E] bg-[#704329]" />
          <span className="size-2.5 rounded-full border border-[#5A341E] bg-[#8C583A]" />
          <span className="size-2.5 rounded-full border border-[#8C583A] bg-[#DFB47C]" />
        </span>
      </span>
    );
  }

  if (tipe === "choco") {
    return (
      <span
        aria-hidden
        className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#D6B8A3] bg-[#F3E5DC]"
      >
        <span className="flex items-center -space-x-1">
          <span className="h-4 w-3 -rotate-14 rounded-tl-full rounded-tr-full rounded-bl-md rounded-br-md border border-[#4A2916] bg-[#704329]" />
          <span className="h-4 w-3 rotate-12 rounded-tl-full rounded-tr-full rounded-bl-md rounded-br-md border border-[#5A341E] bg-[#946043]" />
        </span>
      </span>
    );
  }

  if (tipe === "sprinkle") {
    return (
      <span
        aria-hidden
        className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#EDC2CE] bg-[#FFF0F4]"
      >
        <span className="relative size-6">
          <span className="absolute left-0.5 top-1 h-1.5 w-3 -rotate-25 rounded-full bg-[#E06D8B]" />
          <span className="absolute right-0 top-1.5 h-1.5 w-3 rotate-30 rounded-full bg-[#D99B38]" />
          <span className="absolute bottom-1 left-1 h-1.5 w-3 rotate-15 rounded-full bg-[#704329]" />
          <span className="absolute bottom-1 right-0.5 h-1.5 w-2.5 -rotate-20 rounded-full bg-[#6BA3BE]" />
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-secondary text-primary"
    >
      <Sparkles className="size-4" />
    </span>
  );
}

interface ToppingMiniCardProps {
  nama: string;
  selected?: boolean;
  disabled?: boolean;
  onToggle?: (checked: boolean) => void;
}

/**
 * Minimalist Selectable Mini Card untuk pilihan topping (maksimal 2 per cup).
 */
export function ToppingMiniCard({
  nama,
  selected = false,
  disabled = false,
  onToggle,
}: ToppingMiniCardProps) {
  const meta = getToppingVisual(nama);
  const isInteractive = typeof onToggle === "function";

  const inner = (
    <div className="flex min-w-0 w-full items-center justify-between gap-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <ToppingIllustration tipe={meta.key} />
        <div className="min-w-0">
          <p className="wrap-break-word font-heading text-xs font-bold leading-snug text-foreground sm:text-sm">
            {meta.nama}
          </p>
          <p className="wrap-break-word text-[11px] font-medium leading-tight text-muted-foreground">
            {meta.tagline}
          </p>
        </div>
      </div>

      {isInteractive && (
        <span
          aria-hidden
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
            selected
              ? "border-[#704329] bg-[#704329] text-[#FFF9EF] shadow-2xs"
              : "border-[#D5C3B0] bg-background text-transparent",
          )}
        >
          <Check className="size-3 stroke-[2.75]" />
        </span>
      )}
    </div>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(!selected)}
        aria-pressed={selected}
        className={cn(
          "group flex min-h-14 min-w-0 w-full cursor-pointer items-center rounded-2xl border p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
          selected
            ? "border-[#704329] bg-[#FFFDF9] shadow-2xs ring-2 ring-[#704329]/15"
            : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40",
          disabled && "cursor-not-allowed opacity-45 hover:border-border hover:bg-card",
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="flex min-h-14 min-w-0 w-full items-center rounded-2xl border bg-card p-3 shadow-2xs">
      {inner}
    </div>
  );
}
