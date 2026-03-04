import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Space, Row, Col, Card, Segmented, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined, BarsOutlined, PhoneOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPartners, createPartner, updatePartner, deletePartner } from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import '../styles/cards.css';

const { Text } = Typography;

const Partners = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('table');
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: getPartners,
  });

  const createMutation = useMutation({
    mutationFn: createPartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      message.success('Sherik qo\'shildi');
      closeModal();
    },
    onError: () => message.error('Xatolik'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePartner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      message.success('Yangilandi');
      closeModal();
    },
    onError: () => message.error('Xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      message.success('O\'chirildi');
    },
    onError: () => message.error('Xatolik'),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      updateMutation.mutate({ id: editing._id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    { title: 'Ism', dataIndex: 'name', key: 'name' },
    { title: 'Telefon', dataIndex: 'phone', key: 'phone' },
    { title: 'Ulush %', dataIndex: 'profitPercent', key: 'profitPercent', render: (v) => `${v || 0}%` },
    { title: 'Investitsiya', dataIndex: 'investedAmount', key: 'investedAmount', render: (v) => formatMoney(v || 0) },
    { title: 'Sana', dataIndex: 'createdAt', key: 'createdAt', render: formatDate },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/partners/${record._id}`); }} />
          <Button icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(record); }} />
          <Popconfirm
            title="O'chirishni tasdiqlaysizmi?"
            onConfirm={(e) => { e?.stopPropagation(); deleteMutation.mutate(record._id); }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Ha" cancelText="Yo'q"
          >
            <Button danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Segmented value={viewMode} onChange={setViewMode}
          options={[
            { value: 'card', icon: <AppstoreOutlined /> },
            { value: 'table', icon: <BarsOutlined /> },
          ]} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Sherik qo'shish
        </Button>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Jami sheriklar</span>
            <span className="summary-stat-value highlight">{partners.length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Jami investitsiya</span>
            <span className="summary-stat-value">{formatMoney(partners.reduce((s, p) => s + (p.investedAmount || 0), 0))}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'card' ? (
        <Row gutter={[16, 16]}>
          {partners.map((p) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={p._id}>
              <Card className="grid-card" onClick={() => navigate(`/partners/${p._id}`)} style={{ cursor: 'pointer' }}>
                <div className="grid-card-title">{p.name}</div>
                {p.phone && (
                  <div style={{ marginBottom: 4 }}>
                    <PhoneOutlined style={{ color: '#999', marginRight: 6 }} />
                    <Text type="secondary">{p.phone}</Text>
                  </div>
                )}
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary">Ulush: {p.profitPercent || 0}%</Text>
                </div>
                <div>
                  <Text strong>Investitsiya: {formatMoney(p.investedAmount || 0)}</Text>
                </div>
                <div className="grid-card-footer">
                  <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(p.createdAt)}</Text>
                  <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(p); }} />
                    <Popconfirm title="O'chirishni tasdiqlaysizmi?"
                      onConfirm={(e) => { e?.stopPropagation(); deleteMutation.mutate(p._id); }}
                      onCancel={(e) => e?.stopPropagation()}>
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={partners}
          loading={isLoading}
          onRow={(record) => ({ onClick: () => navigate(`/partners/${record._id}`), style: { cursor: 'pointer' } })}
        />
      )}

      <Modal
        title={editing ? 'Sherikni tahrirlash' : 'Sherik qo\'shish'}
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
          <Form.Item name="profitPercent" label="Foyda ulushi (%)">
            <InputNumber style={{ width: '100%' }} min={0} max={100} />
          </Form.Item>
          <Form.Item name="note" label="Izoh"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Partners;
