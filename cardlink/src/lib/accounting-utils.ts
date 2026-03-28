/**
 * Shared accounting utility helpers.
 *
 * These utilities enforce fundamental accounting rules (e.g. double-entry
 * balance) that should be checked before or after posting journal entries.
 */

export type JournalLine = {
  debit?: number;
  credit?: number;
};

/**
 * Validates that the sum of all debit amounts equals the sum of all credit
 * amounts in a set of journal lines.
 *
 * In proper double-entry bookkeeping every transaction must balance:
 *   SUM(debits) === SUM(credits)
 *
 * Returns `{ valid: true }` when the transaction balances within a small
 * floating-point tolerance, or `{ valid: false, debitTotal, creditTotal }`
 * when it does not.
 */
export function validateTransactionBalance(lines: JournalLine[]): {
  valid: boolean;
  debitTotal: number;
  creditTotal: number;
} {
  let debitTotal = 0;
  let creditTotal = 0;

  for (const line of lines) {
    debitTotal += Number(line.debit ?? 0);
    creditTotal += Number(line.credit ?? 0);
  }

// Allow a small floating-point rounding tolerance (0.01 cents)
const BALANCE_TOLERANCE = 0.01;
const valid = Math.abs(debitTotal - creditTotal) < BALANCE_TOLERANCE + Number.EPSILON;

  return { valid, debitTotal, creditTotal };
}
