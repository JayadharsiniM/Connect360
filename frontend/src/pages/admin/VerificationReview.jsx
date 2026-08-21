import { useState, useEffect } from 'react';
import { verificationService } from '../../services/verificationService';
import { Shield, FileText, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { DOCUMENT_TYPES } from '../../config/constants';

export default function VerificationReview() {
  const [verifications, setVerifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadVerifications();
  }, [statusFilter]);

  async function loadVerifications() {
    setLoading(true);
    try {
      const res = await verificationService.listPending(statusFilter);
      setVerifications(res.data.verifications || []);
    } catch (err) {
      console.error('Error loading verifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function viewDetail(id) {
    setDetailLoading(true);
    try {
      const res = await verificationService.getDetail(id);
      setSelectedDoc(res.data.verification);
      setNotes('');
    } catch (err) {
      console.error('Error loading detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleReview(id, action) {
    const confirmMsg = action === 'approve'
      ? 'Approve this document? The worker may become verified.'
      : 'Reject this document?';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      await verificationService.review(id, action, notes);
      setSelectedDoc(null);
      loadVerifications();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Review</h1>
          <p className="text-gray-600 mt-1">Review and approve worker documents</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-20"></div>)}
        </div>
      ) : verifications.length === 0 ? (
        <div className="card text-center py-12">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No {statusFilter} verifications found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {verifications.map((doc) => (
            <div key={doc.id} className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{doc.document_name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.worker_name} • {DOCUMENT_TYPES[doc.document_type] || doc.document_type} • {doc.created_at?.split('T')[0]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                  doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {doc.status}
                </span>
                <button
                  onClick={() => viewDetail(doc.id)}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <Eye size={14} /> View
                </button>
                {doc.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleReview(doc.id, 'approve')}
                      disabled={actionLoading === doc.id}
                      className="btn-success text-sm flex items-center gap-1"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleReview(doc.id, 'reject')}
                      disabled={actionLoading === doc.id}
                      className="btn-danger text-sm flex items-center gap-1"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Document Detail</h2>
              <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>

            {detailLoading ? (
              <div className="animate-pulse h-40 bg-gray-200 rounded"></div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Document Name</p>
                    <p className="font-medium text-gray-900">{selectedDoc.document_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-medium text-gray-900">{DOCUMENT_TYPES[selectedDoc.document_type] || selectedDoc.document_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Worker</p>
                    <p className="font-medium text-gray-900">{selectedDoc.worker_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedDoc.worker_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className={`font-medium capitalize ${
                      selectedDoc.status === 'approved' ? 'text-green-700' :
                      selectedDoc.status === 'rejected' ? 'text-red-700' :
                      'text-yellow-700'
                    }`}>{selectedDoc.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Submitted</p>
                    <p className="font-medium text-gray-900">{selectedDoc.created_at?.split('T')[0]}</p>
                  </div>
                </div>

                {/* Download link */}
                {selectedDoc.download_url && (
                  <div>
                    <a
                      href={selectedDoc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary inline-flex items-center gap-2"
                    >
                      <Eye size={16} /> View Document
                    </a>
                  </div>
                )}

                {/* Admin actions */}
                {selectedDoc.status === 'pending' && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (optional)</label>
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
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button
                        onClick={() => handleReview(selectedDoc.id, 'reject')}
                        disabled={actionLoading === selectedDoc.id}
                        className="btn-danger flex-1 flex items-center justify-center gap-2"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing notes */}
                {selectedDoc.admin_notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                    <p className="text-sm text-gray-700">{selectedDoc.admin_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
