import { useState, useEffect, useCallback, useRef } from 'react';
import { priorityService } from '../../services/priorityService';
import DashboardLayout from '../../components/DashboardLayout';

/**
 * Worker "⚡ Priority Requests" section. Shows auto-matched job offers the
 * worker can Accept or Decline. Only privacy-safe fields are shown (customer
 * first name, coarse area, service, time, estimated earnings, match score) —
 * never phone/email/exact address before acceptance.
 */
export default function WorkerPriorityRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [flash, setFlash] = useState('');
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await priorityService.listWorkerRequests();
      setRequests(res.data.priority_requests || []);
    } catch (err) {
      console.error('Priority requests load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Poll so newly matched offers appear without a manual refresh.
    pollRef.current = setInterval(load, 8000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  async function handleAccept(id) {
    setActionId(id);
    try {
      await priorityService.accept(id);
      setFlash('Request accepted — booking confirmed. Find it under Bookings.');
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not accept this request');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id) {
    if (!window.confirm('Decline this priority request?')) return;
    setActionId(id);
    try {
      await priorityService.reject(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not decline this request');
    } finally {
      setActionId(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="pt-6 lg:pt-0 px-margin-mobile md:px-margin-desktop lg:px-0 max-w-3xl mx-auto flex flex-col gap-stack-lg pb-24 lg:pb-0">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </span>
          <div>
            <h1 className="font-manrope text-headline-lg-mobile lg:text-headline-lg text-primary">
              Priority Requests {requests.length > 0 && <span className="text-secondary">({requests.length})</span>}
            </h1>
            <p className="font-hanken text-body-sm text-on-surface-variant">Auto-matched jobs waiting for your response</p>
          </div>
        </div>

        {flash && (
          <div className="bg-success-container border border-success/20 rounded-lg p-4 flex items-start gap-3 anim-rise">
            <span className="material-symbols-outlined text-success text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="font-hanken text-body-sm text-success">{flash}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-stack-md">
            {[1, 2].map((i) => <div key={i} className="h-56 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">bolt</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No priority requests right now</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">
              When a customer's automatic match selects you, the request will appear here. Keep your availability on to receive more.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-stack-md">
            {requests.map((r) => (
              <div key={r.booking_id} className="priority-card p-stack-lg flex flex-col gap-stack-md anim-rise">
                <div className="priority-accent-bar" />

                <div className="flex items-center justify-between gap-3">
                  <span className="badge badge-priority">
                    <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    Priority Request
                  </span>
                  {typeof r.match_score === 'number' && (
                    <span className="inline-flex items-center gap-1 font-hanken text-label-md text-secondary">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
                      {r.match_score}% match
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field icon="person" label="Customer" value={r.customer_name} />
                  <Field icon="handyman" label="Service" value={r.service_name} />
                  <Field icon="location_on" label="Area" value={r.area || '—'} />
                  <Field
                    icon="schedule"
                    label="Requested"
                    value={`${r.scheduled_date || 'ASAP'}${r.scheduled_time ? ` · ${r.scheduled_time}` : ''}`}
                  />
                  {r.estimated_earnings > 0 && (
                    <Field icon="payments" label="Est. earnings" value={`₹${r.estimated_earnings}`} highlight />
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-outline-variant">
                  <button
                    onClick={() => handleAccept(r.booking_id)}
                    disabled={actionId === r.booking_id}
                    className="btn-primary !py-2 flex-1 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {actionId === r.booking_id ? 'Working…' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleReject(r.booking_id)}
                    disabled={actionId === r.booking_id}
                    className="btn-secondary !py-2 flex-1 flex items-center justify-center gap-1.5 !text-error !border-error"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Field({ icon, label, value, highlight }) {
  return (
    <div>
      <p className="font-hanken text-label-sm text-on-surface-variant flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </p>
      <p className={`font-hanken text-body-md mt-0.5 ${highlight ? 'text-primary font-semibold' : 'text-on-surface'}`}>
        {value}
      </p>
    </div>
  );
}
