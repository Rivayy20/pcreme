"use client";

import { Copy, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  FlavorCard,
  getFlavorVisual,
  MixCombinationPreview,
  ToppingMiniCard,
} from "@/components/public/FlavorToppingVisuals";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { rupiah } from "@/lib/format";
import { labelRasaCup, type KonfigurasiCup, type ModeRasa } from "@/lib/order-meta";
import { cn } from "@/lib/utils";

interface CupConfiguratorCardProps {
  index: number;
  cup: KonfigurasiCup;
  hargaPerCup: number;
  rasaOptions: string[];
  toppingOptions: string[];
  maksTopping: number;
  totalCup: number;
  maksTotalCup: number;
  canRemove: boolean;
  canDuplicate: boolean;
  errorRasa?: string;
  errorTopping?: string;
  onUpdate: (patch: Partial<KonfigurasiCup>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function CupConfiguratorCard({
  index,
  cup,
  hargaPerCup,
  rasaOptions,
  toppingOptions,
  maksTopping,
  totalCup,
  maksTotalCup,
  canRemove,
  canDuplicate,
  errorRasa,
  errorTopping,
  onUpdate,
  onDuplicate,
  onRemove,
}: CupConfiguratorCardProps) {
  const [confirmHapus, setConfirmHapus] = useState(false);

  const ringkasanRasa = labelRasaCup(cup);
  const toppingPenuh = cup.topping.length >= maksTopping;

  function pilihMode(mode: ModeRasa) {
    if (mode === cup.mode) return;
    if (mode === "mix") {
      // Jika sebelumnya sudah ada rasaTunggal, jadikan awal pilihan Mix
      const awalMix = cup.rasaTunggal ? [cup.rasaTunggal] : [];
      onUpdate({ mode: "mix", rasaMix: awalMix });
    } else {
      const awalTunggal = cup.rasaMix[0] ?? cup.rasaTunggal ?? rasaOptions[0] ?? "";
      onUpdate({ mode: "single", rasaTunggal: awalTunggal });
    }
  }

  function toggleMixRasa(rasa: string, checked: boolean) {
    if (checked && cup.rasaMix.length >= 3) return;
    const next = checked
      ? [...cup.rasaMix, rasa]
      : cup.rasaMix.filter((r) => r !== rasa);
    onUpdate({ rasaMix: next });
  }

  function toggleTopping(top: string, checked: boolean) {
    const next = checked
      ? [...cup.topping, top]
      : cup.topping.filter((t) => t !== top);
    onUpdate({ topping: next });
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-4 rounded-3xl border bg-card p-4 shadow-xs transition-all sm:p-5">
      {/* Header Cup */}
      <div className="flex flex-wrap items-start justify-between gap-2.5 border-b pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary px-3 py-0.5 font-heading text-xs font-semibold text-primary-foreground">
              Cup #{index + 1}
            </span>
            <span className="font-heading text-xs font-bold tabular-nums text-primary">
              {rupiah(cup.qty * hargaPerCup)} ({cup.qty} cup)
            </span>
          </div>
          <p className="mt-1.5 wrap-break-word text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{ringkasanRasa}</span>
            {" · "}
            {cup.topping.length > 0 ? `Topping: ${cup.topping.join(" + ")}` : "Tanpa topping"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-3 text-xs"
            disabled={!canDuplicate}
            onClick={onDuplicate}
            title={`Duplikat konfigurasi Cup #${index + 1}`}
          >
            <Copy className="size-3.5" aria-hidden /> Duplikat
          </Button>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmHapus(true)}
              aria-label={`Hapus Cup #${index + 1}`}
            >
              <Trash2 className="size-3.5" aria-hidden /> Hapus
            </Button>
          )}
        </div>
      </div>

      {/* Pilihan Mode Rasa & Minimalist Flavor Cards */}
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">1. Pilih Varian Rasa</span>
          <span className="text-xs text-muted-foreground">
            {cup.mode === "mix" ? "Mode Mix (gabungkan 2–3 rasa)" : "Pilih 1 rasa atau Mix"}
          </span>
        </div>

        {/* Grid Minimalist Flavor Cards */}
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="group"
          aria-label={`Pilihan rasa Cup #${index + 1}`}
        >
          {rasaOptions.map((rasa) => {
            const aktifTunggal = cup.mode === "single" && cup.rasaTunggal === rasa;
            const meta = getFlavorVisual(rasa);
            return (
              <FlavorCard
                key={rasa}
                meta={meta}
                hargaPerCup={hargaPerCup}
                maksTopping={maksTopping}
                selected={aktifTunggal}
                onSelect={() => onUpdate({ mode: "single", rasaTunggal: rasa })}
                compact
              />
            );
          })}

          {rasaOptions.length >= 2 && (
            <FlavorCard
              meta={getFlavorVisual("Mix (Campur Rasa)")}
              hargaPerCup={hargaPerCup}
              maksTopping={maksTopping}
              selected={cup.mode === "mix"}
              onSelect={() => pilihMode("mix")}
              compact
            />
          )}
        </div>

        {/* Sub-pilihan kombinasi ketika Mix dipilih */}
        {cup.mode === "mix" && (
          <MixCombinationPreview
            rasaOptions={rasaOptions}
            selectedMix={cup.rasaMix}
            onToggleRasa={toggleMixRasa}
          />
        )}

        {errorRasa && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errorRasa}
          </p>
        )}
      </div>

      {/* Pilihan Topping Minimalist Mini Cards */}
      {toppingOptions.length > 0 && maksTopping > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-foreground">2. Pilih Topping</span>
              <p className="text-xs text-muted-foreground">
                Maksimal {maksTopping} topping untuk Cup #{index + 1}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
                toppingPenuh
                  ? "border-[#704329]/30 bg-secondary text-primary"
                  : "border-border bg-muted/60 text-muted-foreground",
              )}
            >
              {cup.topping.length}/{maksTopping} topping
            </span>
          </div>

          <div
            className="grid gap-2.5 sm:grid-cols-2"
            role="group"
            aria-label={`Pilihan topping Cup #${index + 1}`}
          >
            {toppingOptions.map((t) => {
              const terpilih = cup.topping.includes(t);
              return (
                <ToppingMiniCard
                  key={t}
                  nama={t}
                  selected={terpilih}
                  disabled={!terpilih && toppingPenuh}
                  onToggle={(checked) => toggleTopping(t, checked)}
                />
              );
            })}
          </div>

          {toppingPenuh && (
            <p className="rounded-xl border border-[#DFC8AC] bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
              Batas maksimal <strong>{maksTopping}/{maksTopping} topping</strong> untuk Cup #{index + 1} sudah tercapai. Klik kembali salah satu topping terpilih jika ingin mengganti pilihan.
            </p>
          )}
          {errorTopping && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errorTopping}
            </p>
          )}
        </div>
      )}

      {/* Jumlah Cup untuk konfigurasi ini */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/70 px-3.5 py-3">
        <div className="min-w-0">
          <span id={`qty-label-${cup.id}`} className="block text-sm font-semibold text-foreground">
            Jumlah Cup
          </span>
          <p className="text-xs font-medium tabular-nums text-muted-foreground">
            Subtotal: <strong className="text-primary">{rupiah(cup.qty * hargaPerCup)}</strong>
          </p>
        </div>
        <div role="group" aria-labelledby={`qty-label-${cup.id}`} className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="size-11 rounded-full bg-card"
            disabled={cup.qty <= 1}
            onClick={() => onUpdate({ qty: Math.max(1, cup.qty - 1) })}
            aria-label={`Kurangi jumlah Cup #${index + 1}`}
          >
            <Minus className="size-4" aria-hidden />
          </Button>
          <output className="w-9 text-center font-heading text-base font-bold tabular-nums" aria-live="polite">
            {cup.qty}
          </output>
          <Button
            type="button"
            variant="outline"
            className="size-11 rounded-full bg-card"
            disabled={totalCup >= maksTotalCup}
            onClick={() => onUpdate({ qty: cup.qty + 1 })}
            aria-label={`Tambah jumlah Cup #${index + 1}`}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Dialog Konfirmasi Hapus Cup */}
      <AlertDialog open={confirmHapus} onOpenChange={setConfirmHapus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus konfigurasi Cup #{index + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              Konfigurasi <strong>{ringkasanRasa}</strong> ({cup.qty} cup) akan dihapus dari daftar pesanan kamu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirmHapus(false);
                onRemove();
              }}
            >
              Ya, Hapus Cup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
