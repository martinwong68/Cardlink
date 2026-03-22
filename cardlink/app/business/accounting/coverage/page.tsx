import {
  accountingBenchmarkSources,
  accountingCoverageSummary,
  accountingCoverageVerdict,
  accountingFunctionCoverage,
  accountingHighPriorityGaps,
  accountingWorkflowCoverage,
  type AccountingCoverageStatus,
} from "@/src/lib/accounting/coverage";

function statusClasses(status: AccountingCoverageStatus) {
  switch (status) {
    case "implemented":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "partial":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function statusLabel(status: AccountingCoverageStatus) {
  switch (status) {
    case "implemented":
      return "Implemented";
    case "partial":
      return "Partial";
    default:
      return "Missing";
  }
}

export default function AccountingCoveragePage() {
  return (
    <div className="space-y-4 pb-28">
      <section className="app-card space-y-4 p-4 md:p-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Professional benchmark review
          </p>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Accounting function and workflow coverage</h1>
            <p className="mt-2 text-sm text-gray-600">
              This review benchmarks Cardlink against the accounting capabilities commonly present in
              ERPNext, Odoo Accounting, and Akaunting for small and medium companies.
            </p>
          </div>
          <p className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            {accountingCoverageVerdict}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <article className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Functions done</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{accountingCoverageSummary.implemented}</p>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Functions partial</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{accountingCoverageSummary.partial}</p>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Functions missing</p>
            <p className="mt-2 text-2xl font-bold text-rose-600">{accountingCoverageSummary.missing}</p>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Workflows done</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{accountingCoverageSummary.workflowsImplemented}</p>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Workflows partial</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{accountingCoverageSummary.workflowsPartial}</p>
          </article>
          <article className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Workflows missing</p>
            <p className="mt-2 text-2xl font-bold text-rose-600">{accountingCoverageSummary.workflowsMissing}</p>
          </article>
        </div>
      </section>

      <section className="app-card p-4 md:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Open-source benchmark references</h2>
          <p className="mt-1 text-sm text-gray-500">
            These projects were used as the functional benchmark for what a professional SMC accounting app
            typically includes.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {accountingBenchmarkSources.map((source) => (
            <article key={source.name} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{source.name}</h3>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-indigo-600"
                >
                  View
                </a>
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                {source.focusArea}
              </p>
              <p className="mt-2 text-sm text-gray-600">{source.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="app-card p-4 md:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Professional accounting function checklist</h2>
          <p className="mt-1 text-sm text-gray-500">
            Use this list to check whether Cardlink already covers the core functions expected from an SMC
            accounting app.
          </p>
        </div>
        <div className="space-y-3">
          {accountingFunctionCoverage.map((item) => (
            <article key={item.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {item.benchmarkLevel} benchmark
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Current in Cardlink</p>
                  <p className="mt-2 text-sm text-gray-700">{item.currentScope}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Gap or next step</p>
                  <p className="mt-2 text-sm text-rose-900">{item.missingScope}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="app-card p-4 md:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Professional accounting workflow checklist</h2>
          <p className="mt-1 text-sm text-gray-500">
            These workflows show whether the app can support the day-to-day operating cycle of an SMC finance team.
          </p>
        </div>
        <div className="space-y-3">
          {accountingWorkflowCoverage.map((item) => (
            <article key={item.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {item.benchmarkLevel} workflow
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Current in Cardlink</p>
                  <p className="mt-2 text-sm text-gray-700">{item.currentScope}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Missing workflow steps</p>
                  <p className="mt-2 text-sm text-amber-950">{item.missingScope}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="app-card p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-900">High-priority gaps before calling it SMC-complete</h2>
        <ul className="mt-3 space-y-2">
          {accountingHighPriorityGaps.map((gap) => (
            <li key={gap} className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {gap}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-gray-600">
          Bottom line: Cardlink is already strong enough to hold and report core accounting data for an SMC,
          but it is not yet comprehensive enough to replace a full professional accounting stack without
          closing the high-priority gaps above.
        </p>
      </section>
    </div>
  );
}
