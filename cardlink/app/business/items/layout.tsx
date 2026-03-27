import ModuleShell from "@/components/business/ModuleShell";

export default function ItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell basePath="/business/items" moduleLabel="Item Master">
      {children}
    </ModuleShell>
  );
}
