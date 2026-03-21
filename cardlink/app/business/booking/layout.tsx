import ModuleShell from "@/components/business/ModuleShell";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell basePath="/business/booking" moduleLabel="Booking">
      {children}
    </ModuleShell>
  );
}
