import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, InputNumber, Select, DatePicker,
  Input, message, Tag, Card, Row, Col, Space, Popconfirm, List, Switch, Segmented, Typography, Divider,
} from 'antd';
import { WalletOutlined, SettingOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, BarsOutlined, TeamOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCashTransactions, createCashTransaction, getCashBalance,
  getExpenseSources, createExpenseSource, updateExpenseSource, deleteExpenseSource,
  getWagons, getWagonProfitSummary,
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
  { value: 'RUB_personal', label: 'Shaxsiy RUB' },
  { value: 'RUB_russia', label: 'Rossiya RUB' },
];

export default function Cash() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('table');
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
  const [editingPercent, setEditingPercent] = useState(0);
  const [partnerCalcOpen, setPartnerCalcOpen] = useState(false);
  const [selectedWagonIds, setSelectedWagonIds] = useState([]);
  const [profitData, setProfitData] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

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

  const { data: wagons = [] } = useQuery({ queryKey: ['wagons'], queryFn: getWagons });

  const partners = sources.filter(s => s.profitPercent > 0);

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
    updateSourceMutation.mutate({ id: editingSource, name, profitPercent: editingPercent || 0 });
  };

  const handleCalcProfit = async () => {
    setCalcLoading(true);
    try {
      const data = await getWagonProfitSummary(selectedWagonIds);
      setProfitData(data);
    } catch { message.error('Xatolik'); }
    finally { setCalcLoading(false); }
  };

  const handlePayPartner = async (partner, amount) => {
    await createMutation.mutateAsync({
      type: 'chiqim',
      source: partner._id,
      amount,
      currency: 'USD',
      account: 'USD_account',
      description: `Sherik ulushi: ${partner.name} (${partner.profitPercent}%)`,
      date: new Date().toISOString(),
    });
    invalidateCash();
    message.success(`${partner.name}ga to'lov qilindi`);
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

  // Compute summary stats from all transactions (unfiltered would be ideal, but use filtered as proxy)
  const totalKirimUSD = transactions.filter(t => t.type === 'kirim' && t.currency === 'USD').reduce((s, t) => s + t.amount, 0);
  const totalChiqimUSD = transactions.filter(t => t.type === 'chiqim' && t.currency === 'USD').reduce((s, t) => s + t.amount, 0);
  const totalKirimRUB = transactions.filter(t => t.type === 'kirim' && t.currency === 'RUB').reduce((s, t) => s + t.amount, 0);
  const totalChiqimRUB = transactions.filter(t => t.type === 'chiqim' && t.currency === 'RUB').reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Balans (USD)</span>
            <span className="summary-stat-value highlight">{formatMoney(balance?.USD, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Shaxsiy RUB</span>
            <span className="summary-stat-value">{(balance?.RUB_personal || 0).toLocaleString('ru')} ₽</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Rossiya RUB</span>
            <span className="summary-stat-value">{(balance?.RUB_russia || 0).toLocaleString('ru')} ₽</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Kirim (USD)</span>
            <span className="summary-stat-value" style={{ color: '#52c41a' }}>+{formatMoney(totalKirimUSD, 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Chiqim (USD)</span>
            <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>−{formatMoney(totalChiqimUSD, 'USD')}</span>
          </div>
          {totalKirimRUB > 0 && (
            <div className="summary-stat">
              <span className="summary-stat-label">Kirim (RUB)</span>
              <span className="summary-stat-value" style={{ color: '#52c41a' }}>+{formatMoney(totalKirimRUB, 'RUB')}</span>
            </div>
          )}
          {totalChiqimRUB > 0 && (
            <div className="summary-stat">
              <span className="summary-stat-label">Chiqim (RUB)</span>
              <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>−{formatMoney(totalChiqimRUB, 'RUB')}</span>
            </div>
          )}
          <div className="summary-stat">
            <span className="summary-stat-label">Jami tranzaksiya</span>
            <span className="summary-stat-value">{transactions.length}</span>
          </div>
        </div>
      </Card>

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
          <Button icon={<TeamOutlined />} onClick={() => { setProfitData(null); setSelectedWagonIds([]); setPartnerCalcOpen(true); }}>
            Sherik hisob
          </Button>
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
                        onClick={() => { setEditingSource(item._id); setEditingName(item.name); setEditingPercent(item.profitPercent || 0); }} />,
                      <Popconfirm key="delete" title="O'chirishni tasdiqlaysizmi?"
                        onConfirm={() => deleteSourceMutation.mutate(item._id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]
              }
            >
              {editingSource === item._id ? (
                <Space style={{ width: '100%' }}>
                  <Input size="small" value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ width: 160 }} />
                  <InputNumber size="small" value={editingPercent} onChange={setEditingPercent} min={0} max={100} style={{ width: 90 }} addonAfter="%" placeholder="Foiz" />
                </Space>
              ) : (
                <span>
                  {item.name}
                  {item.profitPercent > 0 && <Tag color="purple" style={{ marginLeft: 8 }}>{item.profitPercent}%</Tag>}
                  {item.isDefault && <Tag color="blue" style={{ marginLeft: 4 }}>Default</Tag>}
                </span>
              )}
            </List.Item>
          )}
        />
      </Modal>

      {/* Partner profit calculation modal */}
      <Modal
        title={<><TeamOutlined /> Sherik hisob-kitob</>}
        open={partnerCalcOpen}
        onCancel={() => setPartnerCalcOpen(false)}
        footer={null}
        width={680}
      >
        <div style={{ marginBottom: 12 }}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Vagonlarni tanlang (bo'sh = barchasi)"
            value={selectedWagonIds}
            onChange={setSelectedWagonIds}
            options={wagons.map(w => ({ label: `${w.wagonCode} (${w.status})`, value: w._id }))}
            showSearch
            filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
          />
        </div>
        <Button type="primary" loading={calcLoading} onClick={handleCalcProfit} style={{ marginBottom: 16 }}>
          Foydani hisoblash
        </Button>

        {profitData && (
          <>
            <Table
              size="small"
              pagination={false}
              style={{ marginBottom: 16 }}
              dataSource={profitData}
              rowKey="_id"
              columns={[
                { title: 'Vagon', dataIndex: 'wagonCode', key: 'wagonCode' },
                { title: 'Xarajat', dataIndex: 'totalCostUSD', key: 'cost', render: v => formatMoney(v, 'USD') },
                { title: 'Daromad', dataIndex: 'totalIncomeUSD', key: 'income', render: v => <Text style={{ color: '#52c41a' }}>{formatMoney(v, 'USD')}</Text> },
                {
                  title: 'Sof foyda', dataIndex: 'profitUSD', key: 'profit',
                  render: v => <Text strong style={{ color: v >= 0 ? '#389e0d' : '#ff4d4f' }}>{formatMoney(v, 'USD')}</Text>,
                },
              ]}
              summary={(rows) => {
                const totalProfit = rows.reduce((s, r) => s + r.profitUSD, 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}><Text strong>Jami</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1}><Text strong>{formatMoney(rows.reduce((s, r) => s + r.totalCostUSD, 0), 'USD')}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={2}><Text strong style={{ color: '#52c41a' }}>{formatMoney(rows.reduce((s, r) => s + r.totalIncomeUSD, 0), 'USD')}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={3}><Text strong style={{ color: totalProfit >= 0 ? '#389e0d' : '#ff4d4f' }}>{formatMoney(totalProfit, 'USD')}</Text></Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />

            {partners.length > 0 && (
              <>
                <Divider>Sherik ulushlar</Divider>
                {partners.map(partner => {
                  const totalProfit = profitData.reduce((s, r) => s + r.profitUSD, 0);
                  const share = Math.max(0, totalProfit) * partner.profitPercent / 100;
                  return (
                    <Card key={partner._id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>{partner.name}</Text>
                          <Tag color="purple" style={{ marginLeft: 8 }}>{partner.profitPercent}%</Tag>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Text strong style={{ fontSize: 16, color: '#389e0d' }}>
                            <DollarOutlined /> {formatMoney(share, 'USD')}
                          </Text>
                          <Popconfirm
                            title={`${partner.name}ga ${formatMoney(share, 'USD')} to'lansinmi?`}
                            onConfirm={() => handlePayPartner(partner, share)}
                          >
                            <Button size="small" type="primary" disabled={share <= 0}>
                              To'lov qilish
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </>
            )}

            {partners.length === 0 && (
              <Text type="secondary">Foiz belgilangan sherik yo'q. "Chiqim manbalari" da sherik foizini belgilang.</Text>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
