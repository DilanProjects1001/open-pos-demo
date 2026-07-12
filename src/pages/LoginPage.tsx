import { useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';

// Pistas de acceso para la demo (usuarios y PIN predefinidos).
const DEMO_HINTS = [
  { roleKey: 'login.role_admin', pin: '1234' },
  { roleKey: 'login.role_manager', pin: '5678' },
  { roleKey: 'login.role_cashier', pin: '0000' },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/venta';

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const user = login(pin);
    if (user) {
      navigate(from, { replace: true });
    } else {
      setError(true);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70vh',
      }}
    >
      <Card sx={{ width: 400, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
            <StorefrontIcon color="primary" sx={{ fontSize: 44 }} />
            <Typography variant="h5">{t('login.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('login.enter_pin')}
            </Typography>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label={t('login.pin')}
                type="password"
                fullWidth
                autoFocus
                value={pin}
                error={error}
                helperText={error ? t('login.invalid_pin') : ' '}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setError(false);
                }}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
              />
              <Button type="submit" variant="contained" size="large" fullWidth>
                {t('login.submit')}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 2.5 }} />
          <Typography variant="caption" color="text.secondary">
            {t('login.demo_users')}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {DEMO_HINTS.map((h) => (
              <Box
                key={h.pin}
                sx={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Typography variant="body2">{t(h.roleKey)}</Typography>
                <Typography variant="body2" color="primary" sx={{ fontFamily: 'monospace' }}>
                  PIN {h.pin}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
