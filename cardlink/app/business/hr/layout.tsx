import ModuleShell from "@/components/business/ModuleShell";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell basePath="/business/hr" moduleLabel="HR">
      {children}
    </ModuleShell>
  );
}
