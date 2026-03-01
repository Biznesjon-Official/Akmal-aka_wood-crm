import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Select, InputNumber,
  DatePicker, Tag, message, Space, Input, Typography, Divider, Popconfirm,
  Row, Col, Card, Segmented,
} from 'antd';
const { RangePicker } = DatePicker;
import { PlusOutlined, DeleteOutlined, ShoppingCartOutlined, AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getSales, createSale, getCustomers } from '../../api';
import { formatDate, formatMoney, formatM3 } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import '../styles/cards.css';

const { Text } = Typography;

export default function Sales() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [filters, setFilters] = useState({ from: undefined, to: undefined });
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { items: cartItems, removeItem, updateQuantity, clearCart, cartCount } = useCart();

  // Sale form state
  const [customer, setCustomer] = useState(null);
  const [date, setDate] = useState(dayjs());
  const [currency, setCurrency] = useState('USD');
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState('');
  const [prices, setPrices] = useState({}); // { "wagonId-bundleIndex": pricePerM3 }
  const [totalOverride, setTotalOverride] = useState(null); // null = auto, number = manual
  const [totalInputValue, setTotalInputValue] = useState(null); // local input state
  const [totalFocused, setTotalFocused] = useState(false);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', filters],
    queryFn: () => getSales(filters),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    enabled: open,
  });

  // Open modal from cart navigation
  useEffect(() => {
    if (searchParams.get('fromCart') === '1' && cartCount > 0) {
      queueMicrotask(() => {
        setOpen(true);
        setSearchParams({}, { replace: true });
      });
    }
  }, [searchParams, cartCount, setSearchParams]);

  const getKey = (item) => `${item.wagonId}-${item.bundleIndex}`;

  // Auto-calculated total from pricePerM3 * totalM3
  const autoTotal = cartItems.reduce((sum, item) => {
    const pricePerM3 = prices[getKey(item)] || 0;
    return sum + Math.round(pricePerM3 * item.m3PerPiece * item.quantity);
  }, 0);

  // Total cost price (tannarx)
  const totalCostPrice = cartItems.reduce((sum, item) => {
    return sum + Math.round((item.costPricePerM3 || 0) * item.m3PerPiece * item.quantity);
  }, 0);

  const totalAmount = totalOverride !== null ? totalOverride : autoTotal;

  const handlePriceChange = useCallback((key, value) => {
    setPrices((p) => ({ ...p, [key]: value }));
    setTotalOverride(null);
  }, []);

  const handleTotalFocus = useCallback(() => {
    setTotalFocused(true);
    setTotalInputValue(totalAmount);
  }, [totalAmount]);

  const handleTotalBlur = useCallback(() => {
    setTotalFocused(false);
    setTotalOverride(totalInputValue ?? null);
  }, [totalInputValue]);

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      message.success(t('saleCreated'));
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['wagons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      clearCart();
      resetForm();
      setOpen(false);
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || t('error'));
    },
  });

  const resetForm = () => {
    setCustomer(null);
    setDate(dayjs());
    setPaidAmount(0);
    setNote('');
    setPrices({});
    setTotalOverride(null);
    setTotalInputValue(null);
  };

  const handleSubmit = () => {
    if (!customer) { message.warning(t('selectCustomer')); return; }
    if (cartItems.length === 0) { message.warning(t('emptyCartMsg')); return; }

    const finalTotal = totalAmount;
    if (!finalTotal || finalTotal <= 0) {
      message.warning(t('totalSale'));
      return;
    }

    // Check if individual m3 prices are filled
    const hasIndividualPrices = cartItems.every((item) => prices[getKey(item)] > 0);

    let saleItems;
    if (hasIndividualPrices) {
      // Calculate from pricePerM3
      saleItems = cartItems.map((item) => {
        const pricePerM3 = prices[getKey(item)] || 0;
        const totalM3 = item.m3PerPiece * item.quantity;
        const rowTotal = Math.round(pricePerM3 * totalM3);
        return {
          wagon: item.wagonId,
          bundleIndex: item.bundleIndex,
          quantity: item.quantity,
          pricePerPiece: item.quantity > 0 ? rowTotal / item.quantity : 0,
          totalAmount: rowTotal,
        };
      });

      // If totalOverride is set, adjust proportionally
      if (totalOverride !== null && totalOverride !== autoTotal) {
        const currentSum = saleItems.reduce((s, it) => s + it.totalAmount, 0);
        if (currentSum > 0) {
          let distributed = 0;
          saleItems.forEach((it, i) => {
            const isLast = i === saleItems.length - 1;
            it.totalAmount = isLast
              ? finalTotal - distributed
              : Math.round(finalTotal * (it.totalAmount / currentSum));
            distributed += it.totalAmount;
            it.pricePerPiece = it.quantity > 0 ? it.totalAmount / it.quantity : 0;
          });
        }
      }
    } else {
      // Distribute total by tannarx ratio
      const costPerItem = cartItems.map((item) =>
        Math.round((item.costPricePerM3 || 0) * item.m3PerPiece * item.quantity) || 1
      );
      const costSum = costPerItem.reduce((s, c) => s + c, 0);

      let distributed = 0;
      saleItems = cartItems.map((item, i) => {
        const ratio = costSum > 0 ? costPerItem[i] / costSum : 1 / cartItems.length;
        const isLast = i === cartItems.length - 1;
        const rowTotal = isLast ? finalTotal - distributed : Math.round(finalTotal * ratio);
        distributed += rowTotal;
        return {
          wagon: item.wagonId,
          bundleIndex: item.bundleIndex,
          quantity: item.quantity,
          pricePerPiece: item.quantity > 0 ? rowTotal / item.quantity : 0,
          totalAmount: rowTotal,
        };
      });
    }

    mutation.mutate({
      customer,
      date: date?.toISOString(),
      currency,
      items: saleItems,
      paidAmount: paidAmount || 0,
      note,
      totalAmount: finalTotal,
    });
  };

  const handleOpenNew = () => {
    if (cartCount === 0) {
      message.info(t('emptyCart'));
      return;
    }
    resetForm();
    setOpen(true);
  };

  // Cart items table columns for modal
  const cartColumns = [
    {
      title: 'Vagon',
      dataIndex: 'wagonCode',
      key: 'wagon',
      width: 100,
    },
    {
      title: t('size'),
      key: 'dimension',
      width: 120,
      render: (_, r) => `${r.thickness}mm × ${r.width}mm × ${r.length}m`,
    },
    {
      title: t('count'),
      key: 'quantity',
      width: 90,
      render: (_, r) => (
        <InputNumber size="small" min={1} max={r.maxQuantity} value={r.quantity}
          onChange={(v) => updateQuantity(r.wagonId, r.bundleIndex, v)} style={{ width: 70 }} />
      ),
    },
    {
      title: 'm³',
      key: 'm3',
      width: 100,
      render: (_, r) => formatM3(r.m3PerPiece * r.quantity),
    },
    {
      title: 'Tannarx/m³',
      key: 'costPrice',
      width: 120,
      render: (_, r) => {
        const costPerM3 = r.costPricePerM3 || 0;
        const totalCost = Math.round(costPerM3 * r.m3PerPiece * r.quantity);
        return (
          <div>
            <Text strong>{formatMoney(Math.round(costPerM3), currency)}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {t('total')}: {formatMoney(totalCost, currency)}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Sotuv/m³',
      key: 'salePrice',
      width: 150,
      render: (_, r) => {
        const pricePerM3 = prices[getKey(r)] || 0;
        const rowTotal = Math.round(pricePerM3 * r.m3PerPiece * r.quantity);
        return (
          <div>
            <InputNumber size="small" min={0} style={{ width: 120 }}
              value={pricePerM3 || null}
              onChange={(v) => handlePriceChange(getKey(r), v)}
              placeholder={String(Math.round(r.costPricePerM3 || 0))}
              addonAfter={currency} />
            {pricePerM3 > 0 && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                {t('total')}: {formatMoney(rowTotal, currency)}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 40,
      render: (_, r) => (
        <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }}
          onClick={() => removeItem(r.wagonId, r.bundleIndex)} />
      ),
    },
  ];

  // Sales list table columns
  const columns = [
    {
      title: t('date'),
      dataIndex: 'date',
      key: 'date',
      render: (val) => formatDate(val),
    },
    {
      title: t('customer'),
      dataIndex: ['customer', 'name'],
      key: 'customer',
    },
    {
      title: t('totalSale'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val, rec) => formatMoney(val, rec.currency),
    },
    {
      title: t('paid'),
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (val, rec) => formatMoney(val, rec.currency),
    },
    {
      title: t('debt'),
      key: 'debt',
      render: (_, rec) => {
        const debt = (rec.totalAmount || 0) - (rec.paidAmount || 0);
        return (
          <span style={{ color: debt > 0 ? '#cf1322' : undefined }}>
            {formatMoney(debt, rec.currency)}
          </span>
        );
      },
    },
    {
      title: 'Mahsulotlar',
      key: 'items',
      render: (_, rec) => (rec.items?.length || 0),
    },
    {
      title: t('note'),
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
  ];

  const renderSaleCards = () => (
    <Row gutter={[16, 16]}>
      {sales.map((sale) => {
        const debt = (sale.totalAmount || 0) - (sale.paidAmount || 0);
        const isPaid = debt <= 0;
        return (
          <Col xs={24} sm={12} lg={8} xl={6} key={sale._id}>
            <Card className={`grid-card sale-card ${isPaid ? 'paid' : debt > 0 ? 'has-debt' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 15 }}>{sale.customer?.name || '—'}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(sale.date)}</Text>
              </div>
              <div className="grid-card-row">
                <Text type="secondary">{t('total')}:</Text>
                <Text strong>{formatMoney(sale.totalAmount, sale.currency)}</Text>
              </div>
              <div className="grid-card-row">
                <Text type="secondary">{t('paid')}:</Text>
                <Text style={{ color: '#52c41a' }}>{formatMoney(sale.paidAmount, sale.currency)}</Text>
              </div>
              {debt > 0 && (
                <div className="grid-card-row">
                  <Text type="secondary">{t('debt')}:</Text>
                  <Text type="danger" strong>{formatMoney(debt, sale.currency)}</Text>
                </div>
              )}
              <div className="grid-card-footer">
                <Tag>{sale.items?.length || 0} mahsulot</Tag>
                {isPaid ? <Tag color="success">{t('paid')}</Tag> : <Tag color="error">{t('debt')}da</Tag>}
              </div>
              {sale.note && <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }} ellipsis>{sale.note}</Text>}
            </Card>
          </Col>
        );
      })}
    </Row>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <h2 style={{ margin: 0 }}>{t('salesPage')}</h2>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'card', icon: <AppstoreOutlined /> },
              { value: 'table', icon: <BarsOutlined /> },
            ]} />
        </Space>
        <Space>
          <RangePicker
            onChange={(dates) => setFilters({
              from: dates?.[0]?.startOf('day').toISOString(),
              to: dates?.[1]?.endOf('day').toISOString(),
            })}
          />
          <Button type="primary" icon={<ShoppingCartOutlined />} onClick={handleOpenNew}>
            {t('newSale')} {cartCount > 0 && `(${cartCount})`}
          </Button>
        </Space>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">{t('totalSales')}</span>
            <span className="summary-stat-value">{sales.length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('totalSale')}</span>
            <span className="summary-stat-value highlight">{formatMoney(sales.reduce((s, x) => s + (x.totalAmount || 0), 0), 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('paid')}</span>
            <span className="summary-stat-value" style={{ color: '#52c41a' }}>{formatMoney(sales.reduce((s, x) => s + (x.paidAmount || 0), 0), 'USD')}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('debt')}</span>
            <span className="summary-stat-value" style={{ color: '#ff4d4f' }}>{formatMoney(sales.reduce((s, x) => s + Math.max(0, (x.totalAmount || 0) - (x.paidAmount || 0)), 0), 'USD')}</span>
          </div>
        </div>
      </Card>

      {viewMode === 'card' ? renderSaleCards() : (
        <Table
          columns={columns}
          dataSource={sales}
          rowKey="_id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      )}

      <Modal
        title={`${t('newSale')} (${cartItems.length} mahsulot)`}
        open={open}
        onCancel={() => { setOpen(false); resetForm(); }}
        footer={null}
        width="90vw"
        style={{ maxWidth: 1000 }}
        destroyOnHidden
      >
        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">{t('emptyCart')}</Text>
            </div>
          </div>
        ) : (
          <>
            <Table columns={cartColumns} dataSource={cartItems} rowKey={(r) => getKey(r)}
              pagination={false} size="small" scroll={{ x: 680 }} />

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Text type="secondary">{t('customer')}</Text>
                  <Select placeholder={t('selectCustomer')} showSearch optionFilterProp="label"
                    value={customer} onChange={setCustomer} style={{ width: '100%' }}
                    options={customers.map((c) => ({ value: c._id, label: c.name }))} />
                </div>
                <div>
                  <Text type="secondary">{t('date')}</Text>
                  <DatePicker value={date} onChange={setDate} format="DD.MM.YYYY" style={{ width: '100%' }} />
                </div>
                <div>
                  <Text type="secondary">{t('currency')}</Text>
                  <Select value={currency} onChange={setCurrency} style={{ width: 90 }}
                    options={[{ value: 'USD', label: 'USD' }, { value: 'RUB', label: 'RUB' }]} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Text type="secondary">{t('paidAmount')}</Text>
                  <InputNumber min={0} value={paidAmount} onChange={setPaidAmount} style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <Text type="secondary">{t('note')}</Text>
                <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <div style={{
                padding: 12, background: '#f6f6f6', borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Text type="secondary" style={{ fontSize: 14 }}>{t('totalCostLabel')}</Text>
                <Text strong style={{ fontSize: 16 }}>{formatMoney(totalCostPrice, currency)}</Text>
              </div>

              {autoTotal > 0 && totalCostPrice > 0 && (
                <div style={{
                  padding: 8, background: '#fffbe6', borderRadius: 8,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{t('profit')}</Text>
                  <Text strong style={{ fontSize: 14, color: autoTotal > totalCostPrice ? '#52c41a' : '#cf1322' }}>
                    {formatMoney(autoTotal - totalCostPrice, currency)} ({totalCostPrice > 0 ? Math.round((autoTotal - totalCostPrice) / totalCostPrice * 100) : 0}%)
                  </Text>
                </div>
              )}

              <div style={{
                padding: 12, background: '#f6ffed', borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}>
                <Text strong style={{ fontSize: 16 }}>{t('totalSale')}</Text>
                <InputNumber
                  min={0}
                  value={totalFocused ? totalInputValue : totalAmount}
                  onChange={(v) => setTotalInputValue(v)}
                  onFocus={handleTotalFocus}
                  onBlur={handleTotalBlur}
                  onPressEnter={handleTotalBlur}
                  style={{ width: 200, fontSize: 18 }}
                  size="large"
                  addonAfter={currency}
                />
                {totalOverride !== null && (
                  <Button size="small" type="link"
                    onClick={() => { setTotalOverride(null); setTotalInputValue(null); }}>
                    Auto
                  </Button>
                )}
              </div>

              {totalAmount > 0 && paidAmount < totalAmount && (
                <div style={{ padding: '4px 12px', background: '#fff2f0', borderRadius: 8 }}>
                  <Text type="danger">
                    {t('debt')}: {formatMoney(totalAmount - paidAmount, currency)}
                  </Text>
                </div>
              )}

              <Button type="primary" block size="large"
                loading={mutation.isPending} onClick={handleSubmit}
                style={{ height: 48, fontWeight: 600, fontSize: 16 }}>
                {t('createSale')}
              </Button>
            </Space>
          </>
        )}
      </Modal>
    </div>
  );
}
