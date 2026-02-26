import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, InputNumber, Select, DatePicker,
  Input, message, Tag, Card, Row, Col, Statistic, Space, Popconfirm, List, Switch, Segmented, Typography,
} from 'antd';
import { WalletOutlined, SettingOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCashTransactions, createCashTransaction, getCashBalance,
  getExpenseSources, createExpenseSource, updateExpenseSource, deleteExpenseSource,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import '../styles/cards.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const typeOptions = [
  { value: 'kirim', label: 'Kirim' },
  { value: 'chiqim', label: 'Chiqim' },
];

const kirimSourceOptions = [
  { value: 'sotuv', label: 'Yog\'och sotuvi' },
  { value: 'qarz_tolovi', label: 'Qarz to\'lovi' },
  { value: 'yetkazma', label: 'Yetkazma daromadi' },
  { value: 'boshqa', label: 'Boshqa' },
];

const kirimSourceMap = Object.fromEntries(kirimSourceOptions.map((o) => [o.value, o.label]));

const currencyOptions = [
  { value: 'USD', label: 'USD' },
  { value: 'RUB', label: 'RUB' },
];

const accountOptions = [
  { value: 'USD_account', label: 'USD hisob' },
  { value: 'RUB_account', label: 'RUB hisob' },
];

export default function Cash() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('card');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [partnerEnabled, setPartnerEnabled] = useState(false);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    type: undefined,
    source: undefined,
    from: undefined,
    to: undefined,
  });

  const [newSourceName, setNewSourceName] = useState('');
  const [editingSource, setEditingSource] = useState(null);
  const [editingName, setEditingName] = useState('');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['cash-transactions', filters],
    queryFn: () => getCashTransactions(filters),
  });

  const { data: balance } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: getCashBalance,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['expense-sources'],
    queryFn: getExpenseSources,
  });

  const invalidateCash = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: createCashTransaction,
    onError: (err) => message.error(err?.response?.data?.message || 'Xatolik yuz berdi'),
  });

  const createSourceMutation = useMutation({
    mutationFn: createExpenseSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      setNewSourceName('');
      message.success('Manba qo\'shildi');
    },
    onError: (err) => message.error(err?.response?.data?.message || 'Xatolik'),
  });

  const updateSourceMutation = useMutation({
    mutationFn: ({ id, name }) => updateExpenseSource(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      setEditingSource(null);
      message.success('Manba yangilandi');
    },
    onError: (err) => message.error(err?.response?.data?.message || 'Xatolik'),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: deleteExpenseSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      message.success('Manba o\'chirildi');
    },
    onError: (err) => message.error(err?.response?.data?.message || 'Xatolik'),
  });

  const handleCreate = async (values) => {
    const payload = {
      type: modalType,
      amount: values.amount,
      currency: values.currency,
      account: values.account,
      description: values.description,
      date: values.date?.toISOString(),
    };

    if (modalType === 'kirim') {
      payload.category = values.category;
    } else {
      payload.source = values.source;
    }

    try {
      await createMutation.mutateAsync(payload);

      // Partner share on kirim
      if (modalType === 'kirim' && partnerEnabled && values.partnerAmount > 0) {
        const sherikSource = sources.find((s) => s.isDefault);
        if (sherikSource) {
          await createMutation.mutateAsync({
            type: 'chiqim',
            source: sherikSource._id,
            amount: values.partnerAmount,
            currency: 'USD',
            account: 'USD_account',
            description: `Sherik ulushi: ${values.description || kirimSourceMap[values.category] || ''}`,
            date: values.date?.toISOString(),
          });
        }
      }

      invalidateCash();
      message.success(modalType === 'kirim' ? 'Kirim qo\'shildi' : 'Xarajat qo\'shildi');
      setModalOpen(false);
      setPartnerEnabled(false);
      form.resetFields();
    } catch {
      // error handled by mutation
    }
  };

  const handleDateRange = (dates) => {
    setFilters((prev) => ({
      ...prev,
      from: dates?.[0]?.toISOString(),
      to: dates?.[1]?.toISOString(),
    }));
  };

  const openModal = (type) => {
    setModalType(type);
    setPartnerEnabled(false);
    form.resetFields();
    setModalOpen(true);
  };

  const handleAddSource = () => {
    const name = newSourceName.trim();
    if (!name) return;
    createSourceMutation.mutate({ name });
  };

  const handleUpdateSource = () => {
    const name = editingName.trim();
    if (!name || !editingSource) return;
    updateSourceMutation.mutate({ id: editingSource, name });
  };

  const chiqimSourceOptions = sources.map((s) => ({ value: s._id, label: s.name }));

  const categoryLabels = {
    sotuv: 'Yog\'och sotuvi', qarz_tolovi: 'Qarz to\'lovi', yetkazma: 'Yetkazma',
    xarid: 'Yog\'och xaridi', transport: 'Transport', soliq: 'Soliq', boshqa: 'Boshqa',
  };

  const getSourceName = (record) => {
    if (record.type === 'kirim') {
      return kirimSourceMap[record.category] || categoryLabels[record.category] || record.category || '—';
    }
    if (record.source?.name) return record.source.name;
    return categoryLabels[record.category] || record.description || '—';
  };

  const columns = [
    { title: 'Sana', dataIndex: 'date', key: 'date', render: formatDate },
    {
      title: 'Turi', dataIndex: 'type', key: 'type',
      render: (type) => <Tag color={type === 'kirim' ? 'green' : 'red'}>{type === 'kirim' ? 'Kirim' : 'Chiqim'}</Tag>,
    },
    { title: 'Manba', key: 'source', render: (_, record) => getSourceName(record) },
    {
      title: 'Summa', dataIndex: 'amount', key: 'amount',
      render: (amount, record) => (
        <span style={{ color: record.type === 'chiqim' ? '#cf1322' : '#389e0d', fontWeight: 500 }}>
          {record.type === 'chiqim' ? '−' : '+'}{formatMoney(amount, record.currency)}
        </span>
      ),
    },
    {
      title: 'Hisob', dataIndex: 'account', key: 'account',
      render: (acc) => accountOptions.find((a) => a.value === acc)?.label || acc,
    },
    { title: 'Izoh', dataIndex: 'description', key: 'description', ellipsis: true },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic title="USD hisob balansi" value={balance?.USD}
              prefix={<WalletOutlined />} formatter={(val) => formatMoney(val, 'USD')} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic title="RUB hisob balansi" value={balance?.RUB}
              prefix={<WalletOutlined />} formatter={(val) => formatMoney(val, 'RUB')} />
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space wrap>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'card', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <BarsOutlined /> },
            ]} />
          <Select placeholder="Turi" allowClear style={{ width: 150 }} options={typeOptions}
            onChange={(val) => setFilters((prev) => ({ ...prev, type: val }))} />
          <Select placeholder="Chiqim manbasi" allowClear style={{ width: 170 }} options={chiqimSourceOptions}
            onChange={(val) => setFilters((prev) => ({ ...prev, source: val }))} />
          <RangePicker onChange={handleDateRange} />
        </Space>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setSourcesModalOpen(true)}>
            Chiqim manbalari
          </Button>
          <Button type="primary" style={{ background: '#389e0d' }} onClick={() => openModal('kirim')}>
            + Kirim
          </Button>
          <Button type="primary" danger onClick={() => openModal('chiqim')}>
            + Chiqim
          </Button>
        </Space>
      </div>

      {viewMode === 'card' ? (
        <Row gutter={[12, 12]}>
          {transactions.map((tx) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={tx._id}>
              <Card className={`grid-card cash-card ${tx.type}`} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Tag color={tx.type === 'kirim' ? 'green' : 'red'}>{tx.type === 'kirim' ? 'Kirim' : 'Chiqim'}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(tx.date)}</Text>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: tx.type === 'chiqim' ? '#cf1322' : '#389e0d', marginBottom: 4 }}>
                  {tx.type === 'chiqim' ? '−' : '+'}{formatMoney(tx.amount, tx.currency)}
                </div>
                <div className="grid-card-row">
                  <Text type="secondary" style={{ fontSize: 12 }}>Manba:</Text>
                  <Text style={{ fontSize: 12 }}>{getSourceName(tx)}</Text>
                </div>
                <div className="grid-card-row">
                  <Text type="secondary" style={{ fontSize: 12 }}>Hisob:</Text>
                  <Text style={{ fontSize: 12 }}>{accountOptions.find((a) => a.value === tx.account)?.label || tx.account}</Text>
                </div>
                {tx.description && <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }} ellipsis>{tx.description}</Text>}
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Table columns={columns} dataSource={transactions} rowKey="_id" loading={isLoading} pagination={{ pageSize: 20 }} />
      )}

      {/* Create transaction modal */}
      <Modal
        title={modalType === 'kirim' ? 'Kirim qo\'shish' : 'Chiqim qo\'shish'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setPartnerEnabled(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          {modalType === 'kirim' ? (
            <Form.Item name="category" label="Kirim manbasi" rules={[{ required: true, message: 'Manbani tanlang' }]}>
              <Select options={kirimSourceOptions} placeholder="Tanlang" />
            </Form.Item>
          ) : (
            <Form.Item name="source" label="Chiqim manbasi" rules={[{ required: true, message: 'Manbani tanlang' }]}>
              <Select options={chiqimSourceOptions} placeholder="Tanlang" />
            </Form.Item>
          )}
          <Form.Item name="amount" label="Summa" rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label="Valyuta" initialValue="USD">
            <Select options={currencyOptions} />
          </Form.Item>
          <Form.Item name="account" label="Hisob" initialValue="USD_account">
            <Select options={accountOptions} />
          </Form.Item>
          <Form.Item name="description" label="Izoh">
            <Input.TextArea rows={3} placeholder="Izoh..." />
          </Form.Item>
          <Form.Item name="date" label="Sana" initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {modalType === 'kirim' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: partnerEnabled ? 8 : 0 }}>
                <Switch checked={partnerEnabled} onChange={setPartnerEnabled} size="small" />
                <span>Sherikka ulush berish (USD)</span>
              </div>
              {partnerEnabled && (
                <Form.Item name="partnerAmount" label="Sherik ulushi (USD)" style={{ marginTop: 8 }}
                  rules={[{ required: partnerEnabled, message: 'Summani kiriting' }]}>
                  <InputNumber style={{ width: '100%' }} min={0.01} placeholder="0" />
                </Form.Item>
              )}
            </>
          )}
        </Form>
      </Modal>

      {/* Chiqim sources management modal */}
      <Modal
        title="Chiqim manbalari"
        open={sourcesModalOpen}
        onCancel={() => { setSourcesModalOpen(false); setEditingSource(null); }}
        footer={null}
        width={500}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input placeholder="Yangi manba nomi" value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)} onPressEnter={handleAddSource} />
          <Button type="primary" onClick={handleAddSource} loading={createSourceMutation.isPending}>
            Qo'shish
          </Button>
        </div>

        <List
          bordered
          dataSource={sources}
          locale={{ emptyText: 'Manbalar yo\'q' }}
          renderItem={(item) => (
            <List.Item
              actions={
                item.isDefault
                  ? [<Tag key="default" color="blue">Default</Tag>]
                  : editingSource === item._id
                    ? [
                      <Button size="small" type="primary" key="save" onClick={handleUpdateSource}
                        loading={updateSourceMutation.isPending}>Saqlash</Button>,
                      <Button size="small" key="cancel" onClick={() => setEditingSource(null)}>Bekor</Button>,
                    ]
                    : [
                      <Button size="small" type="text" key="edit" icon={<EditOutlined />}
                        onClick={() => { setEditingSource(item._id); setEditingName(item.name); }} />,
                      <Popconfirm key="delete" title="O'chirishni tasdiqlaysizmi?"
                        onConfirm={() => deleteSourceMutation.mutate(item._id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]
              }
            >
              {editingSource === item._id ? (
                <Input size="small" value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onPressEnter={handleUpdateSource} style={{ width: '100%' }} />
              ) : (
                <span>{item.name} {item.isDefault && <Tag color="blue" style={{ marginLeft: 8 }}>Default</Tag>}</span>
              )}
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
