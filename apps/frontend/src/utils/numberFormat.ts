/**
 * Format a number with thousand separators (commas)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0 for integers, 2 for currency)
 * @returns Formatted string with commas
 */
export function formatNumber(value: number | string, decimals: number = 0): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  
  // Handle decimal places
  const fixed = decimals > 0 ? num.toFixed(decimals) : num.toString();
  
  // Split into integer and decimal parts
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine with decimal part if exists
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

/**
 * Format currency (price) with commas and 2 decimal places
 * @param cents - Price in cents
 * @returns Formatted string like "₦1,234,567.89"
 */
export function formatCurrency(cents: number | string): string {
  const num = typeof cents === 'string' ? parseFloat(cents) : cents;
  if (isNaN(num)) return '₦0.00';
  
  const amount = num / 100;
  return `₦${formatNumber(amount, 2)}`;
}

/**
 * Parse a formatted number string (with commas) back to a number
 * @param formattedValue - String with commas like "1,234,567.89"
 * @returns Numeric value
 */
export function parseFormattedNumber(formattedValue: string): number {
  if (!formattedValue || formattedValue.trim() === '') return 0;
  // Remove all commas and parse
  const cleaned = formattedValue.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format number for input field - allows typing with automatic comma insertion
 * @param value - Current input value
 * @param allowDecimals - Whether to allow decimal places
 * @returns Formatted string for display in input
 */
export function formatNumberInput(value: string, allowDecimals: boolean = false): string {
  if (!value || value === '') return '';
  
  // Remove all non-numeric characters except decimal point
  let cleaned = value.replace(/[^\d.]/g, '');
  
  // Only allow one decimal point
  if (allowDecimals) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
  } else {
    // Remove decimal point if decimals not allowed
    cleaned = cleaned.replace(/\./g, '');
  }
  
  // Parse and format with commas
  const num = parseFloat(cleaned);
  if (isNaN(num)) return cleaned; // Return cleaned value if can't parse (e.g., just ".")
  
  // Format with commas
  const decimals = allowDecimals ? 2 : 0;
  return formatNumber(num, decimals);
}

/**
 * Handle number input change - formats numbers with commas for display
 * @param value - Input value
 * @param allowDecimals - Whether to allow decimals
 * @returns Object with formatted display value and raw numeric value
 */
export function handleNumberInputChange(
  value: string,
  allowDecimals: boolean = false
): { displayValue: string; numericValue: number } {
  if (!value || value === '') return { displayValue: '', numericValue: 0 };
  
  // Remove all non-numeric characters except decimal point and commas
  let cleaned = value.replace(/[^\d.,]/g, '');
  
  // Only allow one decimal point
  if (allowDecimals) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    // Limit decimal places to 2 while typing
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    // If there's a trailing decimal point, format with 2 decimal places
    if (cleaned.endsWith('.')) {
      const num = parseFormattedNumber(cleaned.slice(0, -1));
      if (!isNaN(num) && num > 0) {
        return { displayValue: formatNumber(num, 2), numericValue: num };
      }
    }
  } else {
    // Remove decimal point if decimals not allowed
    cleaned = cleaned.replace(/\./g, '');
  }
  
  // Parse the numeric value
  const numericValue = parseFormattedNumber(cleaned);
  
  // Format with commas for display
  if (isNaN(numericValue) || numericValue === 0) {
    return { displayValue: cleaned, numericValue: 0 };
  }
  
  // Format the display value with commas
  if (allowDecimals) {
    const parts = cleaned.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    const formattedInteger = formatNumber(parseFloat(integerPart) || 0, 0);
    // If there's a decimal part, include it; otherwise format with 2 decimal places if it was a complete number
    const displayValue = decimalPart ? `${formattedInteger}.${decimalPart}` : formatNumber(numericValue, 2);
    return { displayValue, numericValue };
  } else {
    return { displayValue: formatNumber(numericValue, 0), numericValue };
  }
}

/**
 * Format number input on blur - adds commas for display
 * @param value - Input value to format
 * @param allowDecimals - Whether to allow decimals
 * @returns Formatted string with commas
 */
export function formatNumberInputOnBlur(
  value: string,
  allowDecimals: boolean = false
): string {
  if (!value || value.trim() === '') return '';
  
  const parsed = parseFormattedNumber(value);
  if (isNaN(parsed) || parsed === 0) return '';
  
  return formatNumber(parsed, allowDecimals ? 2 : 0);
}

