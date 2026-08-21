import { useState, useEffect } from 'react';
import { workersService } from '../../services/workersService';
import { servicesService } from '../../services/servicesService';
import { Save, Plus, X } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl"></div></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="text-gray-600 mt-1">Keep your profile updated to attract more customers</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 border-b pb-2">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input name="full_name" value={profile.full_name} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" value={profile.phone} onChange={handleChange} className="input-field" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input name="city" value={profile.city} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input name="address" value={profile.address} onChange={handleChange} className="input-field" />
            </div>
          </div>
        </div>

        {/* Professional Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 border-b pb-2">Professional Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea name="bio" value={profile.bio} onChange={handleChange} className="input-field" rows={3} placeholder="Tell customers about your expertise..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
              <input name="experience_years" type="number" min="0" value={profile.experience_years} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₹)</label>
              <input name="hourly_rate" type="number" min="0" step="50" value={profile.hourly_rate} onChange={handleChange} className="input-field" placeholder="500" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_available" checked={profile.is_available} onChange={handleChange} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Available for bookings</span>
              </label>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 border-b pb-2">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span key={skill} className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-600" aria-label={`Remove ${skill}`}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="input-field flex-1"
              placeholder="Add a skill (e.g., Pipe Fitting)"
            />
            <button type="button" onClick={addSkill} className="btn-secondary flex items-center gap-1">
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        {/* Services */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 border-b pb-2">Services Offered</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allServices.map((service) => (
              <label key={service.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${serviceIds.includes(service.id) ? 'bg-primary-50 border-primary-300' : 'hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={serviceIds.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">{service.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
