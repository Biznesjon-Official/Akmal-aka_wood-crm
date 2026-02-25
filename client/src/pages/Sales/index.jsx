import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Select, InputNumber,
  DatePicker, Tag, message, Space, Input, Typography, Divider, Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getSales, createSale, getCustomers } from '../../api';
import { formatDate, formatMoney, formatM3 } from '../../utils/format';
import { useCart } from '../../context/CartContext';

const { Text } = Typography;

export default function Sales() {
  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { items: cartItems, removeItem, updateQuantity, clearCart, cartCount } = useCart();

  // Sale form state
  const [customer, setCustomer] = useState(null);
  const [date, setDate] = useState(dayjs());
  const [currency, setCurrency] = useState('USD');
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState('');
  const [prices, setPrices] = useState({}); // { "wagonId-bundleIndex": pricePerPiece }
  const [totalOverride, setTotalOverride] = useState(null); // null = auto, number = manual
  const [totalInputValue, setTotalInputValue] = useState(null); // local input state
  const [totalFocused, setTotalFocused] = useState(false);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: getSales,
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

  // Auto-calculated total from individual sale prices (per row total)
  const autoTotal = cartItems.reduce((sum, item) => {
    return sum + (prices[getKey(item)] || 0);
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
      message.success('Sotuv muvaffaqiyatli yaratildi');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['wagons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      clearCart();
      resetForm();
      setOpen(false);
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || 'Xatolik yuz berdi');
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
    if (!customer) { message.warning('Mijozni tanlang'); return; }
    if (cartItems.length === 0) { message.warning('Savatcha bo\'sh'); return; }

    const finalTotal = totalAmount;
    if (!finalTotal || finalTotal <= 0) {
      message.warning('Jami sotuv narxini kiriting');
      return;
    }

    // Check if individual prices are filled
    const hasIndividualPrices = cartItems.every((item) => prices[getKey(item)] > 0);

    let saleItems;
    if (hasIndividualPrices) {
      // Use individual prices
      saleItems = cartItems.map((item) => {
        const rowTotal = prices[getKey(item)] || 0;
        return {
          wagon: item.wagonId,
          bundleIndex: item.bundleIndex,
          quantity: item.quantity,
          pricePerPiece: item.quantity > 0 ? rowTotal / item.quantity : 0,
          totalAmount: rowTotal,
        };
      });
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
      message.info('Avval savatchaga mahsulot qo\'shing');
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
      title: "O'lcham",
      key: 'dimension',
      width: 120,
      render: (_, r) => `${r.thickness}×${r.width}×${r.length}`,
    },
    {
      title: 'Soni',
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
      title: 'Tannarx',
      key: 'costPrice',
      width: 110,
      render: (_, r) => {
        const cost = Math.round((r.costPricePerM3 || 0) * r.m3PerPiece * r.quantity);
        return <Text type="secondary">{formatMoney(cost, currency)}</Text>;
      },
    },
    {
      title: `Sotuv narxi`,
      key: 'salePrice',
      width: 130,
      render: (_, r) => (
        <InputNumber size="small" min={0} style={{ width: 110 }}
          value={prices[getKey(r)] || null}
          onChange={(v) => handlePriceChange(getKey(r), v)}
          placeholder="0" addonAfter={currency} />
      ),
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
      title: 'Sana',
      dataIndex: 'date',
      key: 'date',
      render: (val) => formatDate(val),
    },
    {
      title: 'Mijoz',
      dataIndex: ['customer', 'name'],
      key: 'customer',
    },
    {
      title: 'Jami summa',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val, rec) => formatMoney(val, rec.currency),
    },
    {
      title: "To'langan",
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (val, rec) => formatMoney(val, rec.currency),
    },
    {
      title: 'Qarz',
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
      title: 'Izoh',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Sotuvlar</h2>
        <Button type="primary" icon={<ShoppingCartOutlined />} onClick={handleOpenNew}>
          Yangi sotuv {cartCount > 0 && `(${cartCount})`}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={sales}
        rowKey="_id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={`Yangi sotuv (${cartItems.length} mahsulot)`}
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
              <Text type="secondary">Savatcha bo'sh. Avval ombordan mahsulot qo'shing.</Text>
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
                  <Text type="secondary">Mijoz</Text>
                  <Select placeholder="Mijoz tanlang" showSearch optionFilterProp="label"
                    value={customer} onChange={setCustomer} style={{ width: '100%' }}
                    options={customers.map((c) => ({ value: c._id, label: c.name }))} />
                </div>
                <div>
                  <Text type="secondary">Sana</Text>
                  <DatePicker value={date} onChange={setDate} format="DD.MM.YYYY" style={{ width: '100%' }} />
                </div>
                <div>
                  <Text type="secondary">Valyuta</Text>
                  <Select value={currency} onChange={setCurrency} style={{ width: 90 }}
                    options={[{ value: 'USD', label: 'USD' }, { value: 'RUB', label: 'RUB' }]} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Text type="secondary">To'langan summa</Text>
                  <InputNumber min={0} value={paidAmount} onChange={setPaidAmount} style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <Text type="secondary">Izoh</Text>
                <Input.TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <div style={{
                padding: 12, background: '#f6f6f6', borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Text type="secondary" style={{ fontSize: 14 }}>Jami tannarx:</Text>
                <Text strong style={{ fontSize: 16 }}>{formatMoney(totalCostPrice, currency)}</Text>
              </div>

              <div style={{
                padding: 12, background: '#f6ffed', borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}>
                <Text strong style={{ fontSize: 16 }}>Jami sotuv:</Text>
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
                    Qarz: {formatMoney(totalAmount - paidAmount, currency)}
                  </Text>
                </div>
              )}

              <Button type="primary" block size="large"
                loading={mutation.isPending} onClick={handleSubmit}
                style={{ height: 48, fontWeight: 600, fontSize: 16 }}>
                Sotuvni yaratish
              </Button>
            </Space>
          </>
        )}
      </Modal>
    </div>
  );
}
