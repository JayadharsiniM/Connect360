import { useState, useEffect } from 'react';
import { workersService } from '../../services/workersService';
import DashboardLayout from '../../components/DashboardLayout';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WorkerAvailability() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAvailability();
  }, []);

  async function loadAvailability() {
    try {
      const res = await workersService.getAvailability();
      setSchedule(res.data.availability || []);
    } catch (err) {
      setError('Failed to load availability.');
      console.error('Error loading availability:', err);
    } finally {
      setLoading(false);
    }
  }

  const addSlot = (dayIndex) => {
    setSchedule((prev) => [
      ...prev,
      { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00', is_available: true },
    ]);
  };

  const removeSlot = (index) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index, field, value) => {
    setSchedule((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleDayAvailability = (dayIndex) => {
    const daySlots = schedule.filter((s) => s.day_of_week === dayIndex);
    if (daySlots.length > 0) {
      setSchedule((prev) => prev.filter((s) => s.day_of_week !== dayIndex));
    } else {
      addSlot(dayIndex);
    }
  };

  const quickFillWeekdays = () => {
    const slots = [];
    for (let day = 1; day <= 5; day++) {
      slots.push({ day_of_week: day, start_time: '09:00', end_time: '17:00', is_available: true });
    }
    setSchedule(slots);
  };

  const clearAll = () => setSchedule([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await workersService.setAvailability(schedule);
      setMessage('Availability updated successfully!');
    } catch (err) {
      setMessage('Failed to update availability.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
          <div className="animate-pulse flex flex-col gap-stack-lg">
            <div className="h-8 bg-surface-container-high rounded-lg w-2/3" />
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-surface-container-high rounded-xl" />)}
          </div>
        </div>
        <div className="hidden lg:grid grid-cols-12 gap-8 animate-pulse">
          <div className="col-span-8 h-96 bg-surface-container-high rounded-xl" />
          <div className="col-span-4 h-72 bg-surface-container-high rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="pt-6 lg:pt-0 px-margin-mobile lg:px-0 max-w-container mx-auto">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={loadAvailability} className="btn-primary mt-4">Retry</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const messageBanner = message && (
    <div className={`rounded-lg p-4 flex items-center gap-3 ${message.includes('success') ? 'bg-success-container' : 'bg-error-container'}`}>
      <span className="material-symbols-outlined text-[20px]">{message.includes('success') ? 'check_circle' : 'error'}</span>
      <p className="font-hanken text-body-sm">{message}</p>
    </div>
  );

  // Shared day row renderer
  const renderDayRow = (day, dayIndex, variant) => {
    const daySlots = schedule
      .map((slot, idx) => ({ ...slot, _idx: idx }))
      .filter((s) => s.day_of_week === dayIndex);
    const isActive = daySlots.length > 0;

    if (variant === 'desktop') {
      return (
        <div key={dayIndex} className={`flex items-start gap-4 py-3 border-b border-surface-container last:border-0 ${isActive ? '' : 'opacity-60'}`}>
          <div className="w-36 flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => toggleDayAvailability(dayIndex)}
              className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${isActive ? 'bg-secondary' : 'bg-outline-variant'}`}
              aria-label={`Toggle ${day}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
            <span className="font-hanken text-label-md text-on-surface">{day}</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {isActive ? (
              daySlots.map((slot) => (
                <div key={slot._idx} className="flex items-center gap-3">
                  <input type="time" value={slot.start_time} onChange={(e) => updateSlot(slot._idx, 'start_time', e.target.value)} className="h-11 bg-white border border-outline-slate rounded-lg px-3 font-hanken text-body-md focus:border-secondary focus:ring-1 focus:ring-secondary/50 outline-none" />
                  <span className="text-on-surface-variant">-</span>
                  <input type="time" value={slot.end_time} onChange={(e) => updateSlot(slot._idx, 'end_time', e.target.value)} className="h-11 bg-white border border-outline-slate rounded-lg px-3 font-hanken text-body-md focus:border-secondary focus:ring-1 focus:ring-secondary/50 outline-none" />
                  <button type="button" onClick={() => removeSlot(slot._idx)} className="text-on-surface-variant hover:text-error transition-colors p-2" aria-label="Remove slot">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))
            ) : (
              <span className="font-hanken text-body-md text-on-surface-variant italic pt-2">Unavailable</span>
            )}
            {isActive && (
              <button type="button" onClick={() => addSlot(dayIndex)} className="flex items-center gap-1 font-hanken text-label-sm text-secondary hover:opacity-80 transition-opacity w-fit">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add slot
              </button>
            )}
          </div>
        </div>
      );
    }

    // mobile variant (original)
    return (
      <div key={dayIndex} className={`bg-surface-container-lowest rounded-xl border p-5 shadow-level-1 transition-all ${isActive ? 'border-primary-container' : 'border-outline-variant'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => toggleDayAvailability(dayIndex)} className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${isActive ? 'bg-primary' : 'bg-surface-container-highest'}`} aria-label={`Toggle ${day} availability`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-[26px]' : 'translate-x-0.5'}`} />
            </button>
            <div>
              <h3 className="font-manrope text-label-md text-on-surface">{day}</h3>
              <p className="font-hanken text-body-sm text-on-surface-variant">
                {isActive ? `${daySlots.length} time slot${daySlots.length > 1 ? 's' : ''}` : 'Unavailable'}
              </p>
            </div>
          </div>
          {isActive && (
            <button type="button" onClick={() => addSlot(dayIndex)} className="flex items-center gap-1 font-hanken text-label-sm text-secondary hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Slot
            </button>
          )}
        </div>
        {isActive && (
          <div className="mt-4 flex flex-col gap-2">
            {daySlots.map((slot) => (
              <div key={slot._idx} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">schedule</span>
                <input type="time" value={slot.start_time} onChange={(e) => updateSlot(slot._idx, 'start_time', e.target.value)} className="input-field !w-auto !py-2 !px-3 font-hanken text-body-sm" />
                <span className="font-hanken text-body-sm text-on-surface-variant">to</span>
                <input type="time" value={slot.end_time} onChange={(e) => updateSlot(slot._idx, 'end_time', e.target.value)} className="input-field !w-auto !py-2 !px-3 font-hanken text-body-sm" />
                <button type="button" onClick={() => removeSlot(slot._idx)} className="text-on-surface-variant hover:text-error transition-colors p-1" aria-label="Remove time slot">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-stack-sm">
          <div>
            <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">Availability</h1>
            <p className="font-hanken text-body-md text-on-surface-variant">Define when you're available for bookings</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={quickFillWeekdays} className="btn-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
              Mon-Fri 9-5
            </button>
            <button type="button" onClick={clearAll} className="btn-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">clear_all</span>
              Clear
            </button>
          </div>
        </section>

        {messageBanner}

        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
          {DAYS_OF_WEEK.map((day, dayIndex) => renderDayRow(day, dayIndex, 'mobile'))}

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-primary text-[24px]">event_available</span>
              <h3 className="font-manrope text-label-md text-on-surface">Weekly Summary</h3>
            </div>
            <div className="flex gap-2">
              {SHORT_DAYS.map((day, idx) => {
                const hasSlots = schedule.some((s) => s.day_of_week === idx);
                return (
                  <span key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-hanken text-label-sm ${hasSlots ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {day}
                  </span>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 w-fit">
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </form>
      </div>

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-manrope text-display-lg text-primary">Availability Settings</h1>
            <p className="font-hanken text-body-md text-on-surface-variant mt-2 max-w-2xl">
              Define your standard weekly working hours. These determine your open slots for new bookings.
            </p>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={clearAll} className="bg-surface text-primary border border-outline-slate px-6 py-3 rounded-lg font-hanken text-label-md hover:bg-surface-container transition-colors">
              Clear All
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="bg-primary-container text-on-primary px-6 py-3 rounded-lg font-hanken text-label-md hover:bg-primary transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </div>

        {messageBanner}

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Weekly schedule */}
          <div className="col-span-8">
            <div className="bg-white rounded-xl border border-outline-slate p-stack-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-manrope text-headline-md text-primary">Weekly Schedule</h3>
                <button type="button" onClick={quickFillWeekdays} className="flex items-center gap-1.5 font-hanken text-label-sm text-secondary hover:opacity-80 transition-opacity">
                  <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                  Fill Mon–Fri 9–5
                </button>
              </div>
              <div className="flex flex-col">
                {DAYS_OF_WEEK.map((day, dayIndex) => renderDayRow(day, dayIndex, 'desktop'))}
              </div>
            </div>
          </div>

          {/* Sidebar: summary + impact */}
          <div className="col-span-4 flex flex-col gap-6 sticky top-[80px]">
            <div className="bg-white rounded-xl border border-outline-slate p-stack-md">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary text-[24px]">event_available</span>
                <h3 className="font-manrope text-headline-sm text-primary">Weekly Summary</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {SHORT_DAYS.map((day, idx) => {
                  const hasSlots = schedule.some((s) => s.day_of_week === idx);
                  return (
                    <span key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-hanken text-label-sm ${hasSlots ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {day}
                    </span>
                  );
                })}
              </div>
              <p className="font-hanken text-body-sm text-on-surface-variant mt-4">
                {schedule.length} time slot{schedule.length !== 1 ? 's' : ''} across {new Set(schedule.map((s) => s.day_of_week)).size} day(s).
              </p>
            </div>

            <div className="bg-primary text-on-primary rounded-xl p-stack-md">
              <h4 className="font-manrope text-headline-sm font-bold mb-2">Schedule Impact</h4>
              <p className="font-hanken text-body-sm text-primary-fixed-dim mb-4">
                Changes to your availability immediately affect your open slots for new bookings.
              </p>
              <div className="flex items-center gap-2 font-hanken text-body-sm">
                <span className="material-symbols-outlined text-secondary-fixed">info</span>
                <span>Save your changes to apply them.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
