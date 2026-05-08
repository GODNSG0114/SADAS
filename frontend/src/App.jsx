import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/student/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import ActivityRecords from './pages/admin/ActivityRecords';

const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  
  return children;
};

const App = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Routes>
        <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard') : '/login'} replace />} />
        
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        
        <Route 
          path="/student/dashboard" 
          element={
            <PrivateRoute roles={['student']}>
              <StudentDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/admin/dashboard" 
          element={
            <PrivateRoute roles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/admin/users" 
          element={
            <PrivateRoute roles={['admin']}>
              <UserManagement />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/admin/activities" 
          element={
            <PrivateRoute roles={['admin']}>
              <ActivityRecords />
            </PrivateRoute>
          } 
        />

        <Route path="/unauthorized" element={<div className="flex h-screen items-center justify-center font-bold text-2xl text-red-500">UnAuthorized</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
