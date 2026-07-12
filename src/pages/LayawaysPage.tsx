import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentsIcon from '@mui/icons-material/Payments';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';
import { getAllProducts } from '../db/products';
import { getAllCustomers } from '../db/customers';
import {
  getAllLayaways, saveLayaway, addLayawayPayment, cancelLayaway, layawayBalance,
} from '../db/layaways';
import type { Customer, Layaway, Product, SaleItem } from '../db/db';
import { formatCurrency, parseCurrencyToCents } from '../utils/format';

interface Line { productId: string; quantity: string; }

export default function LayawaysPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'es-MX';
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<Layaway[]>([]);
  const [dialog, setDialog] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [firstPayment, setFirstPayment] = useState('');
  const [payTarget, setPayTarget] = useState<Layaway | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const reload = async () => {
    const [p, c, l] = await Promise.all([getAllProducts(), getAllCustomers(), getAllLayaways()]);
    setProducts(p); setCustomers(c); setRows(l);
  };
  useEffect(() => { void reload(); }, []);

  const totalCents = useMemo(
    () => lines.reduce((sum, l) => {
      const p = products.find((x) => String(x.id) === l.productId);
      return sum + (p?.price ?? 0) * (Number(l.quantity) || 0);
    }, 0),
    [lines, products],
  );

  const open = () => {
    setCustomerId(customers[0]?.id ?? '');
    setLines([{ productId: products[0] ? String(products[0].id) : '', quantity: '1' }]);
    setFirstPayment('');
    setDialog(true);
  };

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const create = async () => {
    const customer = customers.find((c) => c.id === customerId);
    const items: SaleItem[] = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => {
        const p = products.find((x) => String(x.id) === l.productId)!;
        const quantity = Number(l.quantity) || 0;
        return { productId: l.productId, name: p.name, priceCents: p.price, quantity, subtotalCents: p.price * quantity };
      });
    if (items.length === 0 || !customer) return;
    const total = items.reduce((s, it) => s + it.subtotalCents, 0);
    const initial = Math.min(total, parseCurrencyToCents(firstPayment));
    const layaway: Layaway = {
      id: crypto.randomUUID(),
      customerId: customer.id,
      customerName: customer.name,
      items,
      totalCents: total,
      paidCents: initial,
      status: initial >= total ? 'settled' : 'open',
      payments: initial > 0 ? [{ amountCents: initial, timestamp: Date.now() }] : [],
      createdAt: Date.now(),
    };
    await saveLayaway(layaway);
    setDialog(false);
    await reload();
  };

  const registerPayment = async () => {
    if (!payTarget) return;
    await addLayawayPayment(payTarget.id, parseCurrencyToCents(payAmount));
    setPayTarget(null); setPayAmount('');
    await reload();
  };

  const statusChip = (l: Layaway) => {
    if (l.status === 'settled') return <Chip size="small" color="success" label={t('layaways.settled')} />;
    if (l.status === 'cancelled') return <Chip size="small" color="default" label={t('layaways.cancelled')} />;
    return <Chip size="small" color="warning" label={t('layaways.open')} />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <BookmarkIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('layaways.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={open} disabled={customers.length === 0 || products.length === 0}>
          {t('layaways.add')}
        </Button>
      </Box>
      {customers.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>{t('layaways.need_customer')}</Typography>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('cash.date_time')}</TableCell>
              <TableCell>{t('layaways.customer')}</TableCell>
              <TableCell align="right">{t('sale.total')}</TableCell>
              <TableCell align="right">{t('layaways.paid')}</TableCell>
              <TableCell align="right">{t('layaways.balance')}</TableCell>
              <TableCell align="center">{t('layaways.status')}</TableCell>
              <TableCell align="right">{t('catalog.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell>{new Date(l.createdAt).toLocaleString(locale)}</TableCell>
                <TableCell>{l.customerName}</TableCell>
                <TableCell align="right">{formatCurrency(l.totalCents)}</TableCell>
                <TableCell align="right">{formatCurrency(l.paidCents)}</TableCell>
                <TableCell align="right">{formatCurrency(layawayBalance(l))}</TableCell>
                <TableCell align="center">{statusChip(l)}</TableCell>
                <TableCell align="right">
                  {l.status === 'open' && (
                    <>
                      <Button size="small" startIcon={<PaymentsIcon />} onClick={() => { setPayTarget(l); setPayAmount(''); }}>
                        {t('layaways.pay')}
                      </Button>
                      <IconButton size="small" color="error" title={t('layaways.cancel')}
                        onClick={async () => { await cancelLayaway(l.id); await reload(); }}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{t('layaways.empty')}</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Nuevo apartado */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('layaways.add')}</DialogTitle>
        <DialogContent>
          <TextField select label={t('layaways.customer')} value={customerId} fullWidth sx={{ mt: 1, mb: 2 }}
            onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <Card variant="outlined"><CardContent>
            <Stack spacing={1.5}>
              {lines.map((l, i) => (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
                  <TextField select label={t('purchases.product')} value={l.productId} sx={{ flex: 2, minWidth: 160 }} fullWidth
                    onChange={(e) => setLine(i, { productId: e.target.value })}>
                    {products.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name} — {formatCurrency(p.price)}</MenuItem>)}
                  </TextField>
                  <TextField label={t('sale.quantity')} type="number" value={l.quantity} sx={{ flex: 1 }}
                    onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  <IconButton color="error" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => setLines((prev) => [...prev, { productId: products[0] ? String(products[0].id) : '', quantity: '1' }])}>
                {t('purchases.add_line')}
              </Button>
            </Stack>
          </CardContent></Card>
          <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <TextField label={t('layaways.first_payment')} value={firstPayment} sx={{ maxWidth: 220 }}
              onChange={(e) => setFirstPayment(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            <Typography variant="h6">{t('sale.total')}: {formatCurrency(totalCents)}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={create}>{t('layaways.create')}</Button>
        </DialogActions>
      </Dialog>

      {/* Abono */}
      <Dialog open={payTarget !== null} onClose={() => setPayTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('layaways.pay')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('layaways.balance')}: {formatCurrency(payTarget ? layawayBalance(payTarget) : 0)}
          </Typography>
          <TextField label={t('layaways.amount')} value={payAmount} fullWidth autoFocus
            onChange={(e) => setPayAmount(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={registerPayment}>{t('layaways.register_payment')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
