import ModuleShell from "@/components/business/ModuleShell";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell basePath="/business/crm" moduleLabel="CRM">
      {children}
    </ModuleShell>
  );
}
