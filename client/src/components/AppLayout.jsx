import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import CartDrawer from './CartDrawer';
import {
  DashboardOutlined,
  CarOutlined,
  DatabaseOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  FileTextOutlined,
  WalletOutlined,
  SwapOutlined,
  TruckOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/wagons', icon: <CarOutlined />, label: 'Vagonlar' },
  { key: '/warehouse', icon: <DatabaseOutlined />, label: 'Ombor' },
  { key: '/sales', icon: <ShoppingCartOutlined />, label: 'Sotuv' },
  { key: '/customers', icon: <UserOutlined />, label: 'Mijozlar' },
  { key: '/debts', icon: <FileTextOutlined />, label: 'Qarzdaftarcha' },
  { key: '/cash', icon: <WalletOutlined />, label: 'Kassa' },
  { key: '/deliveries', icon: <TruckOutlined />, label: 'Yetkazmalar' },
  { key: '/transfers', icon: <SwapOutlined />, label: "O'tkazish" }
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 32, margin: 16, color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: collapsed ? 14 : 16 }}>
          {collapsed ? 'YS' : "Yog'och Savdo"}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
      <CartDrawer />
    </Layout>
  );
}
