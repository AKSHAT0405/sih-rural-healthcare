import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {  Facility  } from '../types';
import { authApi } from '../api';

interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  userRole: string | null;
  userId: string | null;
  userFacility: Facility | null;
  login: (token: string, data: any) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userFacility, setUserFacility] = useState<Facility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const data = await authApi.getMe(token);
          setUserEmail(data.email);
          setUserRole(data.role);
          setUserId(data.id);
          setUserFacility(data.facility);
        } catch (error) {
          console.error('Failed to authenticate token', error);
          setToken(null);
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [token]);

  const login = (newToken: string, data: any) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setUserEmail(data.email);
    setUserRole(data.role);
    setUserId(data.id);
    setUserFacility(data.facility);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setUserEmail(null);
    setUserRole(null);
    setUserId(null);
    setUserFacility(null);
  };

  return (
    <AuthContext.Provider value={{ token, userEmail, userRole, userId, userFacility, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
