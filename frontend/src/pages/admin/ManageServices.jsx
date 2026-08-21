import { useState, useEffect } from 'react';
import { servicesService } from '../../services/servicesService';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      const res = await servicesService.list();
      setServices(res.data.services || []);
    } catch (err) {
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
    if (!window.confirm(`Delete "${name}"? This will hide it from the platform.`)) return;

    try {
      await servicesService.delete(id);
      setMessage('Service deleted successfully.');
      loadServices();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete service.');
    }
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Services</h1>
          <p className="text-gray-600 mt-1">Add, edit, or remove service categories</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Service
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 border-2 border-primary-200">
          <h3 className="font-semibold text-gray-900">
            {editingId ? 'Edit Service' : 'Add New Service'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Plumbing"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (keyword)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="input-field"
                placeholder="e.g., wrench, zap"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Brief description of the service"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={resetForm} className="btn-secondary flex items-center gap-1">
              <X size={16} /> Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1">
              <Save size={16} /> {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Services Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Icon</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{service.name}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell max-w-xs truncate">
                  {service.description || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{service.icon || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(service)}
                      className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id, service.name)}
                      className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No services found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
