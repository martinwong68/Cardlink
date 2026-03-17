export default function StatCardsRow({
  accounts,
  transactions,
  invoices,
}: {
  accounts: number;
  transactions: number;
  invoices: number;
}) {
  const cards = [
    { label: "Accounts", value: accounts },
    { label: "Transactions", value: transactions },
    { label: "Invoices", value: invoices },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-500">{card.label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
