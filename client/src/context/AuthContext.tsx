import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
export type Role = 'User' | 'Author' | 'Admin' | null;
interface User {
  id: string;
  name: string;
  authorNickname?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

interface AuthContextProps {
  user: User | null;
  role: Role;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User, role: Role) => void;
  logout: () => void;
  init: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const TOKEN_KEY = 'nid_token';
const USER_KEY = 'nid_user';
const ROLE_KEY = 'nid_role';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  });
  const [role, setRole] = useState<Role>(() => (localStorage.getItem(ROLE_KEY) as Role) || null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const isAuthenticated = !!token;

  const login = useCallback((newToken: string, newUser: User, newRole: Role) => {
    setToken(newToken);
    setUser(newUser);
    setRole(newRole);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    if (newRole) localStorage.setItem(ROLE_KEY, newRole);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setRole(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  }, []);

  const init = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    
    if (savedToken) {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${savedToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setToken(savedToken);
          const userData = { 
            id: data.user.id, 
            name: data.user.email, 
            authorNickname: data.user.authorNickname,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            phone: data.user.phone,
            address: data.user.address
          };
          setUser(userData);
          setRole(data.user.role as Role);
          localStorage.setItem(ROLE_KEY, data.user.role);
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        } else {
          logout();
        }
      } catch (e) {
        console.error("Auth init error:", e);
      }
    }
  }, [logout]);

  const refreshToken = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) return;
    try {
      const response = await fetch('/api/auth/refresh', {
        method: "POST",
        headers: { 'Authorization': `Bearer ${savedToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
        // calling init() to re-sync user info using the new token
        await init();
      }
    } catch (e) {
      console.error("Failed to refresh token:", e);
    }
  }, [init]);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <AuthContext.Provider value={{ user, role, token, isAuthenticated, login, logout, init, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
