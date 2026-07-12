import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import PaymentsIcon from '@mui/icons-material/Payments';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SavingsIcon from '@mui/icons-material/Savings';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTranslation } from 'react-i18next';
import { getAllSales } from '../db/sales';
import { getClosedSessions, summarizeSession } from '../db/cash';
import type { CashSession, Sale } from '../db/db';
import { salesPerDay, topProducts, methodTotals } from '../db/reports';
import { formatCurrency } from '../utils/format';

export default function ReportsPage() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [sales, setSales] = useState<Sale[]>([]);
  const [lastClosed, setLastClosed] = useState<CashSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const [s, closed] = await Promise.all([getAllSales(), getClosedSessions()]);
      setSales(s);
      setLastClosed(closed[0] ?? null);
      setLoaded(true);
    })();
  }, []);

  const perDay = useMemo(() => salesPerDay(sales), [sales]);
  const top = useMemo(() => topProducts(sales), [sales]);
  const totals = useMemo(() => methodTotals(sales), [sales]);
  const lastSummary = useMemo(
    () => (lastClosed ? summarizeSession(lastClosed, sales) : null),
    [lastClosed, sales],
  );

  const money = (v: number) => formatCurrency(Math.round(v * 100));

  if (loaded && sales.length === 0) {
    return (
      <Box>
        <Header />
        <Alert severity="info">{t('reports.no_data')}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Header />

      {/* Tarjetas de resumen */}
      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        <SummaryCard
          icon={<ReceiptLongIcon color="primary" />}
          label={t('reports.total_sales')}
          value={formatCurrency(totals.totalCents)}
          hint={t('reports.sales_count', { count: totals.count })}
        />
        <SummaryCard
          icon={<PaymentsIcon sx={{ color: 'success.main' }} />}
          label={t('payment.cash')}
          value={formatCurrency(totals.cashCents)}
        />
        <SummaryCard
          icon={<CreditCardIcon sx={{ color: 'info.main' }} />}
          label={t('payment.card')}
          value={formatCurrency(totals.cardCents)}
        />
        <SummaryCard
          icon={<AccountBalanceIcon sx={{ color: 'secondary.main' }} />}
          label={t('payment.transfer')}
          value={formatCurrency(totals.transferCents)}
        />
      </Grid>

      <Grid container spacing={2.5}>
        {/* Ventas por día */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t('reports.sales_per_day')}
              </Typography>
              <BarChart
                height={300}
                xAxis={[{ data: perDay.map((d) => d.label), scaleType: 'band' }]}
                series={[
                  {
                    data: perDay.map((d) => d.totalCents / 100),
                    label: t('reports.sold'),
                    color: theme.palette.primary.main,
                    valueFormatter: (v) => (v == null ? '' : money(v)),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Resumen del último corte */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <SavingsIcon color="primary" />
                <Typography variant="h6">{t('reports.cash_summary')}</Typography>
              </Box>
              {lastSummary && lastClosed ? (
                <Box>
                  <Row label={t('reports.last_cut')} value="" />
                  <Row label={t('cash.sales_count')} value={String(lastSummary.salesCount)} />
                  <Row label={t('cash.total_sales')} value={formatCurrency(lastSummary.totalCents)} />
                  <Row label={t('payment.cash')} value={formatCurrency(lastSummary.cashCents)} />
                  <Row label={t('payment.card')} value={formatCurrency(lastSummary.cardCents)} />
                  <Row label={t('payment.transfer')} value={formatCurrency(lastSummary.transferCents)} />
                  <Row
                    label={t('cash.expected_cash')}
                    value={formatCurrency(lastSummary.expectedCashCents)}
                    bold
                  />
                </Box>
              ) : (
                <Alert severity="info">{t('reports.no_cuts')}</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top productos */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t('reports.top_products')}
              </Typography>
              {top.length > 0 ? (
                <BarChart
                  height={300}
                  layout="horizontal"
                  yAxis={[{ data: top.map((p) => p.name), scaleType: 'band', width: 110 }]}
                  series={[
                    {
                      data: top.map((p) => p.quantity),
                      label: t('reports.units'),
                      color: theme.palette.secondary.main,
                    },
                  ]}
                />
              ) : (
                <Alert severity="info">{t('reports.no_data')}</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top productos: detalle en dinero */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                {t('reports.top_by_amount')}
              </Typography>
              {top.map((p, i) => (
                <Row
                  key={p.name}
                  label={`${i + 1}. ${p.name}`}
                  value={formatCurrency(p.totalCents)}
                />
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function Header() {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <BarChartIcon color="primary" fontSize="large" />
      <Typography variant="h4">{t('reports.title')}</Typography>
    </Box>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {icon}
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }} color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400 }}>
        {value}
      </Typography>
    </Box>
  );
}
