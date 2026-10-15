import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';

/**
 * LanguageSwitcher — compact language dropdown for the top bar.
 * Changes the app language instantly (persisted to localStorage via i18n).
 */
export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="material-symbols-outlined text-[20px] text-on-surface-variant pointer-events-none absolute left-2">
        language
      </span>
      <select
        value={LANGUAGES.some((l) => l.code === current) ? current : 'en'}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        aria-label="Select language"
        className="appearance-none pl-8 pr-7 py-1.5 rounded-full border border-outline-slate bg-surface-container-lowest font-hanken text-label-sm text-on-surface cursor-pointer hover:bg-surface-container-low focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
      <span className="material-symbols-outlined text-[18px] text-on-surface-variant pointer-events-none absolute right-1.5">
        expand_more
      </span>
    </label>
  );
}
