import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      const role = result?.role || 'customer';
      navigate(`/${role}/dashboard`);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
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
              hub
            </span>
          </div>
          <h1 className="font-manrope text-headline-lg-mobile text-primary">Welcome back</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            Sign in to your Connect360 account
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
            <label className="font-hanken text-label-md text-on-surface">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              required
            />
          </div>

          <div className="flex flex-col gap-stack-xs">
            <label className="font-hanken text-label-md text-on-surface">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-stack-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="font-hanken text-body-sm text-on-surface-variant text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-secondary font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
