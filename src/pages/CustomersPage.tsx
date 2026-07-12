import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import {
  getAllCustomers, saveCustomer, deleteCustomer, newCustomer, getCustomerSales,
} from '../db/customers';
import type { Customer, Sale } from '../db/db';
import { formatCurrency } from '../utils/format';

const EMPTY = { name: '', phone: '', email: '', address: '' };

export default function CustomersPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'es-MX';
  const [rows, setRows] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [delTarget, setDelTarget] = useState<Customer | null>(null);
  const [history, setHistory] = useState<{ customer: Customer; sales: Sale[] } | null>(null);

  const reload = async () => setRows(await getAllCustomers());
  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [rows, query]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialog(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address });
    setDialog(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (editing) await saveCustomer({ ...editing, ...form });
    else await saveCustomer(newCustomer(form));
    setDialog(false);
    await reload();
  };

  const openHistory = async (c: Customer) => {
    setHistory({ customer: c, sales: await getCustomerSales(c.id) });
  };

  const field = (key: keyof typeof form, label: string) => (
    <TextField label={label} value={form[key]} fullWidth
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <PeopleIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('customers.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t('customers.add')}
        </Button>
      </Box>

      <TextField placeholder={t('customers.search')} value={query} fullWidth
        onChange={(e) => setQuery(e.target.value)} sx={{ mb: 2, maxWidth: 420 }}
        slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) } }} />

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('customers.name')}</TableCell>
              <TableCell>{t('customers.phone')}</TableCell>
              <TableCell>{t('customers.email')}</TableCell>
              <TableCell align="right">{t('customers.points')}</TableCell>
              <TableCell align="right">{t('customers.balance')}</TableCell>
              <TableCell align="right">{t('catalog.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell align="right"><Chip size="small" color="secondary" label={c.points} /></TableCell>
                <TableCell align="right">{formatCurrency(c.balanceCents)}</TableCell>
                <TableCell align="right">
                  <Tooltip title={t('customers.history')}>
                    <IconButton size="small" onClick={() => openHistory(c)}><HistoryIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('catalog.edit')}>
                    <IconButton size="small" onClick={() => openEdit(c)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('catalog.delete')}>
                    <IconButton size="small" color="error" onClick={() => setDelTarget(c)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{t('customers.empty')}</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Alta / edición */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={save}>
          <DialogTitle>{editing ? t('customers.edit') : t('customers.add')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {field('name', t('customers.name'))}
              {field('phone', t('customers.phone'))}
              {field('email', t('customers.email'))}
              {field('address', t('customers.address'))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialog(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={!form.name.trim()}>{t('common.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Borrado */}
      <Dialog open={delTarget !== null} onClose={() => setDelTarget(null)}>
        <DialogTitle>{t('customers.delete_title')}</DialogTitle>
        <DialogContent><Typography>{t('customers.delete_desc', { name: delTarget?.name })}</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={async () => {
            if (delTarget) { await deleteCustomer(delTarget.id); setDelTarget(null); await reload(); }
          }}>{t('catalog.delete')}</Button>
        </DialogActions>
      </Dialog>

      {/* Historial */}
      <Dialog open={history !== null} onClose={() => setHistory(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('customers.history_of', { name: history?.customer.name })}</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Chip color="secondary" label={`${t('customers.points')}: ${history?.customer.points ?? 0}`} />
            <Chip variant="outlined" label={`${t('customers.balance')}: ${formatCurrency(history?.customer.balanceCents ?? 0)}`} />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('cash.date_time')}</TableCell>
                <TableCell align="center">{t('sale.quantity')}</TableCell>
                <TableCell align="right">{t('sale.total')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(history?.sales ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.timestamp).toLocaleString(locale)}</TableCell>
                  <TableCell align="center">{s.items.reduce((n, i) => n + i.quantity, 0)}</TableCell>
                  <TableCell align="right">{formatCurrency(s.totalCents)}</TableCell>
                </TableRow>
              ))}
              {(history?.sales.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">{t('customers.no_purchases')}</Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setHistory(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
