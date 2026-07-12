import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../theme';

type Mode = 'light' | 'dark';

interface ColorModeCtx {
  mode: Mode;
  toggle: () => void;
}

const Ctx = createContext<ColorModeCtx>({ mode: 'light', toggle: () => {} });

export const useColorMode = () => useContext(Ctx);

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(
    (localStorage.getItem('openpos_mode') as Mode) || 'light',
  );

  const value = useMemo<ColorModeCtx>(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          localStorage.setItem('openpos_mode', next);
          return next;
        }),
    }),
    [mode],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <Ctx.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Ctx.Provider>
  );
}
