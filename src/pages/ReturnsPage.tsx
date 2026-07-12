import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { getAllSales } from '../db/sales';
import { addReturn, getAllReturns } from '../db/returns';
import type { PaymentMethod, ReturnRecord, Sale, SaleItem } from '../db/db';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../auth/AuthContext';

export default function ReturnsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const locale = i18n.language === 'en' ? 'en-US' : 'es-MX';

  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [dialog, setDialog] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reason, setReason] = useState('');

  const reload = async () => {
    const [s, r] = await Promise.all([getAllSales(), getAllReturns()]);
    setSales(s); setReturns(r);
  };
  useEffect(() => { void reload(); }, []);

  const sale = useMemo(() => sales.find((s) => s.id === saleId) ?? null, [sales, saleId]);

  const refundCents = useMemo(() => {
    if (!sale) return 0;
    return sale.items.reduce((sum, it) => sum + it.priceCents * (qtys[it.productId] ?? 0), 0);
  }, [sale, qtys]);

  const open = () => {
    const first = sales[0];
    setSaleId(first?.id ?? '');
    setQtys({});
    setMethod('cash');
    setReason('');
    setDialog(true);
  };

  const confirm = async () => {
    if (!sale) return;
    const items: SaleItem[] = sale.items
      .filter((it) => (qtys[it.productId] ?? 0) > 0)
      .map((it) => {
        const quantity = Math.min(it.quantity, qtys[it.productId] ?? 0);
        return { ...it, quantity, subtotalCents: it.priceCents * quantity };
      });
    if (items.length === 0) return;
    const record: ReturnRecord = {
      id: crypto.randomUUID(),
      saleId: sale.id,
      items,
      refundCents: items.reduce((s, it) => s + it.subtotalCents, 0),
      method,
      operatorId: user?.id ?? 'desconocido',
      reason: reason.trim(),
      timestamp: Date.now(),
    };
    await addReturn(record);
    setDialog(false);
    await reload();
  };

  const methodLabel = (m: PaymentMethod) => t(`payment.${m}`);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <AssignmentReturnIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('returns.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={open} disabled={sales.length === 0}>
          {t('returns.add')}
        </Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>{t('returns.manager_only')}</Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('cash.date_time')}</TableCell>
              <TableCell align="center">{t('purchases.items')}</TableCell>
              <TableCell>{t('returns.method')}</TableCell>
              <TableCell>{t('returns.reason')}</TableCell>
              <TableCell align="right">{t('returns.refund')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {returns.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{new Date(r.timestamp).toLocaleString(locale)}</TableCell>
                <TableCell align="center">{r.items.reduce((n, i) => n + i.quantity, 0)}</TableCell>
                <TableCell><Chip size="small" variant="outlined" label={methodLabel(r.method)} /></TableCell>
                <TableCell>{r.reason || '—'}</TableCell>
                <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                  - {formatCurrency(r.refundCents)}
                </TableCell>
              </TableRow>
            ))}
            {returns.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{t('returns.empty')}</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('returns.add')}</DialogTitle>
        <DialogContent>
          <TextField select label={t('returns.sale')} value={saleId} fullWidth sx={{ mt: 1, mb: 2 }}
            onChange={(e) => { setSaleId(e.target.value); setQtys({}); }}>
            {sales.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {new Date(s.timestamp).toLocaleString(locale)} — {formatCurrency(s.totalCents)}
              </MenuItem>
            ))}
          </TextField>

          {sale && (
            <Card variant="outlined"><CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('returns.pick_items')}</Typography>
              <Stack spacing={1}>
                {sale.items.map((it) => (
                  <Stack key={it.productId} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ flexGrow: 1 }}>{it.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('returns.sold_qty')}: {it.quantity}
                    </Typography>
                    <TextField type="number" size="small" sx={{ width: 100 }} label={t('returns.qty')}
                      value={qtys[it.productId] ?? 0}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(it.quantity, Number(e.target.value) || 0));
                        setQtys((p) => ({ ...p, [it.productId]: v }));
                      }} />
                  </Stack>
                ))}
              </Stack>
            </CardContent></Card>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField select label={t('returns.method')} value={method} sx={{ minWidth: 160 }}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <MenuItem value="cash">{t('payment.cash')}</MenuItem>
              <MenuItem value="card">{t('payment.card')}</MenuItem>
              <MenuItem value="transfer">{t('payment.transfer')}</MenuItem>
            </TextField>
            <TextField label={t('returns.reason')} value={reason} fullWidth
              onChange={(e) => setReason(e.target.value)} />
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Typography variant="h6" color="error">{t('returns.refund')}: {formatCurrency(refundCents)}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirm} disabled={refundCents <= 0}>
            {t('returns.process')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
