import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select,
  message, Card, Typography, Tag, Space, Popconfirm, Segmented, Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined,
  CheckCircleOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getDeliveries, createDelivery, updateDelivery, deleteDelivery, markDelivered } from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import '../styles/cards.css';

const { Text } = Typography;

const statusOptions = [
  { label: 'Barchasi', value: '' },
  { label: "Yo'lda", value: "yo'lda" },
  { label: 'Yetkazildi', value: 'yetkazildi' },
];

export default function Deliveries() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [viewMode, setViewMode] = useState('card');
  const [statusFilter, setStatusFilter] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
  };

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries', statusFilter],
    queryFn: () => getDeliveries(statusFilter ? { status: statusFilter } : {}),
  });

  const createMut = useMutation({
    mutationFn: createDelivery,
    onSuccess: () => { invalidate(); message.success('Yaratildi'); closeModal(); },
    onError: () => message.error('Xatolik'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateDelivery(id, data),
    onSuccess: () => { invalidate(); message.success('Saqlandi'); closeModal(); },
    onError: () => message.error('Xatolik'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDelivery,
    onSuccess: () => { invalidate(); message.success("O'chirildi"); },
  });

  const deliverMut = useMutation({
    mutationFn: markDelivered,
    onSuccess: () => { invalidate(); message.success('Yetkazildi deb belgilandi'); },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ sentDate: dayjs(), expenses: [{}], incomeCurrency: 'USD' });
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      sentDate: record.sentDate ? dayjs(record.sentDate) : null,
      deliveredDate: record.deliveredDate ? dayjs(record.deliveredDate) : null,
      expenses: record.expenses?.length ? record.expenses : [{}],
    });
    setModalOpen(true);
  };

  const handleSubmit = (values) => {
    const data = {
      ...values,
      sentDate: values.sentDate?.toISOString(),
      deliveredDate: values.deliveredDate?.toISOString(),
    };
    if (editing) {
      updateMut.mutate({ id: editing._id, data });
    } else {
      createMut.mutate(data);
    }
  };

  // Summary
  const totalExpenses = deliveries.reduce((s, d) => s + (d.totalExpensesUSD || 0), 0);
  const totalIncome = deliveries.reduce((s, d) => s + (d.incomeUSD || 0), 0);
  const totalProfit = totalIncome - totalExpenses;

  const columns = [
    { title: 'Vagon', dataIndex: 'wagonCode', key: 'wagonCode', render: (v) => <Text strong>{v}</Text> },
    {
      title: 'Marshrut', key: 'route',
      render: (_, r) => `${r.origin || '—'} → ${r.destination || '—'}`,
    },
    { title: 'Mijoz', dataIndex: 'customer', key: 'customer' },
    { title: 'Jo\'natilgan', dataIndex: 'sentDate', key: 'sentDate', render: formatDate },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={v === 'yetkazildi' ? 'green' : 'orange'}>{v === 'yetkazildi' ? 'Yetkazildi' : "Yo'lda"}</Tag>,
    },
    {
      title: 'Xarajat', key: 'expenses',
      render: (_, r) => formatMoney(r.totalExpensesUSD, 'USD'),
    },
    {
      title: 'Daromad', key: 'income',
      render: (_, r) => <Text style={{ color: '#389e0d' }}>{formatMoney(r.incomeUSD, 'USD')}</Text>,
    },
    {
      title: 'Foyda', key: 'profit',
      render: (_, r) => <Text strong style={{ color: r.profit >= 0 ? '#389e0d' : '#ff4d4f' }}>{formatMoney(r.profit, 'USD')}</Text>,
    },
    {
      title: '', key: 'actions', width: 120,
      render: (_, r) => (
        <Space>
          {r.status !== 'yetkazildi' && (
            <Popconfirm title="Yetkazildi deb belgilaymi?" onConfirm={() => deliverMut.mutate(r._id)}>
              <Button size="small" type="text" style={{ color: '#52c41a' }} icon={<CheckCircleOutlined />} />
            </Popconfirm>
          )}
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(r._id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderCard = (d) => (
    <Col xs={24} sm={12} lg={8} xl={6} key={d._id}>
      <Card className={`delivery-card ${d.status === 'yetkazildi' ? 'yetkazildi' : 'yolda'}`}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text strong style={{ fontSize: 16, fontFamily: 'monospace' }}>{d.wagonCode}</Text>
            <Tag color={d.status === 'yetkazildi' ? 'green' : 'orange'}>
              {d.status === 'yetkazildi' ? 'Yetkazildi' : "Yo'lda"}
            </Tag>
          </div>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
            {d.origin || '—'} → {d.destination || '—'}
          </div>
          {d.customer && <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{d.customer}</div>}
          <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            {formatDate(d.sentDate)}
            {d.deliveredDate && ` → ${formatDate(d.deliveredDate)}`}
          </div>
        </div>
        <div style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #f8f9fe 0%, #f0f5ff 100%)', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>Xarajat</div>
            <div style={{ fontWeight: 700 }}>{formatMoney(d.totalExpensesUSD, 'USD')}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>Daromad</div>
            <div style={{ fontWeight: 700, color: '#389e0d' }}>{formatMoney(d.incomeUSD, 'USD')}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>Foyda</div>
            <div style={{ fontWeight: 700, color: d.profit >= 0 ? '#389e0d' : '#ff4d4f' }}>{formatMoney(d.profit, 'USD')}</div>
          </div>
        </div>
        <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {d.status !== 'yetkazildi' && (
            <Popconfirm title="Yetkazildi deb belgilaymi?" onConfirm={() => deliverMut.mutate(d._id)}>
              <Button size="small" type="text" style={{ color: '#52c41a' }} icon={<CheckCircleOutlined />} />
            </Popconfirm>
          )}
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(d)} />
          <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(d._id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </Card>
    </Col>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Segmented options={[{ label: 'Kartalar', value: 'card' }, { label: 'Jadval', value: 'table' }]} value={viewMode} onChange={setViewMode} />
          <Segmented options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yangi yetkazma</Button>
      </div>

      {/* Summary */}
      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Jami xarajat</span>
            <span className="summary-stat-value">{formatMoney(totalExpenses, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Jami daromad</span>
            <span className="summary-stat-value" style={{ color: '#389e0d' }}>{formatMoney(totalIncome, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Jami foyda</span>
            <span className={`summary-stat-value ${totalProfit >= 0 ? 'highlight' : ''}`} style={totalProfit < 0 ? { color: '#ff4d4f' } : {}}>
              {formatMoney(totalProfit, 'USD')}
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Soni</span>
            <span className="summary-stat-value">{deliveries.length}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'table' ? (
        <Table columns={columns} dataSource={deliveries} rowKey="_id" loading={isLoading} pagination={{ pageSize: 20 }} />
      ) : (
        <Row gutter={[16, 16]}>
          {deliveries.map(renderCard)}
        </Row>
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={editing ? 'Yetkazmani tahrirlash' : 'Yangi yetkazma'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okText="Saqlash"
        cancelText="Bekor qilish"
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="wagonCode" label="Vagon kodi" rules={[{ required: true, message: 'Vagon kodini kiriting' }]}>
                <Input placeholder="V-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customer" label="Mijoz">
                <Input placeholder="Mijoz nomi" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="origin" label="Qayerdan">
                <Input placeholder="Rossiya" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="destination" label="Qayerga">
                <Input placeholder="Toshkent" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sentDate" label="Jo'natilgan sana">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select options={[{ label: "Yo'lda", value: "yo'lda" }, { label: 'Yetkazildi', value: 'yetkazildi' }]} />
              </Form.Item>
            </Col>
          </Row>

          <Text strong>Xarajatlar</Text>
          <Form.List name="expenses">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Row gutter={8} key={key} align="middle">
                    <Col span={9}>
                      <Form.Item {...rest} name={[name, 'description']} rules={[{ required: true, message: 'Tavsif' }]} style={{ marginBottom: 8 }}>
                        <Input placeholder="Tavsif" />
                      </Form.Item>
                    </Col>
                    <Col span={7}>
                      <Form.Item {...rest} name={[name, 'amount']} rules={[{ required: true, message: 'Summa' }]} style={{ marginBottom: 8 }}>
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="Summa" />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item {...rest} name={[name, 'currency']} initialValue="USD" style={{ marginBottom: 8 }}>
                        <Select options={[{ label: 'USD', value: 'USD' }, { label: 'RUB', value: 'RUB' }]} />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} style={{ marginBottom: 8 }} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginBottom: 12 }}>
                  Xarajat qo'shish
                </Button>
              </>
            )}
          </Form.List>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="income" label="Daromad">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="incomeCurrency" label="Daromad valyutasi">
                <Select options={[{ label: 'USD', value: 'USD' }, { label: 'RUB', value: 'RUB' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
