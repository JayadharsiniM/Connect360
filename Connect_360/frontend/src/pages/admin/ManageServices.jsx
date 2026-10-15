import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { servicesService } from '../../services/servicesService';
import DashboardLayout from '../../components/DashboardLayout';

// Map common/aliased icon names (and generic words that aren't valid Material
// Symbols) to real Material Symbols Outlined ligatures. Anything unknown falls
// back to a neutral icon so bad data never renders as giant raw text.
const ICON_ALIASES = {
  hammer: 'handyman',
  zap: 'bolt',
  leaf: 'eco',
  sparkles: 'cleaning_services',
  thermometer: 'thermostat',
  wrench: 'build',
  broom: 'cleaning_services',
  paint: 'format_paint',
  paintbrush: 'format_paint',
  plug: 'electrical_services',
  electric: 'electrical_services',
  water: 'water_drop',
  pipe: 'plumbing',
  ac: 'ac_unit',
  hvac: 'hvac',
  fan: 'mode_fan',
  garden: 'yard',
  gardening: 'yard',
  clean: 'cleaning_services',
  cleaning: 'cleaning_services',
  carpenter: 'carpenter',
  carpentry: 'carpenter',
  appliance: 'home_repair_service',
  settings: 'settings',
};

// Valid Material Symbols ligatures are lowercase letters/numbers/underscores.
// We allow a known alias, otherwise require the string to at least look like a
// symbol token; unknown multi-letter "words" still fall back to 'category'.
const KNOWN_SYMBOLS = new Set([
  'handyman', 'build', 'bolt', 'eco', 'cleaning_services', 'thermostat',
  'format_paint', 'electrical_services', 'water_drop', 'plumbing', 'ac_unit',
  'hvac', 'mode_fan', 'yard', 'carpenter', 'home_repair_service', 'settings',
  'category', 'home', 'construction', 'spa', 'local_laundry_service',
]);

function resolveIcon(raw) {
  if (!raw) return 'category';
  const key = String(raw).trim().toLowerCase();
  if (ICON_ALIASES[key]) return ICON_ALIASES[key];
  if (KNOWN_SYMBOLS.has(key)) return key;
  // Unknown token: if it contains spaces/uppercase or is a plain word that
  // isn't a known symbol, use the safe fallback to avoid giant raw-text render.
  if (/^[a-z0-9_]+$/.test(key) && key.includes('_')) return key; // likely a real symbol
  return 'category';
}

export default function ManageServices() {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [error, setError] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      const res = await servicesService.list();
      setServices(res.data.services || []);
    } catch (err) {
      setError(t('adminServices.loadFailed'));
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', icon: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (service) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      icon: service.icon || '',
    });
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    setMessage('');

    try {
      if (editingId) {
        await servicesService.update(editingId, formData);
        setMessageType('success');
        setMessage(t('adminServices.updatedSuccess'));
      } else {
        await servicesService.create(formData);
        setMessageType('success');
        setMessage(t('adminServices.createdSuccess'));
      }
      resetForm();
      loadServices();
    } catch (err) {
      setMessageType('error');
      setMessage(err.response?.data?.error || t('adminServices.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(t('adminServices.confirmDelete', { name }))) return;

    try {
      await servicesService.delete(id);
      setMessageType('success');
      setMessage(t('adminServices.deletedSuccess'));
      loadServices();
    } catch (err) {
      setMessageType('error');
      setMessage(err.response?.data?.error || t('adminServices.deleteFailed'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
          <div className="animate-pulse flex flex-col gap-stack-lg">
            <div className="h-8 bg-surface-container-high rounded-lg w-1/3" />
            <div className="h-64 bg-surface-container-high rounded-xl" />
          </div>
        </div>
        <div className="hidden lg:block animate-pulse">
          <div className="h-9 bg-surface-container-high rounded-lg w-1/3 mb-6" />
          <div className="h-96 bg-surface-container-high rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && services.length === 0) {
    return (
      <DashboardLayout>
        <div className="pt-6 lg:pt-0 px-margin-mobile lg:px-0 max-w-container mx-auto">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminServices.error')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={loadServices} className="btn-primary mt-4">{t('adminServices.retry')}</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Shared form (used by both mobile and desktop)
  const formSection = showForm && (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-container-lowest rounded-xl border-2 border-secondary p-6 shadow-level-1 flex flex-col gap-stack-md"
    >
      <h3 className="font-manrope text-headline-sm text-on-surface">
        {editingId ? t('adminServices.editService') : t('adminServices.addNewService')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
        <div className="flex flex-col gap-stack-xs">
          <label className="font-hanken text-label-md text-on-surface">{t('adminServices.serviceNameRequired')}</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder={t('adminServices.serviceNamePlaceholder')} required />
        </div>
        <div className="flex flex-col gap-stack-xs">
          <label className="font-hanken text-label-md text-on-surface">{t('adminServices.iconLabel')}</label>
          <div className="flex items-center gap-2">
            <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="input-field flex-1" placeholder={t('adminServices.iconPlaceholder')} />
            {formData.icon && (
              <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px] leading-none">{resolveIcon(formData.icon)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-stack-xs">
        <label className="font-hanken text-label-md text-on-surface">{t('adminServices.description')}</label>
        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows={2} placeholder={t('adminServices.descriptionPlaceholder')} />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={resetForm} className="btn-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">close</span>
          {t('adminServices.cancel')}
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">save</span>
          {saving ? t('adminServices.saving') : editingId ? t('adminServices.updateService') : t('adminServices.createService')}
        </button>
      </div>
    </form>
  );

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
            <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">{t('adminServices.title')}</h1>
            <p className="font-hanken text-body-md text-on-surface-variant">
              {t('adminServices.servicesCount', { count: services.length })}
            </p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 w-fit">
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t('adminServices.addService')}
            </button>
          )}
        </section>

        {messageBanner}
        {formSection}

        {services.length > 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-5 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">{t('adminServices.serviceHeader')}</th>
                    <th className="px-5 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase hidden md:table-cell">{t('adminServices.descriptionHeader')}</th>
                    <th className="px-5 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">{t('adminServices.iconHeader')}</th>
                    <th className="px-5 py-3 text-right font-hanken text-label-sm text-on-surface-variant uppercase">{t('adminServices.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-[18px] leading-none">{resolveIcon(service.icon)}</span>
                          </div>
                          <span className="font-hanken text-body-md text-on-surface font-medium">{service.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-hanken text-body-sm text-on-surface-variant hidden md:table-cell max-w-xs truncate">{service.description || '—'}</td>
                      <td className="px-5 py-4">
                        <code className="font-mono text-label-sm text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">{service.icon || '—'}</code>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(service)} className="p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-primary-container/30 transition-colors" title={t('adminServices.edit')} aria-label={t('adminServices.editAria', { name: service.name })}>
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(service.id, service.name)} className="p-2 text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/30 transition-colors" title={t('adminServices.delete')} aria-label={t('adminServices.deleteAria', { name: service.name })}>
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">category</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminServices.noServices')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{t('adminServices.noServicesDesc')}</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4">{t('adminServices.addFirstService')}</button>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Header & actions */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-manrope text-headline-lg text-primary">{t('adminServices.title')}</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">{t('adminServices.subtitle')}</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="bg-primary-container text-on-primary font-hanken text-label-md px-6 h-12 rounded-lg hover:bg-primary transition-colors flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">add</span>
              {t('adminServices.addService')}
            </button>
          )}
        </div>

        {messageBanner}
        {formSection}

        {/* Data table */}
        {services.length > 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-slate">
                    <th className="py-4 px-6 font-hanken text-label-md text-primary">{t('adminServices.serviceNameHeader')}</th>
                    <th className="py-4 px-6 font-hanken text-label-md text-primary">{t('adminServices.descriptionHeader')}</th>
                    <th className="py-4 px-6 font-hanken text-label-md text-primary">{t('adminServices.iconHeader')}</th>
                    <th className="py-4 px-6 font-hanken text-label-md text-primary text-right">{t('adminServices.actions')}</th>
                  </tr>
                </thead>
                <tbody className="font-hanken text-body-sm text-on-surface divide-y divide-surface-container">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-surface-bright/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary-container/10 flex items-center justify-center text-secondary flex-shrink-0">
                            <span className="material-symbols-outlined leading-none">{resolveIcon(service.icon)}</span>
                          </div>
                          <span className="font-medium text-primary">{service.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant max-w-md truncate">{service.description || '—'}</td>
                      <td className="py-4 px-6">
                        <code className="font-mono text-label-sm text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">{service.icon || '—'}</code>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(service)} className="p-1.5 text-on-surface-variant hover:text-secondary rounded hover:bg-secondary-container/10 transition-colors" title={t('adminServices.edit')}>
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(service.id, service.name)} className="p-1.5 text-on-surface-variant hover:text-error rounded hover:bg-error-container/50 transition-colors" title={t('adminServices.delete')}>
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-outline-slate p-4 flex items-center justify-between bg-surface-bright">
              <span className="font-hanken text-body-sm text-on-surface-variant">
                {t('adminServices.showingCount', { count: services.length })}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">category</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminServices.noServices')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{t('adminServices.noServicesDesc')}</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4">{t('adminServices.addFirstService')}</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
