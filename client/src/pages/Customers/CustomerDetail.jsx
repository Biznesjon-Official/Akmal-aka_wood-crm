import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Descriptions, Table, Button, Tag, Modal, Form, Input, InputNumber,
  Select, DatePicker, Space, Typography, message, Popconfirm, Card, Row, Col, Tabs,
} from 'antd';
import { ArrowLeftOutlined, DollarOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCustomer, getCustomerSales, getPayments, createPayment, deletePayment,
  getDeliveries, getLentDebts, getCashTransactions,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

const { Text } = Typography;

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingSale, setPayingSale] = useState(null);
  const [payForm] = Form.useForm();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
  });

  const { data: customerSales, isLoading: salesLoading } = useQuery({
    queryKey: ['customer-sales', id],
    queryFn: () => getCustomerSales(id),
    enabled: !!id,
  });

  const { data: customerPayments } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: () => getPayments({ customer: id }),
    enabled: !!id,
  });

  const { data: customerDeliveries = [] } = useQuery({
    queryKey: ['customer-deliveries', id],
    queryFn: () => getDeliveries({ customer: id }),
    enabled: !!id,
  });

  const { data: customerLentDebts = [] } = useQuery({
    queryKey: ['customer-lent-debts', customer?.name],
    queryFn: () => getLentDebts({ debtor: customer.name }),
    enabled: !!customer?.name,
  });

  const { data: customerTransactions = [] } = useQuery({
    queryKey: ['customer-transactions', id],
    queryFn: () => getCashTransactions({ relatedPerson: id }),
    enabled: !!id,
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

  const payMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-sales', id] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debtors'] });
      message.success(t('paymentAdded'));
      setPayModalOpen(false);
      setPayingSale(null);
      payForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const deletePayMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-sales', id] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debtors'] });
      message.success(t('deleted'));
    },
    onError: () => message.error(t('error')),
  });

  const handlePaySale = (sale) => {
    setPayingSale(sale);
    payForm.setFieldsValue({ amount: null, currency: sale.currency || 'USD', date: dayjs(), note: '' });
    setPayModalOpen(true);
  };

  const handlePaySubmit = async () => {
    try {
      const values = await payForm.validateFields();
      payMutation.mutate({
        sale: payingSale._id,
        customer: payingSale.customer?._id || payingSale.customer || id,
        amount: values.amount,
        currency: values.currency,
        date: values.date?.toISOString(),
        note: values.note,
      });
    } catch { /* validation */ }
  };

  // Expandable: items (wood) + payments per sale
  const expandedRowRender = (sale) => {
    const payments = paymentsBySale[sale._id] || [];
    const paymentRows = [];
    if (sale.paidAmount > 0) {
      paymentRows.push({ _id: 'initial', date: sale.date || sale.createdAt, amount: sale.paidAmount, note: t('initialPayment') });
    }
    payments.forEach((p) => paymentRows.push({ _id: p._id, date: p.date, amount: p.amount, note: p.note || '' }));

    const items = sale.items || [];
    return (
      <div style={{ padding: '0 24px 8px' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#555' }}>{t('woods')}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>Vagon</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>{t('size')}</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>{t('count')}</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>{t('unitM3')}</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>Jami m³</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>{t('pricePerPiece')}</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>{t('amount')}</th>
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
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.quantity} {t('pieces')}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.m3PerPiece?.toFixed(4)} m³</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.totalM3?.toFixed(4)} m³</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>{formatMoney(item.pricePerPiece)}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}><Text strong>{formatMoney(item.totalAmount)}</Text></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {paymentRows.length > 0 && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#555' }}>{t('payments2')}</div>
            <Table
              rowKey="_id"
              dataSource={paymentRows}
              size="small"
              pagination={false}
              columns={[
                { title: t('date'), dataIndex: 'date', key: 'date', render: (v) => formatDate(v) },
                { title: t('amount'), dataIndex: 'amount', key: 'amount', render: (v) => formatMoney(v) },
                { title: t('note'), dataIndex: 'note', key: 'note' },
                {
                  title: '', key: 'del', width: 48,
                  render: (_, p) => p._id === 'initial' ? null : (
                    <Popconfirm title={t('deleteConfirm')} onConfirm={() => deletePayMutation.mutate(p._id)}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </>
        )}
      </div>
    );
  };

  const salesColumns = [
    { title: t('date'), dataIndex: 'date', key: 'date', width: 100, render: (v, r) => formatDate(v || r.createdAt) },
    { title: t('totalSaleAmount'), dataIndex: 'totalAmount', key: 'totalAmount', render: (v) => formatMoney(v) },
    {
      title: t('paid'),
      key: 'paid',
      render: (_, sale) => {
        const extra = (paymentsBySale[sale._id] || []).reduce((s, p) => s + (p.amount || 0), 0);
        return formatMoney((sale.paidAmount || 0) + extra);
      },
    },
    {
      title: t('debt'),
      key: 'debt',
      render: (_, sale) => {
        const extra = (paymentsBySale[sale._id] || []).reduce((s, p) => s + (p.amount || 0), 0);
        const debt = (sale.totalAmount || 0) - (sale.paidAmount || 0) - extra;
        return debt > 0
          ? <Text type="danger">{formatMoney(debt)}</Text>
          : <Tag color="green">{t('full')}</Tag>;
      },
    },
    {
      title: '',
      key: 'pay',
      width: 80,
      render: (_, sale) => {
        const extra = (paymentsBySale[sale._id] || []).reduce((s, p) => s + (p.amount || 0), 0);
        const debt = (sale.totalAmount || 0) - (sale.paidAmount || 0) - extra;
        if (debt <= 0) return null;
        return (
          <Button
            type="primary"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => handlePaySale({ ...sale, debt })}
          >
            {t('pay')}
          </Button>
        );
      },
    },
  ];

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}>Yuklanmoqda...</div>;
  if (!customer) return <div>Mijoz topilmadi</div>;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')}>Ortga</Button>
        <Text strong style={{ fontSize: 18 }}>{customer.name}</Text>
      </Space>

      <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
        <Descriptions.Item label={t('phone')}>{customer.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label={t('created')}>{formatDate(customer.createdAt)}</Descriptions.Item>
        {customer.note && (
          <Descriptions.Item label={t('note')} span={2}>{customer.note}</Descriptions.Item>
        )}
      </Descriptions>

      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('totalSaleAmount')}</Text>
            <div><Text strong>{formatMoney(totalSaleAmount)}</Text></div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('paid')}</Text>
            <div><Text strong style={{ color: '#52c41a' }}>{formatMoney(totalPaid)}</Text></div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('remainingDebt')}</Text>
            <div>
              <Text strong style={{ color: totalDebt > 0 ? '#ff4d4f' : '#52c41a' }}>
                {totalDebt > 0 ? formatMoney(totalDebt) : t('noDebt')}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="sales" items={[
        {
          key: 'sales',
          label: `${t('salesHistory')} (${(customerSales || []).length})`,
          children: (
            <Table
              rowKey="_id"
              columns={salesColumns}
              dataSource={customerSales}
              loading={salesLoading}
              size="small"
              pagination={false}
              expandable={{ expandedRowRender }}
              locale={{ emptyText: t('noSales') }}
            />
          ),
        },
        {
          key: 'deliveries',
          label: `Yetkazmalar (${customerDeliveries.length})`,
          children: (
            <Table
              rowKey="_id"
              dataSource={customerDeliveries}
              size="small"
              pagination={false}
              locale={{ emptyText: 'Yetkazmalar yo\'q' }}
              columns={[
                { title: 'Vagon', dataIndex: 'wagonCode', key: 'wagonCode' },
                { title: t('date'), dataIndex: 'sentDate', key: 'sentDate', render: formatDate },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={v === 'yakunlandi' ? 'green' : v === 'yetkazildi' ? 'blue' : 'orange'}>{v}</Tag> },
                { title: 'Qarz', key: 'debt', render: (_, r) => formatMoney(r.totalDebt, 'USD') },
                { title: "To'langan", key: 'paid', render: (_, r) => <Text style={{ color: '#52c41a' }}>{formatMoney(r.paidAmount, 'USD')}</Text> },
                { title: 'Qoldiq', key: 'remaining', render: (_, r) => r.remainingDebt > 0 ? <Text type="danger">{formatMoney(r.remainingDebt, 'USD')}</Text> : <Tag color="green">To'liq</Tag> },
              ]}
            />
          ),
        },
        {
          key: 'debts',
          label: `Qarzlar (${customerLentDebts.length})`,
          children: (
            <Table
              rowKey="_id"
              dataSource={customerLentDebts}
              size="small"
              pagination={false}
              locale={{ emptyText: 'Qarzlar yo\'q' }}
              columns={[
                { title: t('date'), dataIndex: 'date', key: 'date', render: formatDate },
                { title: t('amount'), dataIndex: 'amount', key: 'amount', render: (v, r) => formatMoney(v, r.currency) },
                { title: "To'langan", key: 'paid', render: (_, r) => formatMoney(r.paidAmount, r.currency) },
                { title: 'Qoldiq', key: 'remaining', render: (_, r) => r.remainingDebt > 0 ? <Text type="danger">{formatMoney(r.remainingDebt, r.currency)}</Text> : <Tag color="green">To'liq</Tag> },
                { title: t('note'), dataIndex: 'description', key: 'description', ellipsis: true },
              ]}
            />
          ),
        },
        {
          key: 'transactions',
          label: `Tranzaksiyalar (${customerTransactions.length})`,
          children: (
            <Table
              rowKey="_id"
              dataSource={customerTransactions}
              size="small"
              pagination={false}
              locale={{ emptyText: 'Tranzaksiyalar yo\'q' }}
              columns={[
                { title: t('date'), dataIndex: 'date', key: 'date', render: formatDate },
                { title: t('type'), dataIndex: 'type', key: 'type', render: (v) => <Tag color={v === 'kirim' ? 'green' : 'red'}>{v === 'kirim' ? 'Kirim' : 'Chiqim'}</Tag> },
                { title: t('amount'), dataIndex: 'amount', key: 'amount', render: (v, r) => (
                  <Text style={{ color: r.type === 'chiqim' ? '#cf1322' : '#389e0d', fontWeight: 500 }}>
                    {r.type === 'chiqim' ? '−' : '+'}{formatMoney(v, r.currency)}
                  </Text>
                )},
                { title: t('note'), dataIndex: 'description', key: 'description', ellipsis: true },
              ]}
            />
          ),
        },
      ]} />

      {/* Pay modal */}
      <Modal
        title={t('makePayment')}
        open={payModalOpen}
        onOk={handlePaySubmit}
        onCancel={() => { setPayModalOpen(false); setPayingSale(null); }}
        confirmLoading={payMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        {payingSale && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {t('debt')}: {formatMoney(payingSale.debt, payingSale.currency)}
            </Text>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={payingSale?.debt} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label={t('currency')} rules={[{ required: true }]}>
            <Select options={[{ value: 'USD', label: 'USD' }, { value: 'RUB', label: 'RUB' }]} />
          </Form.Item>
          <Form.Item name="date" label={t('date')} rules={[{ required: true, message: 'Sanani tanlang' }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
