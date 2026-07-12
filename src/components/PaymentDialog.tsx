import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useTranslation } from 'react-i18next';
import type { Payment } from '../db/db';
import { formatCurrency, parseCurrencyToCents } from '../utils/format';

interface Props {
  open: boolean;
  totalCents: number;
  onCancel: () => void;
  onComplete: (payments: Payment[], changeCents: number) => void;
}

/** Diálogo de cobro con pago mixto (efectivo / tarjeta / transferencia). */
export default function PaymentDialog({ open, totalCents, onCancel, onComplete }: Props) {
  const { t } = useTranslation();
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [transfer, setTransfer] = useState('');

  // Limpia los campos cada vez que se abre el diálogo.
  useEffect(() => {
    if (open) {
      setCash('');
      setCard('');
      setTransfer('');
    }
  }, [open]);

  const cashCents = parseCurrencyToCents(cash);
  const cardCents = parseCurrencyToCents(card);
  const transferCents = parseCurrencyToCents(transfer);

  const paidCents = cashCents + cardCents + transferCents;
  const missingCents = Math.max(0, totalCents - paidCents);
  // El cambio solo se entrega sobre el excedente de EFECTIVO.
  const changeCents = useMemo(() => {
    if (paidCents < totalCents) return 0;
    if (cashCents <= 0) return 0;
    return Math.min(cashCents, paidCents - totalCents);
  }, [paidCents, totalCents, cashCents]);

  const canComplete = paidCents >= totalCents && totalCents > 0;

  const handleComplete = () => {
    const payments: Payment[] = [];
    if (cashCents > 0) payments.push({ method: 'cash', amountCents: cashCents });
    if (cardCents > 0) payments.push({ method: 'card', amountCents: cardCents });
    if (transferCents > 0) payments.push({ method: 'transfer', amountCents: transferCents });
    onComplete(payments, changeCents);
  };

  const field = (
    label: string,
    icon: React.ReactNode,
    value: string,
    setter: (v: string) => void,
  ) => (
    <TextField
      label={label}
      value={value}
      onChange={(e) => setter(e.target.value)}
      fullWidth
      placeholder="0.00"
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              {icon}
              <Box component="span" sx={{ ml: 0.5 }}>$</Box>
            </InputAdornment>
          ),
        },
      }}
    />
  );

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{t('payment.title')}</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            bgcolor: 'action.hover',
            borderRadius: 2,
            px: 2,
            py: 1.5,
            mb: 2.5,
          }}
        >
          <Typography variant="subtitle1">{t('payment.total_to_pay')}</Typography>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
            {formatCurrency(totalCents)}
          </Typography>
        </Box>

        <Stack spacing={2}>
          {field(t('payment.cash'), <PaymentsIcon fontSize="small" color="action" />, cash, setCash)}
          {field(t('payment.card'), <CreditCardIcon fontSize="small" color="action" />, card, setCard)}
          {field(
            t('payment.transfer'),
            <AccountBalanceIcon fontSize="small" color="action" />,
            transfer,
            setTransfer,
          )}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Stack spacing={0.75}>
          <Row label={t('payment.total_paid')} value={formatCurrency(paidCents)} />
          {missingCents > 0 ? (
            <Row
              label={t('payment.missing')}
              value={formatCurrency(missingCents)}
              color="error.main"
              bold
            />
          ) : (
            <Row
              label={t('payment.change')}
              value={formatCurrency(changeCents)}
              color="success.main"
              bold
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!canComplete} onClick={handleComplete}>
          {t('payment.complete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Row({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography sx={{ fontWeight: bold ? 700 : 400 }} color={color}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: bold ? 700 : 400 }} color={color}>
        {value}
      </Typography>
    </Box>
  );
}
