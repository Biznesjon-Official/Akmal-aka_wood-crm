import { useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Drawer, List, Tag, Row, Col, Card, Segmented, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined, BarsOutlined, PhoneOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerSales, getCustomerDebts } from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import '../styles/cards.css';

const { Text } = Typography;

const Customers = () => {
  const [viewMode, setViewMode] = useState('card');
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Queries
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const { data: customerSales, isLoading: salesLoading } = useQuery({
    queryKey: ['customer-sales', selectedCustomer?._id],
    queryFn: () => getCustomerSales(selectedCustomer._id),
    enabled: !!selectedCustomer?._id,
  });

  const { data: customerDebts, isLoading: debtsLoading } = useQuery({
    queryKey: ['customer-debts', selectedCustomer?._id],
    queryFn: () => getCustomerDebts(selectedCustomer._id),
    enabled: !!selectedCustomer?._id,
  });

  // Mutations
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

  // Handlers
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

  // Table columns
  const columns = [
    {
      title: 'Ism',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Izoh',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    {
      title: 'Sana',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => formatDate(val),
    },
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
            okText="Ha"
            cancelText="Yo'q"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Sales mini-table columns
  const salesColumns = [
    {
      title: 'Sana',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => formatDate(val),
    },
    {
      title: 'Umumiy summa',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val) => formatMoney(val),
    },
    {
      title: 'To\'langan',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (val) => formatMoney(val),
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

      {viewMode === 'card' ? renderCustomerCards() : (
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={customers}
          loading={isLoading}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        title={editingCustomer ? 'Mijozni tahrirlash' : 'Mijoz qo\'shish'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Ism"
            rules={[{ required: true, message: 'Ismni kiriting' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Customer Details Drawer */}
      <Drawer
        title={selectedCustomer?.name}
        open={drawerOpen}
        onClose={closeDrawer}
        size="large"
      >
        {selectedCustomer && (
          <>
            <p><strong>Telefon:</strong> {selectedCustomer.phone || '—'}</p>
            <p><strong>Izoh:</strong> {selectedCustomer.note || '—'}</p>
            <p><strong>Ro'yxatdan o'tgan:</strong> {formatDate(selectedCustomer.createdAt)}</p>

            <h3 style={{ marginTop: 24 }}>Sotuvlar</h3>
            <Table
              rowKey="_id"
              columns={salesColumns}
              dataSource={customerSales}
              loading={salesLoading}
              size="small"
              pagination={false}
            />

            <h3 style={{ marginTop: 24 }}>Qarzlar</h3>
            <List
              loading={debtsLoading}
              dataSource={customerDebts}
              locale={{ emptyText: 'Qarz yo\'q' }}
              renderItem={(item) => (
                <List.Item>
                  <span>{formatDate(item.createdAt)}</span>
                  <Tag color="red">{formatMoney(item.debtAmount)}</Tag>
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default Customers;
