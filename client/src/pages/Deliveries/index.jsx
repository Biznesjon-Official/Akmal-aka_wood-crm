import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, AutoComplete,
  message, Card, Typography, Tag, Space, Popconfirm, Segmented, Row, Col, Descriptions, Progress, Tabs, Divider,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, DollarOutlined, CreditCardOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getDeliveries, createDelivery, updateDelivery, deleteDelivery,
  markDelivered, addDeliveryPayment, deleteDeliveryPayment,
  addDeliverySupplierPayment, deleteDeliverySupplierPayment,
  addDeliveryExpense, deleteDeliveryExpense,
  getCustomers, createCustomer, getSuppliers, createSupplier,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';
import '../styles/cards.css';

const { Text, Title } = Typography;

const STATUS_COLOR = { "yo'lda": 'orange', yetkazildi: 'blue', yakunlandi: 'green' };
const DEBT_COLOR = { tolanmagan: '#ff4d4f', qisman: '#fa8c16', toliq: '#52c41a' };
const DEBT_LABEL = { tolanmagan: "To'lanmagan", qisman: 'Qisman', toliq: "To'liq" };

export default function Deliveries() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [payType, setPayType] = useState('customer'); // 'customer' | 'supplier'
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
  const [viewMode, setViewMode] = useState('table');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerTyped, setCustomerTyped] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [detailDelivery, setDetailDelivery] = useState(null);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [bulkCustomerId, setBulkCustomerId] = useState(null);
  const [bulkAmounts, setBulkAmounts] = useState({});
  const [bulkPayLoading, setBulkPayLoading] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseTarget, setExpenseTarget] = useState(null);
  const [expenseForm] = Form.useForm();

  const STATUS_LABEL = {
    "yo'lda": t('onRoad'),
    yetkazildi: t('delivered'),
    yakunlandi: t('finished'),
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
  };

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries', statusFilter],
    queryFn: () => getDeliveries(statusFilter ? { status: statusFilter } : {}),
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });

  const customerOptions = customers.map(c => ({ label: c.name, value: c.name, id: c._id }));

  const createCustomerMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  const createSupplierMut = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const createMut = useMutation({
    mutationFn: createDelivery,
    onSuccess: () => { invalidate(); message.success(t('updated')); closeModal(); },
    onError: () => message.error(t('error')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateDelivery(id, data),
    onSuccess: () => { invalidate(); message.success(t('updated')); closeModal(); },
    onError: () => message.error(t('error')),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDelivery,
    onSuccess: () => { invalidate(); message.success(t('deleted')); },
  });

  const deliverMut = useMutation({
    mutationFn: markDelivered,
    onSuccess: () => { invalidate(); message.success(t('delivered')); },
  });

  const payMut = useMutation({
    mutationFn: ({ id, data }) => addDeliveryPayment(id, data),
    onSuccess: (updated) => { invalidate(); message.success(t('paymentAdded2')); setPayTarget(updated); payForm.resetFields(); payForm.setFieldsValue({ date: dayjs() }); },
    onError: () => message.error(t('error')),
  });

  const deletePayMut = useMutation({
    mutationFn: ({ id, paymentId }) => deleteDeliveryPayment(id, paymentId),
    onSuccess: (updated) => { invalidate(); message.success(t('deleted')); setPayTarget(updated); },
    onError: () => message.error(t('error')),
  });

  const supplierPayMut = useMutation({
    mutationFn: ({ id, data }) => addDeliverySupplierPayment(id, data),
    onSuccess: (updated) => { invalidate(); message.success("Supplier to'lov qo'shildi"); setPayTarget(updated); payForm.resetFields(); payForm.setFieldsValue({ date: dayjs() }); },
    onError: () => message.error(t('error')),
  });

  const deleteSupplierPayMut = useMutation({
    mutationFn: ({ id, paymentId }) => deleteDeliverySupplierPayment(id, paymentId),
    onSuccess: (updated) => { invalidate(); message.success(t('deleted')); setPayTarget(updated); },
    onError: () => message.error(t('error')),
  });

  const addExpenseMut = useMutation({
    mutationFn: ({ id, data }) => addDeliveryExpense(id, data),
    onSuccess: (updated) => { invalidate(); message.success("Xarajat qo'shildi"); setDetailDelivery(updated); setExpenseModalOpen(false); expenseForm.resetFields(); },
    onError: () => message.error(t('error')),
  });

  const deleteExpenseMut = useMutation({
    mutationFn: ({ id, expenseId }) => deleteDeliveryExpense(id, expenseId),
    onSuccess: (updated) => { invalidate(); message.success(t('deleted')); setDetailDelivery(updated); },
    onError: () => message.error(t('error')),
  });

  const closeModal = () => {
    setModalOpen(false); setEditing(null);
    form.resetFields(); setCustomerTyped(''); setIsNewCustomer(false); setNewSupplierName('');
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ sentDate: dayjs() });
    setEditing(null); setCustomerTyped(''); setIsNewCustomer(false); setNewSupplierName('');
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    const custName = record.customer?.name || '';
    setCustomerTyped(custName);
    setIsNewCustomer(false);
    setNewSupplierName('');
    form.setFieldsValue({
      ...record,
      wagonCode: record.wagonCode || '',
      sender: record.sender?._id || record.sender || undefined,
      customerName: custName,
      sentDate: record.sentDate ? dayjs(record.sentDate) : null,
      arrivedDate: record.arrivedDate ? dayjs(record.arrivedDate) : null,
    });
    setModalOpen(true);
  };

  const openPay = (record, type = 'customer') => {
    setPayTarget(record);
    setPayType(type);
    const remaining = type === 'customer' ? record.remainingDebt : record.supplierDebt;
    payForm.setFieldsValue({ date: dayjs(), amount: remaining || 0 });
    setPayModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      let customerId = editing?.customer?._id || editing?.customer;
      const name = values.customerName?.trim();

      if (name) {
        const existing = customers.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          customerId = existing._id;
        } else {
          const newCust = await createCustomerMut.mutateAsync({ name, phone: values.customerPhone || '' });
          customerId = newCust._id;
        }
      }

      const data = {
        ...values,
        wagonCode: values.wagonCode || '',
        customer: customerId,
        sender: values.sender || null,
        sentDate: values.sentDate?.toISOString(),
        arrivedDate: values.arrivedDate?.toISOString() || null,
      };
      delete data.customerName;
      delete data.customerPhone;

      if (editing) updateMut.mutate({ id: editing._id, data });
      else createMut.mutate(data);
    } catch { message.error(t('error')); }
  };

  const handleAddNewSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const newSup = await createSupplierMut.mutateAsync({ name: newSupplierName.trim() });
      form.setFieldsValue({ sender: newSup._id });
      setNewSupplierName('');
      message.success('Supplier yaratildi');
    } catch { message.error(t('error')); }
  };

  // Summary stats
  const totalDebt = deliveries.reduce((s, d) => s + (d.totalDebt || 0), 0);
  const totalPaid = deliveries.reduce((s, d) => s + (d.paidAmount || 0), 0);
  const totalRemaining = deliveries.reduce((s, d) => s + (d.remainingDebt || 0), 0);
  const totalSupplierDebt = deliveries.reduce((s, d) => s + (d.supplierDebt || 0), 0);

  const columns = [
    {
      title: t('wagonNumber'), dataIndex: 'wagonCode', key: 'wagonCode',
      render: (v) => <Text strong style={{ fontFamily: 'monospace' }}>{v || '—'}</Text>,
    },
    {
      title: 'Kimdan', key: 'sender',
      render: (_, r) => r.sender?.name || '—',
    },
    {
      title: 'Kimga', key: 'customer',
      render: (_, r) => <Text>{r.customer?.name || '—'}</Text>,
    },
    {
      title: t('date'), key: 'dates',
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <div>{formatDate(r.sentDate)}</div>
          {r.arrivedDate && <div style={{ color: '#52c41a' }}>{formatDate(r.arrivedDate)}</div>}
        </div>
      ),
    },
    {
      title: t('cargo'), key: 'cargo',
      render: (_, r) => r.cargoType ? (
        <div style={{ fontSize: 12 }}>
          <div>{r.cargoType}</div>
          {r.cargoWeight && <div style={{ color: '#888' }}>{r.cargoWeight} t</div>}
        </div>
      ) : '—',
    },
    {
      title: t('status'), dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: t('totalDebt3'), key: 'totalDebt',
      render: (_, r) => <Text strong>{formatMoney(r.totalDebt, 'USD')}</Text>,
    },
    {
      title: t('paid'), key: 'debt',
      render: (_, r) => {
        const pct = r.totalDebt > 0 ? Math.min(100, Math.round((r.paidAmount / r.totalDebt) * 100)) : 0;
        return (
          <div style={{ minWidth: 120 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: DEBT_COLOR[r.debtStatus] }}>{DEBT_LABEL[r.debtStatus]}</span>
              <span>{formatMoney(r.paidAmount, 'USD')} / {formatMoney(r.totalDebt, 'USD')}</span>
            </div>
            <Progress percent={pct} showInfo={false} strokeColor={DEBT_COLOR[r.debtStatus]} size="small" />
          </div>
        );
      },
    },
    {
      title: 'Supplier qarz', key: 'supplierDebt',
      render: (_, r) => r.supplierDebt > 0 ? (
        <Text type="danger">{formatMoney(r.supplierDebt, 'USD')}</Text>
      ) : <Text type="success">—</Text>,
    },
    {
      title: '', key: 'actions', width: 140,
      render: (_, r) => (
        <Space>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailDelivery(r)} />
          {r.debtStatus !== 'toliq' && (
            <Button size="small" type="text" style={{ color: '#1677ff' }} icon={<DollarOutlined />} onClick={(e) => { e.stopPropagation(); openPay(r, 'customer'); }} />
          )}
          {r.status === "yo'lda" && (
            <Popconfirm title={t('deliveryConfirm')} onConfirm={() => deliverMut.mutate(r._id)}>
              <Button size="small" type="text" style={{ color: '#52c41a' }} icon={<CheckCircleOutlined />} />
            </Popconfirm>
          )}
          <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(r); }} />
          <Popconfirm title={t('deleteConfirm')} onConfirm={() => deleteMut.mutate(r._id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderCard = (d) => {
    const pct = d.totalDebt > 0 ? Math.min(100, Math.round((d.paidAmount / d.totalDebt) * 100)) : 0;
    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={d._id}>
        <Card size="small" style={{ borderLeft: `4px solid ${STATUS_COLOR[d.status] === 'green' ? '#52c41a' : STATUS_COLOR[d.status] === 'blue' ? '#1677ff' : '#fa8c16'}`, borderRadius: 8, cursor: 'pointer' }}
          onClick={() => setDetailDelivery(d)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <Text strong style={{ fontFamily: 'monospace' }}>{d.wagonCode || '—'}</Text>
            <Tag color={STATUS_COLOR[d.status]}>{STATUS_LABEL[d.status]}</Tag>
          </div>
          {d.sender?.name && <div style={{ color: '#888', fontSize: 12 }}>Kimdan: {d.sender.name}</div>}
          <div style={{ color: '#555', fontSize: 13, marginBottom: 2 }}>Kimga: {d.customer?.name || '—'}</div>
          {d.cargoType && <div style={{ color: '#888', fontSize: 12 }}>{d.cargoType}{d.cargoWeight ? ` — ${d.cargoWeight} t` : ''}</div>}
          <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>
            {formatDate(d.sentDate)}{d.arrivedDate && ` → ${formatDate(d.arrivedDate)}`}
          </div>

          <div style={{ marginTop: 8, padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
            <Descriptions size="small" column={2} labelStyle={{ color: '#888', fontSize: 11 }} contentStyle={{ fontSize: 11, fontWeight: 600 }}>
              {d.uzRate > 0 && <Descriptions.Item label={d.uzCode ? `UZ (${d.uzCode})` : 'UZ'}>${d.uzRate}/t</Descriptions.Item>}
              {d.kzRate > 0 && <Descriptions.Item label={d.kzCode ? `KZ (${d.kzCode})` : 'KZ'}>${d.kzRate}/t</Descriptions.Item>}
              {d.avgExpense > 0 && <Descriptions.Item label={d.avgCode ? `AVG (${d.avgCode})` : 'AVG'}>{formatMoney(d.avgExpense, 'USD')}</Descriptions.Item>}
              {d.prastoy > 0 && <Descriptions.Item label="Prastoy">{formatMoney(d.prastoy, 'USD')}</Descriptions.Item>}
              {d.totalExpenses > 0 && <Descriptions.Item label="Xarajatlar">{formatMoney(d.totalExpenses, 'USD')}</Descriptions.Item>}
            </Descriptions>
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: DEBT_COLOR[d.debtStatus] }}>{DEBT_LABEL[d.debtStatus]}</span>
                <span>{formatMoney(d.paidAmount, 'USD')} / <strong>{formatMoney(d.totalDebt, 'USD')}</strong></span>
              </div>
              <Progress percent={pct} showInfo={false} strokeColor={DEBT_COLOR[d.debtStatus]} size="small" />
            </div>
            {d.supplierDebt > 0 && (
              <div style={{ fontSize: 12, marginTop: 4, color: '#ff4d4f' }}>
                Supplier qarz: {formatMoney(d.supplierDebt, 'USD')}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
            {d.debtStatus !== 'toliq' && (
              <Button size="small" type="primary" icon={<DollarOutlined />} onClick={(e) => { e.stopPropagation(); openPay(d, 'customer'); }}>{t('payBtn')}</Button>
            )}
            {d.status === "yo'lda" && (
              <Popconfirm title="Yetkazildi?" onConfirm={() => deliverMut.mutate(d._id)}>
                <Button size="small" type="text" style={{ color: '#52c41a' }} icon={<CheckCircleOutlined />} />
              </Popconfirm>
            )}
            <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(d); }} />
            <Popconfirm title={t('deleteConfirm')} onConfirm={() => deleteMut.mutate(d._id)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        </Card>
      </Col>
    );
  };

  const renderDetailTabs = (d) => {
    const pct = d.totalDebt > 0 ? Math.min(100, Math.round((d.paidAmount / d.totalDebt) * 100)) : 0;
    return (
      <Tabs defaultActiveKey="info" items={[
        {
          key: 'info',
          label: "Ma'lumot",
          children: (
            <>
              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                <Descriptions.Item label={t('status')}><Tag color={STATUS_COLOR[d.status]}>{STATUS_LABEL[d.status]}</Tag></Descriptions.Item>
                {d.sender?.name && <Descriptions.Item label="Kimdan">{d.sender.name}</Descriptions.Item>}
                <Descriptions.Item label="Kimga">{d.customer?.name || '—'}</Descriptions.Item>
                <Descriptions.Item label={t('sentDateLabel')}>{formatDate(d.sentDate)}</Descriptions.Item>
                <Descriptions.Item label={t('arrivedDateLabel')}>{d.arrivedDate ? formatDate(d.arrivedDate) : '—'}</Descriptions.Item>
                {d.cargoType && <Descriptions.Item label={t('cargo')}>{d.cargoType}</Descriptions.Item>}
                {d.cargoWeight > 0 && <Descriptions.Item label={t('weight')}>{d.cargoWeight} t</Descriptions.Item>}
              </Descriptions>
              <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
                {d.uzRate > 0 && <Descriptions.Item label={`UZ${d.uzCode ? ` (${d.uzCode})` : ''}`}>${d.uzRate}/t</Descriptions.Item>}
                {d.kzRate > 0 && <Descriptions.Item label={`KZ${d.kzCode ? ` (${d.kzCode})` : ''}`}>${d.kzRate}/t</Descriptions.Item>}
                {d.avgExpense > 0 && <Descriptions.Item label={d.avgCode ? `AVG (${d.avgCode})` : 'AVG'}>{formatMoney(d.avgExpense, 'USD')}</Descriptions.Item>}
                {d.prastoy > 0 && <Descriptions.Item label="Prastoy">{formatMoney(d.prastoy, 'USD')}</Descriptions.Item>}
                {d.totalExpenses > 0 && <Descriptions.Item label="Qo'shimcha xarajatlar">{formatMoney(d.totalExpenses, 'USD')}</Descriptions.Item>}
              </Descriptions>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={8}><Text type="secondary">{t('totalDebt3')}</Text><br /><Text strong>{formatMoney(d.totalDebt, 'USD')}</Text></Col>
                <Col span={8}><Text type="secondary">Mijoz to'ladi</Text><br /><Text strong style={{ color: '#52c41a' }}>{formatMoney(d.paidAmount, 'USD')}</Text></Col>
                <Col span={8}><Text type="secondary">Mijoz qoldiq</Text><br /><Text strong style={{ color: '#ff4d4f' }}>{formatMoney(d.remainingDebt, 'USD')}</Text></Col>
              </Row>
              <Progress percent={pct} strokeColor={DEBT_COLOR[d.debtStatus]} />
              {d.sender && (
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={8}><Text type="secondary">Supplier to'landi</Text><br /><Text strong style={{ color: '#52c41a' }}>{formatMoney(d.supplierPaid, 'USD')}</Text></Col>
                  <Col span={8}><Text type="secondary">Supplier qarz</Text><br /><Text strong style={{ color: '#ff4d4f' }}>{formatMoney(d.supplierDebt, 'USD')}</Text></Col>
                </Row>
              )}
            </>
          ),
        },
        {
          key: 'customerPayments',
          label: `Mijoz to'lovlari (${d.payments?.length || 0})`,
          children: (
            <>
              <div style={{ marginBottom: 12 }}>
                <Button type="primary" size="small" icon={<DollarOutlined />}
                  disabled={d.remainingDebt <= 0}
                  onClick={() => openPay(d, 'customer')}>
                  Mijozdan to'lov olish
                </Button>
              </div>
              {d.payments?.length > 0 ? (
                <Table
                  size="small" pagination={false} dataSource={[...d.payments].reverse()} rowKey="_id"
                  columns={[
                    { title: t('date'), dataIndex: 'date', key: 'date', render: formatDate },
                    { title: t('amount'), dataIndex: 'amount', key: 'amount', render: (v) => <Text strong style={{ color: '#389e0d' }}>{formatMoney(v, 'USD')}</Text> },
                    { title: t('note'), dataIndex: 'note', key: 'note', ellipsis: true },
                    { title: '', key: 'del', width: 40, render: (_, p) => (
                      <Popconfirm title={t('deleteConfirm')} onConfirm={() => deletePayMut.mutate({ id: d._id, paymentId: p._id })}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )},
                  ]}
                />
              ) : <Text type="secondary">To'lovlar yo'q</Text>}
            </>
          ),
        },
        {
          key: 'supplierPayments',
          label: `Supplier to'lovlari (${d.supplierPayments?.length || 0})`,
          children: (
            <>
              <div style={{ marginBottom: 12 }}>
                <Button type="primary" size="small" icon={<DollarOutlined />}
                  disabled={d.supplierDebt <= 0}
                  onClick={() => openPay(d, 'supplier')}>
                  Supplierga to'lov qilish
                </Button>
              </div>
              {d.supplierPayments?.length > 0 ? (
                <Table
                  size="small" pagination={false} dataSource={[...d.supplierPayments].reverse()} rowKey="_id"
                  columns={[
                    { title: t('date'), dataIndex: 'date', key: 'date', render: formatDate },
                    { title: t('amount'), dataIndex: 'amount', key: 'amount', render: (v) => <Text strong style={{ color: '#cf1322' }}>{formatMoney(v, 'USD')}</Text> },
                    { title: t('note'), dataIndex: 'note', key: 'note', ellipsis: true },
                    { title: '', key: 'del', width: 40, render: (_, p) => (
                      <Popconfirm title={t('deleteConfirm')} onConfirm={() => deleteSupplierPayMut.mutate({ id: d._id, paymentId: p._id })}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )},
                  ]}
                />
              ) : <Text type="secondary">To'lovlar yo'q</Text>}
            </>
          ),
        },
        {
          key: 'expenses',
          label: `Xarajatlar (${d.expenses?.length || 0})`,
          children: (
            <>
              <div style={{ marginBottom: 12 }}>
                <Button type="primary" size="small" icon={<PlusOutlined />}
                  onClick={() => { setExpenseTarget(d); expenseForm.resetFields(); expenseForm.setFieldsValue({ currency: 'USD' }); setExpenseModalOpen(true); }}>
                  Chiqim qo'shish
                </Button>
              </div>
              {d.expenses?.length > 0 ? (
                <Table
                  size="small" pagination={false} dataSource={d.expenses} rowKey="_id"
                  columns={[
                    { title: 'Tavsif', dataIndex: 'description', key: 'description' },
                    { title: 'Summa', dataIndex: 'amount', key: 'amount', render: (v, r) => formatMoney(v, r.currency) },
                    { title: 'Valyuta', dataIndex: 'currency', key: 'currency' },
                    { title: '', key: 'del', width: 40, render: (_, e) => (
                      <Popconfirm title={t('deleteConfirm')} onConfirm={() => deleteExpenseMut.mutate({ id: d._id, expenseId: e._id })}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )},
                  ]}
                />
              ) : <Text type="secondary">Xarajatlar yo'q</Text>}
              {d.totalExpenses > 0 && (
                <div style={{ marginTop: 8, padding: '6px 12px', background: '#fff7e6', borderRadius: 6 }}>
                  <Text type="secondary">Jami xarajat: </Text>
                  <Text strong style={{ color: '#d46b08' }}>{formatMoney(d.totalExpenses, 'USD')}</Text>
                </div>
              )}
            </>
          ),
        },
      ]} />
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Segmented options={[{ label: 'Jadval', value: 'table' }, { label: 'Kartalar', value: 'card' }]} value={viewMode} onChange={setViewMode} />
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: t('all'), value: '' },
              { label: t('onRoad'), value: "yo'lda" },
              { label: t('delivered'), value: 'yetkazildi' },
              { label: t('finished'), value: 'yakunlandi' },
            ]}
          />
        </Space>
        <Space>
          <Button icon={<CreditCardOutlined />} onClick={() => { setBulkPayOpen(true); setBulkCustomerId(null); setBulkAmounts({}); }}>
            Ommaviy to'lov
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('newDelivery')}</Button>
        </Space>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">{t('totalDeliveries2')}</span>
            <span className="summary-stat-value">{deliveries.length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('debt')}</span>
            <span className="summary-stat-value">{formatMoney(totalDebt, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('paid')}</span>
            <span className="summary-stat-value" style={{ color: '#52c41a' }}>{formatMoney(totalPaid, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('remaining')}</span>
            <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>{formatMoney(totalRemaining, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Supplier qarz</span>
            <span className="summary-stat-value" style={{ color: '#fa8c16' }}>{formatMoney(totalSupplierDebt, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('finished')}</span>
            <span className="summary-stat-value highlight">{deliveries.filter(d => d.status === 'yakunlandi').length}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'table' ? (
        <Table columns={columns} dataSource={deliveries} rowKey="_id" loading={isLoading} pagination={{ pageSize: 20 }}
          onRow={(record) => ({ onClick: () => setDetailDelivery(record), style: { cursor: 'pointer' } })} />
      ) : (
        <Row gutter={[16, 16]}>{deliveries.map(renderCard)}</Row>
      )}

      {/* Detail Modal */}
      <Modal
        title={detailDelivery ? `${detailDelivery.wagonCode || '—'} — ${detailDelivery.customer?.name || ''}` : ''}
        open={!!detailDelivery}
        onCancel={() => setDetailDelivery(null)}
        footer={null}
        width={700}
      >
        {detailDelivery && renderDetailTabs(detailDelivery)}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        title={editing ? t('editDelivery') : t('newDelivery')}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="wagonCode" label={t('wagonNumber')}>
                <Input placeholder="V-001 (ixtiyoriy)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sender" label="Kimdan (supplier)">
                <Select
                  allowClear
                  showSearch
                  placeholder="Supplier tanlang"
                  filterOption={(input, opt) => opt.label?.toLowerCase().includes(input.toLowerCase())}
                  options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Input
                          placeholder="Yangi supplier"
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          size="small"
                        />
                        <Button type="text" icon={<PlusOutlined />} onClick={handleAddNewSupplier} size="small">
                          Qo'shish
                        </Button>
                      </Space>
                    </>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="customerName" label="Kimga (qabul qiluvchi)" rules={[{ required: true, message: 'Mijoz nomini kiriting' }]}>
                <AutoComplete
                  options={customerOptions}
                  placeholder="Mijoz ismi"
                  filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                  value={customerTyped}
                  onChange={(val) => {
                    setCustomerTyped(val);
                    const found = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                    setIsNewCustomer(!!val && !found);
                  }}
                />
              </Form.Item>
            </Col>
            {isNewCustomer && (
              <Col span={12}>
                <Form.Item name="customerPhone" label="Telefon (yangi mijoz)">
                  <Input placeholder="+998 90 000 00 00" />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sentDate" label={t('sentDateLabel')}>
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="arrivedDate" label={t('arrivedDateLabel')}>
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="cargoType" label={t('cargo')}>
            <Input placeholder="Yog'och, metall..." />
          </Form.Item>

          <Title level={5} style={{ margin: '8px 0 8px' }}>{t('borderPayments')}</Title>
          <Row gutter={12} style={{ marginBottom: 0 }}>
            <Col span={12}>
              <Form.Item name="cargoWeight" label={t('weight')} style={{ marginBottom: 8 }}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" addonAfter="t" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ogirlik" label={t('weightLoss')} style={{ marginBottom: 8 }}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" addonAfter="t" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="uzCode" label="UZ kodi" style={{ marginBottom: 8 }}>
                <Input placeholder="Kod raqami" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="uzRate" label="UZ (USD/t)" style={{ marginBottom: 8 }}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" addonBefore="$" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="kzCode" label="KZ kodi" style={{ marginBottom: 8 }}>
                <Input placeholder="Kod raqami" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="kzRate" label="KZ (USD/t)" style={{ marginBottom: 8 }}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" addonBefore="$" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="avgCode" label="AVG kodi" style={{ marginBottom: 8 }}>
                <Input placeholder="Kod raqami" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="avgExpense" label="AVG summa (USD)" style={{ marginBottom: 8 }}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" addonBefore="$" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="prastoy" label="Prastoy (USD)">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" addonBefore="$" />
              </Form.Item>
            </Col>
          </Row>

          {/* Live total */}
          <Form.Item noStyle shouldUpdate>
            {() => {
              const weight = form.getFieldValue('cargoWeight') || 0;
              const loss = form.getFieldValue('ogirlik') || 0;
              const eff = Math.max(0, weight - loss);
              const uz = (form.getFieldValue('uzRate') || 0) * eff;
              const kz = (form.getFieldValue('kzRate') || 0) * eff;
              const avg = form.getFieldValue('avgExpense') || 0;
              const pr = form.getFieldValue('prastoy') || 0;
              const total = uz + kz + avg + pr;
              if (!total) return null;
              return (
                <Card size="small" style={{ background: '#fff7e6' }}>
                  {eff !== weight && weight > 0 && (
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                      {t('effectiveWeight')} {weight} − {loss} = <strong>{eff} t</strong>
                    </div>
                  )}
                  <Row gutter={8}>
                    {uz > 0 && <Col span={12}><Text type="secondary">UZ: </Text><Text strong>{formatMoney(uz, 'USD')}</Text></Col>}
                    {kz > 0 && <Col span={12}><Text type="secondary">KZ: </Text><Text strong>{formatMoney(kz, 'USD')}</Text></Col>}
                    {avg > 0 && <Col span={12}><Text type="secondary">AVG{form.getFieldValue('avgCode') ? ` (${form.getFieldValue('avgCode')})` : ''}: </Text><Text strong>{formatMoney(avg, 'USD')}</Text></Col>}
                    {pr > 0 && <Col span={12}><Text type="secondary">Prastoy: </Text><Text strong>{formatMoney(pr, 'USD')}</Text></Col>}
                  </Row>
                  <div style={{ marginTop: 8, borderTop: '1px solid #ffd591', paddingTop: 6 }}>
                    {t('customerDebt2')} <Text strong style={{ fontSize: 16, color: '#d46b08' }}>{formatMoney(total, 'USD')}</Text>
                  </div>
                </Card>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment Modal (Customer or Supplier) */}
      <Modal
        title={payType === 'customer'
          ? `Mijoz to'lovi — ${payTarget?.wagonCode || ''} (${payTarget?.customer?.name || ''})`
          : `Supplier to'lov — ${payTarget?.wagonCode || ''} (${payTarget?.sender?.name || ''})`
        }
        open={payModalOpen}
        onCancel={() => { setPayModalOpen(false); payForm.resetFields(); setPayTarget(null); }}
        onOk={() => payForm.submit()}
        confirmLoading={payMut.isPending || supplierPayMut.isPending}
        okText={t('payBtn')}
        cancelText={t('cancel')}
      >
        {payTarget && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: payType === 'customer' ? '#f6ffed' : '#fff7e6', borderRadius: 8 }}>
            {payType === 'customer' ? (
              <Row gutter={16}>
                <Col span={8}><Text type="secondary">{t('totalDebt3')}</Text><br /><Text strong>{formatMoney(payTarget.totalDebt, 'USD')}</Text></Col>
                <Col span={8}><Text type="secondary">{t('paid')}:</Text><br /><Text strong style={{ color: '#52c41a' }}>{formatMoney(payTarget.paidAmount, 'USD')}</Text></Col>
                <Col span={8}><Text type="secondary">{t('remaining')}:</Text><br /><Text strong style={{ color: '#ff4d4f' }}>{formatMoney(payTarget.remainingDebt, 'USD')}</Text></Col>
              </Row>
            ) : (
              <Row gutter={16}>
                <Col span={8}><Text type="secondary">Jami qarz</Text><br /><Text strong>{formatMoney(payTarget.totalDebt, 'USD')}</Text></Col>
                <Col span={8}><Text type="secondary">To'landi:</Text><br /><Text strong style={{ color: '#52c41a' }}>{formatMoney(payTarget.supplierPaid, 'USD')}</Text></Col>
                <Col span={8}><Text type="secondary">Qoldiq:</Text><br /><Text strong style={{ color: '#ff4d4f' }}>{formatMoney(payTarget.supplierDebt, 'USD')}</Text></Col>
              </Row>
            )}
          </div>
        )}
        <Form form={payForm} layout="vertical" onFinish={(values) => {
          const data = { ...values, date: values.date?.toISOString() };
          if (payType === 'customer') {
            payMut.mutate({ id: payTarget._id, data });
          } else {
            supplierPayMut.mutate({ id: payTarget._id, data });
          }
        }}>
          <Form.Item name="amount" label={`To'lov summasi (USD)`} rules={[{ required: true, message: t('enterAmount') }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="0" addonBefore="$" />
          </Form.Item>
          <Form.Item name="date" label={t('date')}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Expense Modal */}
      <Modal
        title={`Chiqim qo'shish — ${expenseTarget?.wagonCode || ''}`}
        open={expenseModalOpen}
        onCancel={() => { setExpenseModalOpen(false); expenseForm.resetFields(); }}
        onOk={() => expenseForm.submit()}
        confirmLoading={addExpenseMut.isPending}
        okText="Qo'shish"
        cancelText={t('cancel')}
      >
        <Form form={expenseForm} layout="vertical" onFinish={(values) => {
          addExpenseMut.mutate({ id: expenseTarget._id, data: values });
        }}>
          <Form.Item name="description" label="Tavsif" rules={[{ required: true, message: 'Tavsif kiriting' }]}>
            <Input placeholder="Masalan: Yukni tushirish, Kran xizmati..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="amount" label="Summa" rules={[{ required: true, message: 'Summa kiriting' }]}>
                <InputNumber style={{ width: '100%' }} min={0.01} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="currency" label="Valyuta">
                <Select options={[{ value: 'USD', label: 'USD' }, { value: 'RUB', label: 'RUB' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Bulk Payment Modal */}
      <Modal
        title="Ommaviy to'lov"
        open={bulkPayOpen}
        onCancel={() => { setBulkPayOpen(false); setBulkCustomerId(null); setBulkAmounts({}); }}
        width={700}
        okText="To'lovlarni saqlash"
        confirmLoading={bulkPayLoading}
        onOk={async () => {
          const entries = Object.entries(bulkAmounts).filter(([, v]) => v > 0);
          if (entries.length === 0) { message.warning("Kamida bitta delivery uchun summa kiriting"); return; }
          setBulkPayLoading(true);
          try {
            for (const [deliveryId, amount] of entries) {
              await addDeliveryPayment(deliveryId, { amount, date: new Date().toISOString() });
            }
            invalidate();
            message.success(`${entries.length} ta delivery uchun to'lov saqlandi`);
            setBulkPayOpen(false);
            setBulkCustomerId(null);
            setBulkAmounts({});
          } catch { message.error(t('error')); }
          finally { setBulkPayLoading(false); }
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Mijozni tanlang:</Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            placeholder="Mijoz tanlang"
            showSearch
            filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
            value={bulkCustomerId}
            onChange={(v) => { setBulkCustomerId(v); setBulkAmounts({}); }}
            options={customers.map(c => ({ value: c._id, label: c.name }))}
          />
        </div>

        {bulkCustomerId && (() => {
          const custDeliveries = deliveries.filter(d =>
            (d.customer?._id === bulkCustomerId || d.customer === bulkCustomerId) && d.remainingDebt > 0
          );
          const totalBulk = Object.values(bulkAmounts).reduce((s, v) => s + (v || 0), 0);
          const totalRemain = custDeliveries.reduce((s, d) => s + d.remainingDebt, 0);

          if (custDeliveries.length === 0) return <Text type="secondary">Bu mijozning to'lanmagan yetkazmalari yo'q</Text>;

          return (
            <>
              <Table
                size="small"
                pagination={false}
                dataSource={custDeliveries}
                rowKey="_id"
                columns={[
                  { title: 'Vagon', dataIndex: 'wagonCode', key: 'wagonCode', width: 100 },
                  { title: 'Jami qarz', key: 'totalDebt', width: 110, render: (_, r) => formatMoney(r.totalDebt, 'USD') },
                  { title: 'Qoldiq', key: 'remaining', width: 110, render: (_, r) => <Text type="danger">{formatMoney(r.remainingDebt, 'USD')}</Text> },
                  {
                    title: "To'lov summasi", key: 'payment', width: 140,
                    render: (_, r) => (
                      <InputNumber
                        size="small"
                        style={{ width: '100%' }}
                        min={0}
                        max={r.remainingDebt}
                        placeholder="0"
                        value={bulkAmounts[r._id] || undefined}
                        onChange={(v) => setBulkAmounts(prev => ({ ...prev, [r._id]: v || 0 }))}
                        addonBefore="$"
                      />
                    ),
                  },
                ]}
              />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f6ffed', borderRadius: 6 }}>
                <div>
                  <Text type="secondary">Jami qoldiq: </Text>
                  <Text strong style={{ color: '#ff4d4f' }}>{formatMoney(totalRemain, 'USD')}</Text>
                </div>
                <div>
                  <Text type="secondary">Jami to'lov: </Text>
                  <Text strong style={{ color: '#52c41a', fontSize: 16 }}>{formatMoney(totalBulk, 'USD')}</Text>
                </div>
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}
