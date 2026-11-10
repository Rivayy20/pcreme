import { cn } from "@/lib/utils";
import {
  ORDER_PROGRESS_BADGE,
  ORDER_PROGRESS_LABEL_ID,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL_ID,
  STATUS_BADGE,
  deriveOrderProgressStatus,
  derivePaymentStatus,
  isPaymentRejected,
  labelStatusDinamis,
  type OrderProgressStatusType,
  type PaymentStatusType,
} from "@/lib/status";
import type { Fulfillment, OrderStatus } from "@/lib/types";

export function StatusBadge({
  status,
  fulfillment,
  catatanAdmin,
  buktiBayarPath,
  alasanPenolakan,
  className,
}: {
  status: OrderStatus;
  fulfillment?: Fulfillment;
  catatanAdmin?: string | null;
  buktiBayarPath?: string | null;
  alasanPenolakan?: string | null;
  className?: string;
}) {
  const rejected = isPaymentRejected(status, { catatanAdmin, buktiBayarPath, alasanPenolakan });
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        rejected ? "border-red-200 bg-red-100 text-red-900" : STATUS_BADGE[status],
        className,
      )}
    >
      {rejected ? "Bukti Ditolak" : labelStatusDinamis(status, fulfillment)}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  catatanAdmin,
  buktiBayarPath,
  sudahKirimBukti,
  alasanPenolakan,
  paymentStatus,
  className,
}: {
  status?: OrderStatus;
  catatanAdmin?: string | null;
  buktiBayarPath?: string | null;
  sudahKirimBukti?: boolean;
  alasanPenolakan?: string | null;
  paymentStatus?: PaymentStatusType;
  className?: string;
}) {
  const ps =
    paymentStatus ??
    derivePaymentStatus(status ?? "menunggu_bayar", {
      catatanAdmin,
      buktiBayarPath,
      sudahKirimBukti,
      alasanPenolakan,
    });
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        PAYMENT_STATUS_BADGE[ps],
        className,
      )}
    >
      {PAYMENT_STATUS_LABEL_ID[ps]}
    </span>
  );
}

export function OrderProgressBadge({
  status,
  fulfillment = "ambil",
  progressStatus,
  className,
}: {
  status?: OrderStatus;
  fulfillment?: Fulfillment;
  progressStatus?: OrderProgressStatusType;
  className?: string;
}) {
  const os = progressStatus ?? deriveOrderProgressStatus(status ?? "menunggu_bayar", fulfillment);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        ORDER_PROGRESS_BADGE[os],
        className,
      )}
    >
      {ORDER_PROGRESS_LABEL_ID[os]}
    </span>
  );
}
