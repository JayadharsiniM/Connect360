import { useState, useEffect } from 'react';
import { workersService } from '../../services/workersService';

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

  const getDaySlots = (dayIndex) => schedule.filter((s) => s.day_of_week === dayIndex);

  const addSlot = (dayIndex) => {
    setSchedule([
      ...schedule,
      { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00', is_available: true },
    ]);
  };

  const removeSlot = (index) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const updateSlot = (index, field, value) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: value };
    setSchedule(updated);
  };

  const toggleDayAvailability = (dayIndex) => {
    const daySlots = getDaySlots(dayIndex);
    if (daySlots.length > 0) {
      // Remove all slots for this day
      setSchedule(schedule.filter((s) => s.day_of_week !== dayIndex));
    } else {
      // Add default slot for this day
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

  const clearAll = () => {
    setSchedule([]);
  };

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
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse flex flex-col gap-stack-lg">
          <div className="h-8 bg-surface-container-high rounded-lg w-2/3" />
          <div className="h-5 bg-surface-container-high rounded-lg w-1/3" />
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-16 bg-surface-container-high rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
          <button onClick={loadAvailability} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-stack-sm">
        <div>
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">Availability</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            Define when you're available for bookings
          </p>
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

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${message.includes('success') ? 'bg-success-container' : 'bg-error-container'}`}>
          <span className="material-symbols-outlined text-[20px]">
            {message.includes('success') ? 'check_circle' : 'error'}
          </span>
          <p className="font-hanken text-body-sm">{message}</p>
        </div>
      )}

      {/* Weekly Schedule */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
        {DAYS_OF_WEEK.map((day, dayIndex) => {
          const daySlots = schedule
            .map((slot, idx) => ({ ...slot, _idx: idx }))
            .filter((s) => s.day_of_week === dayIndex);
          const isActive = daySlots.length > 0;

          return (
            <div
              key={dayIndex}
              className={`bg-surface-container-lowest rounded-xl border p-5 shadow-level-1 transition-all ${
                isActive ? 'border-primary-container' : 'border-outline-variant'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDayAvailability(dayIndex)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      isActive ? 'bg-primary' : 'bg-surface-container-highest'
                    }`}
                    aria-label={`Toggle ${day} availability`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        isActive ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <div>
                    <h3 className="font-manrope text-label-md text-on-surface">{day}</h3>
                    <p className="font-hanken text-body-sm text-on-surface-variant">
                      {isActive
                        ? `${daySlots.length} time slot${daySlots.length > 1 ? 's' : ''}`
                        : 'Unavailable'}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <button
                    type="button"
                    onClick={() => addSlot(dayIndex)}
                    className="flex items-center gap-1 font-hanken text-label-sm text-secondary hover:opacity-80 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Slot
                  </button>
                )}
              </div>

              {/* Time Slots */}
              {isActive && (
                <div className="mt-4 flex flex-col gap-2">
                  {daySlots.map((slot) => (
                    <div key={slot._idx} className="flex items-center gap-3 pl-15">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">schedule</span>
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateSlot(slot._idx, 'start_time', e.target.value)}
                        className="input-field !w-auto !py-2 !px-3 font-hanken text-body-sm"
                      />
                      <span className="font-hanken text-body-sm text-on-surface-variant">to</span>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateSlot(slot._idx, 'end_time', e.target.value)}
                        className="input-field !w-auto !py-2 !px-3 font-hanken text-body-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(slot._idx)}
                        className="text-on-surface-variant hover:text-error transition-colors p-1"
                        aria-label="Remove time slot"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Summary */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-[24px]">event_available</span>
            <h3 className="font-manrope text-label-md text-on-surface">Weekly Summary</h3>
          </div>
          <div className="flex gap-2">
            {SHORT_DAYS.map((day, idx) => {
              const hasSlots = schedule.some((s) => s.day_of_week === idx);
              return (
                <span
                  key={idx}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-hanken text-label-sm ${
                    hasSlots
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {day}
                </span>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 w-fit">
          <span className="material-symbols-outlined text-[18px]">save</span>
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </form>
    </div>
  );
}
