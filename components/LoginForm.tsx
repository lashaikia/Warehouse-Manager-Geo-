import React, { useState } from 'react';
import { User } from '../types';
import { login } from '../services/storage';
import { Lock, User as UserIcon, LogIn, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
        const user = await login(username, password);
        if (user) {
          onLogin(user);
        } else {
          setError('მომხმარებელი ან პაროლი არასწორია');
        }
    } catch (e) {
        console.error(e);
        setError('შეცდომა დაკავშირებისას. შეამოწმეთ ინტერნეტი.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in relative">
        
        <div className="p-8 pb-0 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <Lock className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">სისტემაში შესვლა</h2>
          <p className="text-gray-500 mt-2">შეიყვანეთ თქვენი მონაცემები</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">მომხმარებელი</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                placeholder="Username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">პაროლი</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition duration-200 flex items-center justify-center disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <LogIn size={20} className="mr-2" />}
            შესვლა
          </button>
        </form>

        <div className="bg-gray-50 p-6 text-center border-t border-gray-100 text-xs text-gray-500">
           <p className="font-semibold mb-2">სატესტო მომხმარებლები (User / Pass):</p>
           <div className="space-x-4">
             <span>admin / admin</span>
             <span>editor / editor</span>
             <span>viewer / viewer</span>
           </div>
        </div>
      </div>
    </div>
  );
};