import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { getUsers, saveUser, updateUser, deleteUser } from '../services/storage';
import { Users, Plus, Edit2, Trash2, Save, X, Shield, Key, Loader2 } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'viewer' as Role
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', username: '', password: '', role: 'viewer' });
    setEditingUser(null);
    setIsModalOpen(false);
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password || '',
      role: user.role
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('ნამდვილად გსურთ მომხმარებლის წაშლა?')) {
        const admins = users.filter(u => u.role === 'admin');
        const userToDelete = users.find(u => u.id === id);
        if (userToDelete?.role === 'admin' && admins.length <= 1) {
            alert('სისტემაში უნდა არსებობდეს მინიმუმ ერთი ადმინისტრატორი!');
            return;
        }
        
        setLoading(true);
        const updated = await deleteUser(id);
        setUsers(updated);
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.name || !formData.role) return;

    setLoading(true);

    if (editingUser) {
        const updated = await updateUser(editingUser.id, formData);
        setUsers(updated);
    } else {
        if (users.some(u => u.username === formData.username)) {
            alert('მომხმარებლის სახელი დაკავებულია!');
            setLoading(false);
            return;
        }
        if (!formData.password) {
            alert('ახალი მომხმარებლისთვის პაროლი სავალდებულოა!');
            setLoading(false);
            return;
        }

        await saveUser(formData);
        const updated = await getUsers();
        setUsers(updated);
    }
    setLoading(false);
    resetForm();
  };

  const getRoleBadge = (role: Role) => {
    switch(role) {
        case 'admin': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">ადმინისტრატორი</span>;
        case 'editor': return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">რედაქტორი</span>;
        case 'viewer': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">სტუმარი</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center">
             <Users className="mr-3 text-indigo-600" size={28} />
             მომხმარებლები
           </h2>
           <p className="text-gray-500 text-sm mt-1">სისტემაში დაშვებული პირების მართვა</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          დამატება
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[200px]">
        {loading && (
           <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
           </div>
        )}
        <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <th className="p-4">სახელი / გვარი</th>
                <th className="p-4">User</th>
                <th className="p-4">როლი</th>
                <th className="p-4 text-center">პაროლი</th>
                <th className="p-4 text-center">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-800">{user.name}</td>
                        <td className="p-4 font-mono text-gray-600">{user.username}</td>
                        <td className="p-4">{getRoleBadge(user.role)}</td>
                        <td className="p-4 text-center text-gray-400 text-xs">••••••</td>
                        <td className="p-4 flex justify-center space-x-2">
                             <button 
                                onClick={() => handleEditClick(user)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="რედაქტირება"
                             >
                                <Edit2 size={18} />
                             </button>
                             <button 
                                onClick={() => handleDeleteClick(user.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="წაშლა"
                             >
                                <Trash2 size={18} />
                             </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-lg font-bold text-gray-800">
                 {editingUser ? 'მომხმარებლის რედაქტირება' : 'ახალი მომხმარებელი'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                 <X size={24} />
               </button>
             </div>

             <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                 <label className="text-sm font-medium text-gray-700 block mb-1">სახელი, გვარი</label>
                 <input 
                   required
                   type="text"
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   className="w-full p-2.5 bg-white border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   placeholder="მაგ: გიორგი ბერიძე"
                 />
               </div>

               <div>
                 <label className="text-sm font-medium text-gray-700 block mb-1">მომხმარებლის სახელი (Login)</label>
                 <input 
                   required
                   type="text"
                   value={formData.username}
                   onChange={e => setFormData({...formData, username: e.target.value})}
                   disabled={!!editingUser}
                   className={`w-full p-2.5 bg-white border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${editingUser ? 'bg-gray-100 text-gray-500' : ''}`}
                   placeholder="mag: giorgi123"
                 />
               </div>

               <div>
                 <label className="text-sm font-medium text-gray-700 block mb-1 flex items-center">
                    <Key size={14} className="mr-1" />
                    პაროლი {editingUser && <span className="text-xs text-gray-400 font-normal ml-1">(დატოვეთ ცარიელი თუ არ ცვლით)</span>}
                 </label>
                 <input 
                   type="text"
                   value={formData.password}
                   onChange={e => setFormData({...formData, password: e.target.value})}
                   className="w-full p-2.5 bg-white border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                   placeholder="პაროლი"
                 />
               </div>

               <div>
                 <label className="text-sm font-medium text-gray-700 block mb-1 flex items-center">
                    <Shield size={14} className="mr-1" />
                    როლი
                 </label>
                 <select
                   value={formData.role}
                   onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                   className="w-full p-2.5 bg-white border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 >
                   <option value="viewer">Viewer (მხოლოდ ნახვა)</option>
                   <option value="editor">Editor (ოპერატორი)</option>
                   <option value="admin">Admin (სრული უფლება)</option>
                 </select>
               </div>
               
               <div className="pt-4 flex justify-end space-x-3">
                 <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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
      )}
    </div>
  );
};