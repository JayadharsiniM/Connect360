import { useState, useEffect } from 'react';
import { workersService } from '../../services/workersService';
import { servicesService } from '../../services/servicesService';

export default function WorkerProfile() {
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    bio: '',
    experience_years: 0,
    hourly_rate: '',
    is_available: true,
  });
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [serviceIds, setServiceIds] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [profileRes, servicesRes] = await Promise.all([
        workersService.getProfile(),
        servicesService.list(),
      ]);
      const p = profileRes.data.profile;
      setProfile({
        full_name: p.full_name || '',
        phone: p.phone || '',
        address: p.address || '',
        city: p.city || '',
        bio: p.bio || '',
        experience_years: p.experience_years || 0,
        hourly_rate: p.hourly_rate || '',
        is_available: p.is_available ?? true,
      });
      setSkills(p.skills || []);
      setServiceIds((p.services || []).map((s) => s.id));
      setAllServices(servicesRes.data.services || []);
    } catch (err) {
      setError('Failed to load profile data.');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile({ ...profile, [name]: type === 'checkbox' ? checked : value });
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const toggleService = (id) => {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await workersService.updateProfile({
        ...profile,
        skills,
        service_ids: serviceIds,
      });
      setMessage('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      setMessage('Failed to update profile.');
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
          <div className="h-48 bg-surface-container-high rounded-xl" />
          <div className="h-48 bg-surface-container-high rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error Loading Profile</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
          <button onClick={loadData} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-stack-sm">
        <div>
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">My Profile</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            Keep your profile updated to attract more customers
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 w-fit">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit Profile
          </button>
        )}
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

      {editing ? (
        /* Edit Mode */
        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-lg">
          {/* Personal Info Card */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
            <h2 className="font-manrope text-headline-sm text-on-surface pb-4 border-b border-outline-variant">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">Full Name</label>
                <input name="full_name" value={profile.full_name} onChange={handleChange} className="input-field" />
              </div>
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">Phone</label>
                <input name="phone" value={profile.phone} onChange={handleChange} className="input-field" placeholder="+91 98765 43210" />
              </div>
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">City</label>
                <input name="city" value={profile.city} onChange={handleChange} className="input-field" />
              </div>
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">Address</label>
                <input name="address" value={profile.address} onChange={handleChange} className="input-field" />
              </div>
            </div>
          </div>

          {/* Professional Details Card */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
            <h2 className="font-manrope text-headline-sm text-on-surface pb-4 border-b border-outline-variant">
              Professional Details
            </h2>
            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Bio</label>
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                className="input-field"
                rows={3}
                placeholder="Tell customers about your expertise..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">Experience (years)</label>
                <input name="experience_years" type="number" min="0" value={profile.experience_years} onChange={handleChange} className="input-field" />
              </div>
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">Hourly Rate (₹)</label>
                <input name="hourly_rate" type="number" min="0" step="50" value={profile.hourly_rate} onChange={handleChange} className="input-field" placeholder="500" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer font-hanken text-label-md text-on-surface">
                  <input
                    type="checkbox"
                    name="is_available"
                    checked={profile.is_available}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-outline-variant text-primary"
                  />
                  Available for bookings
                </label>
              </div>
            </div>
          </div>

          {/* Skills Card */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
            <h2 className="font-manrope text-headline-sm text-on-surface pb-4 border-b border-outline-variant">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-primary-container text-on-primary px-3 py-1.5 rounded-full font-hanken text-label-sm flex items-center gap-1.5"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:opacity-70 transition-opacity"
                    aria-label={`Remove ${skill}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <p className="font-hanken text-body-sm text-on-surface-variant">No skills added yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="input-field flex-1"
                placeholder="Add a skill (e.g., Pipe Fitting)"
              />
              <button type="button" onClick={addSkill} className="btn-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add
              </button>
            </div>
          </div>

          {/* Services Card */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
            <h2 className="font-manrope text-headline-sm text-on-surface pb-4 border-b border-outline-variant">
              Services Offered
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allServices.map((service) => (
                <label
                  key={service.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all font-hanken text-body-sm ${
                    serviceIds.includes(service.id)
                      ? 'bg-primary-container border-primary-container text-on-primary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="w-4 h-4 rounded border-outline-variant text-primary"
                  />
                  {service.name}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* View Mode */
        <div className="flex flex-col gap-stack-lg">
          {/* Profile Header Card */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
            <div className="flex items-center gap-4 pb-6 border-b border-outline-variant">
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[32px]">person</span>
              </div>
              <div className="flex-1">
                <h2 className="font-manrope text-headline-sm text-on-surface">{profile.full_name || 'Not set'}</h2>
                <p className="font-hanken text-body-sm text-on-surface-variant">{profile.city || 'No city set'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-hanken text-label-sm ${
                    profile.is_available ? 'bg-success-container text-on-success-container' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-[12px]">
                      {profile.is_available ? 'check_circle' : 'do_not_disturb'}
                    </span>
                    {profile.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md mt-6">
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Phone</p>
                <p className="font-hanken text-body-md text-on-surface mt-1">{profile.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Address</p>
                <p className="font-hanken text-body-md text-on-surface mt-1">{profile.address || 'Not set'}</p>
              </div>
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Experience</p>
                <p className="font-hanken text-body-md text-on-surface mt-1">{profile.experience_years} years</p>
              </div>
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Hourly Rate</p>
                <p className="font-hanken text-body-md text-on-surface mt-1">₹{profile.hourly_rate || 0}/hr</p>
              </div>
              {profile.bio && (
                <div className="md:col-span-2">
                  <p className="font-hanken text-label-sm text-on-surface-variant">Bio</p>
                  <p className="font-hanken text-body-md text-on-surface mt-1">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
            <h2 className="font-manrope text-headline-sm text-on-surface mb-4">Skills</h2>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="bg-primary-container text-on-primary px-3 py-1.5 rounded-full font-hanken text-label-sm">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="font-hanken text-body-sm text-on-surface-variant">No skills added yet</p>
            )}
          </div>

          {/* Services */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
            <h2 className="font-manrope text-headline-sm text-on-surface mb-4">Services Offered</h2>
            {serviceIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allServices.filter((s) => serviceIds.includes(s.id)).map((service) => (
                  <span key={service.id} className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full font-hanken text-label-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">handyman</span>
                    {service.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="font-hanken text-body-sm text-on-surface-variant">No services selected yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
