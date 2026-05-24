import { I18n } from 'i18n-js';
import en from './en';
import es from './es';

const i18n = new I18n({ en, es });

i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

export const setLocale = (locale) => {
  i18n.locale = locale;
};

export const t = (key, options) => i18n.t(key, options);

export default i18n;
