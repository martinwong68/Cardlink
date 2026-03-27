import ModuleShell from "@/components/business/ModuleShell";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell basePath="/business/store" moduleLabel="Online Store">
      {children}
    </ModuleShell>
  );
}
