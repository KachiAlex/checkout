import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatCurrency,
  parseFormattedNumber,
  formatNumberInput,
  handleNumberInputChange,
} from "./numberFormat";

describe("numberFormat utilities", () => {
  describe("formatNumber", () => {
    it("should format integers with commas", () => {
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1000000)).toBe("1,000,000");
      expect(formatNumber(1234567890)).toBe("1,234,567,890");
    });

    it("should format numbers with decimals", () => {
      expect(formatNumber(1234.56, 2)).toBe("1,234.56");
      expect(formatNumber(1000.5, 1)).toBe("1,000.5");
      expect(formatNumber(999.99, 2)).toBe("999.99");
    });

    it("should handle zero", () => {
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(0, 2)).toBe("0.00");
    });

    it("should handle negative numbers", () => {
      expect(formatNumber(-1000)).toBe("-1,000");
      expect(formatNumber(-1234.56, 2)).toBe("-1,234.56");
    });

    it("should handle small numbers without commas", () => {
      expect(formatNumber(1)).toBe("1");
      expect(formatNumber(99)).toBe("99");
      expect(formatNumber(999)).toBe("999");
    });

    it("should handle string inputs", () => {
      expect(formatNumber("1000")).toBe("1,000");
      expect(formatNumber("1234.56", 2)).toBe("1,234.56");
    });

    it("should handle NaN and invalid inputs", () => {
      expect(formatNumber(NaN)).toBe("");
      expect(formatNumber("invalid")).toBe("");
      expect(formatNumber("")).toBe("");
    });

    it("should handle decimal places correctly", () => {
      expect(formatNumber(1000.1, 2)).toBe("1,000.10");
      expect(formatNumber(1000.123, 2)).toBe("1,000.12"); // Rounds
      expect(formatNumber(1000.999, 2)).toBe("1,001.00"); // Rounds up to 1,001.00
    });
  });

  describe("formatCurrency", () => {
    it("should format cents to currency string", () => {
      expect(formatCurrency(100000)).toBe("₦1,000.00");
      expect(formatCurrency(1234567)).toBe("₦12,345.67");
      expect(formatCurrency(100)).toBe("₦1.00");
    });

    it("should handle zero cents", () => {
      expect(formatCurrency(0)).toBe("₦0.00");
    });

    it("should handle negative amounts", () => {
      expect(formatCurrency(-100000)).toBe("₦-1,000.00");
    });

    it("should handle string inputs", () => {
      expect(formatCurrency("100000")).toBe("₦1,000.00");
      expect(formatCurrency("1234567")).toBe("₦12,345.67");
    });

    it("should handle NaN and invalid inputs", () => {
      expect(formatCurrency(NaN)).toBe("₦0.00");
      expect(formatCurrency("invalid")).toBe("₦0.00");
    });

    it("should handle large amounts", () => {
      expect(formatCurrency(100000000)).toBe("₦1,000,000.00");
      expect(formatCurrency(1234567890)).toBe("₦12,345,678.90");
    });

    it("should handle amounts less than 100 cents", () => {
      expect(formatCurrency(50)).toBe("₦0.50");
      expect(formatCurrency(1)).toBe("₦0.01");
    });
  });

  describe("parseFormattedNumber", () => {
    it("should parse comma-formatted strings", () => {
      expect(parseFormattedNumber("1,000")).toBe(1000);
      expect(parseFormattedNumber("1,234,567")).toBe(1234567);
      expect(parseFormattedNumber("1,234.56")).toBe(1234.56);
    });

    it("should handle strings without commas", () => {
      expect(parseFormattedNumber("1000")).toBe(1000);
      expect(parseFormattedNumber("1234.56")).toBe(1234.56);
    });

    it("should handle empty strings", () => {
      expect(parseFormattedNumber("")).toBe(0);
      expect(parseFormattedNumber("   ")).toBe(0);
    });

    it("should handle invalid inputs", () => {
      expect(parseFormattedNumber("invalid")).toBe(0);
      expect(parseFormattedNumber("abc123")).toBe(0); // parseFloat('abc123') is NaN, returns 0
    });

    it("should handle decimal numbers", () => {
      expect(parseFormattedNumber("1,234.56")).toBe(1234.56);
      expect(parseFormattedNumber("999.99")).toBe(999.99);
    });

    it("should handle negative numbers", () => {
      expect(parseFormattedNumber("-1,000")).toBe(-1000);
      expect(parseFormattedNumber("-1,234.56")).toBe(-1234.56);
    });
  });

  describe("formatNumberInput", () => {
    it("should format integer inputs with commas", () => {
      expect(formatNumberInput("1000", false)).toBe("1,000");
      expect(formatNumberInput("1000000", false)).toBe("1,000,000");
    });

    it("should format decimal inputs with commas", () => {
      expect(formatNumberInput("1000.50", true)).toBe("1,000.50");
      expect(formatNumberInput("1234.56", true)).toBe("1,234.56");
    });

    it("should limit decimal places to 2", () => {
      expect(formatNumberInput("1000.123", true)).toBe("1,000.12");
      expect(formatNumberInput("1000.999", true)).toBe("1,000.99");
    });

    it("should prevent multiple decimal points", () => {
      expect(formatNumberInput("1000.50.25", true)).toBe("1,000.50");
    });

    it("should remove decimal point for integer inputs", () => {
      // When decimals not allowed, it removes the decimal point but keeps the numbers
      // So '1000.50' becomes '100050' which formats to '100,050'
      expect(formatNumberInput("1000.50", false)).toBe("100,050");
      expect(formatNumberInput("1234.56", false)).toBe("123,456");
    });

    it("should handle empty strings", () => {
      expect(formatNumberInput("", false)).toBe("");
      expect(formatNumberInput("", true)).toBe("");
    });

    it("should handle partial input (just decimal point)", () => {
      expect(formatNumberInput(".", true)).toBe(".");
      // When there's a number before the decimal, it formats with 2 decimal places
      expect(formatNumberInput("1000.", true)).toBe("1,000.00");
    });

    it("should remove non-numeric characters", () => {
      expect(formatNumberInput("1,000abc", false)).toBe("1,000");
      expect(formatNumberInput("$1,000.50", true)).toBe("1,000.50");
    });
  });

  describe("handleNumberInputChange", () => {
    it("should return formatted display value and numeric value", () => {
      const result = handleNumberInputChange("1000", false);
      expect(result.displayValue).toBe("1,000");
      expect(result.numericValue).toBe(1000);
    });

    it("should handle decimal inputs", () => {
      const result = handleNumberInputChange("1234.56", true);
      expect(result.displayValue).toBe("1,234.56");
      expect(result.numericValue).toBe(1234.56);
    });

    it("should handle empty input", () => {
      const result = handleNumberInputChange("", false);
      expect(result.displayValue).toBe("");
      expect(result.numericValue).toBe(0);
    });

    it("should handle invalid input", () => {
      const result = handleNumberInputChange("abc", false);
      expect(result.displayValue).toBe("");
      expect(result.numericValue).toBe(0);
    });

    it("should handle partial decimal input", () => {
      const result = handleNumberInputChange("1000.", true);
      // When there's a number before the decimal, it formats with 2 decimal places
      expect(result.displayValue).toBe("1,000.00");
      expect(result.numericValue).toBe(1000);
    });

    it("should handle large numbers", () => {
      const result = handleNumberInputChange("1000000", false);
      expect(result.displayValue).toBe("1,000,000");
      expect(result.numericValue).toBe(1000000);
    });
  });
});
