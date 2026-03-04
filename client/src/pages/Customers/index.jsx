import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Popconfirm, Space, Row, Col, Card, Segmented, Typography, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined, BarsOutlined, PhoneOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, createLentDebt, getDebtors } from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';
import '../styles/cards.css';

const { Text } = Typography;

const Customers = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [pageTab, setPageTab] = useState('customers');
  const [viewMode, setViewMode] = useState('table');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [astatkaOpen, setAstatkaOpen] = useState(false);
  const [astatkaForm] = Form.useForm();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers({ customerType: 'customer' }),
  });

  const { data: afghans, isLoading: afghansLoading } = useQuery({
    queryKey: ['afghans'],
    queryFn: () => getCustomers({ customerType: 'afghan' }),
    enabled: pageTab === 'afghans',
  });

  const { data: ozimList, isLoading: ozimLoading } = useQuery({
    queryKey: ['ozim-customers'],
    queryFn: () => getCustomers({ customerType: 'ozim' }),
    enabled: pageTab === 'ozim',
  });

  const { data: debtors, isLoading: debtorsLoading } = useQuery({
    queryKey: ['customer-debtors'],
    queryFn: getDebtors,
    enabled: pageTab === 'debtors',
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['afghans'] });
      queryClient.invalidateQueries({ queryKey: ['ozim-customers'] });
      message.success(t('customerAdded'));
      closeModal();
    },
    onError: () => message.error(t('error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['afghans'] });
      queryClient.invalidateQueries({ queryKey: ['ozim-customers'] });
      message.success(t('customerUpdated'));
      closeModal();
    },
    onError: () => message.error(t('error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['afghans'] });
      queryClient.invalidateQueries({ queryKey: ['ozim-customers'] });
      message.success(t('customerDeleted'));
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

  const openCreate = (type = 'customer') => {
    setEditingCustomer(null);
    form.resetFields();
    form.setFieldsValue({ customerType: type });
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

  const goToDetail = (record) => navigate(`/customers/${record._id}`);

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
          <Button icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); goToDetail(record); }} />
          <Button icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(record); }} />
          <Popconfirm
            title={t('deleteCustomerConfirm')}
            onConfirm={(e) => { e?.stopPropagation(); deleteMutation.mutate(record._id); }}
            onCancel={(e) => e?.stopPropagation()}
            okText={t('yes')} cancelText={t('no')}
          >
            <Button danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const currentList = pageTab === 'afghans' ? (afghans || []) : pageTab === 'ozim' ? (ozimList || []) : (customers || []);
  const filteredCustomers = currentList.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  const renderCustomerCards = () => (
    <Row gutter={[16, 16]}>
      {filteredCustomers.map((c) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={c._id}>
          <Card className="grid-card customer-card" onClick={() => goToDetail(c)} style={{ cursor: 'pointer' }}>
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
                <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(c); }} />
                <Popconfirm title={t('deleteConfirm')}
                  onConfirm={(e) => { e?.stopPropagation(); deleteMutation.mutate(c._id); }}
                  onCancel={(e) => e?.stopPropagation()}>
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const debtorColumns = [
    { title: t('name'), dataIndex: 'name', key: 'name' },
    { title: t('phone'), dataIndex: 'phone', key: 'phone' },
    { title: t('totalSaleAmount'), dataIndex: 'totalSaleAmount', key: 'totalSaleAmount', render: (v) => formatMoney(v) },
    { title: t('paid'), dataIndex: 'totalPaid', key: 'totalPaid', render: (v) => <Text style={{ color: '#52c41a' }}>{formatMoney(v)}</Text> },
    { title: t('debt'), dataIndex: 'debt', key: 'debt', render: (v) => <Text type="danger" strong>{formatMoney(v)}</Text> },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<DollarOutlined />}
          onClick={(e) => { e.stopPropagation(); goToDetail(record); }}
        >
          {t('pay')}
        </Button>
      ),
    },
  ];

  const totalDebtorsDebt = (debtors || []).reduce((s, d) => s + d.debt, 0);

  return (
    <div>
      <Tabs
        activeKey={pageTab}
        onChange={setPageTab}
        items={[
          {
            key: 'customers',
            label: `${t('customersPage')} (${(customers || []).length})`,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <Space wrap>
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
                      Astatka qo&apos;shish
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('customer')}>
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
                    dataSource={filteredCustomers}
                    loading={isLoading}
                    onRow={(record) => ({ onClick: () => goToDetail(record), style: { cursor: 'pointer' } })}
                  />
                )}
              </>
            ),
          },
          {
            key: 'afghans',
            label: `${t('afghans')} (${(afghans || []).length})`,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <Space wrap>
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
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('afghan')}>
                    {t('addAfghan')}
                  </Button>
                </div>

                <Card className="summary-card" style={{ marginBottom: 16 }}>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <span className="summary-stat-label">{t('totalAfghans')}</span>
                      <span className="summary-stat-value highlight">{(afghans || []).length}</span>
                    </div>
                  </div>
                </Card>

                {viewMode === 'card' ? renderCustomerCards() : (
                  <Table rowKey="_id" columns={columns}
                    dataSource={filteredCustomers}
                    loading={afghansLoading}
                    onRow={(record) => ({ onClick: () => goToDetail(record), style: { cursor: 'pointer' } })}
                  />
                )}
              </>
            ),
          },
          {
            key: 'ozim',
            label: `${t('ozim')} (${(ozimList || []).length})`,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <Space wrap>
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
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('ozim')}>
                    {t('addOzim')}
                  </Button>
                </div>

                <Card className="summary-card" style={{ marginBottom: 16 }}>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <span className="summary-stat-label">{t('totalOzim')}</span>
                      <span className="summary-stat-value highlight">{(ozimList || []).length}</span>
                    </div>
                  </div>
                </Card>

                {viewMode === 'card' ? renderCustomerCards() : (
                  <Table rowKey="_id" columns={columns}
                    dataSource={filteredCustomers}
                    loading={ozimLoading}
                    onRow={(record) => ({ onClick: () => goToDetail(record), style: { cursor: 'pointer' } })}
                  />
                )}
              </>
            ),
          },
          {
            key: 'debtors',
            label: `Qarzdorlar (${(debtors || []).length})`,
            children: (
              <>
                <Card className="summary-card" style={{ marginBottom: 16 }}>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <span className="summary-stat-label">Jami qarzdorlar</span>
                      <span className="summary-stat-value highlight">{(debtors || []).length}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-stat-label">Jami qarz</span>
                      <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>{formatMoney(totalDebtorsDebt)}</span>
                    </div>
                  </div>
                </Card>

                <Table
                  rowKey="_id"
                  columns={debtorColumns}
                  dataSource={debtors}
                  loading={debtorsLoading}
                  onRow={(record) => ({ onClick: () => goToDetail(record), style: { cursor: 'pointer' } })}
                />
              </>
            ),
          },
        ]}
      />

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
          <Form.Item name="customerType" hidden><Input /></Form.Item>
          <Form.Item name="name" label={t('name')} rules={[{ required: true, message: t('enterName') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('phone')}><Input /></Form.Item>
          <Form.Item name="note" label={t('note')}><Input.TextArea rows={3} /></Form.Item>
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
