import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';

const DOCUMENT_TYPES = {
  id_proof: 'ID Proof',
  address_proof: 'Address Proof',
  certification: 'Certification',
};

export default function VerificationReview() {
  const [verifications, setVerifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
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
      setVerifications(res.data.verifications || []);
    } catch (err) {
      setError('Failed to load verifications.');
      console.error('Error loading verifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id, action) {
    const confirmMsg = action === 'approve'
      ? 'Approve this document? The worker may become verified.'
      : 'Reject this document?';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      await adminService.reviewVerification(id, { action, notes });
      setSelectedDoc(null);
      setNotes('');
      loadVerifications();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-stack-sm">
        <div>
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">Verification Review</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            Review and approve worker documents
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
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
            {s}
          </button>
        ))}
      </div>

      {/* Verifications List */}
      {loading ? (
        <div className="flex flex-col gap-stack-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface-container-high rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
          <button onClick={loadVerifications} className="btn-primary mt-4">Retry</button>
        </div>
      ) : verifications.length > 0 ? (
        <div className="flex flex-col gap-stack-md">
          {verifications.map((doc) => (
            <div
              key={doc.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-level-1"
            >
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
                      {doc.worker_name} · {DOCUMENT_TYPES[doc.document_type] || doc.document_type}
                      {doc.created_at && ` · ${doc.created_at.split('T')[0]}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setSelectedDoc(doc); setNotes(''); }}
                    className="btn-secondary !py-2 !px-4 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    View
                  </button>
                  {doc.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleReview(doc.id, 'approve')}
                        disabled={actionLoading === doc.id}
                        className="btn-primary !py-2 !px-4 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(doc.id, 'reject')}
                        disabled={actionLoading === doc.id}
                        className="btn-secondary !py-2 !px-4 flex items-center gap-1.5 !text-error !border-error"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        Reject
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
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No {statusFilter} verifications</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">
            {statusFilter === 'pending'
              ? 'All caught up! No documents waiting for review.'
              : `No ${statusFilter} verifications found.`}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDoc(null)}>
          <div
            className="bg-background rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-level-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-manrope text-headline-sm text-on-surface">Document Detail</h2>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
              </button>
            </div>

            {/* Document Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Document Name</p>
                <p className="font-hanken text-body-md text-on-surface mt-0.5">{selectedDoc.document_name}</p>
              </div>
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Type</p>
                <p className="font-hanken text-body-md text-on-surface mt-0.5">
                  {DOCUMENT_TYPES[selectedDoc.document_type] || selectedDoc.document_type}
                </p>
              </div>
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Worker</p>
                <p className="font-hanken text-body-md text-on-surface mt-0.5">{selectedDoc.worker_name}</p>
              </div>
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Email</p>
                <p className="font-hanken text-body-md text-on-surface mt-0.5">{selectedDoc.worker_email || '—'}</p>
              </div>
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Status</p>
                <div className="mt-0.5"><StatusBadge status={selectedDoc.status} /></div>
              </div>
              <div>
                <p className="font-hanken text-label-sm text-on-surface-variant">Submitted</p>
                <p className="font-hanken text-body-md text-on-surface mt-0.5">{selectedDoc.created_at?.split('T')[0]}</p>
              </div>
            </div>

            {/* Download Link */}
            {selectedDoc.download_url && (
              <div className="mb-6">
                <a
                  href={selectedDoc.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  View Document File
                </a>
              </div>
            )}

            {/* Existing Admin Notes */}
            {selectedDoc.admin_notes && (
              <div className="bg-surface-container-low rounded-lg p-4 mb-6">
                <p className="font-hanken text-label-sm text-on-surface-variant mb-1">Admin Notes</p>
                <p className="font-hanken text-body-sm text-on-surface">{selectedDoc.admin_notes}</p>
              </div>
            )}

            {/* Admin Actions */}
            {selectedDoc.status === 'pending' && (
              <div className="border-t border-outline-variant pt-5 flex flex-col gap-stack-md">
                <div className="flex flex-col gap-stack-xs">
                  <label className="font-hanken text-label-md text-on-surface">Admin Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field"
                    rows={2}
                    placeholder="Reason for approval/rejection"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview(selectedDoc.id, 'approve')}
                    disabled={actionLoading === selectedDoc.id}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(selectedDoc.id, 'reject')}
                    disabled={actionLoading === selectedDoc.id}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 !text-error !border-error"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
