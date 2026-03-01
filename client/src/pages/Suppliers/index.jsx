import { useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Card, Segmented, Row, Col, Typography, Drawer, Tag, Descriptions } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, BarsOutlined, PhoneOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierWagons } from '../../api';
import { formatDate, formatM3, statusLabels, statusColors } from '../../utils/format';
import '../styles/cards.css';

const { Text } = Typography;

const Suppliers = () => {
  const [viewMode, setViewMode] = useState('table');
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  });

  const { data: supplierWagons, isLoading: wagonsLoading } = useQuery({
    queryKey: ['supplier-wagons', selectedSupplier?._id],
    queryFn: () => getSupplierWagons(selectedSupplier._id),
    enabled: !!selectedSupplier?._id,
  });

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success('Rus qo\'shildi');
      closeModal();
    },
    onError: () => message.error('Xatolik yuz berdi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success('Rus yangilandi');
      closeModal();
    },
    onError: () => message.error('Xatolik yuz berdi'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success('Rus o\'chirildi');
    },
    onError: () => message.error('Xatolik yuz berdi'),
  });

  const openCreate = () => {
    setEditingSupplier(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingSupplier(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSupplier(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier._id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openDrawer = (record) => {
    setSelectedSupplier(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedSupplier(null);
  };

  // Helper: yog'och xaridi (RUB) summasi
  const getWoodCost = (wagon) => {
    const wood = (wagon.expenses || []).find(e => e.description === "Yog'och xaridi" && e.currency === 'RUB');
    return wood ? wood.amount : 0;
  };

  const wagonColumns = [
    {
      title: 'Kod',
      dataIndex: 'wagonCode',
      key: 'wagonCode',
      width: 110,
    },
    {
      title: 'Turi',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (t) => t === 'mashina' ? <Tag color="blue">Mashina</Tag> : <Tag color="green">Vagon</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
    },
    {
      title: 'Qayerdan',
      dataIndex: 'origin',
      key: 'origin',
      width: 100,
    },
    {
      title: 'Kelgan',
      dataIndex: 'arrivedDate',
      key: 'arrivedDate',
      width: 100,
      render: (v) => formatDate(v),
    },
    {
      title: 'Jami m³',
      dataIndex: 'totalM3',
      key: 'totalM3',
      width: 90,
      render: (v) => formatM3(v),
    },
    {
      title: "Yog'och (RUB)",
      key: 'woodCost',
      width: 120,
      render: (_, r) => {
        const amt = getWoodCost(r);
        return amt ? amt.toLocaleString('ru') + ' ₽' : '—';
      },
    },
  ];

  const columns = [
    { title: 'Ism', dataIndex: 'name', key: 'name' },
    { title: 'Telefon', dataIndex: 'phone', key: 'phone' },
    { title: 'Izoh', dataIndex: 'note', key: 'note', ellipsis: true },
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
            title="Rusni o'chirishni tasdiqlaysizmi?"
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

  const renderCards = () => (
    <Row gutter={[16, 16]}>
      {(suppliers || []).map((s) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={s._id}>
          <Card className="grid-card customer-card">
            <div className="grid-card-title">{s.name}</div>
            {s.phone && (
              <div style={{ marginBottom: 4 }}>
                <PhoneOutlined style={{ color: '#999', marginRight: 6 }} />
                <Text type="secondary">{s.phone}</Text>
              </div>
            )}
            {s.note && <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{s.note}</Text>}
            <div className="grid-card-footer">
              <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(s.createdAt)}</Text>
              <Space size="small">
                <Button size="small" icon={<EyeOutlined />} onClick={() => openDrawer(s)} />
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(s)} />
                <Popconfirm title="O'chirishni tasdiqlaysizmi?"
                  onConfirm={() => deleteMutation.mutate(s._id)}>
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
          <h2 style={{ margin: 0 }}>Ruslar</h2>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'card', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <BarsOutlined /> },
            ]} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Rus qo'shish
        </Button>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Jami ruslar</span>
            <span className="summary-stat-value highlight">{(suppliers || []).length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Telefon bor</span>
            <span className="summary-stat-value">{(suppliers || []).filter(s => s.phone).length}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'card' ? renderCards() : (
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={suppliers}
          loading={isLoading}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        title={editingSupplier ? 'Rusni tahrirlash' : 'Rus qo\'shish'}
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

      {/* Supplier Detail Drawer */}
      <Drawer
        title={selectedSupplier?.name}
        open={drawerOpen}
        onClose={closeDrawer}
        size="large"
        width={760}
      >
        {selectedSupplier && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Telefon">{selectedSupplier.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Qo'shilgan">{formatDate(selectedSupplier.createdAt)}</Descriptions.Item>
              {selectedSupplier.note && (
                <Descriptions.Item label="Izoh" span={2}>{selectedSupplier.note}</Descriptions.Item>
              )}
            </Descriptions>

            <h3 style={{ marginBottom: 12 }}>
              Vagonlar
              {supplierWagons && (
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
                  ({supplierWagons.length} ta)
                </Text>
              )}
            </h3>
            <Table
              rowKey="_id"
              columns={wagonColumns}
              dataSource={supplierWagons}
              loading={wagonsLoading}
              size="small"
              pagination={false}
              locale={{ emptyText: 'Vagon yo\'q' }}
              scroll={{ x: 700 }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default Suppliers;
