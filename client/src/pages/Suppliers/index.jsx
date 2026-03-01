import { useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Card, Segmented, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, BarsOutlined, PhoneOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../api';
import { formatDate } from '../../utils/format';
import '../styles/cards.css';

const { Text } = Typography;

const Suppliers = () => {
  const [viewMode, setViewMode] = useState('table');
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
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
    </div>
  );
};

export default Suppliers;
