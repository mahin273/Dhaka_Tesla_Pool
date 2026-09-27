import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRole,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="h-8 bg-slate-800 rounded animate-pulse w-3/4 mx-auto" />
          <div className="h-32 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const target = user.role === 'DRIVER' ? '/driver' : '/passenger';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
