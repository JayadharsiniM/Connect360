import { Link } from 'react-router-dom';

const services = [
  {
    name: 'Home Cleaning',
    description: 'Top-rated cleaners for your home.',
    icon: 'cleaning_services',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
  },
  {
    name: 'Plumbing',
    description: 'Expert plumbers for quick fixes.',
    icon: 'plumbing',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop',
  },
  {
    name: 'Electrical',
    description: 'Certified electricians you can trust.',
    icon: 'electrical_services',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop',
  },
  {
    name: 'Painting',
    description: 'Transform your space with color.',
    icon: 'format_paint',
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop',
  },
];

const steps = [
  {
    number: '1',
    title: 'Search',
    description: 'Browse through our extensive list of trusted professionals in your area.',
    icon: 'search',
  },
  {
    number: '2',
    title: 'Book',
    description: 'Select a suitable time and confirm your booking instantly and securely.',
    icon: 'event_available',
  },
  {
    number: '3',
    title: 'Get it Done',
    description: 'Relax while the professional handles the task with quality and care.',
    icon: 'check_circle',
  },
];

const features = [
  {
    title: 'Verified Professionals',
    description: 'Every provider is thoroughly vetted to ensure high quality and safety.',
    icon: 'verified_user',
  },
  {
    title: 'Easy Booking',
    description: 'A seamless, intuitive process to find and schedule services in minutes.',
    icon: 'touch_app',
  },
  {
    title: 'Secure Platform',
    description: 'Your data and transactions are encrypted and safely processed.',
    icon: 'lock',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <section className="px-margin-mobile md:px-margin-desktop py-stack-xl flex flex-col items-center text-center gap-stack-md bg-surface-container-lowest border-b border-outline-variant">
        <h1 className="font-manrope text-headline-lg-mobile md:text-display-lg text-primary max-w-2xl mx-auto">
          Find trusted professionals for every task.
        </h1>
        <p className="font-hanken text-body-md text-on-surface-variant max-w-xl mx-auto">
          Connect360 makes it simple to discover verified professionals, compare your options, and book the right person for the job.
        </p>
        <div className="flex flex-col sm:flex-row w-full gap-stack-sm mt-stack-sm max-w-sm mx-auto">
          <Link to="/register" className="btn-primary w-full text-center">
            Find a Professional
          </Link>
          <Link to="/register?role=worker" className="btn-secondary w-full text-center">
            Become a Professional
          </Link>
        </div>
        <div className="w-full mt-stack-lg rounded-xl overflow-hidden shadow-level-2 border border-outline-variant relative h-64 md:h-96 max-w-3xl mx-auto">
          <img
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=600&fit=crop"
            alt="Professional at work"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      </section>

      {/* Popular Services Section */}
      <section className="px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-stack-md bg-surface">
        <div className="flex justify-between items-end">
          <h2 className="font-manrope text-headline-sm text-primary">Popular Services</h2>
          <Link to="/login" className="font-hanken text-label-sm text-secondary hover:underline">
            View All
          </Link>
        </div>
        <div className="flex overflow-x-auto no-scrollbar gap-stack-md pb-4 -mx-margin-mobile px-margin-mobile md:-mx-0 md:px-0">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex-none w-48 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 overflow-hidden group cursor-pointer hover:shadow-level-2 transition-shadow"
            >
              <div className="h-28 w-full bg-surface-container-high relative overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  src={service.image}
                  alt={service.name}
                />
              </div>
              <div className="p-3">
                <h3 className="font-hanken text-label-md text-on-surface">{service.name}</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-stack-md bg-surface-container-lowest border-y border-outline-variant">
        <h2 className="font-manrope text-headline-sm text-primary text-center">How It Works</h2>
        <div className="flex flex-col gap-stack-md mt-4 max-w-lg mx-auto w-full">
          {steps.map((step) => (
            <div key={step.number} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-manrope text-headline-sm font-bold shadow-level-1">
                {step.number}
              </div>
              <div>
                <h3 className="font-hanken text-label-md text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 0" }}>
                    {step.icon}
                  </span>
                  {step.title}
                </h3>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Connect360 Section */}
      <section className="px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-stack-md bg-surface">
        <h2 className="font-manrope text-headline-sm text-primary text-center">Why Connect360</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md mt-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-level-1 flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {feature.icon}
                </span>
              </div>
              <h3 className="font-hanken text-label-md text-on-surface">{feature.title}</h3>
              <p className="font-hanken text-body-sm text-on-surface-variant mt-2">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-stack-lg bg-primary border-t border-outline-variant">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-stack-md">
          <div className="font-hanken text-body-sm text-on-primary text-center md:text-left">
            &copy; 2025 Connect360. Professional Service Marketplace.
          </div>
          <nav className="flex flex-wrap justify-center gap-4">
            <a href="#" className="font-hanken text-body-sm text-on-primary-container opacity-80 hover:opacity-100 transition-opacity">
              Terms of Service
            </a>
            <a href="#" className="font-hanken text-body-sm text-on-primary-container opacity-80 hover:opacity-100 transition-opacity">
              Privacy Policy
            </a>
            <a href="#" className="font-hanken text-body-sm text-on-primary-container opacity-80 hover:opacity-100 transition-opacity">
              Help Center
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
