import { useEffect, useState, type FormEvent } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { getAllSuppliers, saveSupplier, deleteSupplier, newSupplier } from '../db/suppliers';
import type { Supplier } from '../db/db';

const EMPTY = { name: '', contact: '', products: '' };

export default function SuppliersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [delTarget, setDelTarget] = useState<Supplier | null>(null);

  const reload = async () => setRows(await getAllSuppliers());
  useEffect(() => { void reload(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialog(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s); setForm({ name: s.name, contact: s.contact, products: s.products }); setDialog(true);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (editing) await saveSupplier({ ...editing, ...form });
    else await saveSupplier(newSupplier(form));
    setDialog(false); await reload();
  };

  const field = (key: keyof typeof form, label: string, multiline = false) => (
    <TextField label={label} value={form[key]} fullWidth multiline={multiline} minRows={multiline ? 2 : undefined}
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <LocalShippingIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{t('suppliers.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('suppliers.add')}</Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('suppliers.name')}</TableCell>
              <TableCell>{t('suppliers.contact')}</TableCell>
              <TableCell>{t('suppliers.products')}</TableCell>
              <TableCell align="right">{t('catalog.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.contact}</TableCell>
                <TableCell>{s.products}</TableCell>
                <TableCell align="right">
                  <Tooltip title={t('catalog.edit')}>
                    <IconButton size="small" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('catalog.delete')}>
                    <IconButton size="small" color="error" onClick={() => setDelTarget(s)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{t('suppliers.empty')}</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={save}>
          <DialogTitle>{editing ? t('suppliers.edit') : t('suppliers.add')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {field('name', t('suppliers.name'))}
              {field('contact', t('suppliers.contact'))}
              {field('products', t('suppliers.products'), true)}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialog(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={!form.name.trim()}>{t('common.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={delTarget !== null} onClose={() => setDelTarget(null)}>
        <DialogTitle>{t('suppliers.delete_title')}</DialogTitle>
        <DialogContent><Typography>{t('suppliers.delete_desc', { name: delTarget?.name })}</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={async () => {
            if (delTarget) { await deleteSupplier(delTarget.id); setDelTarget(null); await reload(); }
          }}>{t('catalog.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
