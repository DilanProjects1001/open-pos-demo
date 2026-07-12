import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CashSession, Sale } from '../db/db';
import { filterSessionSales, summarizeSession } from '../db/cash';
import { formatCurrency } from '../utils/format';

interface Props {
  session: CashSession | null;
  sales: Sale[];
  onClose: () => void;
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
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

/** Detalle de un corte: resumen + ventas del turno. */
export default function SessionDetailDialog({ session, sales, onClose }: Props) {
  const { t, i18n } = useTranslation();
  if (!session) return null;

  const locale = i18n.language === 'en' ? 'en-US' : 'es-MX';
  const summary = summarizeSession(session, sales);
  const turnSales = filterSessionSales(session, sales).sort((a, b) => b.timestamp - a.timestamp);
  const diffCents = (session.finalCashCents ?? 0) - summary.expectedCashCents;
  const diffColor = diffCents === 0 ? 'success.main' : diffCents > 0 ? 'info.main' : 'error.main';

  return (
    <Dialog open={session !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('cash.detail_title')}</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {t('cash.opened_at')}: {new Date(session.openedAt).toLocaleString(locale)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {t('cash.closed_at')}:{' '}
          {session.closedAt ? new Date(session.closedAt).toLocaleString(locale) : '—'}
        </Typography>

        <Stack spacing={0.75}>
          <Row label={t('cash.sales_count')} value={String(summary.salesCount)} />
          <Row label={t('cash.total_sales')} value={formatCurrency(summary.totalCents)} />
          <Row label={t('payment.cash')} value={formatCurrency(summary.cashCents)} />
          <Row label={t('payment.card')} value={formatCurrency(summary.cardCents)} />
          <Row label={t('payment.transfer')} value={formatCurrency(summary.transferCents)} />
          <Divider sx={{ my: 0.5 }} />
          <Row label={t('cash.initial_cash')} value={formatCurrency(session.initialCashCents)} />
          <Row label={t('cash.expected_cash')} value={formatCurrency(summary.expectedCashCents)} />
          <Row
            label={t('cash.final_cash')}
            value={formatCurrency(session.finalCashCents ?? 0)}
          />
          <Row
            label={t('cash.difference')}
            value={`${diffCents > 0 ? '+' : ''}${formatCurrency(diffCents)}`}
            bold
            color={diffColor}
          />
        </Stack>

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          {t('cash.turn_sales')}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('cash.date_time')}</TableCell>
              <TableCell align="center">{t('sale.quantity')}</TableCell>
              <TableCell align="right">{t('sale.total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {turnSales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{new Date(s.timestamp).toLocaleString(locale)}</TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={s.items.reduce((n, i) => n + i.quantity, 0)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">{formatCurrency(s.totalCents)}</TableCell>
              </TableRow>
            ))}
            {turnSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('cash.no_sales')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
