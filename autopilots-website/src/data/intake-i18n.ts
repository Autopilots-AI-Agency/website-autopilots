import { scanLocale, scanLocales, scanTranslator } from '../../netlify/functions/_shared/intake-i18n.mjs';
import { routeTranslations } from './intake-route-translations';
import { translator } from '../components/premium/showcase-i18n';
import type { SupportedLocale } from '../i18n/languages';
export function intakeTranslator(locale: string) {
  const code = scanLocale(locale) as SupportedLocale;
  const shared = scanTranslator(code);
  const showcase = translator(code);
  const index = scanLocales.indexOf(code);
  const routes = new Map(routeTranslations.map(row => [row[0], row[index]]));
  return (source: string, values: Record<string, string | number> = {}) => {
    let result = routes.get(source) ?? shared(source);
    if (result === source) result = showcase(source);
    for (const [key, value] of Object.entries(values)) result = result.replaceAll(`{${key}}`, String(value));
    return result;
  };
}
