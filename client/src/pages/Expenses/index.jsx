import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Select, Table, Button, InputNumber, Input, Card, Space, Popconfirm,
  message, Tag, Typography, Row, Col, Descriptions, Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getWagons, updateExpenses } from '../../api';
import { formatMoney, formatM3 } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

const { Text } = Typography;

const WOOD_EXPENSE_KEY = "Yog'och xaridi";

const currencyOptions = [
  { value: 'USD', label: 'USD' },
  { value: 'RUB', label: 'RUB' },
];

export default function Expenses() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedWagonId, setSelectedWagonId] = useState(null);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState(null);
  const [newCurrency, setNewCurrency] = useState('USD');

  const { data: wagons = [] } = useQuery({
    queryKey: ['wagons'],
    queryFn: () => getWagons(),
  });

  // Only active wagons (not sotildi)
  const activeWagons = wagons.filter(w => w.status !== 'sotildi' && w.wagonCode !== 'ASTATKA');
  const selectedWagon = wagons.find(w => w._id === selectedWagonId);

  // Non-wood expenses only
  const expenses = (selectedWagon?.expenses || []).filter(e => e.description !== WOOD_EXPENSE_KEY);
  const woodExpense = (selectedWagon?.expenses || []).find(e => e.description === WOOD_EXPENSE_KEY);

  const updateMut = useMutation({
    mutationFn: ({ id, expenses: exps }) => updateExpenses(id, exps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wagons'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      message.success(t('updated'));
    },
    onError: () => message.error(t('error')),
  });

  const handleAdd = () => {
    if (!newDesc.trim() || !newAmount || newAmount <= 0) {
      message.warning('Xarajat nomi va summani kiriting');
      return;
    }
    const allExpenses = [...(selectedWagon?.expenses || [])];
    allExpenses.push({ description: newDesc.trim(), amount: newAmount, currency: newCurrency });
    updateMut.mutate({ id: selectedWagonId, expenses: allExpenses });
    setNewDesc('');
    setNewAmount(null);
    setNewCurrency('USD');
  };

  const handleRemove = (idx) => {
    // Find the actual index in full expenses array (including wood)
    const nonWoodExpenses = expenses.filter((_, i) => i !== idx);
    const allExpenses = [];
    if (woodExpense) allExpenses.push(woodExpense);
    allExpenses.push(...nonWoodExpenses);
    updateMut.mutate({ id: selectedWagonId, expenses: allExpenses });
  };

  const columns = [
    { title: 'Xarajat turi', dataIndex: 'description', key: 'description' },
    {
      title: 'Summa', dataIndex: 'amount', key: 'amount',
      render: (v, r) => <Text strong>{formatMoney(v, r.currency)}</Text>,
    },
    {
      title: 'Valyuta', dataIndex: 'currency', key: 'currency',
      render: (v) => <Tag color={v === 'RUB' ? 'orange' : 'green'}>{v}</Tag>,
    },
    {
      title: '', key: 'del', width: 48,
      render: (_, _r, idx) => (
        <Popconfirm title={t('deleteConfirm')} onConfirm={() => handleRemove(idx)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // Tannarx calculation
  const rate = selectedWagon?.exchangeRate || 0;
  const totalM3 = selectedWagon?.totalM3 || 0;
  const usdTotal = (selectedWagon?.expenses || []).filter(e => e.currency === 'USD').reduce((s, e) => s + (e.amount || 0), 0);
  const rubTotal = (selectedWagon?.expenses || []).filter(e => e.currency === 'RUB').reduce((s, e) => s + (e.amount || 0), 0);
  const rubInUsd = rate > 0 ? rubTotal / rate : 0;
  const totalExpUsd = usdTotal + rubInUsd;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Xarajatlar</h2>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%' }} direction="vertical" size={12}>
          <div>
            <Text strong>Vagonni tanlang:</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Vagon tanlang"
              showSearch
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              value={selectedWagonId}
              onChange={setSelectedWagonId}
              options={activeWagons.map(w => ({
                value: w._id,
                label: `${w.wagonCode} — ${w.type === 'mashina' ? 'Mashina' : 'Vagon'} (${w.status})`,
              }))}
            />
          </div>
        </Space>
      </Card>

      {selectedWagon && (
        <>
          {/* Wagon info summary */}
          <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Vagon kodi</Text>
                <div><Text strong>{selectedWagon.wagonCode}</Text></div>
              </Col>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Jami m³</Text>
                <div><Text strong>{formatM3(totalM3)}</Text></div>
              </Col>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tannarx/m³</Text>
                <div>
                  <Text strong style={{ color: '#1677ff', fontSize: 16 }}>
                    {selectedWagon.costPricePerM3 > 0 ? formatMoney(selectedWagon.costPricePerM3) : '—'}
                  </Text>
                </div>
              </Col>
              <Col span={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>Yog'och xaridi</Text>
                <div>
                  <Text strong style={{ color: '#d46b08' }}>
                    {woodExpense ? `${woodExpense.amount.toLocaleString('ru-RU')} RUB` : '—'}
                  </Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Expenses table */}
          <Table
            columns={columns}
            dataSource={expenses}
            rowKey={(_, idx) => idx}
            pagination={false}
            size="small"
            style={{ marginBottom: 16 }}
            locale={{ emptyText: 'Xarajatlar yo\'q' }}
          />

          {/* Add expense form */}
          <Card size="small" title="Yangi xarajat qo'shish" style={{ marginBottom: 16 }}>
            <Row gutter={8} align="middle">
              <Col flex="auto">
                <Input
                  placeholder="Xarajat nomi (NDS, transport...)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </Col>
              <Col>
                <InputNumber
                  placeholder="Summa"
                  min={0.01}
                  value={newAmount}
                  onChange={setNewAmount}
                  style={{ width: 120 }}
                />
              </Col>
              <Col>
                <Select
                  value={newCurrency}
                  onChange={setNewCurrency}
                  options={currencyOptions}
                  style={{ width: 80 }}
                />
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  loading={updateMut.isPending}
                >
                  Qo'shish
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Tannarx breakdown */}
          <Card size="small" title="Tannarx hisoblash">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="USD xarajatlar">{formatMoney(usdTotal)}</Descriptions.Item>
              <Descriptions.Item label="RUB xarajatlar">{rubTotal.toLocaleString('ru-RU')} RUB</Descriptions.Item>
              <Descriptions.Item label="Kurs">{rate > 0 ? `1 USD = ${rate} RUB` : <Text type="danger">Belgilanmagan</Text>}</Descriptions.Item>
              <Descriptions.Item label="RUB → USD">{rate > 0 ? formatMoney(rubInUsd) : '—'}</Descriptions.Item>
              <Descriptions.Item label="Jami xarajat (USD)"><Text strong>{formatMoney(totalExpUsd)}</Text></Descriptions.Item>
              <Descriptions.Item label="Jami m³"><Text strong>{formatM3(totalM3)}</Text></Descriptions.Item>
              <Descriptions.Item label="Tannarx/m³">
                <Text strong style={{ color: '#1677ff', fontSize: 16 }}>
                  {selectedWagon.costPricePerM3 > 0 ? formatMoney(selectedWagon.costPricePerM3) : '—'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </>
      )}
    </div>
  );
}
