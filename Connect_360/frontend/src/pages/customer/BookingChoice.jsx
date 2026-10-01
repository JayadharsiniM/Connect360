import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';

/**
 * BookingChoice — lets the customer pick between the two booking types.
 *   Manual  : "Choose your worker"        -> existing browse/select flow
 *   Priority: "Let us find the best worker" -> new automatic matching flow
 */
export default function BookingChoice() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="pt-6 lg:pt-0 px-margin-mobile md:px-margin-desktop lg:px-0 max-w-container mx-auto flex flex-col gap-stack-lg pb-24 lg:pb-0">
        <div className="flex flex-col gap-stack-sm">
          <p className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider">Book a service</p>
          <h1 className="font-manrope text-headline-lg-mobile lg:text-headline-lg text-primary">How would you like to book?</h1>
          <p className="font-hanken text-body-md text-on-surface-variant max-w-2xl">
            Pick a professional yourself, or let Connect360 automatically match you with the best available worker.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {/* Manual Booking */}
          <button
            onClick={() => navigate('/customer/workers')}
            className="priority-option border-outline-slate bg-surface-container-lowest hover:border-secondary-fixed-dim hover:shadow-level-1 text-left"
          >
            <div className="flex flex-col gap-stack-md h-full">
              <div className="w-14 h-14 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">person_search</span>
              </div>
              <div className="flex-1">
                <h2 className="font-manrope text-headline-sm text-primary mb-2">Choose your worker</h2>
                <p className="font-hanken text-body-md text-on-surface-variant">
                  Browse available workers and select the worker and time slot yourself.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 font-hanken text-label-md text-secondary mt-2">
                Browse workers
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
            </div>
          </button>

          {/* Priority Booking */}
          <button
            onClick={() => navigate('/customer/priority/new')}
            className="priority-option priority-card border-secondary-fixed-dim hover:shadow-level-2 text-left"
          >
            <div className="priority-accent-bar" />
            <div className="flex flex-col gap-stack-md h-full pl-2">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-xl bg-secondary text-on-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
                <span className="badge badge-priority">
                  <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  Priority
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-manrope text-headline-sm text-primary mb-2">Let us find the best worker</h2>
                <p className="font-hanken text-body-md text-on-surface-variant">
                  Tell us what you need and we'll automatically match you with the most suitable available worker.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 font-hanken text-label-md text-secondary mt-2">
                Start priority request
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
            </div>
          </button>
        </div>

        <Link to="/customer/dashboard" className="font-hanken text-body-sm text-on-surface-variant hover:text-secondary self-start">
          ← Back to dashboard
        </Link>
      </div>
    </DashboardLayout>
  );
}
