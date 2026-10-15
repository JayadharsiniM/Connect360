import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import DashboardLayout from '../../components/DashboardLayout';

const DOCUMENT_TYPES = {
  id_proof: 'adminVerify.docTypeIdentity',
  address_proof: 'adminVerify.docTypeAddress',
  certification: 'adminVerify.docTypeLicense',
};

const STATUS_TABS = [
  { key: 'pending', labelKey: 'adminVerify.statusPending' },
  { key: 'approved', labelKey: 'adminVerify.statusApproved' },
  { key: 'rejected', labelKey: 'adminVerify.statusRejected' },
  { key: 'all', labelKey: 'adminVerify.statusAll' },
];

// Priority is derived from how long a PENDING document has waited (no backend field).
function derivePriority(createdAt) {
  if (!createdAt) return 'normal';
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays >= 2 ? 'high' : 'normal';
}

function initials(name) {
  return (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_BADGE = {
  pending: 'bg-warning-container text-on-surface border-warning/40',
  approved: 'bg-success-container text-success border-success/40',
  rejected: 'bg-error-container text-on-error-container border-error/40',
};

export default function VerificationQueue() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusTab, setStatusTab] = useState('pending');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (statusTab === 'all') {
        // Backend lists one status per call; fetch all three and merge.
        const [p, a, r] = await Promise.all([
          adminService.listVerifications('pending'),
          adminService.listVerifications('approved'),
          adminService.listVerifications('rejected'),
        ]);
        const merged = [
          ...(p.data.verifications || []),
          ...(a.data.verifications || []),
          ...(r.data.verifications || []),
        ].sort((x, y) => (y.created_at || '').localeCompare(x.created_at || ''));
        setItems(merged);
      } else {
        const res = await adminService.listVerifications(statusTab);
        setItems(res.data.verifications || []);
      }
    } catch (err) {
      setError(t('adminVerify.loadFailedQueue'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusTab, t]);

  useEffect(() => { load(); }, [load]);

  const filtered = typeFilter ? items.filter((d) => d.document_type === typeFilter) : items;

  const emptyCopy = {
    pending: t('adminVerify.emptyPending'),
    approved: t('adminVerify.emptyApproved'),
    rejected: t('adminVerify.emptyRejected'),
    all: t('adminVerify.emptyAll'),
  }[statusTab];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-stack-lg pt-6 lg:pt-0 px-margin-mobile lg:px-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-manrope text-headline-lg text-primary">{t('adminVerify.title')}</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">
              {t('adminVerify.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-4 rounded-lg border border-outline-slate bg-surface-container-lowest font-hanken text-body-sm text-primary focus:border-secondary focus:ring-1 focus:ring-secondary outline-none cursor-pointer"
            >
              <option value="">{t('adminVerify.allTypes')}</option>
              {Object.entries(DOCUMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
            </select>
            <Link
              to="/admin/verifications"
              className="h-10 px-4 bg-primary-container text-on-primary rounded-lg font-hanken text-label-md flex items-center gap-2 hover:bg-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              {t('adminVerify.reviewConsole')}
            </Link>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`flex-none px-4 py-2 rounded-full font-hanken text-body-sm border transition-all whitespace-nowrap ${
                statusTab === tab.key
                  ? 'bg-primary-container text-on-primary border-primary-container'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
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
              <button onClick={load} className="btn-primary mt-4">{t('adminVerify.retry')}</button>
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-slate">
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary">{t('adminVerify.worker')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary">{t('adminVerify.documentType')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary hidden md:table-cell">{t('adminVerify.submitted')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary">{t('adminVerify.status')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-primary text-right">{t('adminVerify.action')}</th>
                  </tr>
                </thead>
                <tbody className="font-hanken text-body-md text-on-surface">
                  {filtered.map((doc) => {
                    const priority = derivePriority(doc.created_at);
                    const isPending = doc.status === 'pending';
                    return (
                      <tr key={doc.id} className="border-b border-surface-variant hover:bg-surface-container-low transition-colors last:border-0">
                        <td className="py-4 px-stack-md">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed-dim text-primary flex items-center justify-center font-manrope text-label-md">
                              {initials(doc.worker_name)}
                            </div>
                            <div className="font-medium text-primary">{doc.worker_name || t('adminVerify.workerFallback')}</div>
                          </div>
                        </td>
                        <td className="py-4 px-stack-md">{DOCUMENT_TYPES[doc.document_type] ? t(DOCUMENT_TYPES[doc.document_type]) : doc.document_type}</td>
                        <td className="py-4 px-stack-md text-on-surface-variant hidden md:table-cell">
                          {doc.created_at ? doc.created_at.replace('T', ' ').slice(0, 16) : '—'}
                        </td>
                        <td className="py-4 px-stack-md">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_BADGE[doc.status] || 'bg-surface-container-high text-on-surface border-outline-slate'}`}>
                            {t('adminVerify.status' + doc.status.charAt(0).toUpperCase() + doc.status.slice(1), { defaultValue: doc.status })}
                            {isPending && priority === 'high' && (
                              <span className="ml-1 text-error">{t('adminVerify.highFlag')}</span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-stack-md text-right">
                          <Link
                            to={`/admin/verifications?status=${doc.status}&doc=${doc.id}`}
                            className="bg-surface-container-lowest border border-outline-slate text-primary-container px-4 py-2 rounded-lg font-hanken text-label-md hover:bg-surface-container transition-colors inline-flex items-center gap-2"
                          >
                            {isPending ? t('adminVerify.review') : t('adminVerify.view')}
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
              <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminVerify.nothingHere')}</h3>
              <p className="font-hanken text-body-md text-on-surface-variant">{emptyCopy}</p>
            </div>
          )}
          <div className="py-4 px-stack-md border-t border-outline-slate bg-surface-container-lowest">
            <span className="font-hanken text-body-sm text-on-surface-variant">
              {t('adminVerify.docCount', { count: filtered.length })}
              {statusTab !== 'all' && t('adminVerify.docCountStatusSuffix', { status: t('adminVerify.status' + statusTab.charAt(0).toUpperCase() + statusTab.slice(1), { defaultValue: statusTab }) })}
            </span>
          </div>
        </div>

        <p className="font-hanken text-body-sm text-on-surface-variant">
          {t('adminVerify.queueFootnote')}
        </p>
      </div>
    </DashboardLayout>
  );
}
