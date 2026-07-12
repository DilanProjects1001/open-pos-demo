import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Role = 'admin' | 'gerente' | 'cajero';

export interface User {
  id: string;
  name: string;
  role: Role;
}

interface UserWithPin extends User {
  pin: string;
}

// Usuarios predefinidos (demo, sin backend). El PIN NO se expone fuera del contexto.
const USERS: UserWithPin[] = [
  { id: 'admin', name: 'Ana Torres', role: 'admin', pin: '1234' },
  { id: 'gerente', name: 'Luis Prado', role: 'gerente', pin: '5678' },
  { id: 'cajero', name: 'Sofía Ruiz', role: 'cajero', pin: '0000' },
];

interface AuthCtx {
  user: User | null;
  isAuthenticated: boolean;
  /** Valida el PIN e inicia sesión. Devuelve el usuario o null si el PIN es inválido. */
  login: (pin: string) => User | null;
  /** Cierra la sesión por completo. */
  logout: () => void;
  /** Cambio rápido de operador: valida PIN y reemplaza al usuario sin pasar por /login. */
  switchOperator: (pin: string) => User | null;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

function findByPin(pin: string): User | null {
  const match = USERS.find((u) => u.pin === pin.trim());
  if (!match) return null;
  const { pin: _pin, ...safe } = match;
  return safe;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // La sesión vive solo en memoria (no se persiste todavía).
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((pin: string) => {
    const found = findByPin(pin);
    if (found) setUser(found);
    return found;
  }, []);

  const switchOperator = useCallback((pin: string) => {
    const found = findByPin(pin);
    if (found) setUser(found);
    return found;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo<AuthCtx>(
    () => ({ user, isAuthenticated: user !== null, login, logout, switchOperator }),
    [user, login, logout, switchOperator],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
