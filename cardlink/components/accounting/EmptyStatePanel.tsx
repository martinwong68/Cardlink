export default function EmptyStatePanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}
