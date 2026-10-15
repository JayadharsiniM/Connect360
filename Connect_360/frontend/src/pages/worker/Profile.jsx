import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { workersService } from '../../services/workersService';
import { servicesService } from '../../services/servicesService';
import DashboardLayout from '../../components/DashboardLayout';

export default function WorkerProfile() {
  const { t } = useTranslation();
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
  const [isVerified, setIsVerified] = useState(false);
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [serviceIds, setServiceIds] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error'
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
      setIsVerified(p.is_verified || false);
      setSkills(p.skills || []);
      setServiceIds((p.services || []).map((s) => s.id));
      setAllServices(servicesRes.data.services || []);
    } catch (err) {
      setError(t('workerProfile.loadFailed'));
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

  const removeSkill = (skill) => setSkills(skills.filter((s) => s !== skill));

  const toggleService = (id) => {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await workersService.updateProfile({ ...profile, skills, service_ids: serviceIds });
      setMessage(t('workerProfile.updatedSuccess'));
      setMessageType('success');
      setEditing(false);
    } catch (err) {
      setMessage(t('workerProfile.updateFailed'));
      setMessageType('error');
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
            <div className="h-48 bg-surface-container-high rounded-xl" />
          </div>
        </div>
        <div className="hidden lg:grid grid-cols-12 gap-8 animate-pulse">
          <div className="col-span-4 h-72 bg-surface-container-high rounded-xl" />
          <div className="col-span-8 h-96 bg-surface-container-high rounded-xl" />
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
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('workerProfile.errorLoading')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={loadData} className="btn-primary mt-4">{t('workerProfile.retry')}</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const messageBanner = message && (
    <div className={`rounded-lg p-4 flex items-center gap-3 ${messageType === 'success' ? 'bg-success-container' : 'bg-error-container'}`}>
      <span className="material-symbols-outlined text-[20px]">{messageType === 'success' ? 'check_circle' : 'error'}</span>
      <p className="font-hanken text-body-sm">{message}</p>
    </div>
  );

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-stack-sm">
          <div>
            <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">{t('workerProfile.myProfile')}</h1>
            <p className="font-hanken text-body-md text-on-surface-variant">{t('workerProfile.keepUpdated')}</p>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 w-fit">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              {t('workerProfile.editProfile')}
            </button>
          )}
        </section>

        {messageBanner}

        {editing ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-stack-lg">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
              <h2 className="font-manrope text-headline-sm text-on-surface pb-4 border-b border-outline-variant">{t('workerProfile.personalInformation')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div className="flex flex-col gap-stack-xs">
                  <label className="font-hanken text-label-md text-on-surface">{t('workerProfile.fullName')}</label>
                  <input name="full_name" value={profile.full_name} onChange={handleChange} className="input-field" />
                </div>
                <div className="flex flex-col gap-stack-xs">
                  <label className="font-hanken text-label-md text-on-surface">{t('workerProfile.phone')}</label>
                  <input name="phone" value={profile.phone} onChange={handleChange} className="input-field" placeholder={t('workerProfile.phonePlaceholder')} />
                </div>
                <div className="flex flex-col gap-stack-xs">
                  <label className="font-hanken text-label-md text-on-surface">{t('workerProfile.city')}</label>
                  <input name="city" value={profile.city} onChange={handleChange} className="input-field" />
                </div>
                <div className="flex flex-col gap-stack-xs">
                  <label className="font-hanken text-label-md text-on-surface">{t('workerProfile.address')}</label>
                  <input name="address" value={profile.address} onChange={handleChange} className="input-field" />
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
              <h2 className="font-manrope text-headline-sm text-on-surface pb-4 border-b border-outline-variant">{t('workerProfile.professionalDetails')}</h2>
              <div className="flex flex-col gap-stack-xs">
                <label className="font-hanken text-label-md text-on-surface">{t('workerProfile.bio')}</label>
                <textarea name="bio" value={profile.bio} onChange={handleChange} className="input-field" rows={3} placeholder={t('workerProfile.bioPlaceholder')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
                <div className="flex flex-col gap-stack-xs">
                  <label className="font-hanken text-label-md text-on-surface">{t('workerProfile.experienceYears')}</label>
                  <input name="experience_years" type="number" min="0" value={profile.experience_years} onChange={handleChange} className="input-field" />
                </div>
                <div className="flex flex-col gap-stack-xs">
                  <label className="font-hanken text-label-md text-on-surface">{t('workerProfile.hourlyRate')}</label>
                  <input name="hourly_rate" type="number" min="0" step="50" value={profile.hourly_rate} onChange={handleChange} className="input-field" placeholder={t('workerProfile.ratePlaceholder')} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer font-hanken text-label-md text-on-surface">
                    <input type="checkbox" name="is_available" checked={profile.is_available} onChange={handleChange} className="w-5 h-5 rounded border-outline-variant text-primary" />
                    {t('workerProfile.availableForBookings')}
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
              <h2 className="font-manrope text-headline-sm text-on-surface pb-4 border-b border-outline-variant">{t('workerProfile.skills')}</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="bg-primary-container text-on-primary px-3 py-1.5 rounded-full font-hanken text-label-sm flex items-center gap-1.5">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="hover:opacity-70 transition-opacity" aria-label={t('workerProfile.removeSkill', { skill })}>
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
                {skills.length === 0 && <p className="font-hanken text-body-sm text-on-surface-variant">{t('workerProfile.noSkills')}</p>}
              </div>
              <div className="flex gap-2">
                <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input-field flex-1" placeholder={t('workerProfile.skillPlaceholder')} />
                <button type="button" onClick={addSkill} className="btn-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  {t('workerProfile.add')}
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
              <h2 className="font-manrope text-headline-sm text-on-surface pb-4 border-b border-outline-variant">{t('workerProfile.servicesOffered')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allServices.map((service) => (
                  <label key={service.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all font-hanken text-body-sm ${serviceIds.includes(service.id) ? 'bg-primary-container border-primary-container text-on-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                    <input type="checkbox" checked={serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} className="w-4 h-4 rounded border-outline-variant text-primary" />
                    {service.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">save</span>
                {saving ? t('workerProfile.saving') : t('workerProfile.saveProfile')}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">{t('workerProfile.cancel')}</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-stack-lg">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
              <div className="flex items-center gap-4 pb-6 border-b border-outline-variant">
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[32px]">person</span>
                </div>
                <div className="flex-1">
                  <h2 className="font-manrope text-headline-sm text-on-surface">{profile.full_name || t('workerProfile.notSet')}</h2>
                  <p className="font-hanken text-body-sm text-on-surface-variant">{profile.city || t('workerProfile.noCitySet')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-hanken text-label-sm ${profile.is_available ? 'bg-success-container text-on-success-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-[12px]">{profile.is_available ? 'check_circle' : 'do_not_disturb'}</span>
                      {profile.is_available ? t('workerProfile.available') : t('workerProfile.unavailable')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md mt-6">
                <div><p className="font-hanken text-label-sm text-on-surface-variant">{t('workerProfile.phone')}</p><p className="font-hanken text-body-md text-on-surface mt-1">{profile.phone || t('workerProfile.notSet')}</p></div>
                <div><p className="font-hanken text-label-sm text-on-surface-variant">{t('workerProfile.address')}</p><p className="font-hanken text-body-md text-on-surface mt-1">{profile.address || t('workerProfile.notSet')}</p></div>
                <div><p className="font-hanken text-label-sm text-on-surface-variant">{t('workerProfile.experience')}</p><p className="font-hanken text-body-md text-on-surface mt-1">{t('workerProfile.experienceValue', { count: profile.experience_years })}</p></div>
                <div><p className="font-hanken text-label-sm text-on-surface-variant">{t('workerProfile.hourlyRateLabel')}</p><p className="font-hanken text-body-md text-on-surface mt-1">{t('workerProfile.ratePerHr', { rate: profile.hourly_rate || 0 })}</p></div>
                {profile.bio && (
                  <div className="md:col-span-2"><p className="font-hanken text-label-sm text-on-surface-variant">{t('workerProfile.bio')}</p><p className="font-hanken text-body-md text-on-surface mt-1">{profile.bio}</p></div>
                )}
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
              <h2 className="font-manrope text-headline-sm text-on-surface mb-4">{t('workerProfile.skills')}</h2>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => <span key={skill} className="bg-primary-container text-on-primary px-3 py-1.5 rounded-full font-hanken text-label-sm">{skill}</span>)}
                </div>
              ) : <p className="font-hanken text-body-sm text-on-surface-variant">{t('workerProfile.noSkills')}</p>}
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
              <h2 className="font-manrope text-headline-sm text-on-surface mb-4">{t('workerProfile.servicesOffered')}</h2>
              {serviceIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allServices.filter((s) => serviceIds.includes(s.id)).map((service) => (
                    <span key={service.id} className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full font-hanken text-label-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">handyman</span>
                      {service.name}
                    </span>
                  ))}
                </div>
              ) : <p className="font-hanken text-body-sm text-on-surface-variant">{t('workerProfile.noServicesSelected')}</p>}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — always-editable settings layout     */}
      {/* ============================================================= */}
      <form onSubmit={handleSubmit} className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-manrope text-headline-lg text-primary">{t('workerProfile.editWorkerProfile')}</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">{t('workerProfile.editSubtitle')}</p>
          </div>
          <button type="submit" disabled={saving} className="bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-hanken text-label-md hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? t('workerProfile.saving') : t('workerProfile.saveChanges')}
          </button>
        </div>

        {messageBanner}

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left: photo + status */}
          <div className="col-span-4 flex flex-col gap-8 sticky top-[80px]">
            <div className="bg-white rounded-xl border border-outline-slate p-stack-lg flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full bg-surface-container-high border-4 border-surface flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-[56px]">person</span>
              </div>
              <h3 className="font-manrope text-headline-sm text-primary mb-1">{profile.full_name || t('workerProfile.yourName')}</h3>
              <p className="font-hanken text-body-sm text-on-surface-variant">{profile.city || t('workerProfile.serviceProfessional')}</p>
            </div>

            <div className="bg-white rounded-xl border border-outline-slate p-stack-md">
              <h4 className="font-hanken text-label-md text-primary mb-4 pb-2 border-b border-outline-slate">{t('workerProfile.accountStatus')}</h4>
              <div className="flex items-center justify-between mb-3">
                <span className="font-hanken text-body-sm text-on-surface-variant">{t('workerProfile.verification')}</span>
                <span className={`font-hanken text-label-sm px-2 py-1 rounded flex items-center gap-1 ${isVerified ? 'bg-surface-container-low text-secondary' : 'bg-warning-container text-warning'}`}>
                  <span className="material-symbols-outlined text-[14px]">{isVerified ? 'check_circle' : 'pending'}</span>
                  {isVerified ? t('workerProfile.verified') : t('workerProfile.pending')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-hanken text-body-sm text-on-surface-variant">{t('workerProfile.availableForBookings')}</span>
                <button type="button" onClick={() => setProfile({ ...profile, is_available: !profile.is_available })} className={`w-11 h-6 rounded-full relative transition-colors ${profile.is_available ? 'bg-secondary' : 'bg-outline-variant'}`} aria-label={t('workerProfile.toggleAvailability')}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${profile.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="col-span-8 flex flex-col gap-8">
            {/* Basic info */}
            <div className="bg-white rounded-xl border border-outline-slate p-stack-lg">
              <h4 className="font-manrope text-headline-sm text-primary mb-4 pb-2 border-b border-outline-slate">{t('workerProfile.basicInformation')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-hanken text-label-md text-primary">{t('workerProfile.fullName')}</label>
                  <input name="full_name" value={profile.full_name} onChange={handleChange} className="input-field" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-hanken text-label-md text-primary">{t('workerProfile.phone')}</label>
                  <input name="phone" value={profile.phone} onChange={handleChange} className="input-field" placeholder={t('workerProfile.phonePlaceholder')} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-hanken text-label-md text-primary">{t('workerProfile.city')}</label>
                  <input name="city" value={profile.city} onChange={handleChange} className="input-field" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-hanken text-label-md text-primary">{t('workerProfile.address')}</label>
                  <input name="address" value={profile.address} onChange={handleChange} className="input-field" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-hanken text-label-md text-primary">{t('workerProfile.professionalBio')}</label>
                  <textarea name="bio" value={profile.bio} onChange={handleChange} rows={4} className="input-field resize-none" placeholder={t('workerProfile.bioPlaceholder')} />
                </div>
              </div>
            </div>

            {/* Professional details */}
            <div className="bg-white rounded-xl border border-outline-slate p-stack-lg">
              <h4 className="font-manrope text-headline-sm text-primary mb-4 pb-2 border-b border-outline-slate">{t('workerProfile.professionalDetails')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div className="flex flex-col gap-2">
                  <label className="font-hanken text-label-md text-primary">{t('workerProfile.yearsOfExperience')}</label>
                  <input name="experience_years" type="number" min="0" value={profile.experience_years} onChange={handleChange} className="input-field" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-hanken text-label-md text-primary">{t('workerProfile.hourlyRate')}</label>
                  <input name="hourly_rate" type="number" min="0" step="50" value={profile.hourly_rate} onChange={handleChange} className="input-field" placeholder={t('workerProfile.ratePlaceholder')} />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-hanken text-label-md text-primary">{t('workerProfile.skills')}</label>
                  <div className="p-4 border border-outline-slate rounded-lg flex flex-wrap gap-2 min-h-[100px] focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 transition-all bg-surface">
                    {skills.map((skill) => (
                      <span key={skill} className="bg-surface-container-high text-primary-container px-3 py-1 rounded-full font-hanken text-label-sm flex items-center gap-1 border border-outline-slate/50 h-fit">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="hover:text-error transition-colors"><span className="material-symbols-outlined text-[16px]">close</span></button>
                      </span>
                    ))}
                    <input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      className="flex-1 min-w-[150px] bg-transparent outline-none font-hanken text-body-md text-on-surface border-none p-0 focus:ring-0"
                      placeholder={t('workerProfile.skillsPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-xl border border-outline-slate p-stack-lg">
              <h4 className="font-manrope text-headline-sm text-primary mb-4 pb-2 border-b border-outline-slate">{t('workerProfile.servicesOffered')}</h4>
              <div className="grid grid-cols-3 gap-3">
                {allServices.map((service) => (
                  <label key={service.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all font-hanken text-body-sm ${serviceIds.includes(service.id) ? 'bg-secondary-fixed border-secondary text-on-secondary-container' : 'border-outline-slate text-on-surface-variant hover:bg-surface-container-low'}`}>
                    <input type="checkbox" checked={serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} className="w-4 h-4 rounded border-outline-slate text-secondary" />
                    {service.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
