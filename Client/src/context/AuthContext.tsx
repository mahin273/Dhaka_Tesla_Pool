import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse } from '../types';
import { apiClient } from '../api/client';

export type StoryCastKey = 'jashim' | 'nusrat' | 'shirin' | 'rafiq';

export const STORY_CAST: Record<
  StoryCastKey,
  {
    name: string;
    role: 'DRIVER' | 'PASSENGER';
    tagline: string;
    email: string;
    password: string;
    description: string;
  }
> = {
  jashim: {
    name: 'Jashim Uddin',
    role: 'DRIVER',
    tagline: 'Tesla Model 3 (Bullet)',
    email: 'jashim@tesla.dhaka',
    password: 'password123',
    description: 'Lead driver running pooled routes across Banani and Gulshan',
  },
  nusrat: {
    name: 'Nusrat Jahan',
    role: 'PASSENGER',
    tagline: 'Passenger (1 seat)',
    email: 'nusrat@tesla.dhaka',
    password: 'password123',
    description: 'Commuter traveling between Banani and Gulshan 1',
  },
  shirin: {
    name: 'Shirin Akter',
    role: 'PASSENGER',
    tagline: 'Passenger (1 seat)',
    email: 'shirin@tesla.dhaka',
    password: 'password123',
    description: 'Pooling candidate requesting pickup in Banani zone',
  },
  rafiq: {
    name: 'Rafiq Ahmed',
    role: 'PASSENGER',
    tagline: 'Passenger (1 seat)',
    email: 'rafiq@tesla.dhaka',
    password: 'password123',
    description: 'Second commuter matching detour route into Gulshan 1',
  },
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginAs: (castKey: StoryCastKey) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('user', JSON.stringify(res.user));

    setToken(res.accessToken);
    setUser(res.user);

    return res.user;
  };

  const loginAs = async (castKey: StoryCastKey): Promise<User> => {
    const cast = STORY_CAST[castKey];
    return login(cast.email, cast.password);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginAs,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
