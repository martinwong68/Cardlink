import ModuleShell from "@/components/business/ModuleShell";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell basePath="/business/pos" moduleLabel="POS">
      {children}
    </ModuleShell>
  );
}
