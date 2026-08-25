import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmail() {
  const { confirmEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmEmail(email, code);
      navigate('/login', { state: { verified: true } });
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-margin-mobile py-stack-xl">
      <div className="w-full max-w-sm flex flex-col gap-stack-lg">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-stack-sm">
          <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              mark_email_read
            </span>
          </div>
          <h1 className="font-manrope text-headline-lg-mobile text-primary">Verify your email</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            We sent a verification code to
            {email && <span className="font-medium text-on-surface block mt-1">{email}</span>}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-container border border-error/20 rounded-lg p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
            <p className="font-hanken text-body-sm text-on-error-container">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="input-field text-center text-headline-sm tracking-[0.3em]"
              maxLength={6}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        <p className="font-hanken text-body-sm text-on-surface-variant text-center">
          Didn't receive the code?{' '}
          <button className="text-secondary font-medium hover:underline">Resend</button>
        </p>

        <Link to="/login" className="font-hanken text-body-sm text-on-surface-variant text-center hover:text-secondary">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
