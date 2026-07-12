import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ImageIcon from '@mui/icons-material/Image';
import { useTranslation } from 'react-i18next';
import {
  addProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from '../db/products';
import type { Product } from '../db/db';
import { formatCurrency, parseCurrencyToCents } from '../utils/format';

interface FormState {
  code: string;
  name: string;
  category: string;
  price: string; // en moneda (texto), se convierte a centavos al guardar
  stock: string;
  image: string;
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  category: '',
  price: '',
  stock: '',
  image: '',
};

export default function CatalogPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const reload = async () => setProducts(await getAllProducts());

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  }, [products, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      category: p.category,
      price: (p.price / 100).toFixed(2),
      stock: String(p.stock),
      image: p.image ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category.trim() || t('catalog.uncategorized'),
      price: parseCurrencyToCents(form.price),
      stock: Number.parseInt(form.stock, 10) || 0,
      image: form.image.trim() || undefined,
    };
    if (editing?.id != null) {
      await updateProduct({ ...payload, id: editing.id });
    } else {
      await addProduct(payload);
    }
    setDialogOpen(false);
    await reload();
  };

  const confirmDelete = async () => {
    if (deleteTarget?.id != null) {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    }
  };

  const setField = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Inventory2Icon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('catalog.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t('catalog.add')}
        </Button>
      </Box>

      <TextField
        placeholder={t('catalog.search_placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2, maxWidth: 420 }}
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>{t('catalog.code')}</TableCell>
              <TableCell>{t('catalog.name')}</TableCell>
              <TableCell>{t('catalog.category')}</TableCell>
              <TableCell align="right">{t('catalog.price')}</TableCell>
              <TableCell align="right">{t('catalog.stock')}</TableCell>
              <TableCell align="right">{t('catalog.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ width: 56 }}>
                  <Avatar src={p.image} variant="rounded" sx={{ bgcolor: 'action.hover' }}>
                    <ImageIcon fontSize="small" color="disabled" />
                  </Avatar>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{p.code}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <Chip label={p.category} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right">{formatCurrency(p.price)}</TableCell>
                <TableCell align="right">
                  <Chip
                    label={p.stock}
                    size="small"
                    color={p.stock <= 5 ? 'warning' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t('catalog.edit')}>
                    <IconButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('catalog.delete')}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {t('catalog.empty')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {t('catalog.total_count', { count: filtered.length })}
      </Typography>

      {/* Diálogo crear / editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editing ? t('catalog.edit_product') : t('catalog.add_product')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('catalog.code')}
                value={form.code}
                onChange={setField('code')}
                required
                fullWidth
              />
              <TextField
                label={t('catalog.name')}
                value={form.name}
                onChange={setField('name')}
                required
                fullWidth
              />
              <TextField
                label={t('catalog.category')}
                value={form.category}
                onChange={setField('category')}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('catalog.price_currency')}
                  value={form.price}
                  onChange={setField('price')}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    },
                  }}
                />
                <TextField
                  label={t('catalog.stock')}
                  value={form.stock}
                  onChange={setField('stock')}
                  type="number"
                  fullWidth
                />
              </Stack>
              <TextField
                label={t('catalog.image_url')}
                value={form.image}
                onChange={setField('image')}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {t('common.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirmación de borrado */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('catalog.delete_confirm_title')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('catalog.delete_confirm_desc', { name: deleteTarget?.name })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            {t('catalog.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
