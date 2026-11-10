import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNav } from "@/components/public/PublicNav";
import { getPoInfo } from "@/lib/po";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const { data: po } = await getPoInfo();

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col">
      <PublicNav />
      <div className="mx-auto min-w-0 w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        {children}
      </div>
      <PublicFooter po={po} />
    </div>
  );
}
