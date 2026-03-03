import React, { useMemo, useState } from 'react';
import {
  Button, Modal, Form, InputNumber, Select, DatePicker,
  Input, message, Tag, Typography, Space, Spin, Card, Tabs, Popconfirm,
  Row, Col, Progress, Timeline, Empty,
} from 'antd';
import { PlusOutlined, DeleteOutlined, DollarOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getMyDebts, createMyDebt, addMyDebtPayment, deleteMyDebt,
  getLentDebts, createLentDebt, addLentDebtPayment, deleteLentDebt,
} from '../../api';
import { formatDate, formatMoney } from '../../utils/format';
import { useLanguage } from '../../context/LanguageContext';

const { Text, Title } = Typography;


// ─── Mening qarzdorligim (card-based) ───
function MyDebtsSection() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [debtForm] = Form.useForm();
  const [payForm] = Form.useForm();
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['my-debts'],
    queryFn: getMyDebts,
  });

  const createMutation = useMutation({
    mutationFn: createMyDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      message.success(t('debtAdded'));
      setDebtModalOpen(false);
      debtForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => addMyDebtPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      message.success(t('paymentAdded'));
      setPayModalOpen(false);
      setSelectedDebt(null);
      payForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-debts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success(t('debtDeleted'));
    },
  });

  const { totalUSD, totalRUB } = useMemo(() => {
    let usd = 0, rub = 0;
    debts.forEach((d) => {
      if (d.currency === 'RUB') rub += d.remainingDebt;
      else usd += d.remainingDebt;
    });
    return { totalUSD: usd, totalRUB: rub };
  }, [debts]);

  const handleCreateDebt = async () => {
    try {
      const values = await debtForm.validateFields();
      createMutation.mutate({
        ...values,
        date: values.date?.toISOString(),
      });
    } catch { /* validation */ }
  };

  const handlePay = (debt) => {
    setSelectedDebt(debt);
    payForm.setFieldsValue({ amount: null, date: dayjs(), note: '' });
    setPayModalOpen(true);
  };

  const handlePaySubmit = async () => {
    try {
      const values = await payForm.validateFields();
      payMutation.mutate({
        id: selectedDebt._id,
        data: { amount: values.amount, date: values.date?.toISOString(), note: values.note },
      });
    } catch { /* validation */ }
  };

  const handleViewHistory = (debt) => {
    setSelectedDebt(debt);
    setHistoryModalOpen(true);
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" align="center">
          <Title level={4} style={{ margin: 0 }}>{t('myDebtsTitle')}</Title>
          {totalUSD > 0 && (
            <Tag color="orange" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('total')}: {formatMoney(totalUSD, 'USD')}
            </Tag>
          )}
          {totalRUB > 0 && (
            <Tag color="orange" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('total')}: {formatMoney(totalRUB, 'RUB')}
            </Tag>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { debtForm.resetFields(); setDebtModalOpen(true); }}>
            {t('addDebt')}
          </Button>
        </Space>
      </Card>

      {debts.length === 0 ? (
        <Empty description={t('noDebts')} />
      ) : (
        <Row gutter={[16, 16]}>
          {debts.map((debt) => {
            const percent = debt.amount > 0 ? Math.round((debt.paidAmount / debt.amount) * 100) : 0;
            const isDone = debt.remainingDebt <= 0;
            return (
              <Col xs={24} sm={12} lg={8} key={debt._id}>
                <Card
                  size="small"
                  style={{
                    borderLeft: `4px solid ${isDone ? '#52c41a' : '#fa8c16'}`,
                    opacity: isDone ? 0.7 : 1,
                  }}
                  actions={[
                    <Button
                      type="link"
                      icon={<DollarOutlined />}
                      disabled={isDone}
                      onClick={() => handlePay(debt)}
                      key="pay"
                    >
                      {t('pay')}
                    </Button>,
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewHistory(debt)}
                      key="view"
                    >
                      {t('history')} ({debt.payments?.length || 0})
                    </Button>,
                    <Popconfirm
                      title={t('deleteConfirm')}
                      onConfirm={() => deleteMutation.mutate(debt._id)}
                      key="delete"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>{debt.creditor}</Text>
                    {isDone && <Tag color="success" icon={<CheckCircleOutlined />}>{t('paidStatus')}</Tag>}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('debtAmount')}</Text>
                      <Text strong>{formatMoney(debt.amount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('paidAmount2')}</Text>
                      <Text style={{ color: '#52c41a' }} strong>{formatMoney(debt.paidAmount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('remainingAmount')}</Text>
                      <Text type="danger" strong>{formatMoney(debt.remainingDebt, debt.currency)}</Text>
                    </div>
                  </div>

                  <Progress
                    percent={percent}
                    size="small"
                    strokeColor={isDone ? '#52c41a' : '#fa8c16'}
                    format={(p) => `${p}%`}
                  />

                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(debt.date)}
                      {debt.description && ` · ${debt.description}`}
                    </Text>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Create debt modal */}
      <Modal
        title={t('addMyDebt')}
        open={debtModalOpen}
        onOk={handleCreateDebt}
        onCancel={() => { setDebtModalOpen(false); debtForm.resetFields(); }}
        confirmLoading={createMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={debtForm} layout="vertical">
          <Form.Item name="creditor" label={t('toWhom')} rules={[{ required: true, message: t('creditorName') }]}>
            <Input placeholder="Ism" />
          </Form.Item>
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label={t('currency')} initialValue="USD">
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="RUB">RUB</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label={t('note')}>
            <Input.TextArea rows={2} placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment modal */}
      <Modal
        title={t('payDebt')}
        open={payModalOpen}
        onOk={handlePaySubmit}
        onCancel={() => { setPayModalOpen(false); setSelectedDebt(null); }}
        confirmLoading={payMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        {selectedDebt && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedDebt.creditor} — {t('remainingAmount')} {formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}
            </Text>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={selectedDebt?.remainingDebt} placeholder="0" />
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment history modal */}
      <Modal
        title={selectedDebt ? `${selectedDebt.creditor} — ${t('paymentHistory')}` : t('paymentHistory')}
        open={historyModalOpen}
        onCancel={() => { setHistoryModalOpen(false); setSelectedDebt(null); }}
        footer={null}
      >
        {selectedDebt && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('debtAmount')}</Text>
                <Text strong>{formatMoney(selectedDebt.amount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('paidAmount2')}</Text>
                <Text style={{ color: '#52c41a' }} strong>{formatMoney(selectedDebt.paidAmount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('remainingAmount')}</Text>
                <Text type="danger" strong>{formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}</Text>
              </div>
            </div>

            {selectedDebt.payments?.length > 0 ? (
              <Timeline
                items={selectedDebt.payments.map((p) => ({
                  color: 'green',
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong style={{ color: '#52c41a' }}>{formatMoney(p.amount, selectedDebt.currency)}</Text>
                        <Text type="secondary">{formatDate(p.date)}</Text>
                      </div>
                      {p.note && <Text type="secondary" style={{ fontSize: 12 }}>{p.note}</Text>}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description={t('noPayments')} />
            )}
          </>
        )}
      </Modal>
    </>
  );
}

// ─── Mendan qarzdarlar (I lent money to someone) ───
function LentDebtsSection() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [debtForm] = Form.useForm();
  const [payForm] = Form.useForm();
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['lent-debts'],
    queryFn: getLentDebts,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['lent-debts'] });
    queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: createLentDebt,
    onSuccess: () => {
      invalidateAll();
      message.success(t('debtAdded'));
      setDebtModalOpen(false);
      debtForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => addLentDebtPayment(id, data),
    onSuccess: () => {
      invalidateAll();
      message.success(t('paymentAdded'));
      setPayModalOpen(false);
      setSelectedDebt(null);
      payForm.resetFields();
    },
    onError: () => message.error(t('error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLentDebt,
    onSuccess: () => {
      invalidateAll();
      message.success(t('debtDeleted'));
    },
  });

  const { totalUSD, totalRUB } = useMemo(() => {
    let usd = 0, rub = 0;
    debts.forEach((d) => {
      if (d.currency === 'RUB') rub += d.remainingDebt;
      else usd += d.remainingDebt;
    });
    return { totalUSD: usd, totalRUB: rub };
  }, [debts]);

  const handleCreateDebt = async () => {
    try {
      const values = await debtForm.validateFields();
      createMutation.mutate({
        ...values,
        date: values.date?.toISOString(),
      });
    } catch { /* validation */ }
  };

  const handlePay = (debt) => {
    setSelectedDebt(debt);
    payForm.setFieldsValue({ amount: null, date: dayjs(), note: '' });
    setPayModalOpen(true);
  };

  const handlePaySubmit = async () => {
    try {
      const values = await payForm.validateFields();
      payMutation.mutate({
        id: selectedDebt._id,
        data: { amount: values.amount, date: values.date?.toISOString(), note: values.note },
      });
    } catch { /* validation */ }
  };

  const handleViewHistory = (debt) => {
    setSelectedDebt(debt);
    setHistoryModalOpen(true);
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" align="center">
          <Title level={4} style={{ margin: 0 }}>{t('lentDebtsTitle')}</Title>
          {totalUSD > 0 && (
            <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('total')}: {formatMoney(totalUSD, 'USD')}
            </Tag>
          )}
          {totalRUB > 0 && (
            <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
              {t('total')}: {formatMoney(totalRUB, 'RUB')}
            </Tag>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { debtForm.resetFields(); setDebtModalOpen(true); }}>
            {t('giveDebt')}
          </Button>
        </Space>
      </Card>

      {debts.length === 0 ? (
        <Empty description={t('noLentDebts')} />
      ) : (
        <Row gutter={[16, 16]}>
          {debts.map((debt) => {
            const percent = debt.amount > 0 ? Math.round((debt.paidAmount / debt.amount) * 100) : 0;
            const isDone = debt.remainingDebt <= 0;
            return (
              <Col xs={24} sm={12} lg={8} key={debt._id}>
                <Card
                  size="small"
                  style={{
                    borderLeft: `4px solid ${isDone ? '#52c41a' : '#1677ff'}`,
                    opacity: isDone ? 0.7 : 1,
                  }}
                  actions={[
                    <Button
                      type="link"
                      icon={<DollarOutlined />}
                      disabled={isDone}
                      onClick={() => handlePay(debt)}
                      key="pay"
                    >
                      Olish
                    </Button>,
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewHistory(debt)}
                      key="view"
                    >
                      {t('history')} ({debt.payments?.length || 0})
                    </Button>,
                    <Popconfirm
                      title={t('deleteConfirm')}
                      onConfirm={() => deleteMutation.mutate(debt._id)}
                      key="delete"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>{debt.debtor}</Text>
                    {isDone && <Tag color="success" icon={<CheckCircleOutlined />}>{t('returnedStatus')}</Tag>}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('given')}</Text>
                      <Text strong>{formatMoney(debt.amount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('returned')}</Text>
                      <Text style={{ color: '#52c41a' }} strong>{formatMoney(debt.paidAmount, debt.currency)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t('remainingAmount')}</Text>
                      <Text type="danger" strong>{formatMoney(debt.remainingDebt, debt.currency)}</Text>
                    </div>
                  </div>

                  <Progress
                    percent={percent}
                    size="small"
                    strokeColor={isDone ? '#52c41a' : '#1677ff'}
                    format={(p) => `${p}%`}
                  />

                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(debt.date)}
                      {debt.description && ` · ${debt.description}`}
                    </Text>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Create lent debt modal */}
      <Modal
        title={t('giveDebt')}
        open={debtModalOpen}
        onOk={handleCreateDebt}
        onCancel={() => { setDebtModalOpen(false); debtForm.resetFields(); }}
        confirmLoading={createMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={debtForm} layout="vertical">
          <Form.Item name="debtor" label="Kimga qarz berildi" rules={[{ required: true, message: "Ismni kiriting" }]}>
            <Input placeholder="Ism" />
          </Form.Item>
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="0" />
          </Form.Item>
          <Form.Item name="currency" label={t('currency')} initialValue="USD">
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="RUB">RUB</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label={t('note')}>
            <Input.TextArea rows={2} placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment receive modal */}
      <Modal
        title="Qarz olish"
        open={payModalOpen}
        onOk={handlePaySubmit}
        onCancel={() => { setPayModalOpen(false); setSelectedDebt(null); }}
        confirmLoading={payMutation.isPending}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        {selectedDebt && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedDebt.debtor} — {t('remainingAmount')} {formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}
            </Text>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true, message: "Summani kiriting" }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={selectedDebt?.remainingDebt} placeholder="0" />
          </Form.Item>
          <Form.Item name="date" label={t('date')} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input placeholder={t('note')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Payment history modal */}
      <Modal
        title={selectedDebt ? `${selectedDebt.debtor} — ${t('returnHistory')}` : t('returnHistory')}
        open={historyModalOpen}
        onCancel={() => { setHistoryModalOpen(false); setSelectedDebt(null); }}
        footer={null}
      >
        {selectedDebt && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('given')}</Text>
                <Text strong>{formatMoney(selectedDebt.amount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('returned')}</Text>
                <Text style={{ color: '#52c41a' }} strong>{formatMoney(selectedDebt.paidAmount, selectedDebt.currency)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('remainingAmount')}</Text>
                <Text type="danger" strong>{formatMoney(selectedDebt.remainingDebt, selectedDebt.currency)}</Text>
              </div>
            </div>

            {selectedDebt.payments?.length > 0 ? (
              <Timeline
                items={selectedDebt.payments.map((p) => ({
                  color: 'green',
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong style={{ color: '#52c41a' }}>{formatMoney(p.amount, selectedDebt.currency)}</Text>
                        <Text type="secondary">{formatDate(p.date)}</Text>
                      </div>
                      {p.note && <Text type="secondary" style={{ fontSize: 12 }}>{p.note}</Text>}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description={t('noReturns')} />
            )}
          </>
        )}
      </Modal>
    </>
  );
}

// ─── Main page ───
export default function Debts() {
  const { t } = useLanguage();
  return (
    <div>
      <Tabs
        defaultActiveKey="my-debts"
        items={[
          { key: 'my-debts', label: t('myDebtsTab'), children: <MyDebtsSection /> },
          { key: 'lent-debts', label: t('lentDebtsTab'), children: <LentDebtsSection /> },
        ]}
        size="large"
        style={{ marginBottom: 16 }}
      />
    </div>
  );
}
