/**
 * Normalizes phone strings for display and storage.
 * US / NANP 10-digit: (###) ###-####
 * With country code: +{cc} (###) ###-####
 * Optional "ext" segments are preserved: `… ext …`
 */

const EXT_SPLIT = /\s+ext\.?\s+/i;

function formatNational10(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** Formats only the digit core (no extension). */
function formatDigitsCore(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length < 10) {
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 10) {
    return formatNational10(digits);
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 ${formatNational10(digits.slice(1))}`;
  }
  if (digits.length === 11 && digits[0] !== "1") {
    return `+${digits[0]} ${formatNational10(digits.slice(1))}`;
  }
  const national = digits.slice(-10);
  const cc = digits.slice(0, -10);
  return `+${cc} ${formatNational10(national)}`;
}

function formatExtensionSegment(extRaw: string): string {
  const trimmed = extRaw.trim();
  if (!trimmed) return "";
  const extDigits = trimmed.replace(/\D/g, "");
  if (extDigits.length >= 10) {
    return formatDigitsCore(extDigits);
  }
  if (extDigits.length === 7) {
    return `${extDigits.slice(0, 3)}-${extDigits.slice(3)}`;
  }
  return trimmed;
}

/**
 * Returns a consistently formatted phone string for display and storage.
 * Unknown / non-numeric input is returned trimmed when no digits are found.
 */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (raw == null) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const parts = trimmed.split(EXT_SPLIT);
  const mainPart = parts[0] ?? "";
  const extRest = parts.length > 1 ? parts.slice(1).join(" ") : "";

  const mainDigits = mainPart.replace(/\D/g, "");
  const formattedMain = formatDigitsCore(mainDigits);

  if (!extRest) {
    if (formattedMain) return formattedMain;
    return trimmed;
  }

  const extFormatted = formatExtensionSegment(extRest);
  if (formattedMain) {
    return extFormatted ? `${formattedMain} ext ${extFormatted}` : formattedMain;
  }
  return extFormatted ? `ext ${extFormatted}` : trimmed;
}
