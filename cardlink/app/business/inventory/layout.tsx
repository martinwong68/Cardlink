import ModuleShell from "@/components/business/ModuleShell";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell basePath="/business/inventory" moduleLabel="Inventory">
      {children}
    </ModuleShell>
  );
}
