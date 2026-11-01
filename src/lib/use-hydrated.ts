import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * false di server dan saat render pertama di browser, true setelah hidrasi selesai.
 * Dipakai untuk menonaktifkan tombol submit sebelum handler React terpasang, supaya form tidak
 * terkirim sebagai GET native (data pribadi/password bisa bocor ke URL).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
