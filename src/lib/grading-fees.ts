export type GradingFeeEvent = {
  id: string;
  title: string;
  date: string;
  fee: string | null;
};

export function gradingFeeLabel(fee: string | null): string {
  if (fee === null || fee.trim() === "") return "Fee not yet announced";
  const amount = Number(fee);
  if (!Number.isFinite(amount) || amount < 0) return "Fee not yet announced";
  if (amount === 0) return "Free";
  return `NGN ${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
