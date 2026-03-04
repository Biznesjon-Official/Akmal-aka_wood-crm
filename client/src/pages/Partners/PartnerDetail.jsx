import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Descriptions, Table, Button, Tag, Modal, Form, Input, InputNumber,
  Select, DatePicker, Space, Typography, message, Popconfirm, Card, Row, Col,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPartner, addPartnerInvestment, removePartnerInvestment } from '../../api';
import { formatDate, formatMoney } from '../../utils/format';

const { Text } = Typography;

export default function PartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => getPartner(id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['partner', id] });

  const addMutation = useMutation({
    mutationFn: (data) => addPartnerInvestment(id, data),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      message.success('Investitsiya qo\'shildi');
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Xatolik'),
  });

  const removeMutation = useMutation({
    mutationFn: (investmentId) => removePartnerInvestment(id, investmentId),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      message.success('O\'chirildi');
    },
    onError: () => message.error('Xatolik'),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    addMutation.mutate({
      ...values,
      date: values.date?.toISOString(),
    });
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}>Yuklanmoqda...</div>;
  if (!partner) return <div>Sherik topilmadi</div>;

  const deposits = (partner.investments || []).filter(i => i.type === 'deposit').reduce((s, i) => s + i.amount, 0);
  const withdrawals = (partner.investments || []).filter(i => i.type === 'withdrawal').reduce((s, i) => s + i.amount, 0);

  const investmentColumns = [
    { title: 'Sana', dataIndex: 'date', key: 'date', render: formatDate },
    {
      title: 'Turi', dataIndex: 'type', key: 'type',
      render: (v) => <Tag color={v === 'deposit' ? 'green' : 'red'}>{v === 'deposit' ? 'Kiritish' : 'Yechish'}</Tag>,
    },
    {
      title: 'Summa', dataIndex: 'amount', key: 'amount',
      render: (v, r) => (
        <Text style={{ color: r.type === 'deposit' ? '#389e0d' : '#cf1322', fontWeight: 500 }}>
          {r.type === 'withdrawal' ? '−' : '+'}{formatMoney(v, r.currency)}
        </Text>
      ),
    },
    { title: 'Valyuta', dataIndex: 'currency', key: 'currency' },
    { title: 'Izoh', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: '', key: 'del', width: 48,
      render: (_, record) => (
        <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => removeMutation.mutate(record._id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/partners')}>Ortga</Button>
        <Text strong style={{ fontSize: 18 }}>{partner.name}</Text>
      </Space>

      <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Telefon">{partner.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Foyda ulushi">{partner.profitPercent || 0}%</Descriptions.Item>
        <Descriptions.Item label="Yaratilgan">{formatDate(partner.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="Investitsiya">{formatMoney(partner.investedAmount || 0)}</Descriptions.Item>
        {partner.note && (
          <Descriptions.Item label="Izoh" span={2}>{partner.note}</Descriptions.Item>
        )}
      </Descriptions>

      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Kiritilgan</Text>
            <div><Text strong style={{ color: '#52c41a' }}>{formatMoney(deposits)}</Text></div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Yechildi</Text>
            <div><Text strong style={{ color: '#ff4d4f' }}>{formatMoney(withdrawals)}</Text></div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Balans</Text>
            <div><Text strong>{formatMoney(partner.investedAmount || 0)}</Text></div>
          </Col>
        </Row>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text strong>Investitsiyalar ({(partner.investments || []).length})</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ currency: 'USD', date: dayjs(), type: 'deposit' }); setModalOpen(true); }}>
          Investitsiya qo'shish
        </Button>
      </div>

      <Table
        rowKey="_id"
        columns={investmentColumns}
        dataSource={[...(partner.investments || [])].sort((a, b) => new Date(b.date) - new Date(a.date))}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Investitsiyalar yo\'q' }}
      />

      <Modal
        title="Investitsiya qo'shish"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={addMutation.isPending}
        okText="Saqlash" cancelText="Bekor qilish"
      >
        <Form form={form} layout="vertical" initialValues={{ currency: 'USD', date: dayjs(), type: 'deposit' }}>
          <Form.Item name="type" label="Turi" rules={[{ required: true }]}>
            <Select options={[
              { value: 'deposit', label: 'Kiritish (deposit)' },
              { value: 'withdrawal', label: 'Yechish (withdrawal)' },
            ]} />
          </Form.Item>
          <Form.Item name="amount" label="Summa" rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label="Valyuta" rules={[{ required: true }]}>
            <Select options={[{ value: 'USD', label: 'USD' }, { value: 'RUB', label: 'RUB' }]} />
          </Form.Item>
          <Form.Item name="date" label="Sana" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input placeholder="Izoh" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
