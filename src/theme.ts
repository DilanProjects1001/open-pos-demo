import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Paleta de marca OpenPOS: verde-azulado (teal) como color principal,
// con buen contraste tanto en modo claro como oscuro.
const brand = {
  primary: '#0d9488', // teal 600
  primaryDark: '#2dd4bf', // teal 300 (mejor contraste en oscuro)
  secondary: '#f59e0b', // ámbar 500
};

const shared: ThemeOptions = {
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, paddingInline: 18 } },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 16 } },
    },
  },
};

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    ...shared,
    palette: {
      mode,
      primary: { main: mode === 'light' ? brand.primary : brand.primaryDark },
      secondary: { main: brand.secondary },
      ...(mode === 'light'
        ? {
            background: { default: '#f4f6f8', paper: '#ffffff' },
          }
        : {
            background: { default: '#0f172a', paper: '#1e293b' },
          }),
    },
  });
