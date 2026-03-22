import React, { useState } from 'react';
import { Lock, User as UserIcon, LogIn, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const foundUser = users.find(u => u.username === username && u.password === password);
    
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 transition-colors relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/background.jpeg')` }}
    >
      {/* Heavy Blur & Semi-transparent Dark Tint Overlay */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-3xl z-0"></div>

      {/* Decorative Elements */}
      <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-amber-500/10 rounded-full mix-blend-screen filter blur-[100px] z-0 animate-blob"></div>
      
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 sm:p-10 relative z-10 transition-colors">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 relative flex justify-center items-center">
            <img src="/logo.png" alt="Wanas Perfumes Logo" className="h-24 w-24 sm:h-28 sm:w-28 object-contain relative z-10 drop-shadow-lg" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center font-cairo">Wanas Perfumes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Authorized Access Only</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg flex items-center text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder-slate-400"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 pb-6">
            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-slate-300 rounded focus:outline-none" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-500 dark:hover:text-amber-400 transition-colors">
                Forgot password?
              </a>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all active:scale-95"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign In to System
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>Secure System &copy; {new Date().getFullYear()} Wanas Perfumes</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
