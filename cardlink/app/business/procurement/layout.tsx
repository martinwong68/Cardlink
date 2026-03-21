import ModuleShell from "@/components/business/ModuleShell";

export default function ProcurementLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell basePath="/business/procurement" moduleLabel="Procurement">
      {children}
    </ModuleShell>
  );
}
