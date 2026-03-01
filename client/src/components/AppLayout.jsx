import { useState, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Spin, Modal, Form, Input, message } from 'antd';
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
  TeamOutlined,
  LockOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { setupPin } from '../api';

const { Sider, Content } = Layout;

const navItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/wagons', icon: <CarOutlined />, label: 'Vagonlar' },
  { key: '/warehouse', icon: <DatabaseOutlined />, label: 'Ombor' },
  { key: '/sales', icon: <ShoppingCartOutlined />, label: 'Sotuv' },
  { key: '/customers', icon: <UserOutlined />, label: 'Mijozlar' },
  { key: '/debts', icon: <FileTextOutlined />, label: 'Qarzdaftarcha' },
  { key: '/cash', icon: <WalletOutlined />, label: 'Kassa' },
  { key: '/deliveries', icon: <TruckOutlined />, label: 'Yetkazmalar' },
  { key: '/suppliers', icon: <TeamOutlined />, label: 'Ruslar' },
  { key: '/transfers', icon: <SwapOutlined />, label: "O'tkazish" },
  { key: '__pin', icon: <LockOutlined />, label: 'PIN o\'zgartirish' },
  { key: '__logout', icon: <LogoutOutlined />, label: 'Chiqish' },
];

const { Sider: S, Content: C } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenu = ({ key }) => {
    if (key === '__logout') {
      sessionStorage.removeItem('auth');
      window.location.reload();
    } else if (key === '__pin') {
      form.resetFields();
      setPinModal(true);
    } else {
      navigate(key);
    }
  };

  const handlePinChange = async () => {
    try {
      const { oldPin, newPin, confirmPin } = await form.validateFields();
      if (newPin !== confirmPin) { message.error('Yangi PIN mos kelmadi'); return; }
      await setupPin(newPin, oldPin);
      message.success('PIN muvaffaqiyatli o\'zgartirildi');
      setPinModal(false);
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 32, margin: 16, color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: collapsed ? 14 : 16 }}>
          {collapsed ? 'YS' : "Yog'och Savdo"}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={handleMenu}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
      <CartDrawer />

      <Modal title="PIN o'zgartirish" open={pinModal} onOk={handlePinChange}
        onCancel={() => setPinModal(false)} okText="Saqlash" cancelText="Bekor">
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="oldPin" label="Eski PIN" rules={[{ required: true, len: 4, message: '4 ta raqam kiriting' }]}>
            <Input.Password maxLength={4} inputMode="numeric" placeholder="• • • •" />
          </Form.Item>
          <Form.Item name="newPin" label="Yangi PIN" rules={[{ required: true, len: 4, message: '4 ta raqam kiriting' }]}>
            <Input.Password maxLength={4} inputMode="numeric" placeholder="• • • •" />
          </Form.Item>
          <Form.Item name="confirmPin" label="Yangi PIN (takror)" rules={[{ required: true, len: 4, message: '4 ta raqam kiriting' }]}>
            <Input.Password maxLength={4} inputMode="numeric" placeholder="• • • •" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
