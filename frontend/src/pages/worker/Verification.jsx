import { useState, useEffect } from 'react';
import { verificationService } from '../../services/verificationService';
import StatusBadge from '../../components/StatusBadge';

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
      // Step 1: Get pre-signed URL
      const contentType = uploadForm.file.type || 'application/pdf';
      const urlRes = await verificationService.getUploadUrl({
        file_name: uploadForm.file.name,
        content_type: contentType,
      });
      const { upload_url, s3_key } = urlRes.data;

      // Step 2: Upload file directly to S3
      await fetch(upload_url, {
        method: 'PUT',
        body: uploadForm.file,
        headers: { 'Content-Type': contentType },
      });

      // Step 3: Submit verification record
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
      case 'approved':
        return 'check_circle';
      case 'rejected':
        return 'cancel';
      default:
        return 'pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-success';
      case 'rejected':
        return 'text-error';
      default:
        return 'text-warning';
    }
  };

  if (loading) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="animate-pulse flex flex-col gap-stack-lg">
          <div className="h-8 bg-surface-container-high rounded-lg w-2/3" />
          <div className="h-5 bg-surface-container-high rounded-lg w-1/3" />
          <div className="h-24 bg-surface-container-high rounded-xl" />
          <div className="h-48 bg-surface-container-high rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center shadow-level-1">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
          <button onClick={loadStatus} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto flex flex-col gap-stack-lg pb-24 md:pb-stack-xl">
      {/* Header */}
      <section className="flex flex-col gap-stack-sm">
        <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg text-primary">Verification</h1>
        <p className="font-hanken text-body-md text-on-surface-variant">
          Upload documents to verify your identity and skills
        </p>
      </section>

      {/* Verification Status Banner */}
      <div className={`bg-surface-container-lowest rounded-xl border p-6 shadow-level-1 flex items-center gap-4 ${
        isFullyVerified ? 'border-success' : 'border-warning'
      }`}>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          isFullyVerified ? 'bg-success-container' : 'bg-warning-container'
        }`}>
          <span className={`material-symbols-outlined text-[28px] ${
            isFullyVerified ? 'text-success' : 'text-warning'
          }`}>
            {isFullyVerified ? 'verified_user' : 'gpp_maybe'}
          </span>
        </div>
        <div>
          <h3 className="font-manrope text-headline-sm text-on-surface">
            {isFullyVerified ? 'Fully Verified' : 'Verification Incomplete'}
          </h3>
          <p className="font-hanken text-body-sm text-on-surface-variant">
            {isFullyVerified
              ? 'Your profile is verified and visible to customers.'
              : 'Upload required documents to get verified and start receiving bookings.'}
          </p>
        </div>
      </div>

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

      {/* Documents List */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1 flex flex-col gap-stack-md">
        <div className="flex items-center justify-between">
          <h2 className="font-manrope text-headline-sm text-on-surface">Uploaded Documents</h2>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="btn-primary !py-2 !px-4 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Upload New
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">description</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">No documents uploaded</h3>
            <p className="font-hanken text-body-sm text-on-surface-variant">
              Upload at least one ID proof to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-lg border border-outline-variant bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[20px] ${getStatusColor(doc.status)}`}>
                    {getStatusIcon(doc.status)}
                  </span>
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

      {/* Upload Form */}
      {showUploadForm && (
        <form
          onSubmit={handleUpload}
          className="bg-surface-container-lowest rounded-xl border-2 border-secondary p-6 shadow-level-1 flex flex-col gap-stack-md"
        >
          <h3 className="font-manrope text-headline-sm text-on-surface">Upload New Document</h3>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Document Type</label>
            <select
              value={uploadForm.document_type}
              onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
              className="input-field"
            >
              {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Document Name</label>
            <input
              type="text"
              value={uploadForm.document_name}
              onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })}
              className="input-field"
              placeholder="e.g., Aadhar Card, Electrician Certificate"
              required
            />
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">File (PDF, JPG, PNG)</label>
            <div className="border-2 border-dashed border-outline-variant rounded-lg p-6 text-center hover:border-secondary transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                className="block w-full font-hanken text-body-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-hanken file:text-label-sm file:bg-primary-container file:text-on-primary hover:file:opacity-80 file:cursor-pointer"
                required
              />
              {!uploadForm.file && (
                <p className="font-hanken text-body-sm text-on-surface-variant mt-2">
                  <span className="material-symbols-outlined text-[20px] align-middle mr-1">cloud_upload</span>
                  Select a file to upload
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setShowUploadForm(false)} className="btn-secondary flex-1">
              Cancel
            </button>
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
      )}

      {/* Document Types Info */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-level-1">
        <h3 className="font-manrope text-label-md text-on-surface mb-4">Required Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(DOCUMENT_TYPES).map(([key, label]) => {
            const uploaded = documents.find((d) => d.document_type === key);
            return (
              <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant">
                <span className={`material-symbols-outlined text-[20px] ${
                  uploaded?.status === 'approved' ? 'text-success' :
                  uploaded ? 'text-warning' : 'text-on-surface-variant'
                }`}>
                  {uploaded?.status === 'approved' ? 'check_circle' :
                   uploaded ? 'pending' : 'radio_button_unchecked'}
                </span>
                <div>
                  <p className="font-hanken text-body-sm text-on-surface">{label}</p>
                  <p className="font-hanken text-label-sm text-on-surface-variant">
                    {uploaded?.status === 'approved' ? 'Verified' :
                     uploaded?.status === 'pending' ? 'Under review' :
                     uploaded?.status === 'rejected' ? 'Rejected' : 'Not uploaded'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
