import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SalePage from './pages/SalePage';
import CatalogPage from './pages/CatalogPage';
import CashPage from './pages/CashPage';
import ReportsPage from './pages/ReportsPage';

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
          <Route path="caja" element={<CashPage />} />
          {/* Reportes: solo admin y gerente */}
          <Route element={<ProtectedRoute roles={['admin', 'gerente']} />}>
            <Route path="reportes" element={<ReportsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/venta" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
