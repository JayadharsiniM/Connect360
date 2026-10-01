import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import DashboardLayout from '../../components/DashboardLayout';

const DOCUMENT_TYPES = {
  id_proof: 'Identity Verification',
  address_proof: 'Address Proof',
  certification: 'Professional License',
};

// Priority is derived from how long a document has waited (no backend field).
function derivePriority(createdAt) {
  if (!createdAt) return 'normal';
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays >= 2 ? 'high' : 'normal';
}

function initials(name) {
  return (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function VerificationQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.listVerifications('pending');
      setItems(res.data.verifications || []);
    } catch (err) {
      setError('Failed to load the verification queue.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = typeFilter ? items.filter((d) => d.document_type === typeFilter) : items;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-stack-lg pt-6 lg:pt-0 px-margin-mobile lg:px-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-manrope text-headline-lg text-primary">Verification Queue</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">Pending worker credentials awaiting review.</p>
          </div>
          <div className="flex gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-4 rounded-lg border border-outline-slate bg-surface-container-lowest font-hanken text-body-sm text-primary focus:border-secondary focus:ring-1 focus:ring-secondary outline-none cursor-pointer"
            >
              <option value="">All Types</option>
              {Object.entries(DOCUMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Link
              to="/admin/verifications"
              className="h-10 px-4 bg-primary-container text-on-primary rounded-lg font-hanken text-label-md flex items-center gap-2 hover:bg-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              Review Console
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-slate overflow-hidden">
          {loading ? (
            <div className="p-stack-lg flex flex-col gap-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-surface-container-high rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="p-stack-lg text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">error</span>
              <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
              <button onClick={load} className="btn-primary mt-4">Retry</button>
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-slate">
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary">Worker</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary">Document Type</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary hidden md:table-cell">Submitted</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary">Priority</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="font-hanken text-body-md text-on-surface">
                  {filtered.map((doc) => {
                    const priority = derivePriority(doc.created_at);
                    return (
                      <tr key={doc.id} className="border-b border-surface-variant hover:bg-surface-container-low transition-colors last:border-0">
                        <td className="py-4 px-stack-md">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed-dim text-primary flex items-center justify-center font-manrope text-label-md">
                              {initials(doc.worker_name)}
                            </div>
                            <div className="font-medium text-primary">{doc.worker_name || 'Worker'}</div>
                          </div>
                        </td>
                        <td className="py-4 px-stack-md">{DOCUMENT_TYPES[doc.document_type] || doc.document_type}</td>
                        <td className="py-4 px-stack-md text-on-surface-variant hidden md:table-cell">
                          {doc.created_at ? doc.created_at.replace('T', ' ').slice(0, 16) : '—'}
                        </td>
                        <td className="py-4 px-stack-md">
                          {priority === 'high' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-error-container text-on-error-container border border-error/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-error mr-1.5" /> High
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-surface-container-high text-on-surface border border-outline-slate">
                              <span className="w-1.5 h-1.5 rounded-full bg-outline mr-1.5" /> Normal
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-stack-md text-right">
                          <Link
                            to="/admin/verifications"
                            className="bg-surface-container-lowest border border-outline-slate text-primary-container px-4 py-2 rounded-lg font-hanken text-label-md hover:bg-surface-container transition-colors inline-flex items-center gap-2"
                          >
                            Review
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-stack-lg text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">verified_user</span>
              <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Queue is clear</h3>
              <p className="font-hanken text-body-md text-on-surface-variant">No pending documents waiting for review.</p>
            </div>
          )}
          <div className="py-4 px-stack-md border-t border-outline-slate bg-surface-container-lowest">
            <span className="font-hanken text-body-sm text-on-surface-variant">
              {filtered.length} pending review{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <p className="font-hanken text-body-sm text-on-surface-variant">
          Priority is derived from how long a submission has been waiting (2+ days = High). Use the Review Console to approve or reject documents.
        </p>
      </div>
    </DashboardLayout>
  );
}
