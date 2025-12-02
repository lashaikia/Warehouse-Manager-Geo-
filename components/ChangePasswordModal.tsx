import React, { useState } from 'react';
import { User } from '../types';
import { changePassword } from '../services/storage';
import { Lock, X, Save, Key, Loader2 } from 'lucide-react';

interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onClose }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('ახალი პაროლები არ ემთხვევა ერთმანეთს');
      return;
    }

    if (newPassword.length < 4) {
      setError('პაროლი უნდა შედგებოდეს მინიმუმ 4 სიმბოლოსგან');
      return;
    }

    setLoading(true);
    const result = await changePassword(user.id, oldPassword, newPassword);
    setLoading(false);
    
    if (result.success) {
      setSuccess(result.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Key size={20} className="mr-2 text-indigo-600" />
            პაროლის შეცვლა
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">მიმდინარე პაროლი</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                required
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="შეიყვანეთ ძველი პაროლი"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">ახალი პაროლი</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="შეიყვანეთ ახალი პაროლი"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">გაიმეორეთ ახალი პაროლი</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="გაიმეორეთ ახალი პაროლი"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg text-center font-medium">
              {success}
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3">
            <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
               გაუქმება
            </button>
            <button
               type="submit"
               disabled={loading}
               className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition flex items-center disabled:opacity-50"
            >
               {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
               შენახვა
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};