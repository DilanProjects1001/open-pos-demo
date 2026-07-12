import { useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Modal para cambiar de operador (turno) ingresando un PIN, sin cerrar sesión. */
export default function OperatorSwitchDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { switchOperator } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const close = () => {
    setPin('');
    setError(false);
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const user = switchOperator(pin);
    if (user) {
      close();
    } else {
      setError(true);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('auth.switch_operator')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('auth.switch_operator_desc')}
          </DialogContentText>
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained">
            {t('auth.switch')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
