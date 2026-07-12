import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import type { Sale, PaymentMethod } from '../db/db';
import { formatCurrency } from '../utils/format';

interface Props {
  sale: Sale | null;
  operatorName?: string;
  onClose: () => void;
}

const methodKey: Record<PaymentMethod, string> = {
  cash: 'payment.cash',
  card: 'payment.card',
  transfer: 'payment.transfer',
};

/** Muestra el ticket de una venta terminada. Permite imprimir con window.print(). */
export default function TicketDialog({ sale, operatorName, onClose }: Props) {
  const { t, i18n } = useTranslation();
  if (!sale) return null;

  const date = new Date(sale.timestamp).toLocaleString(
    i18n.language === 'en' ? 'en-US' : 'es-MX',
  );

  return (
    <Dialog open={sale !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent>
        {/* Zona imprimible */}
        <Box id="ticket-print" sx={{ px: 1 }}>
          <Stack spacing={0.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
            <Typography variant="h6">OpenPOS</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('ticket.title')}
            </Typography>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('ticket.folio')}: {sale.id.slice(0, 8).toUpperCase()}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('ticket.date')}: {date}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('ticket.operator')}: {operatorName ?? sale.operatorId}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={0.75}>
            {sale.items.map((it) => (
              <Box
                key={it.productId}
                sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
              >
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {it.quantity} × {it.name}
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(it.subtotalCents)}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('sale.total')}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {formatCurrency(sale.totalCents)}
            </Typography>
          </Box>

          {sale.payments.map((p, idx) => (
            <Box
              key={`${p.method}-${idx}`}
              sx={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <Typography variant="body2" color="text.secondary">
                {t(methodKey[p.method])}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(p.amountCents)}
              </Typography>
            </Box>
          ))}

          {sale.changeCents > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t('payment.change')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrency(sale.changeCents)}
              </Typography>
            </Box>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            {t('ticket.thanks')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
          {t('ticket.print')}
        </Button>
        <Button variant="contained" onClick={onClose}>
          {t('ticket.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
