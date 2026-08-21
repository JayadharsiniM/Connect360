import { useState, useEffect } from 'react';
import { workersService } from '../../services/workersService';
import { DAYS_OF_WEEK } from '../../config/constants';
import { Clock, Save, Plus, Trash2 } from 'lucide-react';

export default function WorkerAvailability() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadAvailability();
  }, []);

  async function loadAvailability() {
    try {
      const res = await workersService.getAvailability();
      setSchedule(res.data.availability || []);
    } catch (err) {
      console.error('Error loading availability:', err);
    } finally {
      setLoading(false);
    }
  }

  const addSlot = () => {
    setSchedule([
      ...schedule,
      { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
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

  // Quick fill: Mon-Fri 9-5
  const quickFillWeekdays = () => {
    const slots = [];
    for (let day = 1; day <= 5; day++) {
      slots.push({ day_of_week: day, start_time: '09:00', end_time: '17:00', is_available: true });
    }
    setSchedule(slots);
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl"></div></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set Availability</h1>
          <p className="text-gray-600 mt-1">Define when you're available for bookings</p>
        </div>
        <button type="button" onClick={quickFillWeekdays} className="btn-secondary text-sm">
          Quick Fill: Mon-Fri 9-5
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          {schedule.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No availability slots set.</p>
              <p className="text-sm text-gray-500">Add time slots to let customers book you.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.map((slot, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <select
                    value={slot.day_of_week}
                    onChange={(e) => updateSlot(index, 'day_of_week', parseInt(e.target.value))}
                    className="input-field w-auto"
                  >
                    {DAYS_OF_WEEK.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                      className="input-field w-auto"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                      className="input-field w-auto"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    aria-label="Remove slot"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addSlot}
            className="mt-4 w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-600 hover:border-primary-400 hover:text-primary-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={18} /> Add Time Slot
          </button>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </form>
    </div>
  );
}
