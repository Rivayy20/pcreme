"use client";

import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface BarisUrutProps {
  judul: string;
  subjudul?: string;
  aktif: boolean;
  sibuk?: boolean;
  bisaNaik: boolean;
  bisaTurun: boolean;
  onToggle: (aktif: boolean) => void;
  onNaik: () => void;
  onTurun: () => void;
  onEdit: () => void;
}

/** Satu baris daftar yang bisa diaktifkan/nonaktifkan, diubah, dan diurutkan. */
export function BarisUrut({
  judul,
  subjudul,
  aktif,
  sibuk,
  bisaNaik,
  bisaTurun,
  onToggle,
  onNaik,
  onTurun,
  onEdit,
}: BarisUrutProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-2.5 pl-3.5">
      <div className={cn("min-w-28 flex-1", !aktif && "opacity-55")}>
        <p className="wrap-break-word text-sm font-medium">{judul}</p>
        {subjudul && <p className="wrap-break-word text-xs text-muted-foreground">{subjudul}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <label className="flex min-h-10 cursor-pointer items-center gap-1.5 px-1.5 text-xs text-muted-foreground">
          <Switch checked={aktif} disabled={sibuk} onCheckedChange={onToggle} aria-label={`Aktif: ${judul}`} />
          <span className="hidden sm:inline">{aktif ? "Aktif" : "Nonaktif"}</span>
        </label>
        <Button type="button" variant="ghost" className="size-10 sm:size-11" disabled={sibuk || !bisaNaik} onClick={onNaik} aria-label={`Naikkan ${judul}`}>
          <ArrowUp aria-hidden />
        </Button>
        <Button type="button" variant="ghost" className="size-10 sm:size-11" disabled={sibuk || !bisaTurun} onClick={onTurun} aria-label={`Turunkan ${judul}`}>
          <ArrowDown aria-hidden />
        </Button>
        <Button type="button" variant="ghost" className="size-10 sm:size-11" disabled={sibuk} onClick={onEdit} aria-label={`Ubah ${judul}`}>
          <Pencil aria-hidden />
        </Button>
      </div>
    </li>
  );
}
