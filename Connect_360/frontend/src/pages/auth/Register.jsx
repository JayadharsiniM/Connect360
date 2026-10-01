import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: searchParams.get('role') || 'customer',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.fullName, formData.role);
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-margin-mobile py-stack-xl">
      <div className="w-full max-w-sm flex flex-col gap-stack-lg">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-stack-sm">
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              person_add
            </span>
          </div>
          <h1 className="font-manrope text-headline-lg-mobile text-primary">Create account</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            Join Connect360 as a {formData.role}
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
          {/* Role Toggle */}
          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">I want to</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-lg">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'customer' })}
                className={`py-2.5 rounded-md font-hanken text-body-sm font-medium transition-all ${
                  formData.role === 'customer'
                    ? 'bg-surface-container-lowest text-primary shadow-level-1'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Hire professionals
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'worker' })}
                className={`py-2.5 rounded-md font-hanken text-body-sm font-medium transition-all ${
                  formData.role === 'worker'
                    ? 'bg-surface-container-lowest text-primary shadow-level-1'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Offer services
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              className="input-field"
              required
            />
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="input-field"
              required
            />
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              className="input-field"
              required
            />
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              className="input-field"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-stack-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="font-hanken text-body-sm text-on-surface-variant text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-secondary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
