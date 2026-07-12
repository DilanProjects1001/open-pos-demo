import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import { useTranslation } from 'react-i18next';
import { getAllProducts } from '../db/products';
import { addSale } from '../db/sales';
import { createCashSession, getActiveCashSession } from '../db/cash';
import type { CashSession, Product, Sale, SaleItem, Payment } from '../db/db';
import { formatCurrency, parseCurrencyToCents } from '../utils/format';
import { useAuth } from '../auth/AuthContext';
import PaymentDialog from '../components/PaymentDialog';
import TicketDialog from '../components/TicketDialog';

interface CartLine {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

export default function SalePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Turno de caja
  const [session, setSession] = useState<CashSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [initialCash, setInitialCash] = useState('');

  useEffect(() => {
    void getAllProducts().then(setProducts);
    void getActiveCashSession().then((s) => {
      setSession(s);
      setSessionLoaded(true);
    });
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [products, query]);

  const totalCents = useMemo(
    () => cart.reduce((s, l) => s + l.priceCents * l.quantity, 0),
    [cart],
  );

  const addToCart = useCallback((p: Product) => {
    const id = String(p.id);
    setCart((prev) => {
      const found = prev.find((l) => l.productId === id);
      if (found) {
        return prev.map((l) =>
          l.productId === id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { productId: id, name: p.name, priceCents: p.price, quantity: 1 }];
    });
  }, []);

  const changeQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((l) => (l.productId === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );

  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.productId !== id));

  const handleOpenSession = async () => {
    const s = await createCashSession(user?.id ?? 'desconocido', parseCurrencyToCents(initialCash));
    setSession(s);
  };

  const handleComplete = async (payments: Payment[], changeCents: number) => {
    const items: SaleItem[] = cart.map((l) => ({
      productId: l.productId,
      name: l.name,
      priceCents: l.priceCents,
      quantity: l.quantity,
      subtotalCents: l.priceCents * l.quantity,
    }));
    const sale: Sale = {
      id: crypto.randomUUID(),
      items,
      totalCents,
      payments,
      changeCents,
      operatorId: user?.id ?? 'desconocido',
      timestamp: Date.now(),
    };
    await addSale(sale);
    setPayOpen(false);
    setCart([]);
    setLastSale(sale);
  };

  const needsSession = sessionLoaded && session === null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <PointOfSaleIcon color="primary" fontSize="large" />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('sale.title')}
        </Typography>
        {session && (
          <Typography variant="caption" color="text.secondary">
            {t('cash.session_open')} · {t('cash.initial')} {formatCurrency(session.initialCashCents)}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* Columna de búsqueda / productos */}
        <Card variant="outlined">
          <CardContent>
            <TextField
              placeholder={t('sale.search_placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
              disabled={needsSession}
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
            <List sx={{ mt: 1, maxHeight: 460, overflow: 'auto' }}>
              {results.map((p) => (
                <ListItemButton
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={needsSession}
                  sx={{ borderRadius: 2 }}
                >
                  <ListItemText
                    primary={p.name}
                    secondary={`${p.code} · ${p.category}`}
                  />
                  <Typography sx={{ fontWeight: 600, mr: 1 }}>
                    {formatCurrency(p.price)}
                  </Typography>
                  <AddCircleIcon color="primary" />
                </ListItemButton>
              ))}
              {results.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 2 }}>
                  {t('sale.no_results')}
                </Typography>
              )}
            </List>
          </CardContent>
        </Card>

        {/* Columna del carrito */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {t('sale.cart')}
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('sale.product')}</TableCell>
                    <TableCell align="right">{t('sale.price')}</TableCell>
                    <TableCell align="center">{t('sale.quantity')}</TableCell>
                    <TableCell align="right">{t('sale.subtotal')}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cart.map((l) => (
                    <TableRow key={l.productId}>
                      <TableCell>{l.name}</TableCell>
                      <TableCell align="right">{formatCurrency(l.priceCents)}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                          <IconButton size="small" onClick={() => changeQty(l.productId, -1)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Box sx={{ minWidth: 24, textAlign: 'center' }}>{l.quantity}</Box>
                          <IconButton size="small" onClick={() => changeQty(l.productId, 1)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(l.priceCents * l.quantity)}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => removeLine(l.productId)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cart.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">{t('sale.cart_empty')}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('sale.total')}</Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                {formatCurrency(totalCents)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={cart.length === 0 || needsSession}
              onClick={() => setPayOpen(true)}
            >
              {t('sale.checkout')}
            </Button>
          </CardContent>
        </Card>
      </Box>

      <PaymentDialog
        open={payOpen}
        totalCents={totalCents}
        onCancel={() => setPayOpen(false)}
        onComplete={handleComplete}
      />

      <TicketDialog
        sale={lastSale}
        operatorName={user?.name}
        onClose={() => setLastSale(null)}
      />

      {/* Apertura de turno de caja */}
      <Dialog open={needsSession} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PointOfSaleOutlinedIcon color="primary" />
            {t('cash.open_shift')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('cash.open_shift_desc')}
          </DialogContentText>
          <TextField
            label={t('cash.initial_cash')}
            value={initialCash}
            onChange={(e) => setInitialCash(e.target.value)}
            fullWidth
            autoFocus
            placeholder="0.00"
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={handleOpenSession}>
            {t('cash.open_shift_action')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
