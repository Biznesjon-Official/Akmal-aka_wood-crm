import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select,
  AutoComplete, Radio, message, Tag, Space, Popconfirm, Typography, Empty, Divider, Checkbox,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, MinusCircleOutlined } from '@ant-design/icons';
import {
  getCoders, createCoder, updateCoder, deleteCoder, getCoderCodes,
  addCoderCode, removeCoderCode, assignCoderCode,
  createWagon, createDelivery, getCustomers, createCustomer, getSuppliers,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';

const { Text } = Typography;

const WAGON_STATUS_COLOR = { kelyapti: 'orange', faol: 'blue', omborda: 'cyan', sotildi: 'green' };
const DELIVERY_STATUS_COLOR = { "yo'lda": 'orange', yetkazildi: 'blue', yakunlandi: 'green' };
const CODE_TYPE_COLOR = { UZ: 'green', KZ: 'orange', AVG: 'blue' };

const cellS = { padding: '6px 10px' };
const labelS = { ...cellS, fontWeight: 500, background: '#fafafa', whiteSpace: 'nowrap', width: 160 };

export default function Coders() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(null);
  const [coderModal, setCoderModal] = useState(false);
  const [editingCoder, setEditingCoder] = useState(null);
  const [codeModal, setCodeModal] = useState(false);
  const [codeType, setCodeType] = useState('wagon');
  const [coderForm] = Form.useForm();
  const [subTab, setSubTab] = useState('inventory');

  // Add code modal state
  const [addCodeModal, setAddCodeModal] = useState(false);
  const [addCodeForm] = Form.useForm();

  // Wagon state
  const [wagonType, setWagonType] = useState('vagon');
  const [wagonCode, setWagonCode] = useState('');
  const [wagonSentDate, setWagonSentDate] = useState(null);
  const [wagonOrigin, setWagonOrigin] = useState('');
  const [wagonDestination, setWagonDestination] = useState('');
  const [wagonSupplier, setWagonSupplier] = useState(null);
  const [wagonCustomer, setWagonCustomer] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [wagonErrors, setWagonErrors] = useState({});

  // Delivery state
  const [dlvCustomerName, setDlvCustomerName] = useState('');
  const [dlvWagonCode, setDlvWagonCode] = useState('');
  const [dlvSender, setDlvSender] = useState(null);
  const [dlvSentDate, setDlvSentDate] = useState(null);
  const [dlvCargoType, setDlvCargoType] = useState('');
  const [dlvCargoWeight, setDlvCargoWeight] = useState(null);
  const [dlvOgirlik, setDlvOgirlik] = useState(null);
  const [dlvPrastoy, setDlvPrastoy] = useState(null);
  const [dlvErrors, setDlvErrors] = useState({});
  const [dlvSelectedCodes, setDlvSelectedCodes] = useState([]);

  const { data: coders = [] } = useQuery({ queryKey: ['coders'], queryFn: getCoders });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => getCustomers() });
  const { data: ozimCustomers = [] } = useQuery({ queryKey: ['ozim-customers'], queryFn: () => getCustomers({ customerType: 'ozim' }) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });

  const selectedCoderId = activeTab || coders[0]?._id;
  const currentCoder = coders.find(c => c._id === selectedCoderId);

  const { data: codes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['coder-codes', selectedCoderId],
    queryFn: () => getCoderCodes(selectedCoderId),
    enabled: !!selectedCoderId,
  });

  // Get inventory codes from currentCoder
  const inventoryCodes = currentCoder?.codes || [];
  const availableCodes = inventoryCodes.filter(c => c.status === 'mavjud');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['coders'] });
    queryClient.invalidateQueries({ queryKey: ['coder-codes'] });
  };

  const createCoderMut = useMutation({
    mutationFn: createCoder,
    onSuccess: (data) => {
      invalidate();
      setActiveTab(data._id);
      message.success('Kodchi yaratildi');
      setCoderModal(false);
    },
  });

  const updateCoderMut = useMutation({
    mutationFn: ({ id, data }) => updateCoder(id, data),
    onSuccess: () => { invalidate(); message.success('Yangilandi'); setCoderModal(false); },
  });

  const deleteCoderMut = useMutation({
    mutationFn: deleteCoder,
    onSuccess: () => {
      invalidate();
      setActiveTab(null);
      message.success("O'chirildi");
    },
  });

  const createCustomerMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  const createWagonMut = useMutation({
    mutationFn: createWagon,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['wagons'] });
      message.success('Vagon yaratildi');
      setCodeModal(false);
    },
  });

  const createDeliveryMut = useMutation({
    mutationFn: async (data) => {
      const { _selectedCodeIds, ...dlvData } = data;
      const delivery = await createDelivery(dlvData);
      // Assign selected codes
      if (_selectedCodeIds?.length && dlvData.coder) {
        await Promise.all(_selectedCodeIds.map(codeId =>
          assignCoderCode(dlvData.coder, codeId, { assignedTo: delivery._id, assignedModel: 'Delivery' })
        ));
      }
      return delivery;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      message.success('Yetkazib berish yaratildi');
      setCodeModal(false);
    },
  });

  const addCodeMut = useMutation({
    mutationFn: (data) => addCoderCode(selectedCoderId, data),
    onSuccess: () => {
      invalidate();
      message.success('Kod qo\'shildi');
      setAddCodeModal(false);
      addCodeForm.resetFields();
    },
  });

  const removeCodeMut = useMutation({
    mutationFn: (codeId) => removeCoderCode(selectedCoderId, codeId),
    onSuccess: () => { invalidate(); message.success('Kod o\'chirildi'); },
  });

  // Coder modal handlers
  const openNewCoder = () => {
    setEditingCoder(null);
    coderForm.resetFields();
    setCoderModal(true);
  };

  const openEditCoder = (coder) => {
    setEditingCoder(coder);
    coderForm.setFieldsValue(coder);
    setCoderModal(true);
  };

  const handleCoderSubmit = async () => {
    const values = await coderForm.validateFields();
    if (editingCoder) {
      updateCoderMut.mutate({ id: editingCoder._id, data: values });
    } else {
      createCoderMut.mutate(values);
    }
  };

  // Code modal handlers
  const openCodeModal = () => {
    setCodeType('wagon');
    resetWagonForm();
    resetDeliveryForm();
    setCodeModal(true);
  };

  const resetWagonForm = () => {
    setWagonType('vagon');
    setWagonCode('');
    setWagonSentDate(null);
    setWagonOrigin('');
    setWagonDestination('');
    setWagonSupplier(null);
    setWagonCustomer(null);
    setBundles([]);
    setWagonErrors({});
  };

  const resetDeliveryForm = () => {
    setDlvCustomerName('');
    setDlvWagonCode('');
    setDlvSender(null);
    setDlvSentDate(null);
    setDlvCargoType('');
    setDlvCargoWeight(null);
    setDlvOgirlik(null);
    setDlvPrastoy(null);
    setDlvErrors({});
    setDlvSelectedCodes([]);
  };

  const handleWagonSubmit = () => {
    const errs = {};
    const isMashina = wagonType === 'mashina';
    if (!isMashina && (!wagonCode || wagonCode.length !== 8)) errs.wagonCode = true;
    if (isMashina && !wagonCode) errs.wagonCode = true;
    if (Object.keys(errs).length) {
      setWagonErrors(errs);
      message.warning('Kod kiritish majburiy');
      return;
    }
    createWagonMut.mutate({
      type: wagonType,
      wagonCode,
      origin: wagonOrigin || undefined,
      destination: wagonDestination || undefined,
      supplier: wagonSupplier || undefined,
      customer: wagonCustomer || undefined,
      sentDate: wagonSentDate?.toISOString() || null,
      woodBundles: bundles.filter(b => b.thickness && b.width && b.length && b.count),
      coder: selectedCoderId,
    });
  };

  const handleDeliverySubmit = async () => {
    const errs = {};
    if (!dlvCustomerName) errs.customerName = true;
    if (Object.keys(errs).length) {
      setDlvErrors(errs);
      message.warning('Mijozni kiriting');
      return;
    }
    const existing = customers.find(c => c.name === dlvCustomerName);
    let customerId;
    if (existing) {
      customerId = existing._id;
    } else {
      const newCust = await createCustomerMut.mutateAsync({ name: dlvCustomerName });
      customerId = newCust._id;
    }

    // Map selected codes to delivery fields
    const selCodes = inventoryCodes.filter(c => dlvSelectedCodes.includes(c._id));
    const uzSel = selCodes.find(c => c.type === 'UZ');
    const kzSel = selCodes.find(c => c.type === 'KZ');
    const avgSel = selCodes.find(c => c.type === 'AVG');

    createDeliveryMut.mutate({
      customer: customerId,
      wagonCode: dlvWagonCode || undefined,
      sender: dlvSender || undefined,
      sentDate: dlvSentDate?.toISOString() || null,
      cargoType: dlvCargoType || undefined,
      cargoWeight: dlvCargoWeight || undefined,
      ogirlik: dlvOgirlik || undefined,
      uzCode: uzSel?.name || undefined,
      uzCost: uzSel?.costPrice || undefined,
      uzRate: uzSel?.sellPrice || undefined,
      kzCode: kzSel?.name || undefined,
      kzCost: kzSel?.costPrice || undefined,
      kzRate: kzSel?.sellPrice || undefined,
      avgCode: avgSel?.name || undefined,
      avgCost: avgSel?.costPrice || undefined,
      avgExpense: avgSel?.sellPrice || undefined,
      prastoy: dlvPrastoy || undefined,
      coder: selectedCoderId,
      _selectedCodeIds: dlvSelectedCodes,
    });
  };

  const customerOptions = customers.map(c => ({ label: c.name, value: c.name }));

  // History table columns
  const historyColumns = [
    {
      title: 'Turi',
      dataIndex: 'type',
      width: 120,
      render: (t) => (
        <Tag color={t === 'wagon' ? 'blue' : 'purple'}>
          {t === 'wagon' ? 'Vagon' : 'Yetkazib berish'}
        </Tag>
      ),
    },
    { title: 'Vagon raqami', dataIndex: 'wagonCode', width: 140 },
    { title: 'Mijoz', dataIndex: 'customer', width: 160, render: (c) => c?.name || '-' },
    { title: 'Sana', dataIndex: 'sentDate', width: 120, render: (d) => d ? formatDate(d) : '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (s, row) => {
        const colorMap = row.type === 'wagon' ? WAGON_STATUS_COLOR : DELIVERY_STATUS_COLOR;
        return <Tag color={colorMap[s]}>{s}</Tag>;
      },
    },
  ];

  // Inventory table columns
  const inventoryColumns = [
    { title: 'Nomi', dataIndex: 'name', width: 140 },
    {
      title: 'Turi',
      dataIndex: 'type',
      width: 80,
      render: (t) => <Tag color={CODE_TYPE_COLOR[t]}>{t}</Tag>,
    },
    {
      title: 'Tannarx',
      dataIndex: 'costPrice',
      width: 100,
      render: (v, row) => v ? `${formatMoney(v)} ${row.currency}` : '-',
    },
    {
      title: 'Sotuv narxi',
      dataIndex: 'sellPrice',
      width: 100,
      render: (v, row) => v ? `${formatMoney(v)} ${row.currency}` : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (s) => <Tag color={s === 'mavjud' ? 'green' : 'red'}>{s}</Tag>,
    },
    {
      title: 'Biriktirilgan',
      dataIndex: 'assignedModel',
      width: 140,
      render: (model) => {
        if (!model) return '-';
        return <Tag color="blue">{model === 'Wagon' ? 'Vagon' : 'Delivery'}</Tag>;
      },
    },
    {
      title: '',
      width: 50,
      render: (_, row) => row.status === 'mavjud' ? (
        <Popconfirm title="Kodni o'chirish?" onConfirm={() => removeCodeMut.mutate(row._id)}>
          <Button size="small" danger icon={<DeleteOutlined />} type="text" />
        </Popconfirm>
      ) : null,
    },
  ];

  const tabItems = coders.map(c => ({ key: c._id, label: c.name }));
  const isMashina = wagonType === 'mashina';

  return (
    <div>
      <Tabs
        activeKey={selectedCoderId}
        onChange={setActiveTab}
        type="card"
        tabBarExtraContent={
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewCoder} size="small">
            Kodchi qo'shish
          </Button>
        }
        items={tabItems}
      />

      {currentCoder ? (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Text strong>{currentCoder.name}</Text>
            {currentCoder.phone && <Text type="secondary">{currentCoder.phone}</Text>}
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditCoder(currentCoder)} />
            <Popconfirm title="Kodchini o'chirish?" onConfirm={() => deleteCoderMut.mutate(currentCoder._id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
            <Button type="primary" onClick={openCodeModal}>Kod olish</Button>
          </Space>

          <Tabs
            activeKey={subTab}
            onChange={setSubTab}
            size="small"
            items={[
              {
                key: 'inventory',
                label: `Kodlar inventoriya (${inventoryCodes.length})`,
                children: (
                  <div>
                    <Button
                      type="dashed" icon={<PlusOutlined />} size="small"
                      style={{ marginBottom: 12 }}
                      onClick={() => { addCodeForm.resetFields(); setAddCodeModal(true); }}
                    >
                      Kod qo'shish
                    </Button>
                    <Table
                      columns={inventoryColumns}
                      dataSource={inventoryCodes}
                      rowKey="_id"
                      size="small"
                      pagination={false}
                    />
                  </div>
                ),
              },
              {
                key: 'history',
                label: `Kodlar tarixi (${codes.length})`,
                children: (
                  <Table
                    columns={historyColumns}
                    dataSource={codes}
                    rowKey="_id"
                    loading={codesLoading}
                    size="small"
                    pagination={{ pageSize: 20 }}
                  />
                ),
              },
            ]}
          />
        </div>
      ) : (
        <Empty description="Kodchi tanlanmagan. Yangi kodchi qo'shing." />
      )}

      {/* Coder create/edit modal */}
      <Modal
        title={editingCoder ? 'Kodchini tahrirlash' : 'Yangi kodchi'}
        open={coderModal}
        onOk={handleCoderSubmit}
        onCancel={() => setCoderModal(false)}
        confirmLoading={createCoderMut.isPending || updateCoderMut.isPending}
        okText="Saqlash" cancelText="Bekor"
      >
        <Form form={coderForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Ism" rules={[{ required: true, message: 'Ismni kiriting' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add code to inventory modal */}
      <Modal
        title="Yangi kod qo'shish"
        open={addCodeModal}
        onOk={() => addCodeForm.validateFields().then(v => addCodeMut.mutate(v))}
        onCancel={() => setAddCodeModal(false)}
        confirmLoading={addCodeMut.isPending}
        okText="Qo'shish" cancelText="Bekor"
      >
        <Form form={addCodeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Kod nomi" rules={[{ required: true, message: 'Nom kiriting' }]}>
            <Input placeholder="UZ-1234" />
          </Form.Item>
          <Form.Item name="type" label="Turi" rules={[{ required: true, message: 'Turini tanlang' }]}>
            <Select options={[
              { label: 'UZ', value: 'UZ' },
              { label: 'KZ', value: 'KZ' },
              { label: 'AVG', value: 'AVG' },
            ]} />
          </Form.Item>
          <Form.Item name="costPrice" label="Tannarx">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
          </Form.Item>
          <Form.Item name="sellPrice" label="Sotuv narxi">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label="Valyuta" initialValue="USD">
            <Select options={[
              { label: 'USD', value: 'USD' },
              { label: 'RUB', value: 'RUB' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Code creation modal (wagon/delivery) */}
      <Modal
        title="Kod olish"
        open={codeModal}
        onOk={codeType === 'wagon' ? handleWagonSubmit : handleDeliverySubmit}
        onCancel={() => setCodeModal(false)}
        confirmLoading={createWagonMut.isPending || createDeliveryMut.isPending}
        okText="Yaratish" cancelText="Bekor"
        width={700}
      >
        <Radio.Group
          value={codeType}
          onChange={(e) => setCodeType(e.target.value)}
          style={{ marginBottom: 16 }}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: "O'zimga (Vagon)", value: 'wagon' },
            { label: 'Yetkazib berish uchun', value: 'delivery' },
          ]}
        />

        {codeType === 'wagon' ? (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>Turi</td>
                  <td style={cellS}>
                    <Select size="small" style={{ width: '100%' }} value={wagonType} onChange={setWagonType}
                      options={[{ label: 'Vagon', value: 'vagon' }, { label: 'Mashina', value: 'mashina' }]} />
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>{isMashina ? 'Mashina raqami' : 'Vagon raqami'} <span style={{ color: '#ff4d4f' }}>*</span></td>
                  <td style={cellS}>
                    {isMashina ? (
                      <Input size="small" value={wagonCode}
                        onChange={(e) => { const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); setWagonCode(v); if (v) setWagonErrors(p => ({ ...p, wagonCode: false })); }}
                        status={wagonErrors.wagonCode ? 'error' : undefined} placeholder="Mashina raqami" />
                    ) : (
                      <Input size="small" value={wagonCode}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 8); setWagonCode(v); if (v) setWagonErrors(p => ({ ...p, wagonCode: false })); }}
                        status={wagonErrors.wagonCode ? 'error' : undefined} placeholder="8 ta raqam"
                        maxLength={8} suffix={<Text type="secondary">{wagonCode.length}/8</Text>} />
                    )}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>Yuborilgan sana</td>
                  <td style={cellS}>
                    <DatePicker size="small" value={wagonSentDate} style={{ width: '100%' }} onChange={setWagonSentDate} />
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>Qayerdan</td>
                  <td style={cellS}>
                    <Input size="small" value={wagonOrigin} onChange={(e) => setWagonOrigin(e.target.value)} />
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>Qayerga</td>
                  <td style={cellS}>
                    <Input size="small" value={wagonDestination} onChange={(e) => setWagonDestination(e.target.value)} />
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>Yetkazuvchi</td>
                  <td style={cellS}>
                    <Select size="small" style={{ width: '100%' }} allowClear placeholder="Tanlang"
                      value={wagonSupplier} onChange={setWagonSupplier}
                      options={suppliers.map(s => ({ value: s._id, label: s.name }))} />
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>O&apos;zim (Mijoz)</td>
                  <td style={cellS}>
                    <Select size="small" style={{ width: '100%' }} allowClear placeholder="Tanlang"
                      value={wagonCustomer} onChange={setWagonCustomer}
                      showSearch optionFilterProp="label"
                      options={ozimCustomers.map(c => ({ value: c._id, label: c.name }))} />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Wood bundles */}
            <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Yog'ochlar</Divider>
            {bundles.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                <thead>
                  <tr>
                    <th style={{ ...cellS, textAlign: 'left', fontWeight: 500, background: '#fafafa' }}>Qalinlik (mm)</th>
                    <th style={{ ...cellS, textAlign: 'left', fontWeight: 500, background: '#fafafa' }}>Eni (mm)</th>
                    <th style={{ ...cellS, textAlign: 'left', fontWeight: 500, background: '#fafafa' }}>Uzunlik (m)</th>
                    <th style={{ ...cellS, textAlign: 'left', fontWeight: 500, background: '#fafafa' }}>Soni (dona)</th>
                    <th style={{ ...cellS, textAlign: 'left', fontWeight: 500, background: '#fafafa', width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bundles.map((b, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="mm"
                        value={b.thickness} onChange={(v) => setBundles(p => p.map((x, i) => i === idx ? { ...x, thickness: v } : x))} /></td>
                      <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="mm"
                        value={b.width} onChange={(v) => setBundles(p => p.map((x, i) => i === idx ? { ...x, width: v } : x))} /></td>
                      <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="m" step={0.1}
                        value={b.length} onChange={(v) => setBundles(p => p.map((x, i) => i === idx ? { ...x, length: v } : x))} /></td>
                      <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={1} placeholder="0"
                        value={b.count} onChange={(v) => setBundles(p => p.map((x, i) => i === idx ? { ...x, count: v } : x))} /></td>
                      <td style={cellS}><MinusCircleOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }}
                        onClick={() => setBundles(p => p.filter((_, i) => i !== idx))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Button size="small" type="dashed" icon={<PlusOutlined />} block
              onClick={() => setBundles(p => [...p, { thickness: null, width: null, length: null, count: null }])}>
              Yog'och qo'shish
            </Button>
          </>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>Mijoz <span style={{ color: '#ff4d4f' }}>*</span></td>
                <td style={cellS}>
                  <AutoComplete size="small" style={{ width: '100%' }}
                    options={customerOptions}
                    filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                    value={dlvCustomerName}
                    onChange={(v) => { setDlvCustomerName(v); if (v) setDlvErrors(p => ({ ...p, customerName: false })); }}
                    placeholder="Mijoz nomi"
                    status={dlvErrors.customerName ? 'error' : undefined}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>Vagon raqami</td>
                <td style={cellS}>
                  <Input size="small" value={dlvWagonCode} onChange={(e) => setDlvWagonCode(e.target.value)} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>Kimdan (supplier)</td>
                <td style={cellS}>
                  <Select size="small" style={{ width: '100%' }} allowClear placeholder="Tanlang"
                    value={dlvSender} onChange={setDlvSender}
                    options={suppliers.map(s => ({ label: s.name, value: s._id }))} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>Yuborilgan sana</td>
                <td style={cellS}>
                  <DatePicker size="small" value={dlvSentDate} style={{ width: '100%' }} onChange={setDlvSentDate} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>Yuk turi</td>
                <td style={cellS}>
                  <Input size="small" value={dlvCargoType} onChange={(e) => setDlvCargoType(e.target.value)} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>Og'irlik (t)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvCargoWeight} onChange={setDlvCargoWeight} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>Og'irlik yo'qotish (t)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvOgirlik} onChange={setDlvOgirlik} />
                </td>
              </tr>

              {/* Code selection from inventory */}
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f6ffed' }}>
                <td colSpan={2} style={{ ...cellS, fontWeight: 600 }}>Kodlar tanlash (inventoriyadan)</td>
              </tr>
              {availableCodes.length > 0 ? (
                availableCodes.map(code => (
                  <tr key={code._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td colSpan={2} style={cellS}>
                      <Checkbox
                        checked={dlvSelectedCodes.includes(code._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Only allow one code per type
                            setDlvSelectedCodes(prev => {
                              const filtered = prev.filter(id => {
                                const existing = inventoryCodes.find(c => c._id === id);
                                return existing?.type !== code.type;
                              });
                              return [...filtered, code._id];
                            });
                          } else {
                            setDlvSelectedCodes(prev => prev.filter(id => id !== code._id));
                          }
                        }}
                      >
                        <Tag color={CODE_TYPE_COLOR[code.type]}>{code.type}</Tag>
                        <Text strong>{code.name}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          tannarx: {formatMoney(code.costPrice)} {code.currency} / sotuv: {formatMoney(code.sellPrice)} {code.currency}
                        </Text>
                      </Checkbox>
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td colSpan={2} style={{ ...cellS, color: '#999' }}>Mavjud kodlar yo'q</td>
                </tr>
              )}

              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>Prastoy ($)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvPrastoy} onChange={setDlvPrastoy} />
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
