import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import {
  closeCashSession,
  getActiveCashSession,
  getClosedSessions,
  summarizeSession,
  type SessionSummary,
} from '../db/cash';
import { getAllSales } from '../db/sales';
import type { CashSession, Sale } from '../db/db';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../auth/AuthContext';
import { canCloseShift } from '../auth/permissions';
import CloseShiftDialog from '../components/CloseShiftDialog';
import SessionDetailDialog from '../components/SessionDetailDialog';

export default function CashPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const locale = i18n.language === 'en' ? 'en-US' : 'es-MX';

  const [active, setActive] = useState<CashSession | null>(null);
  const [closed, setClosed] = useState<CashSession[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [closeOpen, setCloseOpen] = useState(false);
  const [detail, setDetail] = useState<CashSession | null>(null);

  const reload = useCallback(async () => {
    const [a, c, s] = await Promise.all([
      getActiveCashSession(),
      getClosedSessions(),
      getAllSales(),
    ]);
    setActive(a);
    setClosed(c);
    setSales(s);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeSummary: SessionSummary | null = active
    ? summarizeSession(active, sales)
    : null;

  const canClose = canCloseShift(user?.role);

  const handleConfirmClose = async (finalCashCents: number) => {
    if (!active) return;
    await closeCashSession(active.id, finalCashCents);
    setCloseOpen(false);
    await reload();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <SavingsIcon color="primary" fontSize="large" />
        <Typography variant="h4">{t('cash.title')}</Typography>
      </Box>

      {/* Turno activo */}
      {active && activeSummary ? (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
              <Chip color="success" label={t('cash.active_turn')} />
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                {t('cash.opened_at')}: {new Date(active.openedAt).toLocaleString(locale)}
              </Typography>
              {canClose ? (
                <Button variant="contained" color="error" onClick={() => setCloseOpen(true)}>
                  {t('cash.close_shift')}
                </Button>
              ) : (
                <Chip
                  icon={<LockIcon />}
                  variant="outlined"
                  label={t('cash.only_manager_can_close')}
                />
              )}
            </Box>
            <Stack
              direction="row"
              spacing={3}
              useFlexGap
              sx={{ flexWrap: 'wrap', mt: 1 }}
            >
              <Metric label={t('cash.sales_count')} value={String(activeSummary.salesCount)} />
              <Metric label={t('cash.total_sales')} value={formatCurrency(activeSummary.totalCents)} />
              <Metric label={t('cash.initial_cash')} value={formatCurrency(active.initialCashCents)} />
              <Metric
                label={t('cash.expected_cash')}
                value={formatCurrency(activeSummary.expectedCashCents)}
                highlight
              />
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('cash.no_active')}
        </Alert>
      )}

      {/* Historial de cortes */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {t('cash.history')}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('cash.opened_at')}</TableCell>
              <TableCell>{t('cash.closed_at')}</TableCell>
              <TableCell align="right">{t('cash.initial_cash')}</TableCell>
              <TableCell align="right">{t('cash.final_cash')}</TableCell>
              <TableCell align="right">{t('cash.expected_cash')}</TableCell>
              <TableCell align="right">{t('cash.difference')}</TableCell>
              <TableCell align="center">{t('sale.total')}</TableCell>
              <TableCell align="center">{t('catalog.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {closed.map((s) => {
              const sum = summarizeSession(s, sales);
              const diff = (s.finalCashCents ?? 0) - sum.expectedCashCents;
              const diffColor =
                diff === 0 ? 'success.main' : diff > 0 ? 'info.main' : 'error.main';
              return (
                <TableRow key={s.id} hover>
                  <TableCell>{new Date(s.openedAt).toLocaleString(locale)}</TableCell>
                  <TableCell>
                    {s.closedAt ? new Date(s.closedAt).toLocaleString(locale) : '—'}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(s.initialCashCents)}</TableCell>
                  <TableCell align="right">{formatCurrency(s.finalCashCents ?? 0)}</TableCell>
                  <TableCell align="right">{formatCurrency(sum.expectedCashCents)}</TableCell>
                  <TableCell align="right" sx={{ color: diffColor, fontWeight: 600 }}>
                    {diff > 0 ? '+' : ''}
                    {formatCurrency(diff)}
                  </TableCell>
                  <TableCell align="center">{formatCurrency(sum.totalCents)}</TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setDetail(s)}
                    >
                      {t('cash.view_detail')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {closed.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t('cash.no_closed')}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <CloseShiftDialog
        open={closeOpen}
        session={active}
        summary={activeSummary}
        onCancel={() => setCloseOpen(false)}
        onConfirm={handleConfirmClose}
      />

      <SessionDetailDialog session={detail} sales={sales} onClose={() => setDetail(null)} />
    </Box>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        color={highlight ? 'primary' : 'text.primary'}
        sx={{ fontWeight: 700 }}
      >
        {value}
      </Typography>
    </Box>
  );
}
