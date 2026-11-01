import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Memuat halaman">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
