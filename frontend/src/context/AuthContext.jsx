import { createContext, useContext, useState, useEffect } from 'react';
import { mockUsers } from '../mock/mockData';

const isMock = import.meta.env.VITE_MOCK_MODE === 'true';

const AuthContext = createContext(null);

// =============================================================================
// Real Auth Provider (uses AWS Amplify/Cognito)
// =============================================================================
function RealAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      const { getCurrentUser, fetchUserAttributes } = await import('aws-amplify/auth');
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
        email: attributes.email,
        role: attributes['custom:role'] || 'customer',
        fullName: attributes['custom:full_name'] || '',
      });
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const { signIn } = await import('aws-amplify/auth');
    const result = await signIn({ username: email, password });
    if (result.isSignedIn) {
      await checkAuthState();
    }
    return result;
  }

  async function register(email, password, fullName, role) {
    const { signUp } = await import('aws-amplify/auth');
    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          'custom:role': role,
          'custom:full_name': fullName,
        },
      },
    });
    return result;
  }

  async function confirmEmail(email, code) {
    const { confirmSignUp } = await import('aws-amplify/auth');
    const result = await confirmSignUp({ username: email, confirmationCode: code });
    return result;
  }

  async function logout() {
    const { signOut } = await import('aws-amplify/auth');
    await signOut();
    setUser(null);
  }

  const value = {
    user,
    loading,
    login,
    register,
    confirmEmail,
    logout,
    isAuthenticated: !!user,
    isCustomer: user?.role === 'customer',
    isWorker: user?.role === 'worker',
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// Mock Auth Provider (no AWS needed - for local demo)
// =============================================================================
function MockAuthProviderInner({ children }) {
  const [user, setUser] = useState(null);
  const [loading] = useState(false);

  async function login(email, password) {
    let role = 'customer';
    if (email.includes('admin')) role = 'admin';
    else if (email.includes('worker')) role = 'worker';

    localStorage.setItem('mock_role', role);
    setUser({ ...mockUsers[role], email });
    return { isSignedIn: true };
  }

  async function register(email, password, fullName, role) {
    return { isSignUpComplete: false, nextStep: { signUpStep: 'CONFIRM_SIGN_UP' } };
  }

  async function confirmEmail(email, code) {
    return { isSignUpComplete: true };
  }

  async function logout() {
    localStorage.removeItem('mock_role');
    setUser(null);
  }

  const value = {
    user,
    loading,
    login,
    register,
    confirmEmail,
    logout,
    isAuthenticated: !!user,
    isCustomer: user?.role === 'customer',
    isWorker: user?.role === 'worker',
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// Exports
// =============================================================================
export function AuthProvider({ children }) {
  if (isMock) {
    return <MockAuthProviderInner>{children}</MockAuthProviderInner>;
  }
  return <RealAuthProvider>{children}</RealAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
