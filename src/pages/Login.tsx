import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, registerWithEmail, loginWithEmail, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { X } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { setUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  
  // Form states
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'job_seeker' | 'employer'>('job_seeker');
  
  // For Google login new user flow
  const [pendingUser, setPendingUser] = useState<any>(null);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberPassword(true);
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const user = await loginWithGoogle();
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setUserData(userDoc.data() as any);
        navigate('/dashboard');
      } else {
        setPendingUser(user);
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      
      // Check if it's an unauthorized domain error
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setError('🔐 Google login requires domain authorization. Please use Email/Password login instead, or contact support to add your domain.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked. Please allow pop-ups and try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Google login cancelled.');
      } else {
        setError(err.message || 'Failed to login with Google. Try Email/Password instead.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      if (isLogin) {
        // Login flow
        const user = await loginWithEmail(email, password);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Save credentials if "Remember Password" is checked
          if (rememberPassword) {
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('rememberedPassword', password);
          } else {
            // Clear saved credentials if unchecked
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
          }
          
          setUserData(userDoc.data() as any);
          navigate('/dashboard');
        } else {
          // Edge case: User exists in Auth but not Firestore
          setPendingUser(user);
        }
      } else {
        // Registration flow
        if (!name.trim()) {
          throw new Error("Name is required");
        }
        const user = await registerWithEmail(email, password);
        const newUserData = {
          uid: user.uid,
          email: user.email,
          name,
          role,
          createdAt: new Date().toISOString(),
        };
        
        // Create user record in Firestore
        await setDoc(doc(db, 'users', user.uid), newUserData);
        
        // Initialize empty profile
        if (role === 'job_seeker') {
          await setDoc(doc(db, 'jobSeekerProfiles', user.uid), {
            userId: user.uid,
            skills: [],
            qualifications: [],
            location: '',
            bio: '',
            updatedAt: new Date().toISOString(),
          });
        } else {
          await setDoc(doc(db, 'employerProfiles', user.uid), {
            userId: user.uid,
            companyName: name,
            location: '',
            description: '',
            updatedAt: new Date().toISOString(),
          });
        }
        
        // Update context and navigate
        setUserData(newUserData as any);
        navigate('/profile');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      
      if (err.code === 'auth/operation-not-allowed') {
        setError('❌ Email/Password authentication is not enabled. Please contact support.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Try logging in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else {
        setError(err.message || `Failed to ${isLogin ? 'login' : 'register'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const createNewUserRecord = async (user: any, selectedRole: 'job_seeker' | 'employer', displayName?: string) => {
    const newUserData = {
      uid: user.uid,
      email: user.email,
      name: displayName || user.displayName || 'Anonymous User',
      role: selectedRole,
      createdAt: new Date().toISOString(),
    };
    
    await setDoc(doc(db, 'users', user.uid), newUserData);
    
    // Initialize empty profile
    if (selectedRole === 'job_seeker') {
      await setDoc(doc(db, 'jobSeekerProfiles', user.uid), {
        userId: user.uid,
        skills: [],
        qualifications: [],
        location: '',
        bio: '',
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(doc(db, 'employerProfiles', user.uid), {
        userId: user.uid,
        companyName: displayName || user.displayName || 'My Company',
        location: '',
        description: '',
        updatedAt: new Date().toISOString(),
      });
    }
    
    setUserData(newUserData as any);
    navigate('/profile');
  };

  const handleRoleSelect = async (selectedRole: 'job_seeker' | 'employer') => {
    if (!pendingUser) return;
    try {
      setLoading(true);
      await createNewUserRecord(pendingUser, selectedRole);
      setPendingUser(null); // Clear pending user after successful registration
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `users/${pendingUser.uid}`);
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-10 rounded-xl shadow-lg min-h-[700px] flex flex-col justify-center">
        <div>
          <div className="flex justify-center">
            {!logoFailed ? (
              <img 
                src="/finding-logo.png" 
                alt="Finding Logo" 
                className="h-50 w-auto" 
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <h1 className="text-4xl font-bold text-black">FINDING</h1>
            )}
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-black tracking-tight">
            {pendingUser 
              ? 'Choose your role' 
              : isLogin ? 'Sign in to your account' : 'Create a new account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {pendingUser 
              ? 'Are you looking for a job or hiring?' 
              : 'Welcome to FINDING!'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {pendingUser ? (
          <div className="mt-8 space-y-4">
            <button
              onClick={() => handleRoleSelect('job_seeker')}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-black text-sm font-medium rounded-md text-black bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              I am a Job Seeker
            </button>
            <button
              onClick={() => handleRoleSelect('employer')}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              I am an Employer
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name / Username</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>

              {isLogin && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberPassword"
                    checked={rememberPassword}
                    onChange={(e) => setRememberPassword(e.target.checked)}
                    className="h-4 w-4 border-gray-300 rounded focus:ring-black cursor-pointer"
                  />
                  <label htmlFor="rememberPassword" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                    Remember password
                  </label>
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">I am a...</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'job_seeker' | 'employer')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  >
                    <option value="job_seeker">Job Seeker</option>
                    <option value="employer">Employer</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-sm font-medium text-black hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
