import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, InputNumber, DatePicker, Input, message, Card, Typography, Space, Popconfirm, Segmented } from 'antd';
import { PlusOutlined, DeleteOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  convertCurrency, getConversions, deleteConversion,
  createTopUp, getTopUps, deleteTopUp,
  transferRub, getCashBalance,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

const { Text, Title } = Typography;

export default function Transfers() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [convertOpen, setConvertOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [rubTransferOpen, setRubTransferOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ from: undefined, to: undefined });
  const [convertForm] = Form.useForm();
  const [topUpForm] = Form.useForm();
  const [rubTransferForm] = Form.useForm();

  const { data: balance = {} } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: getCashBalance,
  });

  const rubTransferMutation = useMutation({
    mutationFn: transferRub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      message.success(t('transferSuccess'));
      setRubTransferOpen(false);
      rubTransferForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ['conversions', dateFilter],
    queryFn: () => getConversions(dateFilter),
  });

  const { data: topUps = [] } = useQuery({
    queryKey: ['top-ups', dateFilter],
    queryFn: () => getTopUps(dateFilter),
  });

  // Average rate from this month's conversions
  const thisMonth = dayjs().format('YYYY-MM');
  const monthConversions = conversions.filter(c => dayjs(c.date).format('YYYY-MM') === thisMonth);
  const currentRate = monthConversions.length
    ? monthConversions.reduce((s, c) => s + c.amountRUB, 0) / monthConversions.reduce((s, c) => s + c.amountUSD, 0)
    : 0;

  const convertMutation = useMutation({
    mutationFn: convertCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      message.success(t('conversionSaved'));
      setConvertOpen(false);
      convertForm.resetFields();
    },
    onError: () => message.error(t('conversionError')),
  });

  const deleteConvMutation = useMutation({
    mutationFn: deleteConversion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success(t('deleted'));
    },
  });

  const topUpMutation = useMutation({
    mutationFn: createTopUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-ups'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      message.success(t('topUpSuccess'));
      setTopUpOpen(false);
      topUpForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const deleteTopUpMutation = useMutation({
    mutationFn: deleteTopUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-ups'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success(t('deleted'));
    },
  });

  const handleConvert = (values) => {
    const gross = values.amountUSD * values.rate;
    let rubAmount, commPercent;
    if (values.commissionType === 'amount') {
      const commAmt = values.commissionAmount || 0;
      rubAmount = gross - commAmt;
      commPercent = gross > 0 ? (commAmt / gross) * 100 : 0;
    } else {
      commPercent = values.commissionPercent || 0;
      rubAmount = gross * (1 - commPercent / 100);
    }
    convertMutation.mutate({
      amountUSD: values.amountUSD,
      amountRUB: rubAmount,
      commissionPercent: commPercent,
      date: values.date?.toISOString(),
      note: values.note,
    });
  };

  // Conversion columns
  const convColumns = [
    { title: t('date'), dataIndex: 'date', key: 'date', render: formatDate },
    { title: t('usdGiven'), dataIndex: 'amountUSD', key: 'amountUSD', render: (v) => <Text type="danger" strong>−{formatMoney(v, 'USD')}</Text> },
    { title: t('rubReceived'), dataIndex: 'amountRUB', key: 'amountRUB', render: (v) => <Text style={{ color: '#389e0d' }} strong>+{formatMoney(v, 'RUB')}</Text> },
    {
      title: t('rate'), dataIndex: 'effectiveRate', key: 'effectiveRate',
      render: (v) => <Text strong>1 USD = {v?.toFixed(2)} RUB</Text>,
    },
    {
      title: t('commission'), dataIndex: 'commissionPercent', key: 'commissionPercent',
      render: (v) => v ? `${v}%` : '—',
    },
    { title: t('note'), dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: '', key: 'actions',
      render: (_, r) => (
        <Popconfirm title={t('deleteConfirm')} onConfirm={() => deleteConvMutation.mutate(r._id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // Top-up columns
  const topUpColumns = [
    { title: t('date'), dataIndex: 'date', key: 'date', render: formatDate },
    {
      title: t('amount'), dataIndex: 'amount', key: 'amount',
      render: (v, r) => <Text style={{ color: '#389e0d' }} strong>+{formatMoney(v, r.currency)}</Text>,
    },
    { title: t('note'), dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '', key: 'actions',
      render: (_, r) => (
        <Popconfirm title={t('deleteConfirm')} onConfirm={() => deleteTopUpMutation.mutate(r._id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      {/* RUB accounts section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{t('rubAccounts')}</Title>
        <Button onClick={() => { rubTransferForm.resetFields(); setRubTransferOpen(true); }}>
          {t('personalToRussia')}
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">{t('personalRub')}</Text>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>
            {formatMoney(balance?.RUB_personal || 0, 'RUB')}
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Text type="secondary">{t('russiaRub')}</Text>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#389e0d', marginTop: 4 }}>
            {formatMoney(balance?.RUB_russia || 0, 'RUB')}
          </div>
        </Card>
      </div>

      {/* Monthly avg rate display */}
      {currentRate > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Text strong>{t('monthlyAvgRate')}</Text>
            <Text strong style={{ fontSize: 16, color: '#1677ff' }}>1 USD = {currentRate.toFixed(2)} RUB</Text>
            <Text type="secondary">{t('conversionBasis').replace('{count}', monthConversions.length)}</Text>
          </Space>
        </Card>
      )}

      {/* Date filter */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Text type="secondary">{t('date')}:</Text>
        <DatePicker.RangePicker
          onChange={(dates) => setDateFilter({
            from: dates?.[0]?.startOf('day').toISOString(),
            to: dates?.[1]?.endOf('day').toISOString(),
          })}
        />
      </div>

      {/* Top-ups section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><WalletOutlined /> {t('topUp')}</Title>
        <Button style={{ background: '#389e0d', color: '#fff' }} onClick={() => { topUpForm.resetFields(); setTopUpOpen(true); }}>
          {t('addTopUp')}
        </Button>
      </div>

      {topUps.length > 0 && (
        <Table
          columns={topUpColumns}
          dataSource={topUps}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="small"
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Conversions section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('conversions')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { convertForm.resetFields(); setConvertOpen(true); }}>
          {t('newConversion')}
        </Button>
      </div>

      <Table
        columns={convColumns}
        dataSource={conversions}
        rowKey="_id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      {/* Convert modal */}
      <Modal
        title={t('conversionModal')}
        open={convertOpen}
        onCancel={() => { setConvertOpen(false); convertForm.resetFields(); }}
        onOk={() => convertForm.submit()}
        confirmLoading={convertMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={convertForm} layout="vertical" onFinish={handleConvert}
          initialValues={{ commissionPercent: 0, commissionAmount: 0, commissionType: 'percent', date: dayjs() }}>
          <Form.Item name="amountUSD" label={t('givenAmountUsd')} rules={[{ required: true, message: 'USD summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="1000" />
          </Form.Item>
          <Form.Item name="rate" label={t('rateLabel')} rules={[{ required: true, message: 'Kursni kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder={currentRate || '9000'} />
          </Form.Item>

          <Form.Item label={t('commission')}>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="commissionType" noStyle>
                <Segmented options={[{ label: '%', value: 'percent' }, { label: 'Summa (RUB)', value: 'amount' }]}
                  onChange={() => convertForm.setFieldsValue({ commissionPercent: 0, commissionAmount: 0 })} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.commissionType !== cur.commissionType}>
            {() => convertForm.getFieldValue('commissionType') === 'amount'
              ? (
                <Form.Item name="commissionAmount" label={t('commissionAmt')}>
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                </Form.Item>
              ) : (
                <Form.Item name="commissionPercent" label={t('commissionPct')}>
                  <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="0" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item name="date" label={t('date')}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {() => {
              const usd = convertForm.getFieldValue('amountUSD') || 0;
              const rate = convertForm.getFieldValue('rate') || 0;
              const type = convertForm.getFieldValue('commissionType');
              if (!usd || !rate) return null;
              const gross = usd * rate;
              let rub;
              if (type === 'amount') {
                rub = gross - (convertForm.getFieldValue('commissionAmount') || 0);
              } else {
                rub = gross * (1 - (convertForm.getFieldValue('commissionPercent') || 0) / 100);
              }
              return (
                <Card size="small" style={{ background: '#f6ffed' }}>
                  <div>{t('receivedAmount')} <Text strong style={{ color: '#389e0d', fontSize: 16 }}>+{formatMoney(rub, 'RUB')}</Text></div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">{t('effectiveRate')} </Text>
                    <Text strong>1 USD = {(rub / usd).toFixed(2)} RUB</Text>
                  </div>
                </Card>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* RUB transfer modal */}
      <Modal
        title={t('rubTransferModal')}
        open={rubTransferOpen}
        onCancel={() => { setRubTransferOpen(false); rubTransferForm.resetFields(); }}
        onOk={() => rubTransferForm.submit()}
        confirmLoading={rubTransferMutation.isPending}
        okText={t('transfer')}
        cancelText={t('cancel')}
      >
        <Form form={rubTransferForm} layout="vertical" onFinish={(values) => {
          rubTransferMutation.mutate({
            amount: values.amount,
            note: values.note,
            date: values.date?.toISOString(),
          });
        }} initialValues={{ date: dayjs() }}>
          <Form.Item name="amount" label={t('amountRub')} rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="50000" />
          </Form.Item>
          <Form.Item name="date" label={t('date')}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Top-up modal */}
      <Modal
        title={t('topUpModal')}
        open={topUpOpen}
        onCancel={() => { setTopUpOpen(false); topUpForm.resetFields(); }}
        onOk={() => topUpForm.submit()}
        confirmLoading={topUpMutation.isPending}
        okText={t('topUp')}
        cancelText={t('cancel')}
      >
        <Form form={topUpForm} layout="vertical" onFinish={(values) => {
          topUpMutation.mutate({
            amount: values.amount,
            currency: 'USD',
            description: values.description || t('topUp'),
            date: values.date?.toISOString(),
          });
        }} initialValues={{ date: dayjs() }}>
          <Form.Item name="amount" label={t('topUpAmountUsd')} rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} placeholder="5000" />
          </Form.Item>
          <Form.Item name="date" label={t('date')}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label={t('note')}>
            <Input placeholder={t('topUp')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
