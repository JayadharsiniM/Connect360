import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { verificationService } from '../../services/verificationService';
import StatusBadge from '../../components/StatusBadge';
import DashboardLayout from '../../components/DashboardLayout';

const DOCUMENT_TYPES = {
  id_proof: 'adminVerify.docTypeIdProof',
  address_proof: 'adminVerify.docTypeAddressProof',
  certification: 'adminVerify.docTypeCertification',
};

export default function VerificationReview() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const targetStatus = searchParams.get('status');
  const targetDocId = searchParams.get('doc');

  const [verifications, setVerifications] = useState([]);
  // Honor a status passed via the URL (e.g. from the "View" button) so the
  // console opens on the right list instead of defaulting to pending.
  const [statusFilter, setStatusFilter] = useState(
    ['pending', 'approved', 'rejected'].includes(targetStatus) ? targetStatus : 'pending'
  );
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const filterOptions = ['pending', 'approved', 'rejected'];

  useEffect(() => {
    loadVerifications();
  }, [statusFilter]);

  async function loadVerifications() {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.listVerifications(statusFilter);
      const list = res.data.verifications || [];
      setVerifications(list);
      // Prefer the document deep-linked from the "View" button; else first item.
      const target = (targetDocId && list.find((d) => d.id === targetDocId)) || list[0] || null;
      if (target) {
        selectDoc(target);
      } else {
        setSelectedDoc(null);
      }
    } catch (err) {
      setError(t('adminVerify.loadFailedReview'));
      console.error('Error loading verifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function selectDoc(doc) {
    // Set basic info immediately so the panel opens right away
    setSelectedDoc(doc);
    setNotes('');
    // Then fetch the detail to get the pre-signed download_url
    try {
      const res = await verificationService.getDetail(doc.id);
      setSelectedDoc(res.data.verification);
    } catch (err) {
      // Keep the basic doc if detail fetch fails — preview just won't show
      console.error('Could not fetch document detail:', err);
    }
  }

  async function handleReview(id, action) {
    const confirmMsg = action === 'approve'
      ? t('adminVerify.confirmApprove')
      : t('adminVerify.confirmReject');
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      await adminService.reviewVerification(id, { action, notes });
      setSelectedDoc(null);
      setNotes('');
      loadVerifications();
    } catch (err) {
      alert(err.response?.data?.error || (action === 'approve' ? t('adminVerify.approveFailed') : t('adminVerify.rejectFailed')));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-stack-sm">
          <div>
            <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">{t('adminVerify.reviewTitle')}</h1>
            <p className="font-hanken text-body-md text-on-surface-variant">{t('adminVerify.reviewSubtitle')}</p>
          </div>
        </section>

        <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
          {filterOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-none px-4 py-2 rounded-full font-hanken text-body-sm border transition-all whitespace-nowrap capitalize ${
                statusFilter === s
                  ? 'bg-primary-container text-on-primary border-primary-container'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {t('adminVerify.status' + s.charAt(0).toUpperCase() + s.slice(1), { defaultValue: s })}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-stack-md">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminVerify.error')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={loadVerifications} className="btn-primary mt-4">{t('adminVerify.retry')}</button>
          </div>
        ) : verifications.length > 0 ? (
          <div className="flex flex-col gap-stack-md">
            {verifications.map((doc) => (
              <div key={doc.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant text-[22px]">description</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-manrope text-label-md text-on-surface">{doc.document_name}</h3>
                        <StatusBadge status={doc.status} />
                      </div>
                      <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5">
                        {doc.worker_name} · {DOCUMENT_TYPES[doc.document_type] ? t(DOCUMENT_TYPES[doc.document_type]) : doc.document_type}
                        {doc.created_at && ` · ${doc.created_at.split('T')[0]}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => { selectDoc(doc); setNotes(''); }} className="btn-secondary !py-2 !px-4 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      {t('adminVerify.view')}
                    </button>
                    {doc.status === 'pending' && (
                      <>
                        <button onClick={() => handleReview(doc.id, 'approve')} disabled={actionLoading === doc.id} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          {t('adminVerify.approve')}
                        </button>
                        <button onClick={() => handleReview(doc.id, 'reject')} disabled={actionLoading === doc.id} className="btn-secondary !py-2 !px-4 flex items-center gap-1.5 !text-error !border-error">
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          {t('adminVerify.reject')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">verified_user</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminVerify.noStatusVerifications', { status: t('adminVerify.status' + statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1), { defaultValue: statusFilter }) })}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">
              {statusFilter === 'pending' ? t('adminVerify.allCaughtUp') : t('adminVerify.noStatusFound', { status: t('adminVerify.status' + statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1), { defaultValue: statusFilter }) })}
            </p>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — master/detail from uploaded design  */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-manrope text-headline-lg text-primary mb-1">{t('adminVerify.queueTitle')}</h1>
            <p className="font-hanken text-body-md text-on-surface-variant">{t('adminVerify.queueDesktopSubtitle')}</p>
          </div>
          <div className="flex gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-surface-container-lowest border border-outline-slate rounded-lg px-4 h-11 font-hanken text-body-sm capitalize focus:outline-none focus:border-secondary cursor-pointer">
              {filterOptions.map((s) => <option key={s} value={s}>{t('adminVerify.status' + s.charAt(0).toUpperCase() + s.slice(1), { defaultValue: s })}</option>)}
            </select>
          </div>
        </div>

        {/* Master/detail grid */}
        <div className="grid grid-cols-12 gap-gutter">
          {/* List */}
          <div className="col-span-4 flex flex-col bg-surface-container-lowest rounded-xl border border-outline-slate overflow-hidden h-[calc(100vh-240px)]">
            <div className="p-4 border-b border-outline-slate bg-surface-container/30">
              <h2 className="font-manrope text-headline-sm text-primary capitalize">{t('adminVerify.statusReviews', { status: t('adminVerify.status' + statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1), { defaultValue: statusFilter }), count: verifications.length })}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 flex flex-col gap-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-container-high rounded-lg animate-pulse" />)}
                </div>
              ) : verifications.length > 0 ? (
                verifications.map((doc) => {
                  const active = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => { selectDoc(doc); setNotes(''); }}
                      className={`p-4 border-b border-outline-slate cursor-pointer hover:bg-surface-variant/20 transition-colors border-l-4 ${active ? 'bg-surface-container-low border-l-secondary' : 'border-l-transparent'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-hanken text-label-md text-primary">{doc.worker_name}</h3>
                        {doc.created_at && <span className="font-hanken text-label-sm text-on-surface-variant">{doc.created_at.split('T')[0]}</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="px-2 py-1 bg-surface-container rounded font-hanken text-label-sm text-primary-container">
                          {DOCUMENT_TYPES[doc.document_type] ? t(DOCUMENT_TYPES[doc.document_type]) : doc.document_type}
                        </span>
                        <StatusBadge status={doc.status} />
                      </div>
                      <div className="flex justify-end">
                        <span className="text-secondary font-hanken text-label-md flex items-center gap-1">
                          {t('adminVerify.reviewArrow')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">verified_user</span>
                  <p className="font-hanken text-body-sm text-on-surface-variant">{t('adminVerify.noStatusVerifications', { status: t('adminVerify.status' + statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1), { defaultValue: statusFilter }) })}</p>
                </div>
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl border border-outline-slate flex flex-col h-[calc(100vh-240px)] overflow-hidden">
            {selectedDoc ? (
              <>
                {/* Detail header */}
                <div className="p-6 border-b border-outline-slate flex justify-between items-center bg-surface-bright">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary-container font-manrope text-headline-md font-bold">
                      {(selectedDoc.worker_name || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-manrope text-headline-md text-primary">{selectedDoc.worker_name}</h2>
                      <p className="font-hanken text-body-sm text-on-surface-variant">
                        {selectedDoc.created_at && t('adminVerify.submittedOn', { date: selectedDoc.created_at.split('T')[0] })}
                        {selectedDoc.worker_email && ` · ${selectedDoc.worker_email}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={selectedDoc.status} />
                </div>

                {/* Detail body */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Document preview area */}
                  <div className="flex-1 p-6 bg-surface-container-low flex flex-col border-r border-outline-slate">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-hanken text-label-md text-primary">{t('adminVerify.documentLabel', { name: selectedDoc.document_name })}</h3>
                    </div>
                    <div className="flex-1 bg-surface-container-lowest border border-outline-slate rounded-lg overflow-hidden relative flex items-center justify-center">
                      {selectedDoc.download_url ? (
                        <a href={selectedDoc.download_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 text-secondary hover:underline">
                          <span className="material-symbols-outlined text-[64px]">description</span>
                          <span className="font-hanken text-label-md flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            {t('adminVerify.viewDocumentFile')}
                          </span>
                        </a>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[64px]">description</span>
                          <span className="font-hanken text-body-sm">{t('adminVerify.noFilePreview')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Data + actions */}
                  <div className="w-80 p-6 overflow-y-auto bg-surface-container-lowest flex flex-col">
                    <h3 className="font-hanken text-label-md text-primary mb-4">{t('adminVerify.documentDetails')}</h3>
                    <div className="flex flex-col gap-4 mb-6">
                      <div>
                        <label className="font-hanken text-label-sm text-on-surface-variant block mb-1">{t('adminVerify.documentName')}</label>
                        <div className="p-2 border border-outline-slate rounded bg-surface-container-low font-hanken text-body-sm">{selectedDoc.document_name}</div>
                      </div>
                      <div>
                        <label className="font-hanken text-label-sm text-on-surface-variant block mb-1">{t('adminVerify.type')}</label>
                        <div className="p-2 border border-outline-slate rounded bg-surface-container-low font-hanken text-body-sm">{DOCUMENT_TYPES[selectedDoc.document_type] ? t(DOCUMENT_TYPES[selectedDoc.document_type]) : selectedDoc.document_type}</div>
                      </div>
                      <div>
                        <label className="font-hanken text-label-sm text-on-surface-variant block mb-1">{t('adminVerify.workerEmail')}</label>
                        <div className="p-2 border border-outline-slate rounded bg-surface-container-low font-hanken text-body-sm break-all">{selectedDoc.worker_email || '—'}</div>
                      </div>
                    </div>

                    {selectedDoc.admin_notes && (
                      <div className="bg-surface-container-low rounded-lg p-3 mb-6">
                        <p className="font-hanken text-label-sm text-on-surface-variant mb-1">{t('adminVerify.existingAdminNotes')}</p>
                        <p className="font-hanken text-body-sm text-on-surface">{selectedDoc.admin_notes}</p>
                      </div>
                    )}

                    {selectedDoc.status === 'pending' ? (
                      <div className="mt-auto pt-6 border-t border-outline-slate flex flex-col gap-3">
                        <div className="flex flex-col gap-stack-xs">
                          <label className="font-hanken text-label-md text-on-surface">{t('adminVerify.adminNotesOptional')}</label>
                          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={2} placeholder={t('adminVerify.adminNotesPlaceholder')} />
                        </div>
                        <button onClick={() => handleReview(selectedDoc.id, 'approve')} disabled={actionLoading === selectedDoc.id} className="w-full bg-primary-container text-on-primary py-3 rounded-lg font-hanken text-label-md hover:bg-primary transition-colors flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">check</span> {t('adminVerify.approveWorker')}
                        </button>
                        <button onClick={() => handleReview(selectedDoc.id, 'reject')} disabled={actionLoading === selectedDoc.id} className="w-full bg-surface-container-lowest border border-error text-error py-3 rounded-lg font-hanken text-label-md hover:bg-error-container/20 transition-colors flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">close</span> {t('adminVerify.rejectDocument')}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-auto pt-6 border-t border-outline-slate">
                        <p className="font-hanken text-body-sm text-on-surface-variant text-center capitalize">
                          {t('adminVerify.documentHasBeen', { status: t('adminVerify.status' + selectedDoc.status.charAt(0).toUpperCase() + selectedDoc.status.slice(1), { defaultValue: selectedDoc.status }) })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
                <span className="material-symbols-outlined text-on-surface-variant text-[56px]">fact_check</span>
                <h3 className="font-manrope text-headline-sm text-on-surface">{t('adminVerify.selectDocument')}</h3>
                <p className="font-hanken text-body-md text-on-surface-variant">{t('adminVerify.chooseFromQueue')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
