import { useEffect, useState } from 'react';
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
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import { useTranslation } from 'react-i18next';
import type { SessionSummary } from '../db/cash';
import type { CashSession } from '../db/db';
import { formatCurrency, parseCurrencyToCents } from '../utils/format';

interface Props {
  open: boolean;
  session: CashSession | null;
  summary: SessionSummary | null;
  onCancel: () => void;
  onConfirm: (finalCashCents: number) => void;
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }} color={color}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }} color={color}>
        {value}
      </Typography>
    </Box>
  );
}

/** Diálogo de corte/cierre de turno: muestra el resumen y captura el efectivo final. */
export default function CloseShiftDialog({ open, session, summary, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
  const [finalCash, setFinalCash] = useState('');

  useEffect(() => {
    if (open) setFinalCash('');
  }, [open]);

  if (!session || !summary) return null;

  const finalCents = parseCurrencyToCents(finalCash);
  const diffCents = finalCents - summary.expectedCashCents;
  const diffColor =
    diffCents === 0 ? 'success.main' : diffCents > 0 ? 'info.main' : 'error.main';
  const diffLabel =
    diffCents === 0 ? t('cash.balanced') : diffCents > 0 ? t('cash.over') : t('cash.short');

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PointOfSaleOutlinedIcon color="primary" />
          {t('cash.close_shift_title')}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t('cash.summary')}
        </Typography>
        <Stack spacing={0.75}>
          <Row label={t('cash.sales_count')} value={String(summary.salesCount)} />
          <Row label={t('cash.total_sales')} value={formatCurrency(summary.totalCents)} />
          <Divider sx={{ my: 0.5 }} />
          <Row label={t('payment.cash')} value={formatCurrency(summary.cashCents)} />
          <Row label={t('payment.card')} value={formatCurrency(summary.cardCents)} />
          <Row label={t('payment.transfer')} value={formatCurrency(summary.transferCents)} />
          <Row label={t('cash.change_given')} value={`- ${formatCurrency(summary.changeCents)}`} />
          <Divider sx={{ my: 0.5 }} />
          <Row label={t('cash.initial_cash')} value={formatCurrency(session.initialCashCents)} />
          <Row
            label={t('cash.expected_cash')}
            value={formatCurrency(summary.expectedCashCents)}
            bold
          />
        </Stack>

        <TextField
          label={t('cash.final_cash')}
          value={finalCash}
          onChange={(e) => setFinalCash(e.target.value)}
          fullWidth
          autoFocus
          placeholder="0.00"
          sx={{ mt: 2.5 }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            },
          }}
        />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'action.hover',
            borderRadius: 2,
            px: 2,
            py: 1.25,
            mt: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>{t('cash.difference')}</Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontWeight: 700 }} color={diffColor}>
              {diffCents > 0 ? '+' : ''}
              {formatCurrency(diffCents)}
            </Typography>
            <Typography variant="caption" color={diffColor}>
              {diffLabel}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => onConfirm(finalCents)}>
          {t('cash.confirm_close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
