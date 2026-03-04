import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, InputNumber, Select, DatePicker,
  Input, message, Tag, Card, Row, Col, Space, Popconfirm, List,
  Typography, Descriptions,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SettingOutlined, EditOutlined, SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCashTransactions, createCashTransaction, deleteCashTransaction,
  getExpenseSources, createExpenseSource, updateExpenseSource, deleteExpenseSource,
  getWagons, addWagonExpense, getCustomers, getSuppliers,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';
import '../styles/cards.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const accountOptions = [
  { value: 'USD_account', label: 'USD hisob' },
  { value: 'RUB_personal', label: 'Shaxsiy RUB' },
  { value: 'RUB_russia', label: 'Rossiya RUB' },
];

export default function Expenses() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [detailTx, setDetailTx] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState(undefined);
  const [dateRange, setDateRange] = useState([undefined, undefined]);

  // Source editing
  const [newSourceName, setNewSourceName] = useState('');
  const [editingSource, setEditingSource] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingPercent, setEditingPercent] = useState(0);

  const filters = {
    type: 'chiqim',
    source: filterSource,
    from: dateRange[0],
    to: dateRange[1],
  };

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['cash-transactions', filters],
    queryFn: () => getCashTransactions(filters),
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['expense-sources'],
    queryFn: getExpenseSources,
  });

  const { data: wagons = [] } = useQuery({ queryKey: ['wagons'], queryFn: getWagons });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });

  const chiqimCurrency = Form.useWatch('currency', form);

  const invalidateCash = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: createCashTransaction,
    onError: (err) => message.error(err?.response?.data?.message || t('error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCashTransaction,
    onSuccess: () => { invalidateCash(); message.success(t('deleted')); },
    onError: () => message.error(t('error')),
  });

  // Source mutations
  const createSourceMutation = useMutation({
    mutationFn: createExpenseSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      setNewSourceName('');
      message.success(t('sourceAdded'));
    },
    onError: (err) => message.error(err?.response?.data?.message || t('error')),
  });

  const updateSourceMutation = useMutation({
    mutationFn: ({ id, name, profitPercent }) => updateExpenseSource(id, { name, profitPercent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      setEditingSource(null);
      message.success(t('sourceUpdated'));
    },
    onError: (err) => message.error(err?.response?.data?.message || t('error')),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: deleteExpenseSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-sources'] });
      message.success(t('sourceDeleted'));
    },
    onError: (err) => message.error(err?.response?.data?.message || t('error')),
  });

  // Stats per source
  const sourceStats = useMemo(() => {
    const map = {};
    transactions.forEach((tx) => {
      const name = tx.source?.name || tx.category || 'Boshqa';
      if (!map[name]) map[name] = { name, totalUSD: 0, totalRUB: 0, count: 0 };
      if (tx.currency === 'RUB') map[name].totalRUB += tx.amount;
      else map[name].totalUSD += tx.amount;
      map[name].count++;
    });
    return Object.values(map).sort((a, b) => b.totalUSD - a.totalUSD);
  }, [transactions]);

  const totalUSD = transactions.filter(t => t.currency === 'USD').reduce((s, t) => s + t.amount, 0);
  const totalRUB = transactions.filter(t => t.currency === 'RUB').reduce((s, t) => s + t.amount, 0);

  const chiqimSourceOptions = sources.map((s) => ({ value: s._id, label: s.name }));

  const handleCreate = async (values) => {
    const payload = {
      type: 'chiqim',
      source: values.source,
      amount: values.amount,
      currency: values.currency,
      account: values.account,
      description: values.description,
      date: values.date?.toISOString(),
    };
    if (values.relatedPerson) {
      payload.relatedPerson = values.relatedPerson;
      payload.personModel = values.personType;
    }

    try {
      await createMutation.mutateAsync(payload);

      // If RUB + wagon selected → add to wagon expenses for tannarx
      if (values.currency === 'RUB' && values.wagonId) {
        await addWagonExpense(values.wagonId, {
          description: values.description || '',
          amount: values.amount,
        });
        queryClient.invalidateQueries({ queryKey: ['wagons'] });
      }

      invalidateCash();
      message.success(t('expenseAdded'));
      setModalOpen(false);
      form.resetFields();
    } catch {
      // error handled by mutation
    }
  };

  const filtered = transactions.filter(tx => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (tx.source?.name || '').toLowerCase().includes(s) ||
      (tx.description || '').toLowerCase().includes(s) ||
      (tx.relatedPerson?.name || '').toLowerCase().includes(s);
  });

  const columns = [
    { title: t('date'), dataIndex: 'date', key: 'date', width: 100, render: formatDate },
    {
      title: t('source'), key: 'source',
      render: (_, r) => r.source?.name || r.category || '—',
    },
    {
      title: 'Kimga', key: 'person', width: 140,
      render: (_, r) => r.relatedPerson?.name || '—',
    },
    {
      title: t('amount'), dataIndex: 'amount', key: 'amount',
      render: (v, r) => <Text style={{ color: '#cf1322', fontWeight: 500 }}>−{formatMoney(v, r.currency)}</Text>,
    },
    {
      title: t('account'), dataIndex: 'account', key: 'account', width: 120,
      render: (acc) => accountOptions.find((a) => a.value === acc)?.label || acc,
    },
    { title: t('note'), dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '', key: 'del', width: 48,
      render: (_, r) => (
        <Popconfirm title={t('deleteConfirm')} onConfirm={() => deleteMutation.mutate(r._id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      {/* Source stats cards */}
      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Jami chiqim (USD)</span>
            <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>−{formatMoney(totalUSD, 'USD')}</span>
          </div>
          {totalRUB > 0 && (
            <div className="summary-stat">
              <span className="summary-stat-label">Jami chiqim (RUB)</span>
              <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>−{formatMoney(totalRUB, 'RUB')}</span>
            </div>
          )}
          <div className="summary-stat">
            <span className="summary-stat-label">Tranzaksiyalar</span>
            <span className="summary-stat-value highlight">{transactions.length}</span>
          </div>
        </div>
      </Card>

      {/* Per-source breakdown */}
      {sourceStats.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {sourceStats.map((s) => (
            <Col xs={12} sm={8} lg={6} xl={4} key={s.name}>
              <Card size="small" hoverable onClick={() => setFilterSource(
                sources.find(src => src.name === s.name)?._id || undefined
              )}>
                <Text type="secondary" style={{ fontSize: 12 }}>{s.name}</Text>
                <div>
                  {s.totalUSD > 0 && <Text strong style={{ color: '#cf1322' }}>−{formatMoney(s.totalUSD, 'USD')}</Text>}
                  {s.totalUSD > 0 && s.totalRUB > 0 && ' / '}
                  {s.totalRUB > 0 && <Text strong style={{ color: '#cf1322' }}>−{formatMoney(s.totalRUB, 'RUB')}</Text>}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>{s.count} ta</Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input
            placeholder="Qidirish..."
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="Manba"
            allowClear
            style={{ width: 170 }}
            options={chiqimSourceOptions}
            value={filterSource}
            onChange={setFilterSource}
          />
          <RangePicker onChange={(dates) => setDateRange([
            dates?.[0]?.toISOString(),
            dates?.[1]?.toISOString(),
          ])} />
        </Space>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setSourcesModalOpen(true)}>
            Manbalari
          </Button>
          <Button type="primary" danger icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            Chiqim qo&apos;shish
          </Button>
        </Space>
      </div>

      {/* Transactions table */}
      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="_id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({ onClick: () => setDetailTx(record), style: { cursor: 'pointer' } })}
      />

      {/* Detail modal */}
      <Modal
        title="Chiqim tafsilotlari"
        open={!!detailTx}
        onCancel={() => setDetailTx(null)}
        footer={null}
        width={500}
      >
        {detailTx && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label={t('date')}>{formatDate(detailTx.date)}</Descriptions.Item>
            <Descriptions.Item label={t('amount')}>
              <Text style={{ color: '#cf1322', fontWeight: 600, fontSize: 16 }}>
                −{formatMoney(detailTx.amount, detailTx.currency)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('source')}>{detailTx.source?.name || detailTx.category || '—'}</Descriptions.Item>
            <Descriptions.Item label={t('account')}>{accountOptions.find(a => a.value === detailTx.account)?.label || detailTx.account}</Descriptions.Item>
            {detailTx.relatedPerson?.name && <Descriptions.Item label="Kimga">{detailTx.relatedPerson.name}</Descriptions.Item>}
            {detailTx.description && <Descriptions.Item label={t('note')}>{detailTx.description}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>

      {/* Add expense modal — same as Cash page chiqim */}
      <Modal
        title="Chiqim qo'shish"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="source" label="Xarajat manbasi" rules={[{ required: true, message: 'Manbani tanlang' }]}>
            <Select options={chiqimSourceOptions} placeholder="Manbani tanlang" />
          </Form.Item>
          {chiqimCurrency === 'RUB' && (
            <Form.Item name="wagonId" label="Vagon (tannarxga qo'shiladi)">
              <Select
                allowClear
                placeholder="Vagonni tanlang (ixtiyoriy)"
                options={wagons
                  .filter(w => w.status !== 'sotildi')
                  .map(w => ({ value: w._id, label: `${w.wagonCode} — ${w.status}` }))}
                showSearch
                filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          )}
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label={t('currency')} initialValue="USD">
            <Select options={[{ value: 'USD', label: 'USD' }, { value: 'RUB', label: 'RUB' }]} />
          </Form.Item>
          <Form.Item name="account" label={t('account')} initialValue="USD_account">
            <Select options={accountOptions} />
          </Form.Item>
          <Form.Item name="personType" label="Kimga">
            <Select allowClear placeholder="Tanlang (ixtiyoriy)" onChange={() => form.setFieldValue('relatedPerson', undefined)}>
              <Select.Option value="Customer">Mijoz</Select.Option>
              <Select.Option value="Supplier">Yetkazuvchi</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.personType !== cur.personType}>
            {() => {
              const pt = form.getFieldValue('personType');
              if (!pt) return null;
              const opts = pt === 'Customer'
                ? customers.map(c => ({ value: c._id, label: c.name }))
                : suppliers.map(s => ({ value: s._id, label: s.name }));
              return (
                <Form.Item name="relatedPerson" label={pt === 'Customer' ? 'Mijoz' : 'Yetkazuvchi'}>
                  <Select
                    showSearch placeholder="Tanlang"
                    filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                    options={opts}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="description" label={t('note')}>
            <Input.TextArea rows={2} placeholder="Izoh..." />
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Expense sources management */}
      <Modal
        title="Xarajat manbalari"
        open={sourcesModalOpen}
        onCancel={() => { setSourcesModalOpen(false); setEditingSource(null); }}
        footer={null}
        width={500}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input placeholder="Yangi manba nomi" value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)} onPressEnter={() => {
              const name = newSourceName.trim();
              if (name) createSourceMutation.mutate({ name });
            }} />
          <Button type="primary" onClick={() => {
            const name = newSourceName.trim();
            if (name) createSourceMutation.mutate({ name });
          }} loading={createSourceMutation.isPending}>
            {t('add')}
          </Button>
        </div>

        <List
          bordered
          dataSource={sources}
          locale={{ emptyText: 'Manba yo\'q' }}
          renderItem={(item) => (
            <List.Item
              actions={
                item.isDefault
                  ? [<Tag key="default" color="blue">{t('default')}</Tag>]
                  : editingSource === item._id
                    ? [
                      <Button size="small" type="primary" key="save" onClick={() => {
                        const name = editingName.trim();
                        if (name) updateSourceMutation.mutate({ id: editingSource, name, profitPercent: editingPercent || 0 });
                      }} loading={updateSourceMutation.isPending}>{t('save')}</Button>,
                      <Button size="small" key="cancel" onClick={() => setEditingSource(null)}>{t('cancel')}</Button>,
                    ]
                    : [
                      <Button size="small" type="text" key="edit" icon={<EditOutlined />}
                        onClick={() => { setEditingSource(item._id); setEditingName(item.name); setEditingPercent(item.profitPercent || 0); }} />,
                      <Popconfirm key="delete" title={t('deleteConfirm')}
                        onConfirm={() => deleteSourceMutation.mutate(item._id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]
              }
            >
              {editingSource === item._id ? (
                <Space>
                  <Input size="small" value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ width: 160 }} />
                  <InputNumber size="small" value={editingPercent} onChange={setEditingPercent} min={0} max={100} style={{ width: 90 }} addonAfter="%" />
                </Space>
              ) : (
                <span>
                  {item.name}
                  {item.profitPercent > 0 && <Tag color="purple" style={{ marginLeft: 8 }}>{item.profitPercent}%</Tag>}
                  {item.isDefault && <Tag color="blue" style={{ marginLeft: 4 }}>{t('default')}</Tag>}
                </span>
              )}
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
