export type PrettyModeAvailability =
  | { available: true; reason: null }
  | { available: false; reason: string };

const PRETTY_MODE_BLOCKERS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\{(?:>>|--|\+\+|~~|==)[\s\S]*?(?:<<|--|\+\+|~~|==)\}/,
    reason: "Pretty mode disabled because this file contains CriticMarkup.",
  },
  {
    pattern: /!\[[^\]]*]\([^)]*\)|<img\b/i,
    reason: "Pretty mode disabled because v1 keeps image docs in source mode.",
  },
  {
    pattern: /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/m,
    reason: "Pretty mode disabled because v1 does not edit tables safely.",
  },
  {
    pattern: /^\s*[-*+]\s+\[[ xX]]\s+/m,
    reason: "Pretty mode disabled because v1 does not edit task lists safely.",
  },
  {
    pattern: /\[\^[^\]]+]|^\s*\[\^[^\]]+]:/m,
    reason: "Pretty mode disabled because v1 does not edit footnotes safely.",
  },
  {
    pattern: /~~[^~]+~~/,
    reason: "Pretty mode disabled because v1 does not edit strikethrough safely.",
  },
  {
    pattern: /<\/?[a-z][\w:-]*(?:\s[^>]*)?>/i,
    reason: "Pretty mode disabled because v1 does not edit inline HTML safely.",
  },
];

export function getPrettyModeAvailability(markdown: string): PrettyModeAvailability {
  for (const { pattern, reason } of PRETTY_MODE_BLOCKERS) {
    if (pattern.test(markdown)) return { available: false, reason };
  }
  return { available: true, reason: null };
}
