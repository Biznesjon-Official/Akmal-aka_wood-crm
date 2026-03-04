import { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Popconfirm, Space, Drawer, Tag, Row, Col, Card, Segmented, Typography, Descriptions, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined, BarsOutlined, PhoneOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerSales, getPayments, createPayment, deletePayment, createLentDebt, getDeliveries, getLentDebts, getCashTransactions } from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';
import '../styles/cards.css';

const { Text } = Typography;

const Customers = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('table');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingSale, setPayingSale] = useState(null);
  const [astatkaOpen, setAstatkaOpen] = useState(false);
  const [payForm] = Form.useForm();
  const [astatkaForm] = Form.useForm();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const { data: customerSales, isLoading: salesLoading } = useQuery({
    queryKey: ['customer-sales', selectedCustomer?._id],
    queryFn: () => getCustomerSales(selectedCustomer._id),
    enabled: !!selectedCustomer?._id,
  });

  const { data: customerPayments } = useQuery({
    queryKey: ['customer-payments', selectedCustomer?._id],
    queryFn: () => getPayments({ customer: selectedCustomer._id }),
    enabled: !!selectedCustomer?._id,
  });

  const { data: customerDeliveries = [] } = useQuery({
    queryKey: ['customer-deliveries', selectedCustomer?._id],
    queryFn: () => getDeliveries({ customer: selectedCustomer._id }),
    enabled: !!selectedCustomer?._id,
  });

  const { data: customerLentDebts = [] } = useQuery({
    queryKey: ['customer-lent-debts', selectedCustomer?.name],
    queryFn: () => getLentDebts({ debtor: selectedCustomer.name }),
    enabled: !!selectedCustomer?.name,
  });

  const { data: customerTransactions = [] } = useQuery({
    queryKey: ['customer-transactions', selectedCustomer?._id],
    queryFn: () => getCashTransactions({ relatedPerson: selectedCustomer._id }),
    enabled: !!selectedCustomer?._id,
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

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      message.success(t('customerAdded'));
      closeModal();
    },
    onError: () => message.error(t('error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      message.success(t('customerUpdated'));
      closeModal();
    },
    onError: () => message.error(t('error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      message.success(t('customerDeleted'));
    },
    onError: () => message.error(t('error')),
  });

  const payMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-sales', selectedCustomer?._id] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments', selectedCustomer?._id] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['customer-sales', selectedCustomer?._id] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments', selectedCustomer?._id] });
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
        customer: payingSale.customer?._id || payingSale.customer || selectedCustomer?._id,
        amount: values.amount,
        currency: values.currency,
        date: values.date?.toISOString(),
        note: values.note,
      });
    } catch { /* validation */ }
  };

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

  const columns = [
    { title: t('name'), dataIndex: 'name', key: 'name' },
    { title: t('phone'), dataIndex: 'phone', key: 'phone' },
    { title: t('note'), dataIndex: 'note', key: 'note', ellipsis: true },
    { title: t('date'), dataIndex: 'createdAt', key: 'createdAt', render: (val) => formatDate(val) },
    {
      title: t('actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => openDrawer(record)} />
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title={t('deleteCustomerConfirm')}
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText={t('yes')} cancelText={t('no')}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
        {/* Wood items */}
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

        {/* Payments */}
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

  const filteredCustomers = (customers || []).filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  const renderCustomerCards = () => (
    <Row gutter={[16, 16]}>
      {filteredCustomers.map((c) => (
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
                <Popconfirm title={t('deleteConfirm')}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <h2 style={{ margin: 0 }}>{t('customersPage')}</h2>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'card', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <BarsOutlined /> },
            ]} />
          <Input
            placeholder={t('search') || 'Qidirish...'}
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
        </Space>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => { astatkaForm.resetFields(); setAstatkaOpen(true); }}>
            Astatka qo'shish
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('addCustomer')}
          </Button>
        </Space>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">{t('totalCustomers')}</span>
            <span className="summary-stat-value highlight">{(customers || []).length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('withPhone')}</span>
            <span className="summary-stat-value">{(customers || []).filter(c => c.phone).length}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'card' ? renderCustomerCards() : (
        <Table rowKey="_id" columns={columns}
          dataSource={(customers || []).filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))}
          loading={isLoading}
          onRow={(record) => ({ onClick: () => openDrawer(record), style: { cursor: 'pointer' } })}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        title={editingCustomer ? t('editCustomer') : t('addCustomer')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={t('save')} cancelText={t('cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('name')} rules={[{ required: true, message: t('enterName') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('phone')}><Input /></Form.Item>
          <Form.Item name="note" label={t('note')}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      {/* Customer Details Drawer */}
      <Drawer
        title={selectedCustomer?.name}
        open={drawerOpen}
        onClose={closeDrawer}
        size="large"
        width={720}
      >
        {selectedCustomer && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
              <Descriptions.Item label={t('phone')}>{selectedCustomer.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label={t('created')}>{formatDate(selectedCustomer.createdAt)}</Descriptions.Item>
              {selectedCustomer.note && (
                <Descriptions.Item label={t('note')} span={2}>{selectedCustomer.note}</Descriptions.Item>
              )}
            </Descriptions>

            {/* Transaction summary */}
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
          </>
        )}
      </Drawer>
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
        <Form
          form={astatkaForm}
          layout="vertical"
          initialValues={{ currency: 'USD', date: dayjs() }}
          onFinish={(values) => astatkaMutation.mutate({ ...values, date: values.date?.toISOString() })}
        >
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
    </div>
  );
};

export default Customers;
