import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { X, Mail, Lock, User, LogIn, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error('Google Auth Failed:', err);
      setError(err.message || 'Google Auth could not be established.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Email and password fields are required.');
      return;
    }

    if (isSignUp) {
      if (!displayName.trim()) {
        setError('Please provide a display name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must contain at least 6 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Create user
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Set display name in profile
        if (credential.user) {
          await updateProfile(credential.user, {
            displayName: displayName.trim()
          });
        }
      } else {
        // Sign in user
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onClose();
    } catch (err: any) {
      console.error('Email Authentication Failed:', err);
      let translateError = err.message;
      if (err.code === 'auth/invalid-credential') {
        translateError = 'Invalid email or password combination. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        translateError = 'An account with this email address already exists.';
      } else if (err.code === 'auth/invalid-email') {
        translateError = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        translateError = 'Password is too weak. Please choose at least 6 characters.';
      }
      setError(translateError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      {/* Outer Card Container */}
      <div 
        className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all transform scale-100"
        id="auth-modal-card"
      >
        {/* Header / Accent Bar */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 h-1.5 w-full" />
        
        {/* Dismiss Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-slate-100 bg-gray-950/40 hover:bg-gray-800 p-1.5 rounded-lg transition"
        >
          <X size={16} />
        </button>

        {/* Form Body layout */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-slate-100 tracking-tight font-sans">
              {isSignUp ? 'Create Contributor Account' : 'Welcome back to HotPic'}
            </h3>
            <p className="text-xs text-gray-400">
              {isSignUp ? 'Sign up with email to start uploading aesthetic captures' : 'Log in to interact or manage your submissions'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab Selector */}
          <div className="grid grid-cols-2 bg-gray-950 p-1 rounded-xl">
            <button
              onClick={() => { setIsSignUp(false); setError(null); }}
              className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                !isSignUp ? 'bg-gray-800 text-slate-100 shadow-sm' : 'text-gray-400 hover:text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(null); }}
              className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                isSignUp ? 'bg-gray-800 text-slate-100 shadow-sm' : 'text-gray-400 hover:text-slate-300'
              }`}
            >
              Register
            </button>
          </div>

          {/* Standard Email Auth credentials form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Display Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-orange-500 font-sans"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-orange-500 font-sans"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-orange-500 font-sans"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-orange-500 font-sans"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-800 disabled:to-gray-800 text-white font-semibold py-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn size={14} />
                  <span>{isSignUp ? 'Create Account' : 'Authenticate Credentials'}</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-800" />
            <span className="flex-shrink mx-3 text-[10px] text-gray-500 font-mono tracking-widest uppercase">or continue with</span>
            <div className="flex-grow border-t border-gray-800" />
          </div>

          {/* Social login buttons */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-gray-950 hover:bg-gray-800 border border-gray-800 text-slate-200 py-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2.5 transition cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign In with Google</span>
          </button>

        </div>
      </div>
    </div>
  );
}
