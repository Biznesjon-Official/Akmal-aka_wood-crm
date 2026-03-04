import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select,
  AutoComplete, Radio, message, Tag, Space, Popconfirm, Typography, Empty, Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCoders, createCoder, updateCoder, deleteCoder, getCoderCodes,
  createWagon, createDelivery, getCustomers, createCustomer, getSuppliers,
} from '../../api';
import { formatDate } from '../../utils/format';

const { Text } = Typography;

const WAGON_STATUS_COLOR = { kelyapti: 'orange', faol: 'blue', omborda: 'cyan', sotildi: 'green' };
const DELIVERY_STATUS_COLOR = { "yo'lda": 'orange', yetkazildi: 'blue', yakunlandi: 'green' };

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
  const [dlvUzCode, setDlvUzCode] = useState('');
  const [dlvKzCode, setDlvKzCode] = useState('');
  const [dlvAvgCode, setDlvAvgCode] = useState('');
  const [dlvOgirlik, setDlvOgirlik] = useState(null);
  const [dlvUzCost, setDlvUzCost] = useState(null);
  const [dlvUzRate, setDlvUzRate] = useState(null);
  const [dlvKzCost, setDlvKzCost] = useState(null);
  const [dlvKzRate, setDlvKzRate] = useState(null);
  const [dlvAvgCost, setDlvAvgCost] = useState(null);
  const [dlvAvgExpense, setDlvAvgExpense] = useState(null);
  const [dlvPrastoy, setDlvPrastoy] = useState(null);
  const [dlvErrors, setDlvErrors] = useState({});

  const { data: coders = [] } = useQuery({ queryKey: ['coders'], queryFn: getCoders });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => getCustomers() });
  const { data: ozimCustomers = [] } = useQuery({ queryKey: ['ozim-customers'], queryFn: () => getCustomers({ customerType: 'ozim' }) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });

  const selectedCoderId = activeTab || coders[0]?._id;

  const { data: codes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['coder-codes', selectedCoderId],
    queryFn: () => getCoderCodes(selectedCoderId),
    enabled: !!selectedCoderId,
  });

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
      message.success('Vagon kodi yaratildi');
      setCodeModal(false);
    },
  });

  const createDeliveryMut = useMutation({
    mutationFn: createDelivery,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      message.success('Yetkazib berish kodi yaratildi');
      setCodeModal(false);
    },
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
    setDlvUzCode('');
    setDlvKzCode('');
    setDlvAvgCode('');
    setDlvOgirlik(null);
    setDlvUzCost(null);
    setDlvUzRate(null);
    setDlvKzCost(null);
    setDlvKzRate(null);
    setDlvAvgCost(null);
    setDlvAvgExpense(null);
    setDlvPrastoy(null);
    setDlvErrors({});
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
    // Find or create customer
    const existing = customers.find(c => c.name === dlvCustomerName);
    let customerId;
    if (existing) {
      customerId = existing._id;
    } else {
      const newCust = await createCustomerMut.mutateAsync({ name: dlvCustomerName });
      customerId = newCust._id;
    }
    createDeliveryMut.mutate({
      customer: customerId,
      wagonCode: dlvWagonCode || undefined,
      sender: dlvSender || undefined,
      sentDate: dlvSentDate?.toISOString() || null,
      cargoType: dlvCargoType || undefined,
      cargoWeight: dlvCargoWeight || undefined,
      ogirlik: dlvOgirlik || undefined,
      uzCode: dlvUzCode || undefined,
      uzCost: dlvUzCost || undefined,
      uzRate: dlvUzRate || undefined,
      kzCode: dlvKzCode || undefined,
      kzCost: dlvKzCost || undefined,
      kzRate: dlvKzRate || undefined,
      avgCode: dlvAvgCode || undefined,
      avgCost: dlvAvgCost || undefined,
      avgExpense: dlvAvgExpense || undefined,
      prastoy: dlvPrastoy || undefined,
      coder: selectedCoderId,
    });
  };

  const customerOptions = customers.map(c => ({ label: c.name, value: c.name }));

  const columns = [
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
    { title: 'Vagon kodi', dataIndex: 'wagonCode', width: 140 },
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

  const tabItems = coders.map(c => ({ key: c._id, label: c.name }));
  const currentCoder = coders.find(c => c._id === selectedCoderId);
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

          <Table
            columns={columns}
            dataSource={codes}
            rowKey="_id"
            loading={codesLoading}
            size="small"
            pagination={{ pageSize: 20 }}
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

      {/* Code creation modal */}
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
                  <td style={labelS}>{isMashina ? 'Mashina kodi' : 'Vagon kodi'} <span style={{ color: '#ff4d4f' }}>*</span></td>
                  <td style={cellS}>
                    {isMashina ? (
                      <Input size="small" value={wagonCode}
                        onChange={(e) => { const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); setWagonCode(v); if (v) setWagonErrors(p => ({ ...p, wagonCode: false })); }}
                        status={wagonErrors.wagonCode ? 'error' : undefined} placeholder="Mashina kodi" />
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
                <td style={labelS}>Vagon kodi</td>
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

              {/* UZ */}
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f6ffed' }}>
                <td colSpan={2} style={{ ...cellS, fontWeight: 600 }}>UZ kod</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>UZ kodi</td>
                <td style={cellS}>
                  <Input size="small" value={dlvUzCode} onChange={(e) => setDlvUzCode(e.target.value)} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>UZ tannarx ($/t)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvUzCost} onChange={setDlvUzCost} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>UZ sotuv ($/t)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvUzRate} onChange={setDlvUzRate} />
                </td>
              </tr>

              {/* KZ */}
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fff7e6' }}>
                <td colSpan={2} style={{ ...cellS, fontWeight: 600 }}>KZ kod</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>KZ kodi</td>
                <td style={cellS}>
                  <Input size="small" value={dlvKzCode} onChange={(e) => setDlvKzCode(e.target.value)} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>KZ tannarx ($/t)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvKzCost} onChange={setDlvKzCost} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>KZ sotuv ($/t)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvKzRate} onChange={setDlvKzRate} />
                </td>
              </tr>

              {/* AVG */}
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f0f5ff' }}>
                <td colSpan={2} style={{ ...cellS, fontWeight: 600 }}>AVG kod</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>AVG kodi</td>
                <td style={cellS}>
                  <Input size="small" value={dlvAvgCode} onChange={(e) => setDlvAvgCode(e.target.value)} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>AVG tannarx ($)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvAvgCost} onChange={setDlvAvgCost} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={labelS}>AVG sotuv ($)</td>
                <td style={cellS}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0} value={dlvAvgExpense} onChange={setDlvAvgExpense} />
                </td>
              </tr>
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
