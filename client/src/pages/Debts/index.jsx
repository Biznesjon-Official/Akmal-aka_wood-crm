import React, { useMemo, useState } from 'react';
import {
  Table, Button, Modal, Form, InputNumber, Select, DatePicker,
  Input, message, Tag, Typography, Space, Spin, Card, Tabs, Popconfirm,
  Row, Col, Progress, Timeline, Empty, Segmented,
} from 'antd';
import { PlusOutlined, DeleteOutlined, DollarOutlined, EyeOutlined, CheckCircleOutlined, AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getSales, getPayments, createPayment, deletePayment,
  getMyDebts, createMyDebt, addMyDebtPayment, deleteMyDebt,
  getLentDebts, createLentDebt, addLentDebtPayment, deleteLentDebt,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

const { Text, Title } = Typography;

// ─── Mijozlar qarzlari (existing) ───
function CustomerDebts() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [astatkaForm] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [astatkaOpen, setAstatkaOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [viewMode, setViewMode] = useState('card');

  const { data: salesRaw, isLoading: salesLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: getSales,
  });

  const { data: paymentsRaw, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
  });

  const paymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      message.success(t('paymentAdded'));
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setModalOpen(false);
      setSelectedSale(null);
      form.resetFields();
    },
    onError: () => {
      message.error(t('paymentError'));
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success(t('deleted'));
    },
    onError: () => message.error(t('error')),
  });

  const astatkaMutation = useMutation({
    mutationFn: createLentDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lent-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success(t('debtAdded'));
      setAstatkaOpen(false);
      astatkaForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const { customerDebts, totalDebtUSD, totalDebtRUB } = useMemo(() => {
    const sales = Array.isArray(salesRaw) ? salesRaw : salesRaw?.data || [];
    const payments = Array.isArray(paymentsRaw) ? paymentsRaw : paymentsRaw?.data || [];

    const paymentsBySale = {};
    payments.forEach((p) => {
      const saleId = p.sale?._id || p.sale;
      if (!paymentsBySale[saleId]) paymentsBySale[saleId] = [];
      paymentsBySale[saleId].push(p);
    });

    const byCustomer = {};
    let totalUSD = 0;
    let totalRUB = 0;

    sales.forEach((sale) => {
      const salePayments = paymentsBySale[sale._id] || [];
      const paymentsSum = salePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const paid = (sale.paidAmount || 0) + paymentsSum;
      const debt = (sale.totalAmount || 0) - paid;

      if (debt <= 0) return;

      const customerId = sale.customer?._id || sale.customer;
      const customerName = sale.customer?.name || '—';

      if (!byCustomer[customerId]) {
        byCustomer[customerId] = {
          customerId,
          customerName,
          totalDebt: 0,
          currency: sale.currency || 'USD',
          sales: [],
        };
      }

      byCustomer[customerId].totalDebt += debt;
      byCustomer[customerId].sales.push({
        ...sale,
        paymentsSum,
        totalPaid: paid,
        debt,
      });

      if (sale.currency === 'RUB') totalRUB += debt;
      else totalUSD += debt;
    });

    return {
      customerDebts: Object.values(byCustomer).sort((a, b) => b.totalDebt - a.totalDebt),
      totalDebtUSD: totalUSD,
      totalDebtRUB: totalRUB,
    };
  }, [salesRaw, paymentsRaw]);

  const handlePayment = (sale) => {
    setSelectedSale(sale);
    form.setFieldsValue({
      amount: null,
      currency: sale.currency || 'USD',
      date: dayjs(),
      note: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await paymentMutation.mutateAsync({
        sale: selectedSale._id,
        customer: selectedSale.customer?._id || selectedSale.customer,
        amount: values.amount,
        currency: values.currency,
        date: values.date?.toISOString(),
        note: values.note,
      });
    } catch {
      // validation error
    }
  };

  const saleColumns = [
    { title: t('date'), dataIndex: 'date', key: 'date', render: (val) => formatDate(val) },
    { title: t('total'), dataIndex: 'totalAmount', key: 'totalAmount', render: (val, rec) => formatMoney(val, rec.currency) },
    { title: t('paid'), dataIndex: 'totalPaid', key: 'totalPaid', render: (val, rec) => formatMoney(val, rec.currency) },
    { title: t('debt'), dataIndex: 'debt', key: 'debt', render: (val, rec) => <Text type="danger" strong>{formatMoney(val, rec.currency)}</Text> },
    {
      title: '', key: 'actions',
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => handlePayment(record)}>{t('payBtn')}</Button>
      ),
    },
  ];

  const columns = [
    { title: t('customer'), dataIndex: 'customerName', key: 'customerName', render: (name) => <Text strong>{name}</Text> },
    { title: 'Sotuvlar', key: 'salesCount', render: (_, rec) => rec.sales.length },
    {
      title: t('totalDebtUsd'), dataIndex: 'totalDebt', key: 'totalDebt',
      render: (val, rec) => <Text type="danger" strong style={{ fontSize: 15 }}>{formatMoney(val, rec.currency)}</Text>,
      sorter: (a, b) => a.totalDebt - b.totalDebt,
      defaultSortOrder: 'descend',
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_, rec) => (
        <Button type="primary" size="small" icon={<DollarOutlined />}
          onClick={(e) => { e.stopPropagation(); handlePayment(rec.sales[0]); }}>
          {t('pay')}
        </Button>
      ),
    },
  ];

  if (salesLoading || paymentsLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Segmented value={viewMode} onChange={setViewMode}
          options={[
            { value: 'card', icon: <AppstoreOutlined /> },
            { value: 'table', icon: <BarsOutlined /> },
          ]} />
        <Button icon={<PlusOutlined />} onClick={() => { astatkaForm.resetFields(); setAstatkaOpen(true); }}>
          Astatka qo'shish
        </Button>
      </div>
      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">{t('debtorCustomers')}</span>
            <span className="summary-stat-value">{customerDebts.length}</span>
          </div>
          {totalDebtUSD > 0 && (
            <div className="summary-stat">
              <span className="summary-stat-label">{t('totalDebtUsd')}</span>
              <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>{formatMoney(totalDebtUSD, 'USD')}</span>
            </div>
          )}
          {totalDebtRUB > 0 && (
            <div className="summary-stat">
              <span className="summary-stat-label">{t('totalDebtRub')}</span>
              <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>{formatMoney(totalDebtRUB, 'RUB')}</span>
            </div>
          )}
        </div>
      </Card>

      {viewMode === 'card' ? (
        <Row gutter={[16, 16]}>
          {customerDebts.map((cd) => (
            <Col xs={24} sm={12} lg={8} key={cd.customerId}>
              <Card size="small" style={{ borderLeft: '4px solid #ff4d4f', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 16 }}>{cd.customerName}</Text>
                  <Text type="danger" strong style={{ fontSize: 16 }}>{formatMoney(cd.totalDebt, cd.currency)}</Text>
                </div>
                <Text type="secondary">{cd.sales.length} ta sotuv</Text>
                <div style={{ marginTop: 8 }}>
                  {cd.sales.slice(0, 3).map((s) => (
                    <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(s.date)} — {formatMoney(s.debt, s.currency)}</Text>
                      <Button type="primary" size="small" onClick={() => handlePayment(s)}>{t('pay')}</Button>
                    </div>
                  ))}
                  {cd.sales.length > 3 && <Text type="secondary" style={{ fontSize: 11 }}>+{cd.sales.length - 3} ta yana...</Text>}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          columns={columns}
          dataSource={customerDebts}
          rowKey="customerId"
          pagination={{ pageSize: 20 }}
          expandable={{
            expandedRowRender: (record) => {
              const payments = Array.isArray(paymentsRaw) ? paymentsRaw : paymentsRaw?.data || [];
              const payColumns = [
                { title: t('date'), dataIndex: 'date', key: 'date', render: formatDate },
                { title: t('amount'), key: 'amount', render: (_, p) => <Text style={{ color: '#389e0d' }} strong>{formatMoney(p.amount, p.currency)}</Text> },
                { title: t('note'), dataIndex: 'note', key: 'note', ellipsis: true },
                {
                  title: '', key: 'del', width: 48,
                  render: (_, p) => (
                    <Popconfirm title={t('deleteConfirm')} onConfirm={() => deletePaymentMutation.mutate(p._id)}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ),
                },
              ];
              return record.sales.map((sale) => {
                const salePays = payments.filter(p => (p.sale?._id || p.sale) === sale._id);
                return (
                  <div key={sale._id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text type="secondary">{formatDate(sale.date)} — {t('total')}: {formatMoney(sale.totalAmount, sale.currency)}, {t('debt')}: <Text type="danger">{formatMoney(sale.debt, sale.currency)}</Text></Text>
                      <Button type="primary" size="small" onClick={() => handlePayment(sale)}>{t('payBtn')}</Button>
                    </div>
                    {salePays.length > 0 && (
                      <Table columns={payColumns} dataSource={salePays} rowKey="_id" pagination={false} size="small" style={{ marginLeft: 16 }} />
                    )}
                  </div>
                );
              });
            },
          }}
        />
      )}

      {/* Astatka modal */}
      <Modal
        title="Astatka qo'shish"
        open={astatkaOpen}
        onOk={() => astatkaForm.submit()}
        onCancel={() => { setAstatkaOpen(false); astatkaForm.resetFields(); }}
        confirmLoading={astatkaMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={astatkaForm} layout="vertical"
          initialValues={{ currency: 'USD', date: dayjs() }}
          onFinish={(values) => astatkaMutation.mutate({ ...values, date: values.date?.toISOString() })}>
          <Form.Item name="debtor" label={t('customer')} rules={[{ required: true, message: 'Ismni kiriting' }]}>
            <Input placeholder="Mijoz ismi" />
          </Form.Item>
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label={t('currency')}>
            <Select options={[{ value: 'USD', label: 'USD' }, { value: 'RUB', label: 'RUB' }]} />
          </Form.Item>
          <Form.Item name="date" label={t('date')}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('makePayment')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setSelectedSale(null); }}
        confirmLoading={paymentMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        {selectedSale && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedSale.customer?.name} — {t('debt')}: {formatMoney(selectedSale.debt, selectedSale.currency)}
            </Text>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={selectedSale?.debt} placeholder={t('amount')} />
          </Form.Item>
          <Form.Item name="currency" label={t('currency')} rules={[{ required: true }]}>
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="RUB">RUB</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label={t('date')} rules={[{ required: true, message: "Sanani tanlang" }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─── Mening qarzdorligim (card-based) ───
function MyDebtsSection() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [debtForm] = Form.useForm();
  const [payForm] = Form.useForm();
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['my-debts'],
    queryFn: getMyDebts,
  });

  const createMutation = useMutation({
    mutationFn: createMyDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      message.success(t('debtAdded'));
      setDebtModalOpen(false);
      debtForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => addMyDebtPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      message.success(t('paymentAdded'));
      setPayModalOpen(false);
      setSelectedDebt(null);
      payForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success(t('debtDeleted'));
    },
  });

  const { totalUSD, totalRUB } = useMemo(() => {
    let usd = 0, rub = 0;
    debts.forEach((d) => {
      if (d.currency === 'RUB') rub += d.remainingDebt;
      else usd += d.remainingDebt;
    });
    return { totalUSD: usd, totalRUB: rub };
  }, [debts]);

  const handleCreateDebt = async () => {
    try {
      const values = await debtForm.validateFields();
      createMutation.mutate({
        ...values,
        date: values.date?.toISOString(),
      });
    } catch { /* validation */ }
  };

  const handlePay = (debt) => {
    setSelectedDebt(debt);
    payForm.setFieldsValue({ amount: null, date: dayjs(), note: '' });
    setPayModalOpen(true);
  };

  const handlePaySubmit = async () => {
    try {
      const values = await payForm.validateFields();
      payMutation.mutate({
        id: selectedDebt._id,
        data: { amount: values.amount, date: values.date?.toISOString(), note: values.note },
      });
    } catch { /* validation */ }
  };

  const handleViewHistory = (debt) => {
    setSelectedDebt(debt);
    setHistoryModalOpen(true);
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" align="center">
          <Title level={4} style={{ margin: 0 }}>{t('myDebtsTitle')}</Title>
          {totalUSD > 0 && (
            <Tag color="orange" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('total')}: {formatMoney(totalUSD, 'USD')}
            </Tag>
          )}
          {totalRUB > 0 && (
            <Tag color="orange" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('total')}: {formatMoney(totalRUB, 'RUB')}
            </Tag>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { debtForm.resetFields(); setDebtModalOpen(true); }}>
            {t('addDebt')}
          </Button>
        </Space>
      </Card>

      {debts.length === 0 ? (
        <Empty description={t('noDebts')} />
      ) : (
        <Row gutter={[16, 16]}>
          {debts.map((debt) => {
            const percent = debt.amount > 0 ? Math.round((debt.paidAmount / debt.amount) * 100) : 0;
            const isDone = debt.remainingDebt <= 0;
            return (
              <Col xs={24} sm={12} lg={8} key={debt._id}>
                <Card
                  size="small"
                  style={{
                    borderLeft: `4px solid ${isDone ? '#52c41a' : '#fa8c16'}`,
                    opacity: isDone ? 0.7 : 1,
                  }}
                  actions={[
                    <Button
                      type="link"
                      icon={<DollarOutlined />}
                      disabled={isDone}
                      onClick={() => handlePay(debt)}
                      key="pay"
                    >
                      {t('pay')}
                    </Button>,
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewHistory(debt)}
                      key="view"
                    >
                      {t('history')} ({debt.payments?.length || 0})
                    </Button>,
                    <Popconfirm
                      title={t('deleteConfirm')}
                      onConfirm={() => deleteMutation.mutate(debt._id)}
                      key="delete"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>{debt.creditor}</Text>
                    {isDone && <Tag color="success" icon={<CheckCircleOutlined />}>{t('paidStatus')}</Tag>}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('debtAmount')}</Text>
                      <Text strong>{formatMoney(debt.amount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('paidAmount2')}</Text>
                      <Text style={{ color: '#52c41a' }} strong>{formatMoney(debt.paidAmount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('remainingAmount')}</Text>
                      <Text type="danger" strong>{formatMoney(debt.remainingDebt, debt.currency)}</Text>
                    </div>
                  </div>

                  <Progress
                    percent={percent}
                    size="small"
                    strokeColor={isDone ? '#52c41a' : '#fa8c16'}
                    format={(p) => `${p}%`}
                  />

                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(debt.date)}
                      {debt.description && ` · ${debt.description}`}
                    </Text>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Create debt modal */}
      <Modal
        title={t('addMyDebt')}
        open={debtModalOpen}
        onOk={handleCreateDebt}
        onCancel={() => { setDebtModalOpen(false); debtForm.resetFields(); }}
        confirmLoading={createMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={debtForm} layout="vertical">
          <Form.Item name="creditor" label={t('toWhom')} rules={[{ required: true, message: t('creditorName') }]}>
            <Input placeholder="Ism" />
          </Form.Item>
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label={t('currency')} initialValue="USD">
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="RUB">RUB</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label={t('note')}>
            <Input.TextArea rows={2} placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment modal */}
      <Modal
        title={t('payDebt')}
        open={payModalOpen}
        onOk={handlePaySubmit}
        onCancel={() => { setPayModalOpen(false); setSelectedDebt(null); }}
        confirmLoading={payMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        {selectedDebt && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedDebt.creditor} — {t('remainingAmount')} {formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}
            </Text>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={selectedDebt?.remainingDebt} placeholder="0" />
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment history modal */}
      <Modal
        title={selectedDebt ? `${selectedDebt.creditor} — ${t('paymentHistory')}` : t('paymentHistory')}
        open={historyModalOpen}
        onCancel={() => { setHistoryModalOpen(false); setSelectedDebt(null); }}
        footer={null}
      >
        {selectedDebt && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('debtAmount')}</Text>
                <Text strong>{formatMoney(selectedDebt.amount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('paidAmount2')}</Text>
                <Text style={{ color: '#52c41a' }} strong>{formatMoney(selectedDebt.paidAmount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('remainingAmount')}</Text>
                <Text type="danger" strong>{formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}</Text>
              </div>
            </div>

            {selectedDebt.payments?.length > 0 ? (
              <Timeline
                items={selectedDebt.payments.map((p) => ({
                  color: 'green',
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong style={{ color: '#52c41a' }}>{formatMoney(p.amount, selectedDebt.currency)}</Text>
                        <Text type="secondary">{formatDate(p.date)}</Text>
                      </div>
                      {p.note && <Text type="secondary" style={{ fontSize: 12 }}>{p.note}</Text>}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description={t('noPayments')} />
            )}
          </>
        )}
      </Modal>
    </>
  );
}

// ─── Mendan qarzdarlar (I lent money to someone) ───
function LentDebtsSection() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [debtForm] = Form.useForm();
  const [payForm] = Form.useForm();
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['lent-debts'],
    queryFn: getLentDebts,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['lent-debts'] });
    queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: createLentDebt,
    onSuccess: () => {
      invalidateAll();
      message.success(t('debtAdded'));
      setDebtModalOpen(false);
      debtForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => addLentDebtPayment(id, data),
    onSuccess: () => {
      invalidateAll();
      message.success(t('paymentAdded'));
      setPayModalOpen(false);
      setSelectedDebt(null);
      payForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLentDebt,
    onSuccess: () => {
      invalidateAll();
      message.success(t('debtDeleted'));
    },
  });

  const { totalUSD, totalRUB } = useMemo(() => {
    let usd = 0, rub = 0;
    debts.forEach((d) => {
      if (d.currency === 'RUB') rub += d.remainingDebt;
      else usd += d.remainingDebt;
    });
    return { totalUSD: usd, totalRUB: rub };
  }, [debts]);

  const handleCreateDebt = async () => {
    try {
      const values = await debtForm.validateFields();
      createMutation.mutate({
        ...values,
        date: values.date?.toISOString(),
      });
    } catch { /* validation */ }
  };

  const handlePay = (debt) => {
    setSelectedDebt(debt);
    payForm.setFieldsValue({ amount: null, date: dayjs(), note: '' });
    setPayModalOpen(true);
  };

  const handlePaySubmit = async () => {
    try {
      const values = await payForm.validateFields();
      payMutation.mutate({
        id: selectedDebt._id,
        data: { amount: values.amount, date: values.date?.toISOString(), note: values.note },
      });
    } catch { /* validation */ }
  };

  const handleViewHistory = (debt) => {
    setSelectedDebt(debt);
    setHistoryModalOpen(true);
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" align="center">
          <Title level={4} style={{ margin: 0 }}>{t('lentDebtsTitle')}</Title>
          {totalUSD > 0 && (
            <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('total')}: {formatMoney(totalUSD, 'USD')}
            </Tag>
          )}
          {totalRUB > 0 && (
            <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('total')}: {formatMoney(totalRUB, 'RUB')}
            </Tag>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { debtForm.resetFields(); setDebtModalOpen(true); }}>
            {t('giveDebt')}
          </Button>
        </Space>
      </Card>

      {debts.length === 0 ? (
        <Empty description={t('noLentDebts')} />
      ) : (
        <Row gutter={[16, 16]}>
          {debts.map((debt) => {
            const percent = debt.amount > 0 ? Math.round((debt.paidAmount / debt.amount) * 100) : 0;
            const isDone = debt.remainingDebt <= 0;
            return (
              <Col xs={24} sm={12} lg={8} key={debt._id}>
                <Card
                  size="small"
                  style={{
                    borderLeft: `4px solid ${isDone ? '#52c41a' : '#1677ff'}`,
                    opacity: isDone ? 0.7 : 1,
                  }}
                  actions={[
                    <Button
                      type="link"
                      icon={<DollarOutlined />}
                      disabled={isDone}
                      onClick={() => handlePay(debt)}
                      key="pay"
                    >
                      Olish
                    </Button>,
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewHistory(debt)}
                      key="view"
                    >
                      {t('history')} ({debt.payments?.length || 0})
                    </Button>,
                    <Popconfirm
                      title={t('deleteConfirm')}
                      onConfirm={() => deleteMutation.mutate(debt._id)}
                      key="delete"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>{debt.debtor}</Text>
                    {isDone && <Tag color="success" icon={<CheckCircleOutlined />}>{t('returnedStatus')}</Tag>}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('given')}</Text>
                      <Text strong>{formatMoney(debt.amount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('returned')}</Text>
                      <Text style={{ color: '#52c41a' }} strong>{formatMoney(debt.paidAmount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('remainingAmount')}</Text>
                      <Text type="danger" strong>{formatMoney(debt.remainingDebt, debt.currency)}</Text>
                    </div>
                  </div>

                  <Progress
                    percent={percent}
                    size="small"
                    strokeColor={isDone ? '#52c41a' : '#1677ff'}
                    format={(p) => `${p}%`}
                  />

                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(debt.date)}
                      {debt.description && ` · ${debt.description}`}
                    </Text>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Create lent debt modal */}
      <Modal
        title={t('giveDebt')}
        open={debtModalOpen}
        onOk={handleCreateDebt}
        onCancel={() => { setDebtModalOpen(false); debtForm.resetFields(); }}
        confirmLoading={createMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={debtForm} layout="vertical">
          <Form.Item name="debtor" label="Kimga qarz berildi" rules={[{ required: true, message: "Ismni kiriting" }]}>
            <Input placeholder="Ism" />
          </Form.Item>
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label={t('currency')} initialValue="USD">
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="RUB">RUB</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label={t('note')}>
            <Input.TextArea rows={2} placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment receive modal */}
      <Modal
        title="Qarz olish"
        open={payModalOpen}
        onOk={handlePaySubmit}
        onCancel={() => { setPayModalOpen(false); setSelectedDebt(null); }}
        confirmLoading={payMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        {selectedDebt && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedDebt.debtor} — {t('remainingAmount')} {formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}
            </Text>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={selectedDebt?.remainingDebt} placeholder="0" />
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment history modal */}
      <Modal
        title={selectedDebt ? `${selectedDebt.debtor} — ${t('returnHistory')}` : t('returnHistory')}
        open={historyModalOpen}
        onCancel={() => { setHistoryModalOpen(false); setSelectedDebt(null); }}
        footer={null}
      >
        {selectedDebt && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('given')}</Text>
                <Text strong>{formatMoney(selectedDebt.amount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('returned')}</Text>
                <Text style={{ color: '#52c41a' }} strong>{formatMoney(selectedDebt.paidAmount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('remainingAmount')}</Text>
                <Text type="danger" strong>{formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}</Text>
              </div>
            </div>

            {selectedDebt.payments?.length > 0 ? (
              <Timeline
                items={selectedDebt.payments.map((p) => ({
                  color: 'green',
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong style={{ color: '#52c41a' }}>{formatMoney(p.amount, selectedDebt.currency)}</Text>
                        <Text type="secondary">{formatDate(p.date)}</Text>
                      </div>
                      {p.note && <Text type="secondary" style={{ fontSize: 12 }}>{p.note}</Text>}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description={t('noReturns')} />
            )}
          </>
        )}
      </Modal>
    </>
  );
}

// ─── Main page ───
export default function Debts() {
  const { t } = useLanguage();
  return (
    <div>
      <Tabs
        defaultActiveKey="customers"
        items={[
          { key: 'customers', label: t('customerDebtsTab'), children: <CustomerDebts /> },
          { key: 'my-debts', label: t('myDebtsTab'), children: <MyDebtsSection /> },
          { key: 'lent-debts', label: t('lentDebtsTab'), children: <LentDebtsSection /> },
        ]}
        size="large"
        style={{ marginBottom: 16 }}
      />
    </div>
  );
}
