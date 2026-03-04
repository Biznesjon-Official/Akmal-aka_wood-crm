import { useState, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Spin, Modal, Form, Input, message, Button } from 'antd';
import CartDrawer from './CartDrawer';
import {
  DashboardOutlined, CarOutlined, DatabaseOutlined, ShoppingCartOutlined,
  UserOutlined, FileTextOutlined, WalletOutlined, SwapOutlined, TruckOutlined,
  TeamOutlined, LockOutlined, LogoutOutlined, AccountBookOutlined, CodeOutlined,
} from '@ant-design/icons';
import { setupPin } from '../api';
import { useLanguage } from '../context/LanguageContext';

const { Sider, Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, switchLang } = useLanguage();

  const navItems = [
    { key: '/', icon: <DashboardOutlined />, label: t('dashboard') },
    { key: '/wagons', icon: <CarOutlined />, label: t('wagons') },
    { key: '/expenses', icon: <AccountBookOutlined />, label: t('expenses') || 'Xarajatlar' },
    { key: '/warehouse', icon: <DatabaseOutlined />, label: t('warehouse') },
    { key: '/sales', icon: <ShoppingCartOutlined />, label: t('sales') },
    { key: '/customers', icon: <UserOutlined />, label: t('customers') },
    { key: '/debts', icon: <FileTextOutlined />, label: t('debts') },
    { key: '/cash', icon: <WalletOutlined />, label: t('cash') },
    { key: '/deliveries', icon: <TruckOutlined />, label: t('deliveries') },
    { key: '/suppliers', icon: <TeamOutlined />, label: t('suppliers') },
    { key: '/coders', icon: <CodeOutlined />, label: 'Kodchilar' },
    { key: '/transfers', icon: <SwapOutlined />, label: t('transfers') },
    { key: '__pin', icon: <LockOutlined />, label: t('changePin') },
    { key: '__logout', icon: <LogoutOutlined />, label: t('logout') },
  ];

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
      if (newPin !== confirmPin) { message.error(t('pinMismatch')); return; }
      await setupPin(newPin, oldPin);
      message.success(t('pinChanged'));
      setPinModal(false);
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 32, margin: 16, color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: collapsed ? 14 : 16 }}>
          {collapsed ? 'YS' : t('appName')}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={handleMenu}
        />
        {/* Language toggle */}
        <div style={{ position: 'absolute', bottom: 56, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0' }}>
          <Button size="small"
            type={lang === 'uz' ? 'primary' : 'default'}
            onClick={() => switchLang('uz')}
            style={{ minWidth: 36 }}>UZ</Button>
          <Button size="small"
            type={lang === 'ru' ? 'primary' : 'default'}
            onClick={() => switchLang('ru')}
            style={{ minWidth: 36 }}>RU</Button>
        </div>
      </Sider>
      <Layout>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
      <CartDrawer />

      <Modal title={t('changePin')} open={pinModal} onOk={handlePinChange}
        onCancel={() => setPinModal(false)} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="oldPin" label={t('pinOld')} rules={[{ required: true, len: 4, message: t('pinDigits') }]}>
            <Input.Password maxLength={4} inputMode="numeric" placeholder="• • • •" />
          </Form.Item>
          <Form.Item name="newPin" label={t('pinNew')} rules={[{ required: true, len: 4, message: t('pinDigits') }]}>
            <Input.Password maxLength={4} inputMode="numeric" placeholder="• • • •" />
          </Form.Item>
          <Form.Item name="confirmPin" label={t('pinNewRepeat')} rules={[{ required: true, len: 4, message: t('pinDigits') }]}>
            <Input.Password maxLength={4} inputMode="numeric" placeholder="• • • •" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
