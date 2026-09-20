import { describe, expect, it } from "vitest";
import { LOCALES, LOCALE_CODES, isLocale, matchLocale } from "@/lib/i18n/config";
import en from "@/lib/i18n/locales/en";

/**
 * Every published language, checked as a whole rather than by spot-check.
 *
 * `tsc` already proves each dictionary has the right SHAPE, because they are
 * typed against English. What it cannot see is the content: a key that type-
 * checks fine while holding an empty string renders as nothing on screen, and
 * a translation that drops `{email}` from a sentence renders a sentence with a
 * hole in it. Both are silent in a type system and loud to a patient.
 *
 * It also proves the thing the type system explicitly does not: that each
 * module actually IMPORTS. A dictionary with a syntax error, a bad import, or
 * a stray top-level throw fails the dynamic import at runtime, which is what
 * the app experiences as "the language does not load".
 */

/** Every leaf path in a nested dictionary, as `a.b.c`. */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

function leafAt(dict: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[key]
          : undefined,
      dict
    );
}

/** `{name}` placeholders, sorted, so order of mention is not compared. */
function placeholders(text: string): string[] {
  return (text.match(/\{(\w+)\}/g) ?? []).sort();
}

const EN_PATHS = leafPaths(en).sort();

/**
 * Loaded exactly the way I18nProvider loads them — a dynamic import of the
 * same module path — so a language that fails here is a language that fails
 * in the browser.
 */
const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  en: async () => ({ default: en }),
  es: () => import("@/lib/i18n/locales/es"),
  fr: () => import("@/lib/i18n/locales/fr"),
  de: () => import("@/lib/i18n/locales/de"),
  hi: () => import("@/lib/i18n/locales/hi"),
  "zh-Hans": () => import("@/lib/i18n/locales/zh-Hans"),
  "zh-Hant": () => import("@/lib/i18n/locales/zh-Hant"),
  bn: () => import("@/lib/i18n/locales/bn"),
  pt: () => import("@/lib/i18n/locales/pt"),
  ru: () => import("@/lib/i18n/locales/ru"),
  id: () => import("@/lib/i18n/locales/id"),
  ja: () => import("@/lib/i18n/locales/ja"),
  mr: () => import("@/lib/i18n/locales/mr"),
  te: () => import("@/lib/i18n/locales/te"),
  tr: () => import("@/lib/i18n/locales/tr"),
  ta: () => import("@/lib/i18n/locales/ta"),
  vi: () => import("@/lib/i18n/locales/vi"),
  ko: () => import("@/lib/i18n/locales/ko"),
};

describe("locale registry", () => {
  it("has a loader for every published locale and no orphans", () => {
    expect(Object.keys(LOADERS).sort()).toEqual([...LOCALE_CODES].sort());
  });

  it("has unique codes", () => {
    expect(new Set(LOCALE_CODES).size).toBe(LOCALE_CODES.length);
  });

  it("gives every locale a native name a speaker would recognise", () => {
    for (const locale of LOCALES) {
      expect(locale.native.trim().length, locale.code).toBeGreaterThan(0);
      expect(locale.html.trim().length, locale.code).toBeGreaterThan(0);
    }
  });
});

describe.each(LOCALE_CODES)("locale %s", (code) => {
  it("imports without throwing", async () => {
    const mod = await LOADERS[code]();
    expect(mod.default, `${code} has no default export`).toBeTruthy();
  });

  it("has exactly the keys English has", async () => {
    const dict = (await LOADERS[code]()).default;
    const paths = leafPaths(dict).sort();
    const missing = EN_PATHS.filter((p) => !paths.includes(p));
    const extra = paths.filter((p) => !EN_PATHS.includes(p));
    expect(missing, `${code} is missing keys`).toEqual([]);
    expect(extra, `${code} has keys English does not`).toEqual([]);
  });

  it("has no empty or whitespace-only strings", async () => {
    const dict = (await LOADERS[code]()).default;
    const blank = EN_PATHS.filter((path) => {
      const value = leafAt(dict, path);
      return typeof value === "string" && value.trim().length === 0;
    });
    expect(blank, `${code} has blank strings`).toEqual([]);
  });

  it("is strings all the way down", async () => {
    const dict = (await LOADERS[code]()).default;
    const nonString = EN_PATHS.filter(
      (path) => typeof leafAt(dict, path) !== "string"
    );
    expect(nonString, `${code} has non-string leaves`).toEqual([]);
  });

  it("keeps every {placeholder} English uses", async () => {
    const dict = (await LOADERS[code]()).default;
    const broken: string[] = [];
    for (const path of EN_PATHS) {
      const source = leafAt(en, path);
      const translated = leafAt(dict, path);
      if (typeof source !== "string" || typeof translated !== "string") continue;
      const want = placeholders(source);
      const got = placeholders(translated);
      if (want.join(",") !== got.join(",")) {
        broken.push(`${path}: expected ${want.join(" ") || "none"}, got ${got.join(" ") || "none"}`);
      }
    }
    expect(broken, `${code} has broken placeholders`).toEqual([]);
  });

  it("is actually translated, not a copy of English", async () => {
    // Brand names and a few tokens legitimately match. A dictionary that
    // matches English almost everywhere is an untranslated stub, and shipping
    // one means the language switcher appears to do nothing.
    if (code === "en") return;
    const dict = (await LOADERS[code]()).default;
    const identical = EN_PATHS.filter((path) => {
      const source = leafAt(en, path);
      const translated = leafAt(dict, path);
      return typeof source === "string" && source === translated;
    });
    const ratio = identical.length / EN_PATHS.length;
    expect(
      ratio,
      `${code} is ${Math.round(ratio * 100)}% identical to English`
    ).toBeLessThan(0.5);
  });
});

describe("locale detection", () => {
  it("resolves Chinese by script, not region", () => {
    expect(matchLocale("zh-TW")).toBe("zh-Hant");
    expect(matchLocale("zh-HK")).toBe("zh-Hant");
    expect(matchLocale("zh-Hant-TW")).toBe("zh-Hant");
    expect(matchLocale("zh-CN")).toBe("zh-Hans");
    expect(matchLocale("zh")).toBe("zh-Hans");
  });

  it("drops region for everything else", () => {
    expect(matchLocale("es-MX")).toBe("es");
    expect(matchLocale("pt-PT")).toBe("pt");
    expect(matchLocale("en-GB")).toBe("en");
  });

  it("returns null for a language we do not publish", () => {
    expect(matchLocale("sw")).toBeNull();
    expect(matchLocale("ar")).toBeNull();
  });

  it("guards isLocale against arbitrary input", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("klingon")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});
