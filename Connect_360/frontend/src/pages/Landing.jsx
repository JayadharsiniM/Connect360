import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const services = [
  {
    nameKey: 'landing.svcCleaningName',
    descriptionKey: 'landing.svcCleaningDesc',
    icon: 'cleaning_services',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
  },
  {
    nameKey: 'landing.svcPlumbingName',
    descriptionKey: 'landing.svcPlumbingDesc',
    icon: 'plumbing',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop',
  },
  {
    nameKey: 'landing.svcElectricalName',
    descriptionKey: 'landing.svcElectricalDesc',
    icon: 'electrical_services',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop',
  },
  {
    nameKey: 'landing.svcPaintingName',
    descriptionKey: 'landing.svcPaintingDesc',
    icon: 'format_paint',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop',
  },
];

const steps = [
  {
    number: '1',
    titleKey: 'landing.step1Title',
    descriptionKey: 'landing.step1Desc',
    icon: 'manage_search',
  },
  {
    number: '2',
    titleKey: 'landing.step2Title',
    descriptionKey: 'landing.step2Desc',
    icon: 'handshake',
  },
  {
    number: '3',
    titleKey: 'landing.step3Title',
    descriptionKey: 'landing.step3Desc',
    icon: 'task_alt',
  },
];

const features = [
  {
    titleKey: 'landing.featureVerifiedTitle',
    descriptionKey: 'landing.featureVerifiedDesc',
    icon: 'verified_user',
  },
  {
    titleKey: 'landing.featureBookingTitle',
    descriptionKey: 'landing.featureBookingDesc',
    icon: 'touch_app',
  },
  {
    titleKey: 'landing.featureSecureTitle',
    descriptionKey: 'landing.featureSecureDesc',
    icon: 'lock',
  },
];

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Landing Header */}
      <header className="bg-surface-container-lowest w-full sticky top-0 z-40 border-b border-outline-slate">
        <div className="flex items-center justify-between px-margin-mobile md:px-margin-desktop w-full max-w-container mx-auto h-16">
          <Link to="/" className="font-manrope text-headline-sm font-bold text-primary">
            Connect360
          </Link>
          <nav className="hidden md:flex gap-gutter items-center">
            <a className="font-hanken text-body-md text-on-surface-variant hover:text-secondary transition-colors" href="#services">{t('landing.navServices')}</a>
            <a className="font-hanken text-body-md text-on-surface-variant hover:text-secondary transition-colors" href="#how-it-works">{t('landing.navHowItWorks')}</a>
            <a className="font-hanken text-body-md text-on-surface-variant hover:text-secondary transition-colors" href="#why">{t('landing.navWhyUs')}</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="font-hanken text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/register"
              className="bg-primary-container text-on-primary font-hanken text-label-md font-semibold px-6 py-2 rounded-lg hover:bg-primary transition-colors"
            >
              {t('auth.signup')}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-container mx-auto px-margin-mobile md:px-margin-desktop flex flex-col gap-stack-lg md:gap-stack-xl py-stack-lg md:py-stack-xl">
        {/* Hero Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-center md:min-h-[60vh]">
          <div className="flex flex-col gap-stack-md md:gap-stack-lg md:pr-stack-lg">
            <h1 className="font-manrope text-headline-lg-mobile md:text-display-lg text-primary">
              {t('landing.heroTitle')}
            </h1>
            <p className="font-hanken text-body-md md:text-body-lg text-on-surface-variant max-w-lg">
              {t('landing.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-stack-sm">
              <div className="relative flex-grow">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  search
                </span>
                <input
                  className="w-full pl-10 pr-4 h-12 rounded-lg border border-outline-slate bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary font-hanken text-body-md"
                  placeholder={t('landing.searchPlaceholder')}
                  type="text"
                />
              </div>
              <Link
                to="/register"
                className="bg-primary-container text-on-primary font-hanken text-label-md font-semibold px-8 h-12 rounded-lg hover:bg-primary transition-colors flex items-center justify-center flex-shrink-0 whitespace-nowrap"
              >
                {t('landing.searchPros')}
              </Link>
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden shadow-level-1 h-64 md:h-full md:min-h-[400px] border border-outline-slate">
            <img
              className="absolute inset-0 w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=800&fit=crop"
              alt={t('landing.heroImageAlt')}
            />
          </div>
        </section>

        {/* Popular Services (Bento Grid) */}
        <section id="services" className="flex flex-col gap-stack-lg">
          <div className="flex justify-between items-end">
            <h2 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">{t('landing.popularServices')}</h2>
            <Link to="/register" className="font-hanken text-label-md font-semibold text-secondary hover:underline flex items-center gap-1">
              {t('landing.viewAll')}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="flex md:hidden overflow-x-auto no-scrollbar gap-stack-md pb-4 -mx-margin-mobile px-margin-mobile">
            {services.map((service) => (
              <div
                key={service.nameKey}
                className="flex-none w-48 bg-surface-container-lowest rounded-xl border border-outline-slate shadow-level-1 overflow-hidden group cursor-pointer hover:shadow-level-2 transition-shadow"
              >
                <div className="h-28 w-full bg-surface-container-high relative overflow-hidden">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src={service.image}
                    alt={t(service.nameKey)}
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-hanken text-label-md text-on-surface">{t(service.nameKey)}</h3>
                  <p className="font-hanken text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                    {t(service.descriptionKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: bento grid */}
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-4 h-[600px]">
            {/* Large feature item */}
            <div className="col-span-2 row-span-2 relative rounded-xl overflow-hidden group cursor-pointer border border-outline-slate">
              <img
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                src="https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800&h=800&fit=crop"
                alt={t('landing.renovationImageAlt')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
              <div className="absolute bottom-0 left-0 p-stack-lg w-full">
                <h3 className="font-manrope text-headline-md text-on-primary mb-2">{t('landing.renovationTitle')}</h3>
                <p className="font-hanken text-body-md text-surface-container-low mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                  {t('landing.renovationDesc')}
                </p>
                <Link
                  to="/register"
                  className="inline-block bg-surface-container-lowest text-primary font-hanken text-label-md font-semibold px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-surface-container"
                >
                  {t('landing.explore')}
                </Link>
              </div>
            </div>

            {/* Medium item */}
            <div className="col-span-2 relative rounded-xl overflow-hidden group cursor-pointer border border-outline-slate bg-surface-container-lowest p-stack-md flex flex-col justify-between hover:shadow-level-2 transition-shadow">
              <div className="flex justify-between items-start">
                <div className="bg-secondary-container text-on-secondary-container p-3 rounded-lg inline-flex">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>format_paint</span>
                </div>
                <span className="bg-surface-container text-on-surface-variant font-hanken text-label-sm px-2 py-1 rounded-full">
                  {t('landing.highDemand')}
                </span>
              </div>
              <div>
                <h3 className="font-manrope text-headline-sm text-primary mb-1">{t('landing.paintingTitle')}</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant">
                  {t('landing.paintingDesc')}
                </p>
              </div>
            </div>

            {/* Small items */}
            <div className="relative rounded-xl overflow-hidden group cursor-pointer border border-outline-slate bg-surface-container-lowest p-stack-md flex flex-col justify-center items-center text-center hover:shadow-level-2 transition-shadow">
              <div className="bg-primary-fixed text-on-primary-fixed p-3 rounded-lg mb-3">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
              </div>
              <h3 className="font-hanken text-label-md font-semibold text-primary">{t('landing.plumbing')}</h3>
            </div>
            <div className="relative rounded-xl overflow-hidden group cursor-pointer border border-outline-slate bg-surface-container-lowest p-stack-md flex flex-col justify-center items-center text-center hover:shadow-level-2 transition-shadow">
              <div className="bg-primary-fixed text-on-primary-fixed p-3 rounded-lg mb-3">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>electric_bolt</span>
              </div>
              <h3 className="font-hanken text-label-md font-semibold text-primary">{t('landing.electrical')}</h3>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-stack-lg md:py-stack-xl flex flex-col items-center text-center gap-stack-lg border-t border-outline-slate">
          <div className="max-w-2xl">
            <h2 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary mb-4">{t('landing.howItWorksTitle')}</h2>
            <p className="font-hanken text-body-md text-on-surface-variant">
              {t('landing.howItWorksSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter w-full">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-surface-container-lowest rounded-xl p-stack-lg border border-outline-slate flex flex-col items-center text-center relative"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-container text-on-primary rounded-full flex items-center justify-center font-manrope text-headline-sm font-bold shadow-level-1">
                  {step.number}
                </div>
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                    {step.icon}
                  </span>
                </div>
                <h3 className="font-manrope text-headline-sm text-primary mb-2">{t(step.titleKey)}</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant">{t(step.descriptionKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Connect360 */}
        <section id="why" className="flex flex-col gap-stack-lg border-t border-outline-slate pt-stack-lg md:pt-stack-xl">
          <h2 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary text-center">{t('landing.whyTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {features.map((feature) => (
              <div
                key={feature.titleKey}
                className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-slate flex flex-col items-center text-center hover:shadow-level-2 transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {feature.icon}
                  </span>
                </div>
                <h3 className="font-manrope text-headline-sm text-primary">{t(feature.titleKey)}</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-2">{t(feature.descriptionKey)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container w-full py-stack-lg mt-auto border-t border-outline-slate">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-container mx-auto gap-4">
          <div className="font-manrope text-label-md font-black text-primary">Connect360</div>
          <nav className="flex flex-wrap justify-center gap-gutter items-center">
            <a className="font-hanken text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">{t('landing.footerTerms')}</a>
            <a className="font-hanken text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">{t('landing.footerPrivacy')}</a>
            <a className="font-hanken text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">{t('common.support')}</a>
            <a className="font-hanken text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">{t('landing.footerContact')}</a>
          </nav>
          <div className="font-hanken text-body-sm text-on-surface-variant">
            {t('landing.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
}
