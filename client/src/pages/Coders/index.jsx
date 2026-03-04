import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select,
  AutoComplete, Radio, message, Tag, Space, Popconfirm, Typography, Empty,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCoders, createCoder, updateCoder, deleteCoder, getCoderCodes,
  createWagon, createDelivery, getCustomers, createCustomer, getSuppliers,
} from '../../api';
import { formatDate } from '../../utils/format';

const { Text } = Typography;

const WAGON_STATUS_COLOR = { kelyapti: 'orange', faol: 'blue', omborda: 'cyan', sotildi: 'green' };
const DELIVERY_STATUS_COLOR = { "yo'lda": 'orange', yetkazildi: 'blue', yakunlandi: 'green' };

export default function Coders() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(null);
  const [coderModal, setCoderModal] = useState(false);
  const [editingCoder, setEditingCoder] = useState(null);
  const [codeModal, setCodeModal] = useState(false);
  const [codeType, setCodeType] = useState('wagon');
  const [coderForm] = Form.useForm();
  const [wagonForm] = Form.useForm();
  const [deliveryForm] = Form.useForm();
  const [customerTyped, setCustomerTyped] = useState('');

  const { data: coders = [] } = useQuery({ queryKey: ['coders'], queryFn: getCoders });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
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
      wagonForm.resetFields();
    },
  });

  const createDeliveryMut = useMutation({
    mutationFn: createDelivery,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      message.success('Yetkazib berish kodi yaratildi');
      setCodeModal(false);
      deliveryForm.resetFields();
      setCustomerTyped('');
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
    wagonForm.resetFields();
    deliveryForm.resetFields();
    setCustomerTyped('');
    setCodeModal(true);
  };

  const handleWagonSubmit = async () => {
    const values = await wagonForm.validateFields();
    createWagonMut.mutate({
      ...values,
      sentDate: values.sentDate?.toISOString() || null,
      coder: selectedCoderId,
    });
  };

  const handleDeliverySubmit = async () => {
    const values = await deliveryForm.validateFields();
    // Find or create customer
    const existing = customers.find(c => c.name === values.customerName);
    let customerId;
    if (existing) {
      customerId = existing._id;
    } else {
      const newCust = await createCustomerMut.mutateAsync({ name: values.customerName });
      customerId = newCust._id;
    }
    const { customerName, ...rest } = values;
    createDeliveryMut.mutate({
      ...rest,
      customer: customerId,
      sentDate: values.sentDate?.toISOString() || null,
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
    {
      title: 'Vagon kodi',
      dataIndex: 'wagonCode',
      width: 140,
    },
    {
      title: 'Mijoz',
      dataIndex: 'customer',
      width: 160,
      render: (c) => c?.name || '-',
    },
    {
      title: 'Sana',
      dataIndex: 'sentDate',
      width: 120,
      render: (d) => d ? formatDate(d) : '-',
    },
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

  // Build tabs
  const tabItems = coders.map(c => ({
    key: c._id,
    label: c.name,
  }));

  const currentCoder = coders.find(c => c._id === selectedCoderId);

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
        okText="Saqlash"
        cancelText="Bekor"
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
        okText="Yaratish"
        cancelText="Bekor"
        width={600}
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
          <Form form={wagonForm} layout="vertical">
            <Form.Item name="type" label="Turi" initialValue="vagon">
              <Select options={[
                { label: 'Vagon', value: 'vagon' },
                { label: 'Mashina', value: 'mashina' },
              ]} />
            </Form.Item>
            <Form.Item name="wagonCode" label="Kod" rules={[{ required: true, message: 'Kodni kiriting' }]}>
              <Input placeholder="Vagon yoki mashina kodi" />
            </Form.Item>
            <Form.Item name="sentDate" label="Yuborilgan sana">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="origin" label="Qayerdan">
              <Input />
            </Form.Item>
            <Form.Item name="destination" label="Qayerga">
              <Input />
            </Form.Item>
            <Form.Item name="supplier" label="Yetkazuvchi">
              <Select
                allowClear
                placeholder="Tanlang"
                options={suppliers.map(s => ({ label: s.name, value: s._id }))}
              />
            </Form.Item>
          </Form>
        ) : (
          <Form form={deliveryForm} layout="vertical">
            <Form.Item name="customerName" label="Mijoz" rules={[{ required: true, message: 'Mijozni kiriting' }]}>
              <AutoComplete
                options={customerOptions}
                filterOption={(input, option) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
                onSearch={setCustomerTyped}
                placeholder="Mijoz nomi"
              />
            </Form.Item>
            <Form.Item name="wagonCode" label="Vagon kodi">
              <Input />
            </Form.Item>
            <Form.Item name="sender" label="Kimdan (supplier)">
              <Select
                allowClear
                placeholder="Tanlang"
                options={suppliers.map(s => ({ label: s.name, value: s._id }))}
              />
            </Form.Item>
            <Form.Item name="sentDate" label="Yuborilgan sana">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="cargoType" label="Yuk turi">
              <Input />
            </Form.Item>
            <Form.Item name="cargoWeight" label="Og'irlik (t)">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="uzCode" label="UZ kodi">
              <Input />
            </Form.Item>
            <Form.Item name="kzCode" label="KZ kodi">
              <Input />
            </Form.Item>
            <Form.Item name="avgCode" label="AVG kodi">
              <Input />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
