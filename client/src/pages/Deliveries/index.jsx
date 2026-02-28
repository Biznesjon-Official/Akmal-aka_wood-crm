import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, AutoComplete,
  message, Card, Typography, Tag, Space, Popconfirm, Segmented, Row, Col, Descriptions, Progress,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getDeliveries, createDelivery, updateDelivery, deleteDelivery,
  markDelivered, addDeliveryPayment, getCustomers, createCustomer,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import '../styles/cards.css';

const { Text, Title } = Typography;

const STATUS_COLOR = { "yo'lda": 'orange', yetkazildi: 'blue', yakunlandi: 'green' };
const STATUS_LABEL = { "yo'lda": "Yo'lda", yetkazildi: 'Yetkazildi', yakunlandi: 'Yakunlandi' };
const DEBT_COLOR = { tolanmagan: '#ff4d4f', qisman: '#fa8c16', toliq: '#52c41a' };
const DEBT_LABEL = { tolanmagan: "To'lanmagan", qisman: 'Qisman', toliq: "To'liq" };

export default function Deliveries() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
  const [viewMode, setViewMode] = useState('table');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerTyped, setCustomerTyped] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);

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

  const customerOptions = customers.map(c => ({ label: c.name, value: c.name, id: c._id }));

  const createCustomerMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
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
    onSuccess: () => { invalidate(); message.success('Yetkazildi'); },
  });

  const payMut = useMutation({
    mutationFn: ({ id, data }) => addDeliveryPayment(id, data),
    onSuccess: () => { invalidate(); message.success("To'lov qo'shildi"); setPayModalOpen(false); payForm.resetFields(); setPayTarget(null); },
    onError: () => message.error('Xatolik'),
  });

  const closeModal = () => {
    setModalOpen(false); setEditing(null);
    form.resetFields(); setCustomerTyped(''); setIsNewCustomer(false);
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ sentDate: dayjs() });
    setEditing(null); setCustomerTyped(''); setIsNewCustomer(false);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    const custName = record.customer?.name || '';
    setCustomerTyped(custName);
    setIsNewCustomer(false);
    form.setFieldsValue({
      ...record,
      wagonCode: record.wagonCode || '',
      customerName: custName,
      sentDate: record.sentDate ? dayjs(record.sentDate) : null,
      arrivedDate: record.arrivedDate ? dayjs(record.arrivedDate) : null,
    });
    setModalOpen(true);
  };

  const openPay = (record) => {
    setPayTarget(record);
    payForm.setFieldsValue({ date: dayjs(), amount: record.remainingDebt || 0 });
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
          // Create new customer
          const newCust = await createCustomerMut.mutateAsync({
            name,
            phone: values.customerPhone || '',
          });
          customerId = newCust._id;
        }
      }

      const data = {
        ...values,
        wagonCode: values.wagonCode || '',
        customer: customerId,
        sentDate: values.sentDate?.toISOString(),
        arrivedDate: values.arrivedDate?.toISOString(),
      };
      delete data.customerName;
      delete data.customerPhone;

      if (editing) updateMut.mutate({ id: editing._id, data });
      else createMut.mutate(data);
    } catch { message.error('Xatolik'); }
  };

  // Summary stats
  const totalDebt = deliveries.reduce((s, d) => s + (d.totalDebt || 0), 0);
  const totalPaid = deliveries.reduce((s, d) => s + (d.paidAmount || 0), 0);
  const totalRemaining = deliveries.reduce((s, d) => s + (d.remainingDebt || 0), 0);

  const columns = [
    {
      title: 'Vagon', dataIndex: 'wagonCode', key: 'wagonCode',
      render: (v) => <Text strong style={{ fontFamily: 'monospace' }}>{v || '—'}</Text>,
    },
    {
      title: 'Mijoz', key: 'customer',
      render: (_, r) => <Text>{r.customer?.name || '—'}</Text>,
    },
    {
      title: 'Sanalar', key: 'dates',
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <div>{formatDate(r.sentDate)}</div>
          {r.arrivedDate && <div style={{ color: '#52c41a' }}>{formatDate(r.arrivedDate)}</div>}
        </div>
      ),
    },
    {
      title: 'Yuk', key: 'cargo',
      render: (_, r) => r.cargoType ? (
        <div style={{ fontSize: 12 }}>
          <div>{r.cargoType}</div>
          {r.cargoWeight && <div style={{ color: '#888' }}>{r.cargoWeight} t</div>}
        </div>
      ) : '—',
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Jami qarz', key: 'totalDebt',
      render: (_, r) => <Text strong>{formatMoney(r.totalDebt, 'USD')}</Text>,
    },
    {
      title: 'To\'lov holati', key: 'debt',
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
      title: 'Foyda', key: 'profit',
      render: (_, r) => r.paidAmount > 0 ? (
        <Text strong style={{ color: r.profit >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {r.profit >= 0 ? '+' : ''}{formatMoney(r.profit, 'USD')}
        </Text>
      ) : '—',
    },
    {
      title: '', key: 'actions', width: 120,
      render: (_, r) => (
        <Space>
          {r.debtStatus !== 'toliq' && (
            <Button size="small" type="text" style={{ color: '#1677ff' }} icon={<DollarOutlined />} onClick={() => openPay(r)} />
          )}
          {r.status === "yo'lda" && (
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

  const renderCard = (d) => {
    const pct = d.totalDebt > 0 ? Math.min(100, Math.round((d.paidAmount / d.totalDebt) * 100)) : 0;
    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={d._id}>
        <Card size="small" style={{ borderLeft: `4px solid ${STATUS_COLOR[d.status] === 'green' ? '#52c41a' : STATUS_COLOR[d.status] === 'blue' ? '#1677ff' : '#fa8c16'}`, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <Text strong style={{ fontFamily: 'monospace' }}>{d.wagonCode || '—'}</Text>
            <Tag color={STATUS_COLOR[d.status]}>{STATUS_LABEL[d.status]}</Tag>
          </div>
          <div style={{ color: '#555', fontSize: 13, marginBottom: 2 }}>{d.customer?.name || '—'}</div>
          {d.cargoType && <div style={{ color: '#888', fontSize: 12 }}>{d.cargoType}{d.cargoWeight ? ` — ${d.cargoWeight} t` : ''}</div>}
          <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>
            {formatDate(d.sentDate)}{d.arrivedDate && ` → ${formatDate(d.arrivedDate)}`}
          </div>

          <div style={{ marginTop: 8, padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
            <Descriptions size="small" column={2} labelStyle={{ color: '#888', fontSize: 11 }} contentStyle={{ fontSize: 11, fontWeight: 600 }}>
              {d.uzRate > 0 && <Descriptions.Item label={d.uzCode ? `UZ (${d.uzCode})` : 'UZ'}>${d.uzRate}/t</Descriptions.Item>}
              {d.kzRate > 0 && <Descriptions.Item label={d.kzCode ? `KZ (${d.kzCode})` : 'KZ'}>${d.kzRate}/t</Descriptions.Item>}
              {d.avgExpense > 0 && <Descriptions.Item label="AVG">{formatMoney(d.avgExpense, 'USD')}</Descriptions.Item>}
              {d.kodExpense > 0 && <Descriptions.Item label="Kod">{formatMoney(d.kodExpense, 'USD')}</Descriptions.Item>}
              {d.prastoy > 0 && <Descriptions.Item label="Prastoy">{formatMoney(d.prastoy, 'USD')}</Descriptions.Item>}
            </Descriptions>
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: DEBT_COLOR[d.debtStatus] }}>{DEBT_LABEL[d.debtStatus]}</span>
                <span>{formatMoney(d.paidAmount, 'USD')} / <strong>{formatMoney(d.totalDebt, 'USD')}</strong></span>
              </div>
              <Progress percent={pct} showInfo={false} strokeColor={DEBT_COLOR[d.debtStatus]} size="small" />
            </div>
            {d.profit !== 0 && d.paidAmount > 0 && (
              <div style={{ fontSize: 12, marginTop: 4, color: d.profit >= 0 ? '#52c41a' : '#ff4d4f' }}>
                Foyda: {d.profit >= 0 ? '+' : ''}{formatMoney(d.profit, 'USD')}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
            {d.debtStatus !== 'toliq' && (
              <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => openPay(d)}>To'lov</Button>
            )}
            {d.status === "yo'lda" && (
              <Popconfirm title="Yetkazildi?" onConfirm={() => deliverMut.mutate(d._id)}>
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
              { label: 'Barchasi', value: '' },
              { label: "Yo'lda", value: "yo'lda" },
              { label: 'Yetkazildi', value: 'yetkazildi' },
              { label: 'Yakunlandi', value: 'yakunlandi' },
            ]}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Yangi yetkazma</Button>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Jami yetkazma</span>
            <span className="summary-stat-value">{deliveries.length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Jami qarz</span>
            <span className="summary-stat-value">{formatMoney(totalDebt, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">To'langan</span>
            <span className="summary-stat-value" style={{ color: '#52c41a' }}>{formatMoney(totalPaid, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Qoldiq</span>
            <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>{formatMoney(totalRemaining, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Yakunlandi</span>
            <span className="summary-stat-value highlight">{deliveries.filter(d => d.status === 'yakunlandi').length}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'table' ? (
        <Table columns={columns} dataSource={deliveries} rowKey="_id" loading={isLoading} pagination={{ pageSize: 20 }} />
      ) : (
        <Row gutter={[16, 16]}>{deliveries.map(renderCard)}</Row>
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
        width={580}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="wagonCode" label="Vagon raqami">
                <Input placeholder="V-001 (ixtiyoriy)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customerName" label="Mijoz" rules={[{ required: true, message: 'Mijoz nomini kiriting' }]}>
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
          </Row>
          {isNewCustomer && (
            <Form.Item name="customerPhone" label="Telefon (yangi mijoz uchun, ixtiyoriy)">
              <Input placeholder="+998 90 000 00 00" />
            </Form.Item>
          )}

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="sentDate" label="Jo'natilgan">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="arrivedDate" label="Borgan">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Status">
                <Select options={[
                  { label: "Yo'lda", value: "yo'lda" },
                  { label: 'Yetkazildi', value: 'yetkazildi' },
                  { label: 'Yakunlandi', value: 'yakunlandi' },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="cargoType" label="Ichida nima">
            <Input placeholder="Yog'och, metall..." />
          </Form.Item>

          <Title level={5} style={{ margin: '8px 0 8px' }}>Chegara to'lovlari (mijoz qarzi)</Title>
          <Row gutter={12} style={{ marginBottom: 0 }}>
            <Col span={12}>
              <Form.Item name="cargoWeight" label="Yuk og'irligi (t)" style={{ marginBottom: 8 }}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" addonAfter="t" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ogirlik" label="Og'irlik yo'qotish (t)" style={{ marginBottom: 8 }}>
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
            <Col span={8}>
              <Form.Item name="avgExpense" label="AVG (USD)">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="kodExpense" label="Kod (USD)">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="prastoy" label="Prastoy (USD)">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
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
              const kod = form.getFieldValue('kodExpense') || 0;
              const pr = form.getFieldValue('prastoy') || 0;
              const total = uz + kz + avg + kod + pr;
              if (!total) return null;
              return (
                <Card size="small" style={{ background: '#fff7e6' }}>
                  {eff !== weight && weight > 0 && (
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                      Effektiv og'irlik: {weight} − {loss} = <strong>{eff} t</strong>
                    </div>
                  )}
                  <Row gutter={8}>
                    {uz > 0 && <Col span={12}><Text type="secondary">UZ: </Text><Text strong>{formatMoney(uz, 'USD')}</Text></Col>}
                    {kz > 0 && <Col span={12}><Text type="secondary">KZ: </Text><Text strong>{formatMoney(kz, 'USD')}</Text></Col>}
                    {avg > 0 && <Col span={12}><Text type="secondary">AVG: </Text><Text strong>{formatMoney(avg, 'USD')}</Text></Col>}
                    {kod > 0 && <Col span={12}><Text type="secondary">Kod: </Text><Text strong>{formatMoney(kod, 'USD')}</Text></Col>}
                    {pr > 0 && <Col span={12}><Text type="secondary">Prastoy: </Text><Text strong>{formatMoney(pr, 'USD')}</Text></Col>}
                  </Row>
                  <div style={{ marginTop: 8, borderTop: '1px solid #ffd591', paddingTop: 6 }}>
                    Mijoz qarzi: <Text strong style={{ fontSize: 16, color: '#d46b08' }}>{formatMoney(total, 'USD')}</Text>
                  </div>
                </Card>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        title={`To'lov — ${payTarget?.wagonCode || ''} (${payTarget?.customer?.name || ''})`}
        open={payModalOpen}
        onCancel={() => { setPayModalOpen(false); payForm.resetFields(); setPayTarget(null); }}
        onOk={() => payForm.submit()}
        confirmLoading={payMut.isPending}
        okText="To'lov qo'shish"
        cancelText="Bekor qilish"
      >
        {payTarget && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f6ffed', borderRadius: 8 }}>
            <Row gutter={16}>
              <Col span={8}><Text type="secondary">Jami qarz:</Text><br /><Text strong>{formatMoney(payTarget.totalDebt, 'USD')}</Text></Col>
              <Col span={8}><Text type="secondary">To'langan:</Text><br /><Text strong style={{ color: '#52c41a' }}>{formatMoney(payTarget.paidAmount, 'USD')}</Text></Col>
              <Col span={8}><Text type="secondary">Qoldiq:</Text><br /><Text strong style={{ color: '#ff4d4f' }}>{formatMoney(payTarget.remainingDebt, 'USD')}</Text></Col>
            </Row>
          </div>
        )}
        <Form form={payForm} layout="vertical" onFinish={(values) => {
          payMut.mutate({ id: payTarget._id, data: { ...values, date: values.date?.toISOString() } });
        }}>
          <Form.Item name="amount" label="To'lov summasi (USD)" rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="0" addonBefore="$" />
          </Form.Item>
          <Form.Item name="date" label="Sana">
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
