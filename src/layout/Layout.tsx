import { useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Tooltip,
  Divider,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import TranslateIcon from '@mui/icons-material/Translate';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SavingsIcon from '@mui/icons-material/Savings';
import BarChartIcon from '@mui/icons-material/BarChart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LogoutIcon from '@mui/icons-material/Logout';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useColorMode } from '../theme/ColorModeContext';
import { useAuth, type Role } from '../auth/AuthContext';
import OperatorSwitchDialog from '../auth/OperatorSwitchDialog';

const DRAWER_WIDTH = 248;

// Módulos del menú. `roles` (opcional) limita la visibilidad por rol.
interface NavItem {
  key: string;
  path: string;
  icon: React.ReactNode;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { key: 'sale', path: '/venta', icon: <PointOfSaleIcon /> },
  { key: 'catalog', path: '/catalogo', icon: <Inventory2Icon /> },
  { key: 'cash', path: '/caja', icon: <SavingsIcon /> },
  { key: 'reports', path: '/reportes', icon: <BarChartIcon /> },
];

const roleColor: Record<Role, 'error' | 'warning' | 'info'> = {
  admin: 'error',
  gerente: 'warning',
  cajero: 'info',
};

export default function Layout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const { mode, toggle } = useColorMode();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleLang = () => {
    const next = i18n.language === 'es-MX' ? 'en' : 'es-MX';
    void i18n.changeLanguage(next);
    localStorage.setItem('openpos_lang', next);
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  const roleLabel = (role: Role) =>
    t(`login.role_${role === 'admin' ? 'admin' : role === 'gerente' ? 'manager' : 'cashier'}`);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1.2 }}>
        <StorefrontIcon color="primary" />
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1 }}>
            {t('app.name')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('app.tagline')}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.2, py: 1, flexGrow: 1 }}>
        {visibleItems.map((item) => {
          const selected = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.key}
              selected={selected}
              onClick={() => {
                navigate(item.path);
                if (!isDesktop) setMobileOpen(false);
              }}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={t(`nav.${item.key}`)} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {t('app.name')} · demo v0.2
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(6px)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            OpenPOS
          </Typography>

          <Tooltip title={t('common.language')}>
            <IconButton onClick={toggleLang} aria-label="language">
              <TranslateIcon />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={mode === 'light' ? t('common.theme_dark') : t('common.theme_light')}
          >
            <IconButton onClick={toggle} aria-label="toggle theme" color="primary">
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          {user && (
            <>
              <Chip
                avatar={<Avatar>{user.name.charAt(0)}</Avatar>}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {roleLabel(user.role)}
                    </Typography>
                  </Box>
                }
                color={roleColor[user.role]}
                variant="outlined"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ ml: 1.5, height: 'auto', py: 0.5, cursor: 'pointer' }}
              />
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    setSwitchOpen(true);
                  }}
                >
                  <ListItemIcon>
                    <SwapHorizIcon fontSize="small" />
                  </ListItemIcon>
                  {t('auth.switch_operator')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    logout();
                    navigate('/login');
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  {t('auth.logout')}
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: 1, borderColor: 'divider' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <OperatorSwitchDialog open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </Box>
  );
}
