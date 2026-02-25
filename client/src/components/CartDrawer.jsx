import { useState } from 'react';
import {
  Drawer, Badge, Button, Table, InputNumber,
  Typography, Popconfirm,
} from 'antd';
import { ShoppingCartOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatM3 } from '../utils/format';

const { Text } = Typography;

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, clearCart, cartCount } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const getKey = (item) => `${item.wagonId}-${item.bundleIndex}`;

  const handleGoToSales = () => {
    setOpen(false);
    navigate('/sales?fromCart=1');
  };

  const columns = [
    {
      title: 'Vagon',
      dataIndex: 'wagonCode',
      key: 'wagon',
      width: 100,
    },
    {
      title: "O'lcham",
      key: 'dimension',
      width: 140,
      render: (_, r) => `${r.thickness}×${r.width}×${r.length}`,
    },
    {
      title: 'Soni',
      key: 'quantity',
      width: 90,
      render: (_, r) => (
        <InputNumber size="small" min={1} max={r.maxQuantity} value={r.quantity}
          onChange={(v) => updateQuantity(r.wagonId, r.bundleIndex, v)} style={{ width: 70 }} />
      ),
    },
    {
      title: 'm³',
      key: 'm3',
      width: 90,
      render: (_, r) => formatM3(r.m3PerPiece * r.quantity),
    },
    {
      title: '',
      key: 'action',
      width: 40,
      render: (_, r) => (
        <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }}
          onClick={() => removeItem(r.wagonId, r.bundleIndex)} />
      ),
    },
  ];

  return (
    <>
      {/* Floating cart button */}
      <div style={{
        position: 'fixed', bottom: 32, right: 32, zIndex: 1000,
      }}>
        <Badge count={cartCount} offset={[-4, 4]}>
          <Button type="primary" shape="circle" size="large"
            icon={<ShoppingCartOutlined />}
            onClick={() => setOpen(true)}
            style={{ width: 56, height: 56, fontSize: 24, boxShadow: '0 4px 16px rgba(22,119,255,0.4)' }} />
        </Badge>
      </div>

      <Drawer
        title={`Savatcha (${cartCount})`}
        open={open}
        onClose={() => setOpen(false)}
        width={600}
        extra={
          items.length > 0 && (
            <Popconfirm title="Savatchani tozalash?" onConfirm={clearCart}>
              <Button danger size="small">Tozalash</Button>
            </Popconfirm>
          )
        }
      >
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <div style={{ marginTop: 12 }}><Text type="secondary">Savatcha bo'sh</Text></div>
          </div>
        ) : (
          <>
            <Table columns={columns} dataSource={items} rowKey={(r) => getKey(r)}
              pagination={false} size="small" scroll={{ x: 460 }} />

            <div style={{ marginTop: 24 }}>
              <Button type="primary" block size="large" onClick={handleGoToSales}
                style={{ height: 48, fontWeight: 600, fontSize: 16 }}>
                Sotuvga o'tish
              </Button>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
