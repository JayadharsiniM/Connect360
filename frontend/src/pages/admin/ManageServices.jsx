import { useState, useEffect } from 'react';
import { servicesService } from '../../services/servicesService';

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      const res = await servicesService.list();
      setServices(res.data.services || []);
    } catch (err) {
      setError('Failed to load services.');
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
        setMessage('Service updated successfully!');
      } else {
        await servicesService.create(formData);
        setMessage('Service created successfully!');
      }
      resetForm();
      loadServices();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This will remove it from the platform.`)) return;

    try {
      await servicesService.delete(id);
      setMessage('Service deleted successfully.');
      loadServices();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete service.');
    }
  };

  if (loading) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse flex flex-col gap-stack-lg">
          <div className="h-8 bg-surface-container-high rounded-lg w-1/3" />
          <div className="h-5 bg-surface-container-high rounded-lg w-1/4" />
          <div className="h-64 bg-surface-container-high rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && services.length === 0) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
          <button onClick={loadServices} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-stack-sm">
        <div>
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">Manage Services</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            {services.length} service{services.length !== 1 ? 's' : ''} on the platform
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 w-fit">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Service
          </button>
        )}
      </section>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${
          message.includes('success') ? 'bg-success-container' : 'bg-error-container'
        }`}>
          <span className="material-symbols-outlined text-[20px]">
            {message.includes('success') ? 'check_circle' : 'error'}
          </span>
          <p className="font-hanken text-body-sm">{message}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest rounded-xl border-2 border-secondary p-6 shadow-level-1 flex flex-col gap-stack-md"
        >
          <h3 className="font-manrope text-headline-sm text-on-surface">
            {editingId ? 'Edit Service' : 'Add New Service'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Service Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Plumbing"
                required
              />
            </div>
            <div className="flex flex-col gap-stack-xs">
              <label className="font-hanken text-label-md text-on-surface">Icon (Material Symbol name)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="input-field flex-1"
                  placeholder="e.g., plumbing, electrical_services"
                />
                {formData.icon && (
                  <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">{formData.icon}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Brief description of the service"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={resetForm} className="btn-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">close</span>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">save</span>
              {saving ? 'Saving...' : editingId ? 'Update Service' : 'Create Service'}
            </button>
          </div>
        </form>
      )}

      {/* Services List */}
      {services.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-level-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-5 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">Service</th>
                  <th className="px-5 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase hidden md:table-cell">Description</th>
                  <th className="px-5 py-3 text-left font-hanken text-label-sm text-on-surface-variant uppercase">Icon</th>
                  <th className="px-5 py-3 text-right font-hanken text-label-sm text-on-surface-variant uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            {service.icon || 'category'}
                          </span>
                        </div>
                        <span className="font-hanken text-body-md text-on-surface font-medium">{service.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-hanken text-body-sm text-on-surface-variant hidden md:table-cell max-w-xs truncate">
                      {service.description || '—'}
                    </td>
                    <td className="px-5 py-4 font-hanken text-body-sm text-on-surface-variant">
                      {service.icon || '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(service)}
                          className="p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-primary-container/30 transition-colors"
                          title="Edit"
                          aria-label={`Edit ${service.name}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(service.id, service.name)}
                          className="p-2 text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/30 transition-colors"
                          title="Delete"
                          aria-label={`Delete ${service.name}`}
                        >
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
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No services yet</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">
            Add service categories to get your platform started.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            Add First Service
          </button>
        </div>
      )}
    </div>
  );
}
