import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import RedeemIcon from '@mui/icons-material/Redeem';
import { useTranslation } from 'react-i18next';
import { getLoyaltyConfig, saveLoyaltyConfig, pointsToCents } from '../db/loyalty';
import { getAllCustomers, adjustCustomer } from '../db/customers';
import type { Customer, LoyaltyConfig } from '../db/db';
import { formatCurrency } from '../utils/format';

export default function LoyaltyPage() {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState<LoyaltyConfig | null>(null);
  const [earnPer, setEarnPer] = useState('10');
  const [redeemVal, setRedeemVal] = useState('1');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [redeemTarget, setRedeemTarget] = useState<Customer | null>(null);
  const [redeemPts, setRedeemPts] = useState('');
  const [saved, setSaved] = useState(false);

  const reload = async () => {
    const [c, cus] = await Promise.all([getLoyaltyConfig(), getAllCustomers()]);
    setCfg(c);
    setEarnPer(String(c.earnPerCents / 100));
    setRedeemVal(String(c.redeemValueCents / 100));
    setCustomers(cus);
  };
  useEffect(() => { void reload(); }, []);

  const saveConfig = async () => {
    const next: LoyaltyConfig = {
      id: 'loyalty',
      earnPerCents: Math.max(1, Math.round(Number(earnPer) * 100)),
      redeemValueCents: Math.max(0, Math.round(Number(redeemVal) * 100)),
    };
    await saveLoyaltyConfig(next);
    setCfg(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const doRedeem = async () => {
    if (!redeemTarget || !cfg) return;
    const pts = Math.min(redeemTarget.points, Math.max(0, Math.floor(Number(redeemPts) || 0)));
    if (pts <= 0) return;
    // Canjea puntos por saldo a favor (crédito de tienda usable en ventas).
    await adjustCustomer(redeemTarget.id, -pts, pointsToCents(pts, cfg));
    setRedeemTarget(null); setRedeemPts('');
    await reload();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <LoyaltyIcon color="primary" fontSize="large" />
        <Typography variant="h4">{t('loyalty.title')}</Typography>
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>{t('loyalty.config')}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            <TextField label={t('loyalty.earn_per')} value={earnPer} onChange={(e) => setEarnPer(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            <Typography color="text.secondary">→ 1 {t('loyalty.point')}</Typography>
            <TextField label={t('loyalty.redeem_value')} value={redeemVal} onChange={(e) => setRedeemVal(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            <Typography color="text.secondary">/ {t('loyalty.point')}</Typography>
            <Button variant="contained" onClick={saveConfig}>{t('common.save')}</Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {t('loyalty.rule_hint', { earn: earnPer, value: redeemVal })}
          </Typography>
          {saved && <Alert severity="success" sx={{ mt: 2 }}>{t('loyalty.saved')}</Alert>}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1.5 }}>{t('loyalty.customers_points')}</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('customers.name')}</TableCell>
              <TableCell align="right">{t('customers.points')}</TableCell>
              <TableCell align="right">{t('loyalty.points_value')}</TableCell>
              <TableCell align="right">{t('customers.balance')}</TableCell>
              <TableCell align="right">{t('catalog.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.name}</TableCell>
                <TableCell align="right"><Chip size="small" color="secondary" label={c.points} /></TableCell>
                <TableCell align="right">{cfg ? formatCurrency(pointsToCents(c.points, cfg)) : '—'}</TableCell>
                <TableCell align="right">{formatCurrency(c.balanceCents)}</TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<RedeemIcon />} disabled={c.points <= 0}
                    onClick={() => { setRedeemTarget(c); setRedeemPts(String(c.points)); }}>
                    {t('loyalty.redeem')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{t('loyalty.no_customers')}</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={redeemTarget !== null} onClose={() => setRedeemTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('loyalty.redeem')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('loyalty.redeem_desc', { name: redeemTarget?.name, points: redeemTarget?.points ?? 0 })}
          </Typography>
          <TextField label={t('loyalty.points_to_redeem')} type="number" value={redeemPts} fullWidth autoFocus
            onChange={(e) => setRedeemPts(e.target.value)} />
          {cfg && redeemTarget && (
            <Typography sx={{ mt: 1.5, fontWeight: 600 }}>
              = {formatCurrency(pointsToCents(Math.min(redeemTarget.points, Number(redeemPts) || 0), cfg))} {t('loyalty.in_credit')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRedeemTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={doRedeem}>{t('loyalty.confirm_redeem')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
