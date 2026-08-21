import { useState, useEffect } from 'react';
import { verificationService } from '../../services/verificationService';
import { Upload, FileText, CheckCircle, XCircle, Clock, Shield } from 'lucide-react';
import { DOCUMENT_TYPES } from '../../config/constants';

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

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await verificationService.getStatus();
      setDocuments(res.data.documents || []);
      setIsFullyVerified(res.data.is_fully_verified || false);
    } catch (err) {
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
      const urlRes = await verificationService.getUploadUrl(
        uploadForm.file.name,
        contentType
      );
      const { upload_url, s3_key } = urlRes.data;

      // Step 2: Upload file directly to S3
      await verificationService.uploadToS3(upload_url, uploadForm.file, contentType);

      // Step 3: Submit verification record
      await verificationService.submit({
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

  const statusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected': return <XCircle size={16} className="text-red-600" />;
      default: return <Clock size={16} className="text-yellow-600" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl"></div></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verification</h1>
        <p className="text-gray-600 mt-1">Upload documents to verify your identity and skills</p>
      </div>

      {/* Verification Status Banner */}
      <div className={`card flex items-center gap-4 ${isFullyVerified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isFullyVerified ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <Shield className={`w-6 h-6 ${isFullyVerified ? 'text-green-600' : 'text-yellow-600'}`} />
        </div>
        <div>
          <h3 className={`font-semibold ${isFullyVerified ? 'text-green-800' : 'text-yellow-800'}`}>
            {isFullyVerified ? 'Fully Verified' : 'Verification Incomplete'}
          </h3>
          <p className={`text-sm ${isFullyVerified ? 'text-green-700' : 'text-yellow-700'}`}>
            {isFullyVerified
              ? 'Your profile is verified and visible to customers.'
              : 'Upload required documents to get verified and start receiving bookings.'}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Documents List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Uploaded Documents</h2>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <Upload size={16} /> Upload New
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No documents uploaded yet.</p>
            <p className="text-sm text-gray-500">Upload at least one ID proof to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {statusIcon(doc.status)}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{doc.document_name}</p>
                    <p className="text-xs text-gray-500">
                      {DOCUMENT_TYPES[doc.document_type] || doc.document_type} • Uploaded {doc.created_at?.split('T')[0]}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                  doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleUpload} className="card space-y-4 border-2 border-primary-200">
          <h3 className="font-semibold text-gray-900">Upload New Document</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
            <input
              type="text"
              value={uploadForm.document_name}
              onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })}
              className="input-field"
              placeholder="e.g., Aadhar Card, Electrician Certificate"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF, JPG, PNG)</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              required
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowUploadForm(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {uploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Upload size={16} /> Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
