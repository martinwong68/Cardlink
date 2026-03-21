import ModuleShell from "@/components/business/ModuleShell";

export default function AccountingShell({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell basePath="/business/accounting" moduleLabel="Accounting">
      {children}
    </ModuleShell>
  );
}
