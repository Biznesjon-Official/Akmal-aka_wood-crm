import { useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Drawer, Tag, Row, Col, Card, Segmented, Typography, Descriptions } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined, BarsOutlined, PhoneOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerSales, getPayments } from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import '../styles/cards.css';

const { Text } = Typography;

const Customers = () => {
  const [viewMode, setViewMode] = useState('table');
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const { data: customerSales, isLoading: salesLoading } = useQuery({
    queryKey: ['customer-sales', selectedCustomer?._id],
    queryFn: () => getCustomerSales(selectedCustomer._id),
    enabled: !!selectedCustomer?._id,
  });

  const { data: customerPayments } = useQuery({
    queryKey: ['customer-payments', selectedCustomer?._id],
    queryFn: () => getPayments({ customer: selectedCustomer._id }),
    enabled: !!selectedCustomer?._id,
  });

  // Group payments by sale._id
  const paymentsBySale = {};
  (customerPayments || []).forEach((p) => {
    const saleId = p.sale?._id || p.sale;
    if (!saleId) return;
    if (!paymentsBySale[saleId]) paymentsBySale[saleId] = [];
    paymentsBySale[saleId].push(p);
  });

  // Summary stats
  const totalSaleAmount = (customerSales || []).reduce((s, sale) => s + (sale.totalAmount || 0), 0);
  const totalPaid = (customerSales || []).reduce((s, sale) => {
    const extraPaid = (paymentsBySale[sale._id] || []).reduce((ps, p) => ps + (p.amount || 0), 0);
    return s + (sale.paidAmount || 0) + extraPaid;
  }, 0);
  const totalDebt = totalSaleAmount - totalPaid;

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      message.success('Mijoz qo\'shildi');
      closeModal();
    },
    onError: () => message.error('Xatolik yuz berdi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      message.success('Mijoz yangilandi');
      closeModal();
    },
    onError: () => message.error('Xatolik yuz berdi'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      message.success('Mijoz o\'chirildi');
    },
    onError: () => message.error('Xatolik yuz berdi'),
  });

  const openCreate = () => {
    setEditingCustomer(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingCustomer(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer._id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openDrawer = (record) => {
    setSelectedCustomer(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedCustomer(null);
  };

  const columns = [
    { title: 'Ism', dataIndex: 'name', key: 'name' },
    { title: 'Telefon', dataIndex: 'phone', key: 'phone' },
    { title: 'Izoh', dataIndex: 'note', key: 'note', ellipsis: true },
    { title: 'Sana', dataIndex: 'createdAt', key: 'createdAt', render: (val) => formatDate(val) },
    {
      title: 'Amallar',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => openDrawer(record)} />
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Mijozni o'chirishni tasdiqlaysizmi?"
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Ha" cancelText="Yo'q"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Expandable: items (wood) + payments per sale
  const expandedRowRender = (sale) => {
    const payments = paymentsBySale[sale._id] || [];
    const paymentRows = [];
    if (sale.paidAmount > 0) {
      paymentRows.push({ _id: 'initial', date: sale.date || sale.createdAt, amount: sale.paidAmount, note: 'Dastlabki to\'lov' });
    }
    payments.forEach((p) => paymentRows.push({ _id: p._id, date: p.date, amount: p.amount, note: p.note || '' }));

    const items = sale.items || [];
    return (
      <div style={{ padding: '0 24px 8px' }}>
        {/* Wood items */}
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#555' }}>Yog'ochlar:</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>Vagon</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>O'lcham</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>Soni</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>m³/dona</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>Jami m³</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>Narx/dona</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>Summa</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const bundle = item.wagon?.woodBundles?.[item.bundleIndex];
              const size = bundle ? `${bundle.thickness}×${bundle.width}mm × ${bundle.length}m` : '—';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px 8px' }}><Text strong>{item.wagon?.wagonCode || '—'}</Text></td>
                  <td style={{ padding: '4px 8px' }}>{size}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.quantity} dona</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.m3PerPiece?.toFixed(4)} m³</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.totalM3?.toFixed(4)} m³</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{formatMoney(item.pricePerPiece)}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}><Text strong>{formatMoney(item.totalAmount)}</Text></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Payments */}
        {paymentRows.length > 0 && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#555' }}>To'lovlar:</div>
            <Table
              rowKey="_id"
              dataSource={paymentRows}
              size="small"
              pagination={false}
              columns={[
                { title: 'Sana', dataIndex: 'date', key: 'date', render: (v) => formatDate(v) },
                { title: 'Summa', dataIndex: 'amount', key: 'amount', render: (v) => formatMoney(v) },
                { title: 'Izoh', dataIndex: 'note', key: 'note' },
              ]}
            />
          </>
        )}
      </div>
    );
  };

  const salesColumns = [
    { title: 'Sana', dataIndex: 'date', key: 'date', width: 100, render: (v, r) => formatDate(v || r.createdAt) },
    { title: 'Jami summa', dataIndex: 'totalAmount', key: 'totalAmount', render: (v) => formatMoney(v) },
    {
      title: 'To\'langan',
      key: 'paid',
      render: (_, sale) => {
        const extra = (paymentsBySale[sale._id] || []).reduce((s, p) => s + (p.amount || 0), 0);
        return formatMoney((sale.paidAmount || 0) + extra);
      },
    },
    {
      title: 'Qarz',
      key: 'debt',
      render: (_, sale) => {
        const extra = (paymentsBySale[sale._id] || []).reduce((s, p) => s + (p.amount || 0), 0);
        const debt = (sale.totalAmount || 0) - (sale.paidAmount || 0) - extra;
        return debt > 0
          ? <Text type="danger">{formatMoney(debt)}</Text>
          : <Tag color="green">To'liq</Tag>;
      },
    },
  ];

  const renderCustomerCards = () => (
    <Row gutter={[16, 16]}>
      {(customers || []).map((c) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={c._id}>
          <Card className="grid-card customer-card">
            <div className="grid-card-title">{c.name}</div>
            {c.phone && (
              <div style={{ marginBottom: 4 }}>
                <PhoneOutlined style={{ color: '#999', marginRight: 6 }} />
                <Text type="secondary">{c.phone}</Text>
              </div>
            )}
            {c.note && <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{c.note}</Text>}
            <div className="grid-card-footer">
              <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(c.createdAt)}</Text>
              <Space size="small">
                <Button size="small" icon={<EyeOutlined />} onClick={() => openDrawer(c)} />
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(c)} />
                <Popconfirm title="O'chirishni tasdiqlaysizmi?"
                  onConfirm={() => deleteMutation.mutate(c._id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <h2 style={{ margin: 0 }}>Mijozlar</h2>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'card', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <BarsOutlined /> },
            ]} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Mijoz qo'shish
        </Button>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Jami mijozlar</span>
            <span className="summary-stat-value highlight">{(customers || []).length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Telefon bor</span>
            <span className="summary-stat-value">{(customers || []).filter(c => c.phone).length}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'card' ? renderCustomerCards() : (
        <Table rowKey="_id" columns={columns} dataSource={customers} loading={isLoading} />
      )}

      {/* Create / Edit Modal */}
      <Modal
        title={editingCustomer ? 'Mijozni tahrirlash' : 'Mijoz qo\'shish'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="Saqlash" cancelText="Bekor qilish"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Ism" rules={[{ required: true, message: 'Ismni kiriting' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefon"><Input /></Form.Item>
          <Form.Item name="note" label="Izoh"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      {/* Customer Details Drawer */}
      <Drawer
        title={selectedCustomer?.name}
        open={drawerOpen}
        onClose={closeDrawer}
        size="large"
        width={720}
      >
        {selectedCustomer && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Telefon">{selectedCustomer.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Qo'shilgan">{formatDate(selectedCustomer.createdAt)}</Descriptions.Item>
              {selectedCustomer.note && (
                <Descriptions.Item label="Izoh" span={2}>{selectedCustomer.note}</Descriptions.Item>
              )}
            </Descriptions>

            {/* Transaction summary */}
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Jami sotuv</Text>
                  <div><Text strong>{formatMoney(totalSaleAmount)}</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>To'langan</Text>
                  <div><Text strong style={{ color: '#52c41a' }}>{formatMoney(totalPaid)}</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Qolgan qarz</Text>
                  <div>
                    <Text strong style={{ color: totalDebt > 0 ? '#ff4d4f' : '#52c41a' }}>
                      {totalDebt > 0 ? formatMoney(totalDebt) : 'Qarz yo\'q'}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>

            <h3 style={{ marginBottom: 8 }}>
              Savdo tarixi
              {customerSales && (
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
                  ({customerSales.length} ta sotuv)
                </Text>
              )}
            </h3>
            <Table
              rowKey="_id"
              columns={salesColumns}
              dataSource={customerSales}
              loading={salesLoading}
              size="small"
              pagination={false}
              expandable={{ expandedRowRender }}
              locale={{ emptyText: 'Sotuv yo\'q' }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default Customers;
