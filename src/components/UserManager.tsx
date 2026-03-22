import React, { useState } from 'react';
import { User, Role } from '../types';
import { Shield, UserPlus, Trash2, KeyRound } from 'lucide-react';

interface UserManagerProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
}

const UserManager: React.FC<UserManagerProps> = ({ users, setUsers, currentUser }) => {
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Moderator' as Role });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    // Prevent duplicate usernames
    if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
        alert("Username already exists!");
        return;
    }

    setUsers(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      username: newUser.username,
      password: newUser.password,
      role: newUser.role
    }]);

    setNewUser({ username: '', password: '', role: 'Moderator' });
  };

  const handleDeleteUser = (id: string) => {
    if (currentUser.id === id) {
      alert("You cannot delete yourself.");
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pb-8 pr-1 md:pr-2">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">User Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Provision access, configure roles, and secure the system</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-xl w-fit">
          <Shield className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add User Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col transition-colors h-fit">
          <div className="flex items-center space-x-2 mb-6">
            <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Provision New User</h3>
          </div>
          
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Username</label>
              <input 
                type="text" required
                value={newUser.username}
                onChange={e => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                placeholder="sales_rep_1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Password</label>
              <input 
                type="text" required
                value={newUser.password}
                onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                placeholder="Secure password"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Authorization Role</label>
              <select 
                value={newUser.role}
                onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as Role }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              >
                <option value="Moderator">Moderator (Pricing & Orders)</option>
                <option value="Observer">Observer (Read-Only Accounts)</option>
                <option value="Owner">Owner (Full Admin Access)</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full mt-4 flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all active:scale-95 shadow-sm"
            >
              Add User
            </button>
          </form>
        </div>

        {/* User Roster */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Active System Users</h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{users.length} Account(s)</span>
          </div>
          <div className="overflow-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 relative">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Role & Access Level</th>
                  <th className="px-6 py-4 text-center">Security</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                      {u.username}
                      {u.id === currentUser.id && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">You</span>}
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'Owner' && <span className="text-red-600 dark:text-red-400 font-bold flex items-center"><Shield className="w-3 h-3 mr-1" /> Owner</span>}
                      {u.role === 'Moderator' && <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center"><KeyRound className="w-3 h-3 mr-1" /> Moderator</span>}
                      {u.role === 'Observer' && <span className="text-emerald-600 dark:text-emerald-500 font-bold flex items-center">Observer</span>}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-mono bg-slate-50/50 dark:bg-slate-900/50 text-slate-400">
                      {u.password}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== currentUser.id && (
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Revoke Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManager;
