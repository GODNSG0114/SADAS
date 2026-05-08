import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, Loader2, User, Eye, EyeOff } from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics & Communication',
  'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering',
  'Chemical Engineering', 'Biotechnology', 'Other'
];

const Login = () => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [signIn, setSignIn] = useState({ email: '', password: '' });

  // Sign-up is always student — admin registration requires a secret key
  const [signUp, setSignUp] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    department: 'Computer Science', year: '1', roll_number: ''
  });

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(signIn.email, signIn.password);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (signUp.password !== signUp.confirmPassword) {
      const { default: toast } = await import('react-hot-toast');
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: signUp.name,
        email: signUp.email,
        password: signUp.password,
        department: signUp.department,
        year: parseInt(signUp.year),
        roll_number: signUp.roll_number || undefined,
      });
    } catch (_) {}
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[url('https://images.unsplash.com/photo-1519452285022-751244833bb9?ixlib=rb-4.0.3')] bg-cover bg-center">
      <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px]" />

      <div className="w-full max-w-md m-4 rounded-2xl glass-dark relative z-10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">SADAS</h2>
          <p className="text-gray-400 text-xs mt-1">Student Activity Data Analysis System</p>
        </div>

        {/* Tabs */}
        <div className="flex mx-8 mb-6 bg-gray-800/60 rounded-xl p-1">
          <button onClick={() => setTab('signin')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
            Sign In
          </button>
          <button onClick={() => setTab('signup')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'signup' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
            Sign Up
          </button>
        </div>

        <div className="px-8 pb-8">
          {/* SIGN IN */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="email" value={signIn.email} onChange={e => setSignIn({ ...signIn, email: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 pl-9 pr-4 text-sm transition-all"
                    placeholder="you@example.com" required />
                </div>
              </div>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type={showPassword ? 'text' : 'password'} value={signIn.password} onChange={e => setSignIn({ ...signIn, password: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 pl-9 pr-10 text-sm transition-all"
                    placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-2.5 rounded-lg font-semibold shadow-lg transition-all flex justify-center items-center gap-2 mt-2">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
              </button>
              <p className="text-center text-gray-500 text-xs pt-1">
                Don't have an account?{' '}
                <button type="button" onClick={() => setTab('signup')} className="text-indigo-400 hover:text-indigo-300 font-medium">Sign up here</button>
              </p>
            </form>
          )}

          {/* SIGN UP */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" value={signUp.name} onChange={e => setSignUp({ ...signUp, name: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 pl-9 pr-4 text-sm transition-all"
                    placeholder="John Doe" required minLength={2} />
                </div>
              </div>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="email" value={signUp.email} onChange={e => setSignUp({ ...signUp, email: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 pl-9 pr-4 text-sm transition-all"
                    placeholder="you@example.com" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-300 text-xs font-medium mb-1 block">Department</label>
                  <select value={signUp.department} onChange={e => setSignUp({ ...signUp, department: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 px-3 text-sm transition-all">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-xs font-medium mb-1 block">Year</label>
                  <select value={signUp.year} onChange={e => setSignUp({ ...signUp, year: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 px-3 text-sm transition-all">
                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-300 text-xs font-medium mb-1 block">Roll Number / PRN <span className="text-gray-500">(optional)</span></label>
                  <input type="text" value={signUp.roll_number} onChange={e => setSignUp({ ...signUp, roll_number: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 px-3 text-sm transition-all"
                    placeholder="e.g. CS2024001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-300 text-xs font-medium mb-1 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type={showPassword ? 'text' : 'password'} value={signUp.password} onChange={e => setSignUp({ ...signUp, password: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 pl-8 pr-3 text-sm transition-all"
                      placeholder="Min 8 chars" required minLength={8} />
                  </div>
                </div>
                <div>
                  <label className="text-gray-300 text-xs font-medium mb-1 block">Confirm</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type={showPassword ? 'text' : 'password'} value={signUp.confirmPassword} onChange={e => setSignUp({ ...signUp, confirmPassword: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-600 outline-none focus:border-indigo-500 text-white rounded-lg py-2.5 pl-8 pr-3 text-sm transition-all"
                      placeholder="Repeat" required />
                  </div>
                </div>
              </div>
              <p className="text-gray-500 text-xs">Password must be 8+ chars with uppercase, lowercase & number.</p>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPassword ? 'Hide' : 'Show'} passwords
              </button>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white py-2.5 rounded-lg font-semibold shadow-lg transition-all flex justify-center items-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Account'}
              </button>
              <p className="text-center text-gray-500 text-xs">
                Already have an account?{' '}
                <button type="button" onClick={() => setTab('signin')} className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
