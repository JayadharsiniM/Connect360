import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/customerService';

export default function CustomerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', address: '', city: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await customerService.getProfile();
      const p = res.data.profile;
      setProfile(p);
      setFormData({ full_name: p.full_name || '', phone: p.phone || '', address: p.address || '', city: p.city || '' });
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await customerService.updateProfile(formData);
      setMessage('Profile updated successfully');
      setEditing(false);
      loadProfile();
    } catch (err) {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse h-64 bg-surface-container-high rounded-xl" />
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl max-w-2xl">
      <h1 className="font-manrope text-headline-lg-mobile text-primary">My Profile</h1>

      {message && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${message.includes('success') ? 'bg-success-container' : 'bg-error-container'}`}>
          <span className="material-symbols-outlined text-[20px]">{message.includes('success') ? 'check_circle' : 'error'}</span>
          <p className="font-hanken text-body-sm">{message}</p>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-outline-variant">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[32px]">person</span>
          </div>
          <div className="flex-1">
            <h2 className="font-manrope text-headline-sm text-on-surface">{profile?.full_name || user?.fullName}</h2>
            <p className="font-hanken text-body-sm text-on-surface-variant">{user?.email}</p>
            <p className="font-hanken text-label-sm text-secondary capitalize mt-1">{user?.role}</p>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary !py-2 !px-4">
              <span className="material-symbols-outlined text-[16px] mr-1">edit</span>
              Edit
            </button>
          )}
        </div>

        {/* Profile Content */}
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-stack-md mt-6">
            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Full Name</label>
              <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="input-field" />
            </div>
            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" placeholder="+91 XXXXXXXXXX" />
            </div>
            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Address</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" />
            </div>
            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">City</label>
              <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input-field" />
            </div>
            <div className="flex gap-3 mt-stack-sm">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md mt-6">
            <div>
              <p className="font-hanken text-label-sm text-on-surface-variant">Phone</p>
              <p className="font-hanken text-body-md text-on-surface mt-1">{profile?.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="font-hanken text-label-sm text-on-surface-variant">City</p>
              <p className="font-hanken text-body-md text-on-surface mt-1">{profile?.city || 'Not set'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="font-hanken text-label-sm text-on-surface-variant">Address</p>
              <p className="font-hanken text-body-md text-on-surface mt-1">{profile?.address || 'Not set'}</p>
            </div>
            <div>
              <p className="font-hanken text-label-sm text-on-surface-variant">Total Bookings</p>
              <p className="font-hanken text-body-md text-on-surface mt-1">{profile?.total_bookings || 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
