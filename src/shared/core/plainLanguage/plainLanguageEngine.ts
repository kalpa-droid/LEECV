import { PLAIN_LANGUAGE_RULES, PlainLanguageRule } from './plainLanguageRules';

export type PlainLanguageZone = 'public' | 'app';

export interface PlainLanguageViolation {
  ruleId: string;
  /** Fragmento exacto del texto que disparó la regla. */
  match: string;
  say: string;
  zone: PlainLanguageZone;
  /** En la app: cómo escribirlo bien ("Hoja común (A4)"). */
  example?: string;
}

/**
 * Zonas de la página:
 *  · public → landing, blog, buscadores, imagen para compartir, textos que salen de la app
 *             (compartir por WhatsApp, cookies). Estrictas: cero jerga.
 *  · app    → todo lo demás (editor, ventanas, menús). Ahí se elige la hoja, el corte, etc.,
 *             así que el nombre técnico puede aparecer, entre paréntesis y después de la
 *             explicación sencilla.
 */
const PUBLIC_PATHS: readonly RegExp[] = [
  /(^|[\\/])src[\\/]modules[\\/]landing[\\/]/,
  /(^|[\\/])src[\\/]modules[\\/]blog[\\/]/,
  /(^|[\\/])src[\\/]shared[\\/]i18n[\\/]catalog[\\/]landing\.ts$/,
  /(^|[\\/])src[\\/]shared[\\/]core[\\/]seo[\\/]/,
  /(^|[\\/])src[\\/]shared[\\/]core[\\/]ui[\\/]marketing[\\/]/,
  /CookieConsentBanner\.tsx$/,
  /ShareAppModal\.tsx$/,
  /^(index\.html|metadata\.json)$/,
  /^public[\\/]/,
];

export function zoneOfPath(filePath: string): PlainLanguageZone {
  return PUBLIC_PATHS.some(rx => rx.test(filePath)) ? 'public' : 'app';
}

/** Quita el contenido entre paréntesis (incluso anidado): "Hoja común (A4)" → "Hoja común ". */
export function stripParentheticals(text: string): string {
  let prev: string;
  let out = text;
  do {
    prev = out;
    out = out.replace(/\([^()]*\)/g, '');
  } while (out !== prev);
  return out;
}

/**
 * Devuelve la jerga encontrada en un texto visible para el usuario (vacío = texto OK).
 * Puro y sin dependencias: lo usan el escáner de gobernanza y los tests.
 * Por defecto evalúa con la zona PÚBLICA (la más estricta).
 */
export function findJargon(
  text: string,
  zone: PlainLanguageZone = 'public',
  rules: readonly PlainLanguageRule[] = PLAIN_LANGUAGE_RULES
): PlainLanguageViolation[] {
  const found: PlainLanguageViolation[] = [];
  const withoutParens = zone === 'app' ? stripParentheticals(text) : text;
  for (const rule of rules) {
    const subject = zone === 'app' && rule.appMode === 'parenthetical' ? withoutParens : text;
    const m = subject.match(rule.pattern);
    if (m) found.push({ ruleId: rule.id, match: m[0], say: rule.say, zone, example: rule.appExample });
  }
  return found;
}

/** ¿Es un texto pensado para leerse (varias palabras) y no un código interno como 'A4'? */
export function looksLikeProse(text: string): boolean {
  return /\S\s+\S/.test(text.trim());
}
