import type { Sex } from "./types";

/**
 * US shoe size → foot length (mm).
 * Men's and women's tables use different mm values for the same nominal US
 * size — Men's 9 ≠ Women's 9. Brannock-aligned approximations.
 */
const MENS_SIZE_TO_MM: Record<string, number> = {
  "6": 238, "6.5": 242, "7": 246, "7.5": 250,
  "8": 254, "8.5": 258, "9": 262, "9.5": 266, "10": 270, "10.5": 274,
  "11": 278, "11.5": 282, "12": 286, "12.5": 290, "13": 294, "13.5": 298,
  "14": 302, "14.5": 306, "15": 310, "16": 318,
};

const WOMENS_SIZE_TO_MM: Record<string, number> = {
  "4": 211, "4.5": 215, "5": 218, "5.5": 222, "6": 226, "6.5": 230,
  "7": 234, "7.5": 238, "8": 242, "8.5": 246, "9": 250, "9.5": 254,
  "10": 258, "10.5": 262, "11": 266, "11.5": 270, "12": 274,
};

/** Sizes commonly stocked, per gender. */
const MENS_SIZES = [
  6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5,
  11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16,
];

const WOMENS_SIZES = [
  4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12,
];

export function sizeToMm(size: number, sex: Sex): number {
  const table = sex === "male" ? MENS_SIZE_TO_MM : WOMENS_SIZE_TO_MM;
  return table[size.toString()] ?? 260;
}

export function getSizesForSex(sex: Sex | undefined): number[] {
  if (sex === "female") return WOMENS_SIZES;
  return MENS_SIZES; // default to men's range when sex unknown
}

export function chartTitleFor(sex: Sex | undefined): string {
  if (sex === "female") return "Women's US sizes";
  if (sex === "male") return "Men's US sizes";
  return "US sizes (default men's range)";
}

/** Legacy export for any older callers — defaults to men's range. */
export const SIZE_GRID = MENS_SIZES;
