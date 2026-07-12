import { Link as RouterLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { useTranslation } from 'react-i18next';
import { useAuth, type Role } from './AuthContext';

interface Props {
  /** Si se indica, solo estos roles pueden entrar (además de estar autenticado). */
  roles?: Role[];
}

/**
 * Protege rutas: si no hay sesión redirige a /login.
 * Si se pasan `roles` y el usuario no los cumple, muestra un aviso de acceso denegado.
 */
export default function ProtectedRoute({ roles }: Props) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mt: 8 }}>
        <BlockIcon color="error" sx={{ fontSize: 56 }} />
        <Typography variant="h5">{t('auth.access_denied')}</Typography>
        <Typography color="text.secondary">{t('auth.access_denied_desc')}</Typography>
        <Button component={RouterLink} to="/venta" variant="outlined" sx={{ mt: 1 }}>
          {t('nav.sale')}
        </Button>
      </Box>
    );
  }

  return <Outlet />;
}
