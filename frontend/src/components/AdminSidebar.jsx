import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, BookOpen, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminSidebar = () => {
  const { logout } = useAuth();

  const navClass = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
        : 'text-gray-300 hover:text-white hover:bg-gray-800'
    }`;

  return (
    <aside className="w-64 glass-dark text-white border-r border-gray-700/50 flex flex-col hidden md:flex shrink-0">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-wider">SADAS Admin</h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/admin/dashboard" className={navClass}>
          <LayoutDashboard size={20}/> Analytics Hub
        </NavLink>
        <NavLink to="/admin/users" className={navClass}>
          <Users size={20}/> User Management
        </NavLink>
        <NavLink to="/admin/activities" className={navClass}>
          <BookOpen size={20}/> Activity Records
        </NavLink>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button onClick={logout} className="w-full flex justify-center items-center gap-2 py-2 text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition font-medium">
          Logout <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
