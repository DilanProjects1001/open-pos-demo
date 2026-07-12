import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SalePage from './pages/SalePage';
import CatalogPage from './pages/CatalogPage';
import CashPage from './pages/CashPage';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchasesPage from './pages/PurchasesPage';
import LayawaysPage from './pages/LayawaysPage';
import LoyaltyPage from './pages/LoyaltyPage';
import ReturnsPage from './pages/ReturnsPage';

export default function App() {
  return (
    <Routes>
      {/* Login fuera del layout protegido */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas: requieren sesión */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/venta" replace />} />
          <Route path="venta" element={<SalePage />} />
          <Route path="catalogo" element={<CatalogPage />} />
          <Route path="clientes" element={<CustomersPage />} />
          <Route path="proveedores" element={<SuppliersPage />} />
          <Route path="compras" element={<PurchasesPage />} />
          <Route path="apartados" element={<LayawaysPage />} />
          <Route path="fidelizacion" element={<LoyaltyPage />} />
          <Route path="caja" element={<CashPage />} />
          {/* Reportes y Devoluciones: solo admin y gerente */}
          <Route element={<ProtectedRoute roles={['admin', 'gerente']} />}>
            <Route path="reportes" element={<ReportsPage />} />
            <Route path="devoluciones" element={<ReturnsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/venta" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
