import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Descriptions, Table, Button, Tag, Modal, Form, Input, InputNumber,
  Select, DatePicker, Space, Typography, message, Popconfirm, Divider,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getWagon, updateWagon, bundleToWarehouse, updateExpenses } from '../../api';
import { formatDate, formatM3, formatMoney, statusLabels, statusColors } from '../../utils/format';

const { Title } = Typography;

export default function WagonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [bundleForm] = Form.useForm();
  const [expenseForm] = Form.useForm();

  const { data: wagon, isLoading } = useQuery({
    queryKey: ['wagon', id],
    queryFn: () => getWagon(id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wagon', id] });

  // Update wagon mutation
  const updateMutation = useMutation({
    mutationFn: (data) => updateWagon(id, data),
    onSuccess: () => {
      invalidate();
      message.success('Yangilandi');
      setEditOpen(false);
    },
    onError: () => message.error('Xatolik yuz berdi'),
  });

  // Move bundle to warehouse
  const warehouseMutation = useMutation({
    mutationFn: (index) => bundleToWarehouse(id, index),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['wagons'] });
      message.success("Omborga o'tkazildi");
    },
  });

  // Update expenses
  const expenseMutation = useMutation({
    mutationFn: (expenses) => updateExpenses(id, expenses),
    onSuccess: () => {
      invalidate();
      message.success('Xarajat saqlandi');
    },
  });

  // Handlers
  const handleEdit = (values) => {
    updateMutation.mutate({
      ...values,
      sentDate: values.sentDate?.toISOString(),
      arrivedDate: values.arrivedDate?.toISOString(),
    });
  };

  const openEditModal = () => {
    editForm.setFieldsValue({
      ...wagon,
      sentDate: wagon.sentDate ? dayjs(wagon.sentDate) : null,
      arrivedDate: wagon.arrivedDate ? dayjs(wagon.arrivedDate) : null,
    });
    setEditOpen(true);
  };

  const handleAddBundle = (values) => {
    const bundles = [...(wagon.woodBundles || []), { ...values, location: 'vagon' }];
    updateMutation.mutate({ woodBundles: bundles });
    setBundleOpen(false);
    bundleForm.resetFields();
  };

  const handleAddExpense = (values) => {
    const expenses = [...(wagon.expenses || []), values];
    expenseMutation.mutate(expenses);
    expenseForm.resetFields();
  };

  const handleDeleteExpense = (index) => {
    const expenses = (wagon.expenses || []).filter((_, i) => i !== index);
    expenseMutation.mutate(expenses);
  };

  // Columns
  const expenseColumns = [
    { title: 'Tavsif', dataIndex: 'description', key: 'description' },
    { title: 'Summa', dataIndex: 'amount', key: 'amount', render: (v, r) => formatMoney(v, r.currency) },
    { title: 'Valyuta', dataIndex: 'currency', key: 'currency' },
    {
      title: 'Amal',
      key: 'action',
      render: (_, __, index) => (
        <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => handleDeleteExpense(index)}>
          <Button type="link" danger size="small">O'chirish</Button>
        </Popconfirm>
      ),
    },
  ];

  const bundleColumns = [
    { title: 'Qalinlik (mm)', dataIndex: 'thickness', key: 'thickness' },
    { title: 'Kenglik (mm)', dataIndex: 'width', key: 'width' },
    { title: 'Uzunlik (mm)', dataIndex: 'length', key: 'length' },
    { title: 'Soni', dataIndex: 'count', key: 'count' },
    { title: 'Qoldiq', dataIndex: 'remainingCount', key: 'remainingCount' },
    { title: 'm³/dona', dataIndex: 'm3PerPiece', key: 'm3PerPiece', render: formatM3 },
    { title: 'Jami m³', dataIndex: 'totalM3', key: 'totalM3', render: formatM3 },
    {
      title: 'Joylashuv',
      dataIndex: 'location',
      key: 'location',
      render: (loc) => <Tag color={loc === 'vagon' ? 'blue' : 'green'}>{loc === 'vagon' ? 'Vagon' : 'Ombor'}</Tag>,
    },
    {
      title: 'Amal',
      key: 'action',
      render: (_, record, index) =>
        record.location === 'vagon' && (
          <Popconfirm title="Omborga o'tkazasizmi?" onConfirm={() => warehouseMutation.mutate(index)}>
            <Button type="link" size="small">Omborga o'tkazish</Button>
          </Popconfirm>
        ),
    },
  ];

  if (isLoading || !wagon) return null;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/wagons')}>Ortga</Button>
        <Button type="primary" icon={<EditOutlined />} onClick={openEditModal}>Tahrirlash</Button>
      </Space>

      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Vagon kodi">{wagon.wagonCode}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={statusColors[wagon.status]}>{statusLabels[wagon.status] || wagon.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Yuborilgan sana">{formatDate(wagon.sentDate)}</Descriptions.Item>
        <Descriptions.Item label="Kelgan sana">{formatDate(wagon.arrivedDate)}</Descriptions.Item>
        <Descriptions.Item label="Qayerdan">{wagon.origin || '-'}</Descriptions.Item>
        <Descriptions.Item label="Qayerga">{wagon.destination || '-'}</Descriptions.Item>
        <Descriptions.Item label="NDS">{wagon.nds || '-'}</Descriptions.Item>
        <Descriptions.Item label="KZ kod">{wagon.kzCode || '-'}</Descriptions.Item>
        <Descriptions.Item label="UZ kod">{wagon.uzCode || '-'}</Descriptions.Item>
        <Descriptions.Item label="Jami m³">{formatM3(wagon.totalM3)}</Descriptions.Item>
        <Descriptions.Item label="Tannarx/m³">{formatMoney(wagon.costPricePerM3)}</Descriptions.Item>
      </Descriptions>

      {/* Xarajatlar */}
      <Divider />
      <Title level={4}>Xarajatlar</Title>
      <Table
        columns={expenseColumns}
        dataSource={(wagon.expenses || []).map((e, i) => ({ ...e, key: i }))}
        pagination={false}
        size="small"
        style={{ marginBottom: 16 }}
      />
      <Form form={expenseForm} layout="inline" onFinish={handleAddExpense} style={{ marginBottom: 24 }}>
        <Form.Item name="description" rules={[{ required: true, message: 'Tavsif' }]}>
          <Input placeholder="Tavsif" />
        </Form.Item>
        <Form.Item name="amount" rules={[{ required: true, message: 'Summa' }]}>
          <InputNumber placeholder="Summa" min={0} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="currency" initialValue="USD">
          <Select style={{ width: 100 }} options={[
            { value: 'USD', label: 'USD' },
            { value: 'UZS', label: 'UZS' },
            { value: 'KZT', label: 'KZT' },
          ]} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={expenseMutation.isPending}>Qo'shish</Button>
        </Form.Item>
      </Form>

      {/* Yog'och to'plamlari */}
      <Divider />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Yog'och to'plamlari</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setBundleOpen(true)}>Bundle qo'shish</Button>
      </div>
      <Table
        columns={bundleColumns}
        dataSource={(wagon.woodBundles || []).map((b, i) => ({ ...b, key: i }))}
        pagination={false}
        size="small"
      />

      {/* Edit Modal */}
      <Modal
        title="Vagonni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="wagonCode" label="Vagon kodi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sentDate" label="Yuborilgan sana">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="arrivedDate" label="Kelgan sana">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="origin" label="Qayerdan">
            <Input />
          </Form.Item>
          <Form.Item name="destination" label="Qayerga">
            <Input />
          </Form.Item>
          <Form.Item name="nds" label="NDS">
            <Input />
          </Form.Item>
          <Form.Item name="kzCode" label="KZ kod">
            <Input />
          </Form.Item>
          <Form.Item name="uzCode" label="UZ kod">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Bundle Modal */}
      <Modal
        title="Bundle qo'shish"
        open={bundleOpen}
        onCancel={() => { setBundleOpen(false); bundleForm.resetFields(); }}
        onOk={() => bundleForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={bundleForm} layout="vertical" onFinish={handleAddBundle}>
          <Form.Item name="thickness" label="Qalinlik (mm)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="width" label="Kenglik (mm)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="length" label="Uzunlik (mm)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="count" label="Soni" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
