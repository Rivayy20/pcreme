export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">{children}</div>;
}
