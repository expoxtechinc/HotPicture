import React, { useState } from 'react';
import { 
  auth, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { 
  X, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  // Custom form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time password strength calculation for premium layout feel
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-400' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      setSuccessMsg('Successfully authenticated with Google.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to establish connections to the SSO provider. Please use manual email instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissions = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email) {
      setErrorMsg('Please specify a valid email address.');
      return;
    }

    setLoading(true);

    try {
      if (isForgot) {
        // Password Reset Flow
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMsg('Account Recovery Email sent successfully! Please check your spam or inbox folders.');
        setIsForgot(false);
      } else if (isRegister) {
        // Registration Flow
        if (!fullName.trim()) {
          setErrorMsg('Please provide your full name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must range of 6 characters or above.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('The passwords entered do not match.');
          setLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Force set displayName
        await updateProfile(cred.user, { displayName: fullName.trim() });
        setSuccessMsg('Registration completed! Portal is now configured for your family credentials.');
        
        // Wait then wrap up
        setTimeout(() => {
          onClose();
        }, 1500);

      } else {
        // Log In Flow
        if (!password) {
          setErrorMsg('Password is required for credentials access.');
          setLoading(false);
          return;
        }
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setSuccessMsg('Authorization successful. Welcome back!');
        
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      let descriptiveText = 'Authentication failed. Please verify credentials details.';
      if (err.code === 'auth/user-not-found') {
        descriptiveText = 'No record matches this email address. Please register an account first.';
      } else if (err.code === 'auth/wrong-password') {
        descriptiveText = 'Incorrect security credentials. Please double check password letters or use recovery links.';
      } else if (err.code === 'auth/email-already-in-use') {
        descriptiveText = 'This email address is already registered on our school roster.';
      } else if (err.code === 'auth/invalid-email') {
        descriptiveText = 'Invalid email syntax format. Please double check.';
      } else if (err.code === 'auth/weak-password') {
        descriptiveText = 'Weak password keys. Choose a password with at least 6 letters.';
      }
      setErrorMsg(descriptiveText);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleState = () => {
    setIsRegister(!isRegister);
    setIsForgot(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="auth-modal-screen">
      <div 
        className="bg-white w-full max-w-sm rounded-3xl border border-slate-100 overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] transition-transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative upper stripe */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-amber-500 h-1.5 w-full"></div>

        {/* Closing trigger */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-slate-105 text-slate-400 hover:text-slate-800 rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-100 bg-slate-50/50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-1">
            <span className="text-[9.5px] uppercase font-mono tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100/60 font-semibold">
              MISS Portal Services
            </span>
            <h3 className="text-xl font-serif font-black text-slate-950 uppercase mt-2">
              {isForgot ? 'Access Recovery' : isRegister ? 'Parent & Student Register' : 'Administrative Gate'}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
              {isForgot 
                ? 'Submit your registered email to obtain a security reset voucher.' 
                : isRegister 
                  ? 'Establish local family profile credentials to manage direct registrations.' 
                  : 'Authorized personnel and community accounts verification log.'}
            </p>
          </div>

          {/* Social direct connector */}
          {!isForgot && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-3 px-4 rounded-xl border border-slate-205/60 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" 
                  alt="Google Icon" 
                  className="w-4 h-4"
                />
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-slate-350">
                <span className="h-[1px] w-full bg-slate-100"></span>
                <span className="text-[10px] uppercase font-mono tracking-widest font-semibold shrink-0">Or Email credentials</span>
                <span className="h-[1px] w-full bg-slate-100"></span>
              </div>
            </div>
          )}

          {/* Core Fields form */}
          <form onSubmit={handleSubmissions} className="space-y-4">
            
            {isRegister && !isForgot && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Marie Johnson"
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. marie@gmail.com"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                />
              </div>
            </div>

            {!isForgot && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Password Code
                  </label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgot(true);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] text-blue-900 font-bold hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-10 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {isRegister && password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-505">
                      <span>Password Strength:</span>
                      <span className={strength.score <= 2 ? 'text-rose-600' : strength.score <= 4 ? 'text-amber-500' : 'text-emerald-600'}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${Math.max(15, strength.score * 20)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {isRegister && !isForgot && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-normal">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-normal">{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-semibold text-xs uppercase tracking-widest py-3 px-4 rounded-xl border border-slate-950 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {isForgot ? (
                <>
                  <span>Send Recovery Email</span>
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                </>
              ) : isRegister ? (
                <>
                  <span>Register Profile</span>
                  <UserPlus className="w-4 h-4 text-amber-400" />
                </>
              ) : (
                <>
                  <span>Sign In Credentials</span>
                  <LogIn className="w-4 h-4 text-amber-400" />
                </>
              )}
            </button>
          </form>

          {/* Toggle triggers footer */}
          <div className="text-center pt-3 border-t border-slate-50 text-xs">
            {isForgot ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgot(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-blue-900 hover:underline font-bold font-mono text-[11px] cursor-pointer"
              >
                ← Return to Sign In
              </button>
            ) : (
              <p className="text-slate-500 text-[11px]">
                {isRegister ? 'Already registered on our system?' : 'Want to register as a local parent?'}
                <button
                  type="button"
                  onClick={handleToggleState}
                  className="text-blue-900 font-bold hover:underline ml-1 cursor-pointer"
                >
                  {isRegister ? 'Sign In' : 'Create Account'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
