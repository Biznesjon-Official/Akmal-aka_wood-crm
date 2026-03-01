import { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Space, Card,
  Segmented, Row, Col, Typography, Drawer, Tag, Descriptions, Tabs, DatePicker, List } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, BarsOutlined,
  PhoneOutlined, EyeOutlined, SwapOutlined, WalletOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierWagons,
  getCashBalance, getRubTransactions, transferRub } from '../../api';
import { formatDate, formatM3, statusLabels, statusColors } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';
import '../styles/cards.css';

const { Text } = Typography;

// ==================== RUB ACCOUNTS SECTION ====================
function RubAccounts() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [transferOpen, setTransferOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [form] = Form.useForm();

  const { data: balance = {} } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: getCashBalance,
  });

  const { data: personalTx = [], isLoading: personalLoading } = useQuery({
    queryKey: ['rub-tx-personal'],
    queryFn: () => getRubTransactions('RUB_personal'),
  });

  const { data: russiaTx = [], isLoading: russiaLoading } = useQuery({
    queryKey: ['rub-tx-russia'],
    queryFn: () => getRubTransactions('RUB_russia'),
  });

  const transferMutation = useMutation({
    mutationFn: transferRub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['rub-tx-personal'] });
      queryClient.invalidateQueries({ queryKey: ['rub-tx-russia'] });
      message.success(t('transferSuccess'));
      setTransferOpen(false);
      form.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const handleTransfer = async () => {
    const values = await form.validateFields();
    transferMutation.mutate({
      ...values,
      date: values.date?.toISOString() || new Date().toISOString(),
    });
  };

  const txColumns = [
    { title: t('date'), dataIndex: 'date', key: 'date', width: 100, render: (v) => formatDate(v) },
    {
      title: t('type'),
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (tp) => tp === 'kirim'
        ? <Tag color="green">{t('income')}</Tag>
        : <Tag color="red">{t('expense')}</Tag>,
    },
    {
      title: t('amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (v, r) => (
        <Text style={{ color: r.type === 'kirim' ? '#52c41a' : '#ff4d4f' }}>
          {r.type === 'kirim' ? '+' : '-'}{v?.toLocaleString('ru')} ₽
        </Text>
      ),
    },
    { title: t('note'), dataIndex: 'description', key: 'description', ellipsis: true },
  ];

  const rubPersonal = balance.RUB_personal || 0;
  const rubRussia = balance.RUB_russia || 0;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>
          <WalletOutlined style={{ marginRight: 8 }} />
          {t('rubAccounts')}
        </Text>
        <Button icon={<SwapOutlined />} onClick={() => setTransferOpen(true)}>
          {t('personalToRussia')}
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" style={{ background: rubPersonal >= 0 ? '#f6ffed' : '#fff1f0', border: `1px solid ${rubPersonal >= 0 ? '#b7eb8f' : '#ffa39e'}` }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('personalShort')}</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: rubPersonal >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {rubPersonal.toLocaleString('ru')} ₽
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ background: rubRussia >= 0 ? '#e6f7ff' : '#fff1f0', border: `1px solid ${rubRussia >= 0 ? '#91d5ff' : '#ffa39e'}` }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('russiaShort')}</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: rubRussia >= 0 ? '#1677ff' : '#ff4d4f' }}>
              {rubRussia.toLocaleString('ru')} ₽
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs
        size="small"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'personal',
            label: t('personalHistory'),
            children: (
              <Table
                rowKey="_id"
                columns={txColumns}
                dataSource={personalTx}
                loading={personalLoading}
                size="small"
                pagination={{ pageSize: 10, size: 'small' }}
                locale={{ emptyText: t('noTransactions') }}
              />
            ),
          },
          {
            key: 'russia',
            label: t('russiaHistory'),
            children: (
              <Table
                rowKey="_id"
                columns={txColumns}
                dataSource={russiaTx}
                loading={russiaLoading}
                size="small"
                pagination={{ pageSize: 10, size: 'small' }}
                locale={{ emptyText: t('noTransactions') }}
              />
            ),
          },
        ]}
      />

      <Modal
        title={t('rubTransferModal')}
        open={transferOpen}
        onOk={handleTransfer}
        onCancel={() => { setTransferOpen(false); form.resetFields(); }}
        confirmLoading={transferMutation.isPending}
        okText={t('transfer')}
        cancelText={t('cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label={t('amountRub')} rules={[{ required: true, message: t('enterAmount') }]}>
            <InputNumber style={{ width: '100%' }} min={1} formatter={(v) => v?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} placeholder="0" />
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder="Ixtiyoriy" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ==================== MAIN PAGE ====================
const Suppliers = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('table');
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  });

  const { data: supplierWagons, isLoading: wagonsLoading } = useQuery({
    queryKey: ['supplier-wagons', selectedSupplier?._id],
    queryFn: () => getSupplierWagons(selectedSupplier._id),
    enabled: !!selectedSupplier?._id,
  });

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success(t('supplierAdded'));
      closeModal();
    },
    onError: () => message.error(t('error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success(t('supplierUpdated'));
      closeModal();
    },
    onError: () => message.error(t('error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      message.success(t('supplierDeleted'));
    },
    onError: () => message.error(t('error')),
  });

  const openCreate = () => {
    setEditingSupplier(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingSupplier(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSupplier(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier._id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openDrawer = (record) => {
    setSelectedSupplier(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedSupplier(null);
  };

  const getWoodCost = (wagon) => {
    const wood = (wagon.expenses || []).find(e => e.description === "Yog'och xaridi" && e.currency === 'RUB');
    return wood ? wood.amount : 0;
  };

  const wagonColumns = [
    { title: t('code'), dataIndex: 'wagonCode', key: 'wagonCode', width: 110 },
    {
      title: t('type'), dataIndex: 'type', key: 'type', width: 80,
      render: (tp) => tp === 'mashina' ? <Tag color="blue">Mashina</Tag> : <Tag color="green">Vagon</Tag>,
    },
    {
      title: t('status'), dataIndex: 'status', key: 'status', width: 90,
      render: (s) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
    },
    { title: t('origin'), dataIndex: 'origin', key: 'origin', width: 100 },
    { title: t('arrivedDate'), dataIndex: 'arrivedDate', key: 'arrivedDate', width: 100, render: (v) => formatDate(v) },
    { title: t('totalM3'), dataIndex: 'totalM3', key: 'totalM3', width: 90, render: (v) => formatM3(v) },
    {
      title: "Yog'och (₽)", key: 'woodCost', width: 120,
      render: (_, r) => {
        const amt = getWoodCost(r);
        return amt ? amt.toLocaleString('ru') + ' ₽' : '—';
      },
    },
  ];

  const columns = [
    { title: t('name'), dataIndex: 'name', key: 'name' },
    { title: t('phone'), dataIndex: 'phone', key: 'phone' },
    { title: t('note'), dataIndex: 'note', key: 'note', ellipsis: true },
    { title: t('date'), dataIndex: 'createdAt', key: 'createdAt', render: (val) => formatDate(val) },
    {
      title: t('actions'), key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => openDrawer(record)} />
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title={t('deleteSupplierConfirm')}
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText={t('yes')} cancelText={t('no')}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderCards = () => (
    <Row gutter={[16, 16]}>
      {(suppliers || []).map((s) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={s._id}>
          <Card className="grid-card customer-card">
            <div className="grid-card-title">{s.name}</div>
            {s.phone && (
              <div style={{ marginBottom: 4 }}>
                <PhoneOutlined style={{ color: '#999', marginRight: 6 }} />
                <Text type="secondary">{s.phone}</Text>
              </div>
            )}
            {s.note && <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{s.note}</Text>}
            <div className="grid-card-footer">
              <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(s.createdAt)}</Text>
              <Space size="small">
                <Button size="small" icon={<EyeOutlined />} onClick={() => openDrawer(s)} />
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(s)} />
                <Popconfirm title={t('deleteConfirm')}
                  onConfirm={() => deleteMutation.mutate(s._id)}>
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
      {/* RUB Accounts Section */}
      <RubAccounts />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <h2 style={{ margin: 0 }}>{t('suppliersPage')}</h2>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'card', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <BarsOutlined /> },
            ]} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('addSupplier')}
        </Button>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">{t('totalSuppliers')}</span>
            <span className="summary-stat-value highlight">{(suppliers || []).length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('withPhone')}</span>
            <span className="summary-stat-value">{(suppliers || []).filter(s => s.phone).length}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'card' ? renderCards() : (
        <Table rowKey="_id" columns={columns} dataSource={suppliers} loading={isLoading} />
      )}

      {/* Create / Edit Modal */}
      <Modal
        title={editingSupplier ? t('editSupplier') : t('addSupplier')}
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

      {/* Supplier Detail Drawer */}
      <Drawer
        title={selectedSupplier?.name}
        open={drawerOpen}
        onClose={closeDrawer}
        size="large"
        width={760}
      >
        {selectedSupplier && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label={t('phone')}>{selectedSupplier.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label={t('created')}>{formatDate(selectedSupplier.createdAt)}</Descriptions.Item>
              {selectedSupplier.note && (
                <Descriptions.Item label={t('note')} span={2}>{selectedSupplier.note}</Descriptions.Item>
              )}
            </Descriptions>

            <h3 style={{ marginBottom: 12 }}>
              {t('wagons')}
              {supplierWagons && (
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
                  ({supplierWagons.length} ta)
                </Text>
              )}
            </h3>
            <Table
              rowKey="_id"
              columns={wagonColumns}
              dataSource={supplierWagons}
              loading={wagonsLoading}
              size="small"
              pagination={false}
              locale={{ emptyText: 'Vagon yo\'q' }}
              scroll={{ x: 700 }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default Suppliers;
