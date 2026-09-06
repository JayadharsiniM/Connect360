import { useState, useEffect } from 'react';
import { verificationService } from '../../services/verificationService';
import StatusBadge from '../../components/StatusBadge';
import DashboardLayout from '../../components/DashboardLayout';

const DOCUMENT_TYPES = {
  id_proof: 'ID Proof',
  address_proof: 'Address Proof',
  certification: 'Certification',
};

export default function WorkerVerification() {
  const [documents, setDocuments] = useState([]);
  const [isFullyVerified, setIsFullyVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_type: 'id_proof',
    document_name: '',
    file: null,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await verificationService.getStatus();
      setDocuments(res.data.documents || []);
      setIsFullyVerified(res.data.is_fully_verified || false);
    } catch (err) {
      setError('Failed to load verification status.');
      console.error('Error loading verification status:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e) => {
    setUploadForm({ ...uploadForm, file: e.target.files[0] });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.document_name) {
      setMessage('Please fill in all fields and select a file.');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const contentType = uploadForm.file.type || 'application/pdf';
      const urlRes = await verificationService.getUploadUrl({
        file_name: uploadForm.file.name,
        content_type: contentType,
      });
      const { upload_url, s3_key } = urlRes.data;

      await fetch(upload_url, {
        method: 'PUT',
        body: uploadForm.file,
        headers: { 'Content-Type': contentType },
      });

      await verificationService.submitDocument({
        document_type: uploadForm.document_type,
        document_name: uploadForm.document_name,
        s3_key: s3_key,
      });

      setMessage('Document uploaded successfully! It will be reviewed by an admin.');
      setShowUploadForm(false);
      setUploadForm({ document_type: 'id_proof', document_name: '', file: null });
      loadStatus();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'check_circle';
      case 'rejected': return 'cancel';
      default: return 'pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-success';
      case 'rejected': return 'text-error';
      default: return 'text-warning';
    }
  };

  const approvedCount = documents.filter((d) => d.status === 'approved').length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
          <div className="animate-pulse flex flex-col gap-stack-lg">
            <div className="h-8 bg-surface-container-high rounded-lg w-2/3" />
            <div className="h-24 bg-surface-container-high rounded-xl" />
            <div className="h-48 bg-surface-container-high rounded-xl" />
          </div>
        </div>
        <div className="hidden lg:grid grid-cols-12 gap-6 animate-pulse">
          <div className="col-span-8 h-96 bg-surface-container-high rounded-xl" />
          <div className="col-span-4 h-72 bg-surface-container-high rounded-xl" />
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
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={loadStatus} className="btn-primary mt-4">Retry</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const messageBanner = message && (
    <div className={`rounded-lg p-4 flex items-center gap-3 ${message.includes('success') ? 'bg-success-container' : 'bg-error-container'}`}>
      <span className="material-symbols-outlined text-[20px]">{message.includes('success') ? 'check_circle' : 'error'}</span>
      <p className="font-hanken text-body-sm">{message}</p>
    </div>
  );

  const uploadFormSection = showUploadForm && (
    <form onSubmit={handleUpload} className="bg-surface-container-lowest rounded-xl border-2 border-secondary p-6 shadow-level-1 flex flex-col gap-stack-md">
      <h3 className="font-manrope text-headline-sm text-on-surface">Upload New Document</h3>
      <div className="flex flex-col gap-stack-xs">
        <label className="font-hanken text-label-md text-on-surface">Document Type</label>
        <select value={uploadForm.document_type} onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })} className="input-field">
          {Object.entries(DOCUMENT_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-stack-xs">
        <label className="font-hanken text-label-md text-on-surface">Document Name</label>
        <input type="text" value={uploadForm.document_name} onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })} className="input-field" placeholder="e.g., Aadhar Card, Electrician Certificate" required />
      </div>
      <div className="flex flex-col gap-stack-xs">
        <label className="font-hanken text-label-md text-on-surface">File (PDF, JPG, PNG)</label>
        <div className="border-2 border-dashed border-outline-variant rounded-lg p-6 text-center hover:border-secondary transition-colors">
          <input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="block w-full font-hanken text-body-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-hanken file:text-label-sm file:bg-primary-container file:text-on-primary hover:file:opacity-80 file:cursor-pointer" required />
          {!uploadForm.file && (
            <p className="font-hanken text-body-sm text-on-surface-variant mt-2">
              <span className="material-symbols-outlined text-[20px] align-middle mr-1">cloud_upload</span>
              Select a file to upload
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-3 mt-2">
        <button type="button" onClick={() => setShowUploadForm(false)} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={uploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload Document
            </>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <DashboardLayout>
      {/* ============================================================= */}
      {/* MOBILE / TABLET VIEW (unchanged, below lg)                     */}
      {/* ============================================================= */}
      <div className="lg:hidden pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24">
        <section className="flex flex-col gap-stack-sm">
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">Verification</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">Upload documents to verify your identity and skills</p>
        </section>

        <div className={`bg-surface-container-lowest rounded-xl border p-6 shadow-level-1 flex items-center gap-4 ${isFullyVerified ? 'border-success' : 'border-warning'}`}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isFullyVerified ? 'bg-success-container' : 'bg-warning-container'}`}>
            <span className={`material-symbols-outlined text-[28px] ${isFullyVerified ? 'text-success' : 'text-warning'}`}>
              {isFullyVerified ? 'verified_user' : 'gpp_maybe'}
            </span>
          </div>
          <div>
            <h3 className="font-manrope text-headline-sm text-on-surface">{isFullyVerified ? 'Fully Verified' : 'Verification Incomplete'}</h3>
            <p className="font-hanken text-body-sm text-on-surface-variant">
              {isFullyVerified ? 'Your profile is verified and visible to customers.' : 'Upload required documents to get verified and start receiving bookings.'}
            </p>
          </div>
        </div>

        {messageBanner}

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
          <div className="flex items-center justify-between">
            <h2 className="font-manrope text-headline-sm text-on-surface">Uploaded Documents</h2>
            <button onClick={() => setShowUploadForm(!showUploadForm)} className="btn-primary !py-2 !px-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload New
            </button>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">description</span>
              <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No documents uploaded</h3>
              <p className="font-hanken text-body-sm text-on-surface-variant">Upload at least one ID proof to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-outline-variant bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${getStatusColor(doc.status)}`}>{getStatusIcon(doc.status)}</span>
                    <div>
                      <p className="font-hanken text-body-md text-on-surface">{doc.document_name}</p>
                      <p className="font-hanken text-body-sm text-on-surface-variant">
                        {DOCUMENT_TYPES[doc.document_type] || doc.document_type}
                        {doc.created_at && ` · Uploaded ${doc.created_at.split('T')[0]}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {uploadFormSection}

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
          <h3 className="font-manrope text-label-md text-on-surface mb-4">Required Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(DOCUMENT_TYPES).map(([key, label]) => {
              const uploaded = documents.find((d) => d.document_type === key);
              return (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant">
                  <span className={`material-symbols-outlined text-[20px] ${uploaded?.status === 'approved' ? 'text-success' : uploaded ? 'text-warning' : 'text-on-surface-variant'}`}>
                    {uploaded?.status === 'approved' ? 'check_circle' : uploaded ? 'pending' : 'radio_button_unchecked'}
                  </span>
                  <div>
                    <p className="font-hanken text-body-sm text-on-surface">{label}</p>
                    <p className="font-hanken text-label-sm text-on-surface-variant">
                      {uploaded?.status === 'approved' ? 'Verified' : uploaded?.status === 'pending' ? 'Under review' : uploaded?.status === 'rejected' ? 'Rejected' : 'Not uploaded'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* DESKTOP VIEW (lg and up) — matches uploaded design             */}
      {/* ============================================================= */}
      <div className="hidden lg:flex lg:flex-col gap-stack-lg">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-manrope text-headline-lg text-primary">Verification Status</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">Upload documents to verify your identity and skills.</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-hanken text-label-md border ${isFullyVerified ? 'bg-success-container/40 text-success border-success/30' : 'bg-secondary-container/20 text-secondary border-secondary/30'}`}>
            <span className="material-symbols-outlined text-sm">{isFullyVerified ? 'verified' : 'pending'}</span>
            {isFullyVerified ? 'Verified' : 'Pending Review'}
          </span>
        </div>

        {messageBanner}

        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left: checklist + upload */}
          <div className="col-span-8 flex flex-col gap-6">
            {/* Requirements checklist */}
            <div className="bg-surface-container-lowest rounded-lg border border-outline-slate p-stack-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-manrope text-headline-sm text-primary">Verification Requirements</h3>
                <span className="font-hanken text-body-sm text-on-surface-variant">{approvedCount} of {Object.keys(DOCUMENT_TYPES).length} Completed</span>
              </div>
              <div className="flex flex-col gap-4">
                {Object.entries(DOCUMENT_TYPES).map(([key, label]) => {
                  const uploaded = documents.find((d) => d.document_type === key);
                  const status = uploaded?.status;
                  let styles, icon, iconColor, badge, badgeStyles;
                  if (status === 'approved') {
                    styles = 'border-surface-container-high bg-surface'; icon = 'check_circle'; iconColor = 'text-success';
                    badge = 'Verified'; badgeStyles = 'bg-success-container/40 text-success border-success/30';
                  } else if (status === 'rejected') {
                    styles = 'border-error/30 bg-error-container/30'; icon = 'warning'; iconColor = 'text-error';
                    badge = 'Rejected'; badgeStyles = 'bg-error-container text-error border-error/20';
                  } else if (status === 'pending') {
                    styles = 'border-secondary/20 bg-secondary-fixed/30'; icon = 'badge'; iconColor = 'text-secondary';
                    badge = 'In Review'; badgeStyles = 'bg-secondary-container/20 text-secondary border-secondary/30';
                  } else {
                    styles = 'border-outline-slate bg-surface'; icon = 'radio_button_unchecked'; iconColor = 'text-on-surface-variant';
                    badge = 'Not Uploaded'; badgeStyles = 'bg-surface-container text-on-surface-variant border-outline-slate';
                  }
                  return (
                    <div key={key} className={`flex items-start gap-4 p-4 rounded-lg border relative overflow-hidden ${styles}`}>
                      {status === 'pending' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />}
                      {status === 'rejected' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-error" />}
                      <div className="w-10 h-10 rounded-full bg-surface-container-lowest border border-outline-slate flex items-center justify-center shrink-0">
                        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-hanken text-label-md text-primary mb-1">{label}</h4>
                        <p className="font-hanken text-body-sm text-on-surface-variant">
                          {uploaded ? uploaded.document_name : 'No document uploaded yet.'}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full border font-hanken text-label-sm whitespace-nowrap ${badgeStyles}`}>{badge}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upload zone / form */}
            {showUploadForm ? (
              uploadFormSection
            ) : (
              <div className="bg-surface-container-lowest rounded-lg border border-outline-slate p-stack-lg">
                <h3 className="font-manrope text-headline-sm text-primary mb-4">Upload Documents</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant mb-6">Securely upload additional verification documents here.</p>
                <button onClick={() => setShowUploadForm(true)} className="w-full border-2 border-dashed border-outline-slate rounded-lg p-8 flex flex-col items-center justify-center bg-surface hover:bg-surface-container-low transition-colors group">
                  <div className="w-16 h-16 rounded-full bg-surface-container-lowest border border-outline-slate flex items-center justify-center mb-4 group-hover:border-secondary transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant text-3xl group-hover:text-secondary transition-colors">cloud_upload</span>
                  </div>
                  <h4 className="font-hanken text-label-md text-primary mb-2">Click to upload a document</h4>
                  <p className="font-hanken text-body-sm text-on-surface-variant text-center max-w-sm">Supported formats: PDF, JPEG, PNG.</p>
                </button>
              </div>
            )}
          </div>

          {/* Right: status + document list */}
          <div className="col-span-4 flex flex-col gap-6 sticky top-[80px]">
            <div className={`rounded-lg border p-stack-md flex flex-col items-center text-center ${isFullyVerified ? 'border-success bg-success-container/20' : 'border-outline-slate bg-surface-container-lowest'}`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${isFullyVerified ? 'bg-success-container' : 'bg-warning-container'}`}>
                <span className={`material-symbols-outlined text-[28px] ${isFullyVerified ? 'text-success' : 'text-warning'}`}>{isFullyVerified ? 'verified_user' : 'gpp_maybe'}</span>
              </div>
              <h3 className="font-manrope text-headline-sm text-on-surface">{isFullyVerified ? 'Fully Verified' : 'Verification Incomplete'}</h3>
              <p className="font-hanken text-body-sm text-on-surface-variant mt-1">
                {isFullyVerified ? 'Your profile is verified and visible to customers.' : 'Upload required documents to get verified.'}
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-lg border border-outline-slate p-stack-md">
              <h3 className="font-manrope text-headline-sm text-primary mb-4">Uploaded Documents</h3>
              {documents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`material-symbols-outlined text-[18px] ${getStatusColor(doc.status)}`}>{getStatusIcon(doc.status)}</span>
                        <div className="min-w-0">
                          <p className="font-hanken text-body-sm text-on-surface truncate">{doc.document_name}</p>
                          <p className="font-hanken text-label-sm text-on-surface-variant">{DOCUMENT_TYPES[doc.document_type] || doc.document_type}</p>
                        </div>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-hanken text-body-sm text-on-surface-variant text-center py-4">No documents uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
