import { PLAIN_LANGUAGE_RULES, PlainLanguageRule } from './plainLanguageRules';

export interface PlainLanguageViolation {
  ruleId: string;
  /** Fragmento exacto del texto que disparó la regla. */
  match: string;
  say: string;
}

/**
 * Devuelve la jerga encontrada en un texto visible para el usuario (vacío = texto OK).
 * Puro y sin dependencias: lo usan el escáner de gobernanza y los tests.
 */
export function findJargon(
  text: string,
  rules: readonly PlainLanguageRule[] = PLAIN_LANGUAGE_RULES
): PlainLanguageViolation[] {
  const found: PlainLanguageViolation[] = [];
  for (const rule of rules) {
    const m = text.match(rule.pattern);
    if (m) found.push({ ruleId: rule.id, match: m[0], say: rule.say });
  }
  return found;
}

/** ¿Es un texto pensado para leerse (varias palabras) y no un código interno como 'A4'? */
export function looksLikeProse(text: string): boolean {
  return /\S\s+\S/.test(text.trim());
}
