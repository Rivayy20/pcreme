"use client";

import { Loader2 } from "lucide-react";
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

interface KonfirmasiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  judul: string;
  deskripsi: string;
  labelAksi: string;
  berbahaya?: boolean;
  sibuk?: boolean;
  onKonfirmasi: () => unknown;
}

/** Dialog konfirmasi untuk aksi yang tidak bisa dibatalkan. Penutupan diatur pemanggil. */
export function KonfirmasiDialog({
  open,
  onOpenChange,
  judul,
  deskripsi,
  labelAksi,
  berbahaya,
  sibuk,
  onKonfirmasi,
}: KonfirmasiDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !sibuk && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{judul}</AlertDialogTitle>
          <AlertDialogDescription>{deskripsi}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={sibuk}>
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-11"
            variant={berbahaya ? "destructive" : "default"}
            disabled={sibuk}
            onClick={() => void onKonfirmasi()}
          >
            {sibuk && <Loader2 className="animate-spin" aria-hidden />} {labelAksi}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
