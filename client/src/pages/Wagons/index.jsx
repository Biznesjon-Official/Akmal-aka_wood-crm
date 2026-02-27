import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Tag, Input, InputNumber, Select, DatePicker, Space, Tabs, Row, Col, Card, Segmented,
  Popconfirm, Modal, Divider, Typography, Descriptions, message,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, MinusCircleOutlined, InboxOutlined, AppstoreOutlined, BarsOutlined,
  ArrowRightOutlined, CalendarOutlined, SendOutlined, EnvironmentOutlined, ShoppingCartOutlined, CarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getWagons, createWagon, updateWagon, deleteWagon, getExchangeRate, allBundlesToWarehouse } from '../../api';
import { formatDate, formatM3, formatMoney, statusLabels, statusColors, calcM3PerPiece } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import '../styles/cards.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const STATUS_OPTIONS = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

// Fixed expense types that always show (USD)
const FIXED_EXPENSES = [
  'NDS', 'Usluga', "Temir yo'l KZ", "Temir yo'l UZ",
  'Tupik', 'Xrannei', 'Klentga ortish', 'Yerga tushurish',
];

const WOOD_EXPENSE_KEY = "Yog'och xaridi";

const cellS = { padding: '6px 10px' };
const labelS = { ...cellS, fontWeight: 500, background: '#fafafa', whiteSpace: 'nowrap' };
const thS = { ...cellS, textAlign: 'left', fontWeight: 500, background: '#fafafa' };

// Build initial expenses state from existing data or fresh
function buildExpensesState(existingExpenses) {
  const existing = existingExpenses || [];
  // Fixed USD expenses - always present
  const fixed = FIXED_EXPENSES.map((name) => {
    const found = existing.find((e) => e.description === name && e.currency === 'USD');
    return { description: name, amount: found?.amount || 0, currency: 'USD', _fixed: true };
  });
  // Wood purchase (RUB) - always one row
  const woodFound = existing.find((e) => e.description === WOOD_EXPENSE_KEY && e.currency === 'RUB');
  const wood = { description: WOOD_EXPENSE_KEY, amount: woodFound?.amount || 0, currency: 'RUB', _fixed: true };
  // Extra custom expenses
  const fixedNames = new Set([...FIXED_EXPENSES, WOOD_EXPENSE_KEY]);
  const custom = existing.filter((e) => !fixedNames.has(e.description)).map((e) => ({ ...e, _fixed: false }));
  return { fixed, wood, custom };
}

// Convert state back to flat expenses array for API
function flattenExpenses(fixed, wood, custom) {
  const all = [];
  fixed.forEach((e) => { if (e.amount > 0) all.push({ description: e.description, amount: e.amount, currency: 'USD' }); });
  if (wood.amount > 0) all.push({ description: wood.description, amount: wood.amount, currency: 'RUB' });
  custom.forEach((e) => { if (e.description) all.push({ description: e.description, amount: e.amount || 0, currency: e.currency || 'USD' }); });
  return all;
}

// ===================== EXPENSES TABLE (shared) =====================
function ExpensesEditor({ fixed, wood, custom, onFixedChange, onWoodChange, onCustomChange, onCustomRemove, onCustomAdd }) {
  const usdTotal = fixed.reduce((s, e) => s + (e.amount || 0), 0) + custom.filter(e => e.currency === 'USD').reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <>
      {/* Fixed USD expenses */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <thead>
          <tr>
            <th style={thS}>Xarajat turi</th>
            <th style={{ ...thS, width: 150, textAlign: 'right' }}>Summa (USD)</th>
          </tr>
        </thead>
        <tbody>
          {fixed.map((exp, idx) => (
            <tr key={exp.description} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={cellS}>{exp.description}</td>
              <td style={{ ...cellS, textAlign: 'right' }}>
                <InputNumber size="small" style={{ width: '100%' }} min={0}
                  value={exp.amount} onChange={(v) => onFixedChange(idx, v || 0)} placeholder="0" />
              </td>
            </tr>
          ))}
          {/* Custom expenses */}
          {custom.map((exp, idx) => (
            <tr key={`custom-${idx}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={cellS}>
                <Space size={4}>
                  <Input size="small" value={exp.description} placeholder="Xarajat nomi"
                    onChange={(e) => onCustomChange(idx, 'description', e.target.value)} style={{ width: 200 }} />
                  <MinusCircleOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} onClick={() => onCustomRemove(idx)} />
                </Space>
              </td>
              <td style={{ ...cellS, textAlign: 'right' }}>
                <InputNumber size="small" style={{ width: '100%' }} min={0}
                  value={exp.amount} onChange={(v) => onCustomChange(idx, 'amount', v || 0)} placeholder="0" />
              </td>
            </tr>
          ))}
          <tr style={{ background: '#f6ffed' }}>
            <td style={{ ...cellS, fontWeight: 600 }}>Jami USD</td>
            <td style={{ ...cellS, textAlign: 'right', fontWeight: 600 }}>{usdTotal.toLocaleString('ru-RU')} USD</td>
          </tr>
        </tbody>
      </table>

      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={onCustomAdd} style={{ marginBottom: 12 }}>
        Qo'shimcha xarajat
      </Button>

      {/* Wood purchase (RUB) - single row */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr style={{ background: '#fffbe6', borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ ...cellS, fontWeight: 500 }}>
              {WOOD_EXPENSE_KEY} <Tag color="orange" style={{ marginLeft: 8 }}>RUB</Tag>
            </td>
            <td style={{ ...cellS, textAlign: 'right', width: 150 }}>
              <InputNumber size="small" style={{ width: '100%' }} min={0}
                value={wood.amount} onChange={(v) => onWoodChange(v || 0)} placeholder="0" />
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ===================== CREATE MODAL =====================
function CreateWagonModal({ open, onCancel, onSave, loading, globalRate, transportType = 'vagon' }) {
  const isMashina = transportType === 'mashina';
  const [wagonCode, setWagonCode] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [sentDate, setSentDate] = useState(null);
  const [arrivedDate, setArrivedDate] = useState(null);
  const [errors, setErrors] = useState({});

  const initExp = buildExpensesState([]);
  const [fixed, setFixed] = useState(initExp.fixed);
  const [wood, setWood] = useState(initExp.wood);
  const [custom, setCustom] = useState(initExp.custom);
  const [bundles, setBundles] = useState([]);

  const handleOk = () => {
    const errs = {};
    if (!isMashina && (!wagonCode || wagonCode.length !== 9)) errs.wagonCode = true;
    if (isMashina && !wagonCode) errs.wagonCode = true;
    if (!origin) errs.origin = true;
    if (!destination) errs.destination = true;
    if (Object.keys(errs).length) {
      setErrors(errs);
      message.warning("Majburiy maydonlarni to'ldiring");
      return;
    }
    onSave({
      type: transportType,
      wagonCode, origin, destination,
      sentDate: sentDate?.toISOString() || null,
      arrivedDate: arrivedDate?.toISOString() || null,
      expenses: flattenExpenses(fixed, wood, custom),
      woodBundles: bundles.filter((b) => b.thickness && b.width && b.length && b.count),
    });
  };

  const handleAfterClose = () => {
    setWagonCode(''); setOrigin(''); setDestination(''); setSentDate(null); setArrivedDate(null);
    const fresh = buildExpensesState([]);
    setFixed(fresh.fixed); setWood(fresh.wood); setCustom(fresh.custom);
    setBundles([]); setErrors({});
  };

  return (
    <Modal title={isMashina ? 'Yangi mashina' : 'Yangi vagon'} open={open} onCancel={onCancel} onOk={handleOk}
      confirmLoading={loading} afterClose={handleAfterClose} width={700}
      okText="Yaratish" cancelText="Bekor qilish">

      {/* Basic info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ ...labelS, width: 160 }}>{isMashina ? 'Mashina raqami' : 'Vagon kodi'} <span style={{ color: '#ff4d4f' }}>*</span></td>
            <td style={cellS}>
              {isMashina ? (
                <Input size="small" value={wagonCode}
                  onChange={(e) => { const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); setWagonCode(v); if (v) setErrors((p) => ({ ...p, wagonCode: false })); }}
                  status={errors.wagonCode ? 'error' : undefined} placeholder="Mashina raqami" />
              ) : (
                <Input size="small" value={wagonCode}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 9); setWagonCode(v); if (v) setErrors((p) => ({ ...p, wagonCode: false })); }}
                  status={errors.wagonCode ? 'error' : undefined} placeholder="9 ta raqam"
                  maxLength={9} suffix={<Text type="secondary">{wagonCode.length}/9</Text>} />
              )}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>Jo'natilgan sana</td>
            <td style={cellS}>
              <DatePicker size="small" value={sentDate} style={{ width: '100%' }} onChange={setSentDate} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>Kelgan sana</td>
            <td style={cellS}>
              <DatePicker size="small" value={arrivedDate} style={{ width: '100%' }} onChange={setArrivedDate} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>Qayerdan <span style={{ color: '#ff4d4f' }}>*</span></td>
            <td style={cellS}>
              <Input size="small" value={origin} status={errors.origin ? 'error' : undefined}
                onChange={(e) => { setOrigin(e.target.value); setErrors((p) => ({ ...p, origin: false })); }} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>Qayerga <span style={{ color: '#ff4d4f' }}>*</span></td>
            <td style={cellS}>
              <Input size="small" value={destination} status={errors.destination ? 'error' : undefined}
                onChange={(e) => { setDestination(e.target.value); setErrors((p) => ({ ...p, destination: false })); }} />
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
              <th style={thS}>Qalinlik (mm)</th><th style={thS}>Eni (mm)</th>
              <th style={thS}>Uzunlik (m)</th><th style={thS}>Soni (dona)</th>
              <th style={{ ...thS, width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {bundles.map((b, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="mm"
                  value={b.thickness} onChange={(v) => setBundles((p) => p.map((x, i) => i === idx ? { ...x, thickness: v } : x))} /></td>
                <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="mm"
                  value={b.width} onChange={(v) => setBundles((p) => p.map((x, i) => i === idx ? { ...x, width: v } : x))} /></td>
                <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="m" step={0.1}
                  value={b.length} onChange={(v) => setBundles((p) => p.map((x, i) => i === idx ? { ...x, length: v } : x))} /></td>
                <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={1} placeholder="0"
                  value={b.count} onChange={(v) => setBundles((p) => p.map((x, i) => i === idx ? { ...x, count: v } : x))} /></td>
                <td style={cellS}><MinusCircleOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }}
                  onClick={() => setBundles((p) => p.filter((_, i) => i !== idx))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Button size="small" type="dashed" icon={<PlusOutlined />} block
        onClick={() => setBundles((p) => [...p, { thickness: null, width: null, length: null, count: null }])}>
        Yog'och qo'shish
      </Button>

      {/* Expenses */}
      <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Xarajatlar</Divider>
      <ExpensesEditor
        fixed={fixed} wood={wood} custom={custom}
        onFixedChange={(idx, v) => setFixed((p) => p.map((e, i) => i === idx ? { ...e, amount: v } : e))}
        onWoodChange={(v) => setWood((p) => ({ ...p, amount: v }))}
        onCustomChange={(idx, key, v) => setCustom((p) => p.map((e, i) => i === idx ? { ...e, [key]: v } : e))}
        onCustomRemove={(idx) => setCustom((p) => p.filter((_, i) => i !== idx))}
        onCustomAdd={() => setCustom((p) => [...p, { description: '', amount: 0, currency: 'USD' }])}
      />

      {/* Tannarx real-time preview */}
      {(() => {
        const usdTotal = fixed.reduce((s, e) => s + (e.amount || 0), 0)
          + custom.filter(e => e.currency === 'USD').reduce((s, e) => s + (e.amount || 0), 0);
        const rubTotal = (wood.amount || 0)
          + custom.filter(e => e.currency === 'RUB').reduce((s, e) => s + (e.amount || 0), 0);
        const rate = globalRate || 0;
        const rubInUsd = rate > 0 ? rubTotal / rate : 0;
        const totalUsd = usdTotal + rubInUsd;
        const totalM3 = bundles.reduce((s, b) => {
          if (!b.thickness || !b.width || !b.length || !b.count) return s;
          return s + ((b.thickness * b.width * b.length) / 1e6) * b.count;
        }, 0);
        const tannarx = totalM3 > 0 ? totalUsd / totalM3 : 0;
        return (
          <>
            <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Tannarx (avtomatik)</Divider>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>Jami USD xarajatlar</td>
                  <td style={{ ...cellS, textAlign: 'right' }}>{usdTotal.toLocaleString('ru-RU')} USD</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fffbe6' }}>
                  <td style={labelS}>Yog'och xaridi (RUB → USD)</td>
                  <td style={{ ...cellS, textAlign: 'right' }}>
                    {rubTotal.toLocaleString('ru-RU')} RUB
                    {rate > 0 ? ` ÷ ${rate} = ${rubInUsd.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD` : ''}
                    {rate === 0 && rubTotal > 0 && <Text type="danger" style={{ marginLeft: 8 }}>Kurs belgilanmagan!</Text>}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>Jami xarajat (USD)</td>
                  <td style={{ ...cellS, textAlign: 'right', fontWeight: 600 }}>{totalUsd.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>Jami m³</td>
                  <td style={{ ...cellS, textAlign: 'right' }}>{totalM3.toFixed(4)} m³</td>
                </tr>
                <tr style={{ background: '#f6ffed' }}>
                  <td style={{ ...labelS, fontWeight: 700 }}>Tannarx / m³</td>
                  <td style={{ ...cellS, textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#1677ff' }}>
                    {tannarx > 0 ? `${tannarx.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        );
      })()}
    </Modal>
  );
}

// ===================== DETAIL MODAL =====================
function WagonDetailModal({ wagon, open, onClose, onUpdate, onDelete, updating, deleting, globalRate, onWarehouse, warehouseLoading }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [fixed, setFixed] = useState([]);
  const [wood, setWood] = useState({ description: WOOD_EXPENSE_KEY, amount: 0, currency: 'RUB' });
  const [custom, setCustom] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [deductOpen, setDeductOpen] = useState(false);
  const [deductBundleIdx, setDeductBundleIdx] = useState(null);
  const [deductReason, setDeductReason] = useState('');
  const [deductCount, setDeductCount] = useState(null);

  const openEdit = () => {
    setFormData({
      wagonCode: wagon.wagonCode, origin: wagon.origin, destination: wagon.destination,
      sentDate: wagon.sentDate, arrivedDate: wagon.arrivedDate, exchangeRate: wagon.exchangeRate || 0,
    });
    const exp = buildExpensesState(wagon.expenses);
    setFixed(exp.fixed); setWood(exp.wood); setCustom(exp.custom);
    setBundles((wagon.woodBundles || []).map((b) => ({ ...b, deductions: b.deductions || [] })));
    setEditMode(true);
  };

  const handleSave = () => {
    onUpdate({
      ...formData,
      sentDate: formData.sentDate || null,
      arrivedDate: formData.arrivedDate || null,
      expenses: flattenExpenses(fixed, wood, custom),
      woodBundles: bundles,
    });
    setEditMode(false);
  };

  const openDeduction = (bundleIdx) => {
    setDeductBundleIdx(bundleIdx);
    setDeductReason('');
    setDeductCount(null);
    setDeductOpen(true);
  };

  const submitDeduction = () => {
    if (!deductReason || !deductCount || deductCount <= 0) { message.warning("Sabab va sonni kiriting"); return; }
    if (editMode) {
      // Edit mode — local state
      setBundles((prev) => prev.map((b, i) => i !== deductBundleIdx ? b :
        { ...b, deductions: [...(b.deductions || []), { reason: deductReason, count: deductCount }] }));
    } else {
      // View mode — directly save to server
      const updatedBundles = (wagon.woodBundles || []).map((b, i) => {
        if (i !== deductBundleIdx) return b;
        return { ...b, deductions: [...(b.deductions || []), { reason: deductReason, count: deductCount }] };
      });
      onUpdate({ woodBundles: updatedBundles });
    }
    setDeductOpen(false); setDeductReason(''); setDeductCount(null);
  };

  if (!wagon) return null;

  // View mode calculations
  const totalM3 = (wagon.woodBundles || []).reduce((s, b) => s + (b.totalM3 || 0), 0);
  const usdExp = (wagon.expenses || []).filter((e) => e.currency === 'USD').reduce((s, e) => s + (e.amount || 0), 0);
  const rubExp = (wagon.expenses || []).filter((e) => e.currency === 'RUB').reduce((s, e) => s + (e.amount || 0), 0);
  const rate = wagon.exchangeRate || globalRate || 0;
  const rubInUsd = rate > 0 ? rubExp / rate : 0;
  const totalExpUsd = usdExp + rubInUsd;

  return (
    <Modal title={`${wagon.type === 'mashina' ? 'Mashina' : 'Vagon'}: ${wagon.wagonCode}`} open={open} onCancel={() => { setEditMode(false); onClose(); }} width={800}
      footer={editMode ? [
        <Button key="cancel" onClick={() => setEditMode(false)}>Bekor qilish</Button>,
        <Button key="save" type="primary" loading={updating} onClick={handleSave}>Saqlash</Button>,
      ] : [
        <Popconfirm key="del" title="O'chirishni tasdiqlaysizmi?" onConfirm={() => onDelete(wagon._id)}>
          <Button danger loading={deleting}>O'chirish</Button>
        </Popconfirm>,
        <Button key="edit" type="primary" onClick={openEdit}>Tahrirlash</Button>,
      ]}>

      {!editMode ? (
        <>
          {/* View mode */}
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label={wagon.type === 'mashina' ? 'Mashina raqami' : 'Vagon kodi'}>{wagon.wagonCode}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={statusColors[wagon.status]}>{statusLabels[wagon.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label="Jo'natilgan sana">{formatDate(wagon.sentDate)}</Descriptions.Item>
            <Descriptions.Item label="Kelgan sana">{formatDate(wagon.arrivedDate)}</Descriptions.Item>
            <Descriptions.Item label="Qayerdan">{wagon.origin || '-'}</Descriptions.Item>
            <Descriptions.Item label="Qayerga">{wagon.destination || '-'}</Descriptions.Item>
            <Descriptions.Item label="Kurs (RUB/USD)">{rate || '-'}</Descriptions.Item>
            <Descriptions.Item label="Jami m³">{formatM3(totalM3)}</Descriptions.Item>
          </Descriptions>

          {/* Wood bundles view */}
          <Divider titlePlacement="left" style={{ margin: '8px 0' }}>Yog'ochlar</Divider>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Qalinlik (mm)</th><th style={thS}>Eni (mm)</th><th style={thS}>Uzunlik (m)</th>
                <th style={thS}>Soni</th><th style={thS}>Qoldiq</th><th style={thS}>m³/dona</th>
                <th style={thS}>Jami m³</th><th style={thS}>Ayirmalar</th><th style={thS}>Amal</th>
              </tr>
            </thead>
            <tbody>
              {(wagon.woodBundles || []).map((b, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={cellS}>{b.thickness}mm</td><td style={cellS}>{b.width}mm</td><td style={cellS}>{b.length}m</td>
                  <td style={cellS}>{b.count}</td>
                  <td style={cellS}><Text type={b.remainingCount < b.count ? 'warning' : undefined}>{b.remainingCount}</Text></td>
                  <td style={cellS}>{formatM3(b.m3PerPiece)}</td><td style={cellS}>{formatM3(b.totalM3)}</td>
                  <td style={cellS}>
                    {(b.deductions || []).map((d, di) => <div key={di}><Text type="danger">-{d.count}: {d.reason}</Text></div>)}
                  </td>
                  <td style={cellS}>
                    <Button size="small" type="link" danger onClick={() => openDeduction(i)}>Ayirish</Button>
                  </td>
                </tr>
              ))}
              {(wagon.woodBundles || []).length === 0 && <tr><td colSpan={9} style={{ ...cellS, color: '#999' }}>Yog'och kiritilmagan</td></tr>}
            </tbody>
          </table>
          {(wagon.woodBundles || []).some(b => b.location === 'vagon') && (
            <Popconfirm title="Barcha yog'ochlarni omborga o'tkazishni tasdiqlaysizmi?" onConfirm={() => onWarehouse(wagon._id)}>
              <Button type="primary" icon={<InboxOutlined />} loading={warehouseLoading} style={{ marginTop: 8 }}>
                Barchasini omborga o'tkazish
              </Button>
            </Popconfirm>
          )}

          {/* Expenses view */}
          <Divider titlePlacement="left" style={{ margin: '8px 0' }}>Xarajatlar</Divider>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr><th style={thS}>Turi</th><th style={{ ...thS, textAlign: 'right', width: 130 }}>Summa</th><th style={{ ...thS, width: 70 }}>Valyuta</th></tr>
            </thead>
            <tbody>
              {(wagon.expenses || []).map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: e.currency === 'RUB' ? '#fffbe6' : undefined }}>
                  <td style={cellS}>{e.description}</td>
                  <td style={{ ...cellS, textAlign: 'right' }}>{(e.amount || 0).toLocaleString('ru-RU')}</td>
                  <td style={cellS}><Tag color={e.currency === 'RUB' ? 'orange' : 'green'}>{e.currency}</Tag></td>
                </tr>
              ))}
              {(wagon.expenses || []).length === 0 && <tr><td colSpan={3} style={{ ...cellS, color: '#999' }}>Xarajatlar kiritilmagan</td></tr>}
            </tbody>
          </table>

          {/* Tannarx */}
          <Divider titlePlacement="left" style={{ margin: '8px 0' }}>Tannarx hisoblash</Divider>
          <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="USD xarajatlar">{formatMoney(usdExp)}</Descriptions.Item>
            <Descriptions.Item label="RUB xarajatlar">{rubExp.toLocaleString('ru-RU')} RUB</Descriptions.Item>
            <Descriptions.Item label="Kurs">{rate > 0 ? `1 USD = ${rate} RUB` : <Text type="danger">Belgilanmagan</Text>}</Descriptions.Item>
            <Descriptions.Item label="RUB → USD">{rate > 0 ? formatMoney(rubInUsd) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Jami xarajat (USD)"><Text strong>{formatMoney(totalExpUsd)}</Text></Descriptions.Item>
            <Descriptions.Item label="Jami m³"><Text strong>{formatM3(totalM3)}</Text></Descriptions.Item>
            <Descriptions.Item label="Tannarx / m³">
              <Text strong style={{ color: '#1677ff', fontSize: 16 }}>
                {wagon.costPricePerM3 > 0 ? formatMoney(wagon.costPricePerM3) : '-'}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </>
      ) : (
        <>
          {/* Edit mode */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <tbody>
              {[
                [wagon.type === 'mashina' ? 'Mashina raqami' : 'Vagon kodi',
                  wagon.type === 'mashina'
                    ? <Input size="small" value={formData.wagonCode}
                        onChange={(e) => setFormData((p) => ({ ...p, wagonCode: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() }))} />
                    : <Input size="small" value={formData.wagonCode} maxLength={9}
                        onChange={(e) => setFormData((p) => ({ ...p, wagonCode: e.target.value.replace(/\D/g, '').slice(0, 9) }))} />],
                ["Jo'natilgan sana", <DatePicker size="small" style={{ width: '100%' }} value={formData.sentDate ? dayjs(formData.sentDate) : null}
                  onChange={(d) => setFormData((p) => ({ ...p, sentDate: d?.toISOString() || null }))} />],
                ['Kelgan sana', <DatePicker size="small" style={{ width: '100%' }} value={formData.arrivedDate ? dayjs(formData.arrivedDate) : null}
                  onChange={(d) => setFormData((p) => ({ ...p, arrivedDate: d?.toISOString() || null }))} />],
                ['Qayerdan', <Input size="small" value={formData.origin} onChange={(e) => setFormData((p) => ({ ...p, origin: e.target.value }))} />],
                ['Qayerga', <Input size="small" value={formData.destination} onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))} />],
                ['Kurs (RUB/USD)', <InputNumber size="small" style={{ width: '100%' }} min={0} step={0.01} value={formData.exchangeRate}
                  onChange={(v) => setFormData((p) => ({ ...p, exchangeRate: v || 0 }))} placeholder="Masalan: 90" />],
              ].map(([label, input]) => (
                <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ ...labelS, width: 160 }}>{label}</td>
                  <td style={cellS}>{input}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Edit bundles */}
          <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Yog'ochlar</Divider>
          {bundles.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead>
                <tr>
                  <th style={thS}>Qalinlik (mm)</th><th style={thS}>Eni (mm)</th><th style={thS}>Uzunlik (m)</th>
                  <th style={thS}>Soni</th><th style={thS}>Ayirish</th><th style={{ ...thS, width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((b, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0}
                      value={b.thickness} onChange={(v) => setBundles((p) => p.map((x, i) => i === idx ? { ...x, thickness: v } : x))} /></td>
                    <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0}
                      value={b.width} onChange={(v) => setBundles((p) => p.map((x, i) => i === idx ? { ...x, width: v } : x))} /></td>
                    <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={0}
                      value={b.length} onChange={(v) => setBundles((p) => p.map((x, i) => i === idx ? { ...x, length: v } : x))} /></td>
                    <td style={cellS}><InputNumber size="small" style={{ width: '100%' }} min={1}
                      value={b.count} onChange={(v) => setBundles((p) => p.map((x, i) => i === idx ? { ...x, count: v } : x))} /></td>
                    <td style={cellS}>
                      <Button size="small" type="link" danger onClick={() => openDeduction(idx)}>Ayirish</Button>
                      {(b.deductions || []).map((d, di) => <div key={di}><Text type="danger" style={{ fontSize: 12 }}>-{d.count}: {d.reason}</Text></div>)}
                    </td>
                    <td style={cellS}><MinusCircleOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }}
                      onClick={() => setBundles((p) => p.filter((_, i) => i !== idx))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Button size="small" type="dashed" icon={<PlusOutlined />} block
            onClick={() => setBundles((p) => [...p, { thickness: null, width: null, length: null, count: null, deductions: [] }])}>
            Yog'och qo'shish
          </Button>

          {/* Edit expenses */}
          <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Xarajatlar</Divider>
          <ExpensesEditor
            fixed={fixed} wood={wood} custom={custom}
            onFixedChange={(idx, v) => setFixed((p) => p.map((e, i) => i === idx ? { ...e, amount: v } : e))}
            onWoodChange={(v) => setWood((p) => ({ ...p, amount: v }))}
            onCustomChange={(idx, key, v) => setCustom((p) => p.map((e, i) => i === idx ? { ...e, [key]: v } : e))}
            onCustomRemove={(idx) => setCustom((p) => p.filter((_, i) => i !== idx))}
            onCustomAdd={() => setCustom((p) => [...p, { description: '', amount: 0, currency: 'USD' }])}
          />

          {/* Edit mode tannarx preview */}
          {(() => {
            const editUsd = fixed.reduce((s, e) => s + (e.amount || 0), 0)
              + custom.filter(e => e.currency === 'USD').reduce((s, e) => s + (e.amount || 0), 0);
            const editRub = (wood.amount || 0)
              + custom.filter(e => e.currency === 'RUB').reduce((s, e) => s + (e.amount || 0), 0);
            const editRate = formData.exchangeRate || globalRate || 0;
            const editRubInUsd = editRate > 0 ? editRub / editRate : 0;
            const editTotalUsd = editUsd + editRubInUsd;
            const editM3 = bundles.reduce((s, b) => {
              if (!b.thickness || !b.width || !b.length || !b.count) return s;
              const deducted = (b.deductions || []).reduce((ds, d) => ds + (d.count || 0), 0);
              const remaining = b.count - deducted;
              return s + ((b.thickness * b.width * b.length) / 1e6) * remaining;
            }, 0);
            const editTannarx = editM3 > 0 ? editTotalUsd / editM3 : 0;
            return (
              <>
                <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Tannarx (avtomatik)</Divider>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={labelS}>Jami USD xarajatlar</td>
                      <td style={{ ...cellS, textAlign: 'right' }}>{editUsd.toLocaleString('ru-RU')} USD</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fffbe6' }}>
                      <td style={labelS}>RUB xarajatlar → USD</td>
                      <td style={{ ...cellS, textAlign: 'right' }}>
                        {editRub.toLocaleString('ru-RU')} RUB
                        {editRate > 0 ? ` ÷ ${editRate} = ${editRubInUsd.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD` : ''}
                        {editRate === 0 && editRub > 0 && <Text type="danger" style={{ marginLeft: 8 }}>Kurs belgilanmagan!</Text>}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={labelS}>Jami xarajat (USD)</td>
                      <td style={{ ...cellS, textAlign: 'right', fontWeight: 600 }}>{editTotalUsd.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={labelS}>Jami m³</td>
                      <td style={{ ...cellS, textAlign: 'right' }}>{editM3.toFixed(4)} m³</td>
                    </tr>
                    <tr style={{ background: '#f6ffed' }}>
                      <td style={{ ...labelS, fontWeight: 700 }}>Tannarx / m³</td>
                      <td style={{ ...cellS, textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#1677ff' }}>
                        {editTannarx > 0 ? `${editTannarx.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            );
          })()}

        </>
      )}

      {/* Deduction modal — outside of edit/view conditional */}
      <Modal title="Yog'och ayirish" open={deductOpen}
        onCancel={() => { setDeductOpen(false); setDeductReason(''); setDeductCount(null); }}
        onOk={submitDeduction} okText="Ayirish" cancelText="Bekor qilish" width={400}
        zIndex={1100}>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Input placeholder="Sababi (masalan: sifatsiz)" value={deductReason} onChange={(e) => setDeductReason(e.target.value)} />
          <InputNumber placeholder="Nechta" min={1} style={{ width: '100%' }} value={deductCount} onChange={setDeductCount} />
        </Space>
      </Modal>
    </Modal>
  );
}

// ===================== WAGON CARD (grid view) =====================
function WagonCard({ wagon, onClick, isArchive, onSell }) {
  const totalM3 = (wagon.woodBundles || []).reduce((s, b) => s + (b.totalM3 || 0), 0);
  const bundleCount = (wagon.woodBundles || []).length;
  const status = isArchive ? 'sotildi' : wagon.status;
  const hasStock = (wagon.woodBundles || []).some(b => (b.remainingCount || 0) > 0);

  return (
    <Card className="wagon-card" onClick={() => onClick(wagon)}>
      <div className={`wagon-card-status-strip ${status}`} />
      <div className="wagon-card-header">
        <div>
          <div className="wagon-card-code">
            {wagon.type === 'mashina' && <Tag color="blue" style={{ marginRight: 4, fontSize: 10 }}>Mashina</Tag>}
            {wagon.wagonCode}
          </div>
        </div>
        {isArchive
          ? <Tag color="default">Sotildi</Tag>
          : <Tag color={statusColors[wagon.status]}>{statusLabels[wagon.status]}</Tag>}
      </div>
      <div className="wagon-card-route">
        <EnvironmentOutlined />
        <span>{wagon.origin}</span>
        <ArrowRightOutlined />
        <span>{wagon.destination}</span>
      </div>
      <div className="wagon-card-dates">
        <span><SendOutlined /> {formatDate(wagon.sentDate) || '—'}</span>
        <span><CalendarOutlined /> {formatDate(wagon.arrivedDate) || '—'}</span>
      </div>
      <div className="wagon-card-stats">
        <div className="wagon-card-stat">
          <span className="wagon-card-stat-label">Hajm</span>
          <span className="wagon-card-stat-value">{formatM3(totalM3)} m³</span>
        </div>
        <div className="wagon-card-stat">
          <span className="wagon-card-stat-label">Tannarx/m³</span>
          <span className="wagon-card-stat-value primary">
            {wagon.costPricePerM3 > 0 ? formatMoney(wagon.costPricePerM3) : '—'}
          </span>
        </div>
        <div className="wagon-card-stat">
          <span className="wagon-card-stat-label">Pozitsiya</span>
          <span className="wagon-card-stat-value">{bundleCount}</span>
        </div>
      </div>
      {hasStock && (
        <div className="wagon-card-sell">
          <Button type="primary" icon={<ShoppingCartOutlined />} block
            onClick={(e) => { e.stopPropagation(); onSell(wagon); }}>
            Sotish
          </Button>
        </div>
      )}
    </Card>
  );
}

// ===================== BUNDLE SELL MODAL =====================
function BundleSellModal({ wagon, open, onClose }) {
  const { addItem } = useCart();
  const [quantities, setQuantities] = useState({});

  const bundles = (wagon?.woodBundles || []).filter((b) => (b.remainingCount || 0) > 0);

  const handleAdd = (bundle, idx) => {
    const qty = quantities[idx] || 1;
    addItem({
      wagonId: wagon._id,
      wagonCode: wagon.wagonCode,
      bundleIndex: idx,
      thickness: bundle.thickness,
      width: bundle.width,
      length: bundle.length,
      m3PerPiece: bundle.m3PerPiece || calcM3PerPiece(bundle.thickness, bundle.width, bundle.length),
      quantity: qty,
      maxQuantity: bundle.remainingCount,
      costPricePerM3: wagon.costPricePerM3 || 0,
    });
    message.success(`${qty} dona savatchaga qo'shildi`);
    setQuantities((p) => ({ ...p, [idx]: undefined }));
  };

  const handleClose = () => {
    setQuantities({});
    onClose();
  };

  return (
    <Modal title={`Sotish — ${wagon?.type === 'mashina' ? 'Mashina' : 'Vagon'} ${wagon?.wagonCode || ''}`} open={open} onCancel={handleClose}
      footer={<Button onClick={handleClose}>Yopish</Button>} width={600}>
      {bundles.length === 0 ? (
        <Text type="secondary">Qoldiq yog'och yo'q</Text>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>O'lcham</th>
              <th style={thS}>Qoldiq</th>
              <th style={{ ...thS, width: 100 }}>Miqdor</th>
              <th style={{ ...thS, width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {(wagon?.woodBundles || []).map((b, idx) => {
              if ((b.remainingCount || 0) <= 0) return null;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={cellS}>{b.thickness}mm × {b.width}mm × {b.length}m</td>
                  <td style={cellS}>{b.remainingCount} dona</td>
                  <td style={cellS}>
                    <InputNumber size="small" min={1} max={b.remainingCount}
                      value={quantities[idx] || 1}
                      onChange={(v) => setQuantities((p) => ({ ...p, [idx]: v }))}
                      style={{ width: '100%' }} />
                  </td>
                  <td style={cellS}>
                    <Button size="small" type="primary" icon={<ShoppingCartOutlined />}
                      onClick={() => handleAdd(b, idx)}>
                      Qo'shish
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

// ===================== MAIN PAGE =====================
export default function Wagons() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: undefined, startDate: undefined, endDate: undefined });
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState('vagon');
  const [selectedWagon, setSelectedWagon] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [sellWagon, setSellWagon] = useState(null);

  const { data: wagons = [], isLoading } = useQuery({ queryKey: ['wagons', filters], queryFn: () => getWagons(filters) });
  const { data: rateData } = useQuery({ queryKey: ['exchangeRate'], queryFn: getExchangeRate });

  const createMutation = useMutation({
    mutationFn: createWagon,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wagons'] }); setCreateOpen(false); message.success(createType === 'mashina' ? 'Mashina yaratildi' : 'Vagon yaratildi'); },
    onError: () => message.error('Yaratishda xatolik'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateWagon(id, data),
    onSuccess: (updated) => { queryClient.invalidateQueries({ queryKey: ['wagons'] }); setSelectedWagon(updated); message.success('Yangilandi'); },
    onError: () => message.error('Saqlashda xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWagon,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wagons'] }); setSelectedWagon(null); message.success("O'chirildi"); },
  });

  const warehouseMutation = useMutation({
    mutationFn: allBundlesToWarehouse,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wagons'] }); setSelectedWagon(null); message.success("Omborga o'tkazildi"); },
    onError: () => message.error('Xatolik yuz berdi'),
  });

  // Separate active wagons and archived (all bundles sold) wagons
  const archivedWagons = wagons.filter((w) => {
    const bundles = w.woodBundles || [];
    return bundles.length > 0 && bundles.every(b => (b.remainingCount || 0) === 0);
  });
  const activeWagons = wagons.filter((w) => !archivedWagons.includes(w));

  const columns = [
    { title: 'Turi', dataIndex: 'type', key: 'type', width: 80, render: (t) => t === 'mashina' ? <Tag color="blue">Mashina</Tag> : <Tag color="green">Vagon</Tag> },
    { title: 'Kod/Raqam', dataIndex: 'wagonCode', key: 'wagonCode', width: 120 },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (s) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag> },
    { title: "Jo'natilgan", dataIndex: 'sentDate', key: 'sentDate', width: 110, render: formatDate },
    { title: 'Kelgan', dataIndex: 'arrivedDate', key: 'arrivedDate', width: 110, render: formatDate },
    { title: 'Qayerdan', dataIndex: 'origin', key: 'origin', width: 100 },
    { title: 'Qayerga', dataIndex: 'destination', key: 'destination', width: 100 },
    { title: 'Jami m³', dataIndex: 'totalM3', key: 'totalM3', width: 110, render: formatM3 },
    { title: 'Tannarx/m³', dataIndex: 'costPricePerM3', key: 'costPricePerM3', width: 120, render: (v) => formatMoney(v) },
  ];

  // Archive columns — show "Sotildi" instead of actual status
  const archiveColumns = columns.map((c) =>
    c.key === 'status'
      ? { ...c, render: () => <Tag color="default">Sotildi</Tag> }
      : c
  );

  const rowProps = (record) => ({ onClick: () => setSelectedWagon(record), style: { cursor: 'pointer' } });

  const renderList = (data, cols, isArchive = false) => {
    if (viewMode === 'card') {
      return (
        <Row gutter={[16, 16]}>
          {data.map((w) => (
            <Col key={w._id} xs={24} sm={12} md={8} lg={6}>
              <WagonCard wagon={w} onClick={setSelectedWagon} isArchive={isArchive}
                onSell={(w) => setSellWagon(w)} />
            </Col>
          ))}
          {data.length === 0 && <Col span={24}><Text type="secondary">Ma'lumot yo'q</Text></Col>}
        </Row>
      );
    }
    return (
      <Table columns={cols} dataSource={data} rowKey="_id" loading={isLoading}
        pagination={{ pageSize: 20 }} scroll={{ x: 1000 }} size="small" onRow={rowProps} />
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select placeholder="Status" allowClear style={{ width: 150 }}
            onChange={(val) => setFilters((prev) => ({ ...prev, status: val }))} options={STATUS_OPTIONS} />
          <RangePicker onChange={(dates) => setFilters((prev) => ({
            ...prev, startDate: dates?.[0]?.toISOString(), endDate: dates?.[1]?.toISOString(),
          }))} />
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'table', icon: <BarsOutlined /> },
              { value: 'card', icon: <AppstoreOutlined /> },
            ]} />
        </Space>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateType('vagon'); setCreateOpen(true); }}>Yangi vagon</Button>
          <Button icon={<CarOutlined />} onClick={() => { setCreateType('mashina'); setCreateOpen(true); }}>Yangi mashina</Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="active" items={[
        {
          key: 'active',
          label: `Vagonlar (${activeWagons.length})`,
          children: renderList(activeWagons, columns),
        },
        {
          key: 'archive',
          label: `Arxiv (${archivedWagons.length})`,
          children: renderList(archivedWagons, archiveColumns, true),
        },
      ]} />

      <CreateWagonModal open={createOpen} onCancel={() => setCreateOpen(false)}
        onSave={(data) => createMutation.mutate(data)} loading={createMutation.isPending}
        globalRate={rateData?.rate || 0} transportType={createType} />

      <WagonDetailModal wagon={selectedWagon} open={!!selectedWagon} onClose={() => setSelectedWagon(null)}
        onUpdate={(data) => updateMutation.mutate({ id: selectedWagon._id, data })}
        onDelete={(id) => deleteMutation.mutate(id)} updating={updateMutation.isPending}
        deleting={deleteMutation.isPending} globalRate={rateData?.rate || 0}
        onWarehouse={(id) => warehouseMutation.mutate(id)} warehouseLoading={warehouseMutation.isPending} />

      <BundleSellModal wagon={sellWagon} open={!!sellWagon} onClose={() => setSellWagon(null)} />
    </div>
  );
}
