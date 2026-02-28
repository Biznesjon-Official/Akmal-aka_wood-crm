import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, InputNumber, DatePicker, Input, message, Card, Typography, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  convertCurrency, getConversions, deleteConversion,
  createTopUp, getTopUps, deleteTopUp,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';

const { Text, Title } = Typography;

export default function Transfers() {
  const queryClient = useQueryClient();
  const [convertOpen, setConvertOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [convertForm] = Form.useForm();
  const [topUpForm] = Form.useForm();

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ['conversions'],
    queryFn: getConversions,
  });

  const { data: topUps = [] } = useQuery({
    queryKey: ['top-ups'],
    queryFn: getTopUps,
  });

  // Average rate from this month's conversions
  const thisMonth = dayjs().format('YYYY-MM');
  const monthConversions = conversions.filter(c => dayjs(c.date).format('YYYY-MM') === thisMonth);
  const currentRate = monthConversions.length
    ? monthConversions.reduce((s, c) => s + c.amountRUB, 0) / monthConversions.reduce((s, c) => s + c.amountUSD, 0)
    : 0;

  const convertMutation = useMutation({
    mutationFn: convertCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      message.success('Konversiya saqlandi');
      setConvertOpen(false);
      convertForm.resetFields();
    },
    onError: () => message.error('Konversiya xatolik'),
  });

  const deleteConvMutation = useMutation({
    mutationFn: deleteConversion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success("O'chirildi");
    },
  });

  const topUpMutation = useMutation({
    mutationFn: createTopUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-ups'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      message.success('Hisob to\'ldirildi');
      setTopUpOpen(false);
      topUpForm.resetFields();
    },
    onError: () => message.error('Xatolik'),
  });

  const deleteTopUpMutation = useMutation({
    mutationFn: deleteTopUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-ups'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success("O'chirildi");
    },
  });

  const handleConvert = (values) => {
    const rubAmount = values.amountUSD * values.rate * (1 - (values.commissionPercent || 0) / 100);
    convertMutation.mutate({
      amountUSD: values.amountUSD,
      amountRUB: rubAmount,
      commissionPercent: values.commissionPercent || 0,
      date: values.date?.toISOString(),
      note: values.note,
    });
  };

  // Conversion columns
  const convColumns = [
    { title: 'Sana', dataIndex: 'date', key: 'date', render: formatDate },
    { title: 'USD bergan', dataIndex: 'amountUSD', key: 'amountUSD', render: (v) => <Text type="danger" strong>−{formatMoney(v, 'USD')}</Text> },
    { title: 'RUB olgan', dataIndex: 'amountRUB', key: 'amountRUB', render: (v) => <Text style={{ color: '#389e0d' }} strong>+{formatMoney(v, 'RUB')}</Text> },
    {
      title: 'Kurs', dataIndex: 'effectiveRate', key: 'effectiveRate',
      render: (v) => <Text strong>1 USD = {v?.toFixed(2)} RUB</Text>,
    },
    {
      title: 'Komissiya', dataIndex: 'commissionPercent', key: 'commissionPercent',
      render: (v) => v ? `${v}%` : '—',
    },
    { title: 'Izoh', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: '', key: 'actions',
      render: (_, r) => (
        <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteConvMutation.mutate(r._id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // Top-up columns
  const topUpColumns = [
    { title: 'Sana', dataIndex: 'date', key: 'date', render: formatDate },
    {
      title: 'Summa', dataIndex: 'amount', key: 'amount',
      render: (v, r) => <Text style={{ color: '#389e0d' }} strong>+{formatMoney(v, r.currency)}</Text>,
    },
    { title: 'Izoh', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '', key: 'actions',
      render: (_, r) => (
        <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteTopUpMutation.mutate(r._id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      {/* Monthly avg rate display */}
      {currentRate > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Text strong>Shu oylik o'rtacha kurs:</Text>
            <Text strong style={{ fontSize: 16, color: '#1677ff' }}>1 USD = {currentRate.toFixed(2)} RUB</Text>
            <Text type="secondary">({monthConversions.length} ta konversiya asosida)</Text>
          </Space>
        </Card>
      )}

      {/* Top-ups section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><WalletOutlined /> Hisobni to'ldirish</Title>
        <Button style={{ background: '#389e0d', color: '#fff' }} onClick={() => { topUpForm.resetFields(); setTopUpOpen(true); }}>
          + To'ldirish
        </Button>
      </div>

      {topUps.length > 0 && (
        <Table
          columns={topUpColumns}
          dataSource={topUps}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="small"
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Conversions section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Valyuta almashtirishlar</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { convertForm.resetFields(); setConvertOpen(true); }}>
          Yangi o'tkazish
        </Button>
      </div>

      <Table
        columns={convColumns}
        dataSource={conversions}
        rowKey="_id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      {/* Convert modal */}
      <Modal
        title="USD → RUB o'tkazish"
        open={convertOpen}
        onCancel={() => { setConvertOpen(false); convertForm.resetFields(); }}
        onOk={() => convertForm.submit()}
        confirmLoading={convertMutation.isPending}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        <Form form={convertForm} layout="vertical" onFinish={handleConvert} initialValues={{ commissionPercent: 0, date: dayjs() }}>
          <Form.Item name="amountUSD" label="Berilgan summa (USD)" rules={[{ required: true, message: 'USD summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="1000" />
          </Form.Item>
          <Form.Item name="rate" label="Kurs (1 USD = ? RUB)" rules={[{ required: true, message: 'Kursni kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder={currentRate || '9000'} />
          </Form.Item>
          <Form.Item name="commissionPercent" label="Komissiya (%)">
            <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="0" />
          </Form.Item>
          <Form.Item name="date" label="Sana">
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input placeholder="Izoh" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {() => {
              const usd = convertForm.getFieldValue('amountUSD') || 0;
              const rate = convertForm.getFieldValue('rate') || 0;
              const comm = convertForm.getFieldValue('commissionPercent') || 0;
              if (!usd || !rate) return null;
              const rub = usd * rate * (1 - comm / 100);
              return (
                <Card size="small" style={{ background: '#f6ffed' }}>
                  <div>Olinadigan summa: <Text strong style={{ color: '#389e0d', fontSize: 16 }}>+{formatMoney(rub, 'RUB')}</Text></div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">Effektiv kurs: </Text>
                    <Text strong>1 USD = {(rub / usd).toFixed(2)} RUB</Text>
                  </div>
                </Card>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Top-up modal */}
      <Modal
        title="Hisobni to'ldirish"
        open={topUpOpen}
        onCancel={() => { setTopUpOpen(false); topUpForm.resetFields(); }}
        onOk={() => topUpForm.submit()}
        confirmLoading={topUpMutation.isPending}
        okText="To'ldirish"
        cancelText="Bekor qilish"
      >
        <Form form={topUpForm} layout="vertical" onFinish={(values) => {
          topUpMutation.mutate({
            amount: values.amount,
            currency: 'USD',
            description: values.description || 'Hisobni to\'ldirish',
            date: values.date?.toISOString(),
          });
        }} initialValues={{ date: dayjs() }}>
          <Form.Item name="amount" label="Summa (USD)" rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="5000" />
          </Form.Item>
          <Form.Item name="date" label="Sana">
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label="Izoh">
            <Input placeholder="Hisobni to'ldirish" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
