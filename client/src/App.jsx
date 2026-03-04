import { lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import PinLock from './components/PinLock';
import { getDashboardStats } from './api';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Wagons = lazy(() => import('./pages/Wagons'));
const WagonDetail = lazy(() => import('./pages/Wagons/WagonDetail'));
const Warehouse = lazy(() => import('./pages/Warehouse'));
const Sales = lazy(() => import('./pages/Sales'));
const Customers = lazy(() => import('./pages/Customers'));
const Debts = lazy(() => import('./pages/Debts'));
const Cash = lazy(() => import('./pages/Cash'));
const Transfers = lazy(() => import('./pages/Transfers'));
const Deliveries = lazy(() => import('./pages/Deliveries'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Expenses = lazy(() => import('./pages/Expenses'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Prefetch dashboard data immediately
queryClient.prefetchQuery({
  queryKey: ['dashboard'],
  queryFn: getDashboardStats,
});

const theme = {
  cssVar: true,
  hashed: false,
  token: {
    fontSize: 15,
    fontSizeSM: 13,
    fontSizeLG: 17,
    fontSizeXL: 20,
    fontSizeHeading1: 32,
    fontSizeHeading2: 26,
    fontSizeHeading3: 22,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
  },
};

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('auth'));

  if (!authed) return <PinLock onUnlock={() => setAuthed(true)} />;

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <CartProvider>
        <ConfigProvider theme={theme}>
          <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wagons" element={<Wagons />} />
              <Route path="/wagons/:id" element={<WagonDetail />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/cash" element={<Cash />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/deliveries" element={<Deliveries />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
          </BrowserRouter>
        </ConfigProvider>
      </CartProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
