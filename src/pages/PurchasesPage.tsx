import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { getAllProducts } from '../db/products';
import { getAllSuppliers } from '../db/suppliers';
import { addPurchase, getAllPurchases } from '../db/purchases';
import type { Product, Purchase, PurchaseItem, Supplier } from '../db/db';
import { formatCurrency, parseCurrencyToCents } from '../utils/format';
import { useAuth } from '../auth/AuthContext';

interface Draft { productId: string; name: string; quantity: string; cost: string; }

export default function PurchasesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const locale = i18n.language === 'en' ? 'en-US' : 'es-MX';

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [dialog, setDialog] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Draft[]>([]);

  const reload = async () => {
    const [p, s, pu] = await Promise.all([getAllProducts(), getAllSuppliers(), getAllPurchases()]);
    setProducts(p); setSuppliers(s); setPurchases(pu);
  };
  useEffect(() => { void reload(); }, []);

  const totalCents = useMemo(
    () => lines.reduce((sum, l) => sum + parseCurrencyToCents(l.cost) * (Number(l.quantity) || 0), 0),
    [lines],
  );

  const open = () => {
    setSupplierId(suppliers[0]?.id ?? '');
    setLines([{ productId: products[0] ? String(products[0].id) : '', name: products[0]?.name ?? '', quantity: '1', cost: '' }]);
    setDialog(true);
  };

  const setLine = (i: number, patch: Partial<Draft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = async () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    const items: PurchaseItem[] = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => {
        const p = products.find((x) => String(x.id) === l.productId);
        const costCents = parseCurrencyToCents(l.cost);
        const quantity = Number(l.quantity) || 0;
        return { productId: l.productId, name: p?.name ?? l.name, quantity, costCents, subtotalCents: costCents * quantity };
      });
    if (items.length === 0) return;
    const purchase: Purchase = {
      id: crypto.randomUUID(),
      supplierId,
      supplierName: supplier?.name ?? '—',
      items,
      totalCents: items.reduce((s, it) => s + it.subtotalCents, 0),
      operatorId: user?.id ?? 'desconocido',
      timestamp: Date.now(),
    };
    await addPurchase(purchase);
    setDialog(false);
    await reload();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Inventory2Icon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('purchases.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={open} disabled={suppliers.length === 0 || products.length === 0}>
          {t('purchases.add')}
        </Button>
      </Box>

      {suppliers.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>{t('purchases.need_supplier')}</Typography>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('cash.date_time')}</TableCell>
              <TableCell>{t('purchases.supplier')}</TableCell>
              <TableCell align="center">{t('purchases.items')}</TableCell>
              <TableCell align="right">{t('sale.total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{new Date(p.timestamp).toLocaleString(locale)}</TableCell>
                <TableCell>{p.supplierName}</TableCell>
                <TableCell align="center">{p.items.reduce((n, i) => n + i.quantity, 0)}</TableCell>
                <TableCell align="right">{formatCurrency(p.totalCents)}</TableCell>
              </TableRow>
            ))}
            {purchases.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{t('purchases.empty')}</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('purchases.add')}</DialogTitle>
        <DialogContent>
          <TextField select label={t('purchases.supplier')} value={supplierId} fullWidth sx={{ mt: 1, mb: 2 }}
            onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>

          <Card variant="outlined"><CardContent>
            <Stack spacing={1.5}>
              {lines.map((l, i) => (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
                  <TextField select label={t('purchases.product')} value={l.productId} sx={{ flex: 2, minWidth: 160 }} fullWidth
                    onChange={(e) => setLine(i, { productId: e.target.value })}>
                    {products.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name} ({t('catalog.stock')} {p.stock})</MenuItem>)}
                  </TextField>
                  <TextField label={t('sale.quantity')} type="number" value={l.quantity} sx={{ flex: 1 }}
                    onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  <TextField label={t('purchases.unit_cost')} value={l.cost} sx={{ flex: 1 }}
                    onChange={(e) => setLine(i, { cost: e.target.value })}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
                  <IconButton color="error" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => setLines((prev) => [...prev, { productId: products[0] ? String(products[0].id) : '', name: '', quantity: '1', cost: '' }])}>
                {t('purchases.add_line')}
              </Button>
            </Stack>
          </CardContent></Card>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Typography variant="h6">{t('sale.total')}: {formatCurrency(totalCents)}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save}>{t('purchases.register')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
