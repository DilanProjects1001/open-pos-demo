import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface Props {
  titleKey: string;
  icon?: ReactNode;
}

export default function Placeholder({ titleKey, icon }: Props) {
  const { t } = useTranslation();
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        {icon}
        <Typography variant="h4">{t(titleKey)}</Typography>
      </Box>
      <Card sx={{ maxWidth: 640 }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: 3 }}>
          <ConstructionIcon color="secondary" sx={{ fontSize: 40 }} />
          <Box>
            <Chip
              label={t('common.coming_soon')}
              color="secondary"
              size="small"
              sx={{ mb: 1 }}
            />
            <Typography color="text.secondary">
              {t('common.placeholder_desc')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
