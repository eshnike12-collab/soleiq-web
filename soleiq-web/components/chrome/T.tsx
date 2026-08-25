"use client";

import { fill, useT } from "@/lib/i18n/I18nProvider";
import type { Dictionary } from "@/lib/i18n/locales/en";

/**
 * Dotted paths into the dictionary — `"nav.signOut"`, `"common.save"`.
 *
 * Derived from the dictionary itself, so a typo is a build error and a key
 * that gets renamed breaks at every call site rather than silently rendering
 * its own name.
 */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type PhraseKey = Leaves<Dictionary>;

function lookup(d: Dictionary, key: string): string {
  let node: unknown = d;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)?.[part];
  }
  return typeof node === 'string' ? node : key;
}

/**
 * One translated phrase, addressed by key.
 *
 * This exists for server components. They cannot call `useT()` themselves, and
 * they cannot hand a client component a selector function either — functions
 * do not cross the server/client boundary. A string key does, so that is what
 * this takes.
 *
 * Inside a client component, prefer `useT()` directly; it is plainer to read
 * and the whole dictionary is already to hand.
 */
export function T({
  k,
  vars,
}: {
  k: PhraseKey;
  /** Values for any `{name}` placeholders in the phrase. */
  vars?: Record<string, string | number>;
}) {
  const d = useT();
  const phrase = lookup(d, k);
  return <>{vars ? fill(phrase, vars) : phrase}</>;
}
