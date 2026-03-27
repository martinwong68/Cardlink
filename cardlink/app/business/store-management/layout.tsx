import ModuleShell from "@/components/business/ModuleShell";

export default function StoreManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell basePath="/business/store-management" moduleLabel="Store Management">
      {children}
    </ModuleShell>
  );
}
