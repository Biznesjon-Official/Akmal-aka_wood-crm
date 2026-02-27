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
  getSales, getPayments, createPayment,
  getMyDebts, createMyDebt, addMyDebtPayment, deleteMyDebt,
  getLentDebts, createLentDebt, addLentDebtPayment, deleteLentDebt,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';

const { Text, Title } = Typography;

// ─── Mijozlar qarzlari (existing) ───
function CustomerDebts() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
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
      message.success("To'lov muvaffaqiyatli qo'shildi");
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
      message.error("To'lov qo'shishda xatolik");
    },
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
    { title: 'Sana', dataIndex: 'date', key: 'date', render: (val) => formatDate(val) },
    { title: 'Jami', dataIndex: 'totalAmount', key: 'totalAmount', render: (val, rec) => formatMoney(val, rec.currency) },
    { title: "To'langan", dataIndex: 'totalPaid', key: 'totalPaid', render: (val, rec) => formatMoney(val, rec.currency) },
    { title: 'Qarz', dataIndex: 'debt', key: 'debt', render: (val, rec) => <Text type="danger" strong>{formatMoney(val, rec.currency)}</Text> },
    {
      title: '', key: 'actions',
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => handlePayment(record)}>To'lov</Button>
      ),
    },
  ];

  const columns = [
    { title: 'Mijoz', dataIndex: 'customerName', key: 'customerName', render: (name) => <Text strong>{name}</Text> },
    { title: 'Sotuvlar', key: 'salesCount', render: (_, rec) => rec.sales.length },
    {
      title: 'Jami qarz', dataIndex: 'totalDebt', key: 'totalDebt',
      render: (val, rec) => <Text type="danger" strong style={{ fontSize: 15 }}>{formatMoney(val, rec.currency)}</Text>,
      sorter: (a, b) => a.totalDebt - b.totalDebt,
      defaultSortOrder: 'descend',
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_, rec) => (
        <Button type="primary" size="small" icon={<DollarOutlined />}
          onClick={(e) => { e.stopPropagation(); handlePayment(rec.sales[0]); }}>
          To'lash
        </Button>
      ),
    },
  ];

  if (salesLoading || paymentsLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" align="center">
          <Title level={4} style={{ margin: 0 }}>Mijozlar qarzlari</Title>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'card', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <BarsOutlined /> },
            ]} />
          {totalDebtUSD > 0 && (
            <Tag color="red" style={{ fontSize: 16, padding: '4px 12px' }}>
              Jami: {formatMoney(totalDebtUSD, 'USD')}
            </Tag>
          )}
          {totalDebtRUB > 0 && (
            <Tag color="red" style={{ fontSize: 16, padding: '4px 12px' }}>
              Jami: {formatMoney(totalDebtRUB, 'RUB')}
            </Tag>
          )}
        </Space>
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
                      <Button type="primary" size="small" onClick={() => handlePayment(s)}>To'lash</Button>
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
            expandedRowRender: (record) => (
              <Table
                columns={saleColumns}
                dataSource={record.sales}
                rowKey="_id"
                pagination={false}
                size="small"
              />
            ),
          }}
        />
      )}

      <Modal
        title="To'lov qilish"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setSelectedSale(null); }}
        confirmLoading={paymentMutation.isPending}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        {selectedSale && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedSale.customer?.name} — Qarz: {formatMoney(selectedSale.debt, selectedSale.currency)}
            </Text>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label="Summa" rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={selectedSale?.debt} placeholder="Summa" />
          </Form.Item>
          <Form.Item name="currency" label="Valyuta" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="RUB">RUB</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label="Sana" rules={[{ required: true, message: "Sanani tanlang" }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input placeholder="Izoh" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─── Mening qarzdorligim (card-based) ───
function MyDebtsSection() {
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
      message.success("Qarz qo'shildi");
      setDebtModalOpen(false);
      debtForm.resetFields();
    },
    onError: () => message.error('Xatolik'),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => addMyDebtPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      message.success("To'lov qo'shildi");
      setPayModalOpen(false);
      setSelectedDebt(null);
      payForm.resetFields();
    },
    onError: () => message.error('Xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success("Qarz o'chirildi");
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
          <Title level={4} style={{ margin: 0 }}>Mening qarzdorligim</Title>
          {totalUSD > 0 && (
            <Tag color="orange" style={{ fontSize: 16, padding: '4px 12px' }}>
              Jami: {formatMoney(totalUSD, 'USD')}
            </Tag>
          )}
          {totalRUB > 0 && (
            <Tag color="orange" style={{ fontSize: 16, padding: '4px 12px' }}>
              Jami: {formatMoney(totalRUB, 'RUB')}
            </Tag>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { debtForm.resetFields(); setDebtModalOpen(true); }}>
            Qarz qo'shish
          </Button>
        </Space>
      </Card>

      {debts.length === 0 ? (
        <Empty description="Qarzlar yo'q" />
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
                      To'lash
                    </Button>,
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewHistory(debt)}
                      key="view"
                    >
                      Tarix ({debt.payments?.length || 0})
                    </Button>,
                    <Popconfirm
                      title="O'chirishni tasdiqlaysizmi?"
                      onConfirm={() => deleteMutation.mutate(debt._id)}
                      key="delete"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>{debt.creditor}</Text>
                    {isDone && <Tag color="success" icon={<CheckCircleOutlined />}>To'langan</Tag>}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Qarz:</Text>
                      <Text strong>{formatMoney(debt.amount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">To'langan:</Text>
                      <Text style={{ color: '#52c41a' }} strong>{formatMoney(debt.paidAmount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Qoldiq:</Text>
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
        title="Yangi qarz qo'shish"
        open={debtModalOpen}
        onOk={handleCreateDebt}
        onCancel={() => { setDebtModalOpen(false); debtForm.resetFields(); }}
        confirmLoading={createMutation.isPending}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        <Form form={debtForm} layout="vertical">
          <Form.Item name="creditor" label="Kimga qarz" rules={[{ required: true, message: "Kreditor ismini kiriting" }]}>
            <Input placeholder="Ism" />
          </Form.Item>
          <Form.Item name="amount" label="Summa" rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label="Valyuta" initialValue="USD">
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="RUB">RUB</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label="Sana" initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label="Izoh">
            <Input.TextArea rows={2} placeholder="Izoh" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment modal */}
      <Modal
        title="Qarz to'lash"
        open={payModalOpen}
        onOk={handlePaySubmit}
        onCancel={() => { setPayModalOpen(false); setSelectedDebt(null); }}
        confirmLoading={payMutation.isPending}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        {selectedDebt && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedDebt.creditor} — Qoldiq: {formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}
            </Text>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label="Summa" rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={selectedDebt?.remainingDebt} placeholder="0" />
          </Form.Item>
          <Form.Item name="date" label="Sana" initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input placeholder="Izoh" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment history modal */}
      <Modal
        title={selectedDebt ? `${selectedDebt.creditor} — To'lov tarixi` : "To'lov tarixi"}
        open={historyModalOpen}
        onCancel={() => { setHistoryModalOpen(false); setSelectedDebt(null); }}
        footer={null}
      >
        {selectedDebt && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Jami qarz:</Text>
                <Text strong>{formatMoney(selectedDebt.amount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">To'langan:</Text>
                <Text style={{ color: '#52c41a' }} strong>{formatMoney(selectedDebt.paidAmount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Qoldiq:</Text>
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
              <Empty description="To'lovlar yo'q" />
            )}
          </>
        )}
      </Modal>
    </>
  );
}

// ─── Mendan qarzdarlar (I lent money to someone) ───
function LentDebtsSection() {
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
      message.success("Qarz qo'shildi");
      setDebtModalOpen(false);
      debtForm.resetFields();
    },
    onError: () => message.error('Xatolik'),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => addLentDebtPayment(id, data),
    onSuccess: () => {
      invalidateAll();
      message.success("To'lov qo'shildi");
      setPayModalOpen(false);
      setSelectedDebt(null);
      payForm.resetFields();
    },
    onError: () => message.error('Xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLentDebt,
    onSuccess: () => {
      invalidateAll();
      message.success("Qarz o'chirildi");
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
          <Title level={4} style={{ margin: 0 }}>Mendan qarzdarlar</Title>
          {totalUSD > 0 && (
            <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
              Jami: {formatMoney(totalUSD, 'USD')}
            </Tag>
          )}
          {totalRUB > 0 && (
            <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
              Jami: {formatMoney(totalRUB, 'RUB')}
            </Tag>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { debtForm.resetFields(); setDebtModalOpen(true); }}>
            Qarz berish
          </Button>
        </Space>
      </Card>

      {debts.length === 0 ? (
        <Empty description="Qarzdarlar yo'q" />
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
                      Tarix ({debt.payments?.length || 0})
                    </Button>,
                    <Popconfirm
                      title="O'chirishni tasdiqlaysizmi?"
                      onConfirm={() => deleteMutation.mutate(debt._id)}
                      key="delete"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>{debt.debtor}</Text>
                    {isDone && <Tag color="success" icon={<CheckCircleOutlined />}>Qaytarildi</Tag>}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Berilgan:</Text>
                      <Text strong>{formatMoney(debt.amount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Qaytarilgan:</Text>
                      <Text style={{ color: '#52c41a' }} strong>{formatMoney(debt.paidAmount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Qoldiq:</Text>
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
        title="Qarz berish"
        open={debtModalOpen}
        onOk={handleCreateDebt}
        onCancel={() => { setDebtModalOpen(false); debtForm.resetFields(); }}
        confirmLoading={createMutation.isPending}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        <Form form={debtForm} layout="vertical">
          <Form.Item name="debtor" label="Kimga qarz berildi" rules={[{ required: true, message: "Ismni kiriting" }]}>
            <Input placeholder="Ism" />
          </Form.Item>
          <Form.Item name="amount" label="Summa" rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label="Valyuta" initialValue="USD">
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="RUB">RUB</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label="Sana" initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label="Izoh">
            <Input.TextArea rows={2} placeholder="Izoh" />
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
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        {selectedDebt && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedDebt.debtor} — Qoldiq: {formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}
            </Text>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label="Summa" rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={selectedDebt?.remainingDebt} placeholder="0" />
          </Form.Item>
          <Form.Item name="date" label="Sana" initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input placeholder="Izoh" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment history modal */}
      <Modal
        title={selectedDebt ? `${selectedDebt.debtor} — Qaytarish tarixi` : "Qaytarish tarixi"}
        open={historyModalOpen}
        onCancel={() => { setHistoryModalOpen(false); setSelectedDebt(null); }}
        footer={null}
      >
        {selectedDebt && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Berilgan:</Text>
                <Text strong>{formatMoney(selectedDebt.amount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Qaytarilgan:</Text>
                <Text style={{ color: '#52c41a' }} strong>{formatMoney(selectedDebt.paidAmount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Qoldiq:</Text>
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
              <Empty description="Qaytarishlar yo'q" />
            )}
          </>
        )}
      </Modal>
    </>
  );
}

// ─── Main page ───
export default function Debts() {
  return (
    <div>
      <Tabs
        defaultActiveKey="customers"
        items={[
          { key: 'customers', label: 'Mijozlar qarzlari', children: <CustomerDebts /> },
          { key: 'my-debts', label: 'Mening qarzdorligim', children: <MyDebtsSection /> },
          { key: 'lent-debts', label: 'Mendan qarzdarlar', children: <LentDebtsSection /> },
        ]}
        size="large"
        style={{ marginBottom: 16 }}
      />
    </div>
  );
}
