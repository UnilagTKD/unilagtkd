const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function threeDigitsToWords(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    n %= 10;
  }
  if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

/** Whole-number-to-English-words, e.g. 166300 -> "One Hundred and Sixty-Six Thousand, Three Hundred". */
function integerToWords(value: number): string {
  if (value === 0) return "Zero";

  const groups: string[] = [];
  const scales = ["", "Thousand", "Million", "Billion"];
  let n = value;
  let scaleIndex = 0;

  while (n > 0) {
    const group = n % 1000;
    if (group > 0) {
      const words = threeDigitsToWords(group);
      groups.unshift(scales[scaleIndex] ? `${words} ${scales[scaleIndex]}` : words);
    }
    n = Math.floor(n / 1000);
    scaleIndex += 1;
  }

  return groups.join(", ");
}

/**
 * Amount in words for a printed receipt, e.g. 15000 -> "Fifteen Thousand Naira Only",
 * or 10500.50 -> "Ten Thousand, Five Hundred Naira, Fifty Kobo Only".
 */
export function amountInWords(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value) || value < 0) return "";

  const naira = Math.floor(value);
  const kobo = Math.round((value - naira) * 100);

  const nairaWords = `${integerToWords(naira)} Naira`;
  const koboWords = kobo > 0 ? `, ${integerToWords(kobo)} Kobo` : "";

  return `${nairaWords}${koboWords} Only`;
}
