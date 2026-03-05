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
import { getWagons, createWagon, updateWagon, deleteWagon, getExchangeRate, allBundlesToWarehouse, getSuppliers, getCoders } from '../../api';
import DeliveriesTab from '../Deliveries';
import { formatDate, formatM3, formatMoney, statusLabels, statusColors, calcM3PerPiece } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import '../styles/cards.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const STATUS_OPTIONS = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

// Fixed expense types that always show (USD) — used only in detail view
const FIXED_EXPENSES = [
  'NDS', 'Usluga', "Temir yo'l KZ", "Temir yo'l UZ",
  'Tupik', 'Xrannei', 'Klentga ortish', 'Yerga tushurish',
];

const WOOD_EXPENSE_KEY = "Yog'och xaridi";

const cellS = { padding: '6px 10px' };
const labelS = { ...cellS, fontWeight: 500, background: '#fafafa', whiteSpace: 'nowrap' };
const thS = { ...cellS, textAlign: 'left', fontWeight: 500, background: '#fafafa' };

// Extract wood purchase from expenses
function getWoodExpense(expenses) {
  const found = (expenses || []).find(e => e.description === WOOD_EXPENSE_KEY && e.currency === 'RUB');
  return { description: WOOD_EXPENSE_KEY, amount: found?.amount || 0, currency: 'RUB' };
}

// ===================== CREATE MODAL =====================
function CreateWagonModal({ open, onCancel, onSave, loading, globalRate, transportType = 'vagon', suppliers = [], coders = [] }) {
  const { t } = useLanguage();
  const isMashina = transportType === 'mashina';
  const [wagonCode, setWagonCode] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [sentDate, setSentDate] = useState(null);
  const [arrivedDate, setArrivedDate] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [tonnage, setTonnage] = useState(0);
  const [codeUZName, setCodeUZName] = useState('');
  const [codeUZ, setCodeUZ] = useState(0);
  const [coderUZ, setCoderUZ] = useState(null);
  const [codeKZName, setCodeKZName] = useState('');
  const [codeKZ, setCodeKZ] = useState(0);
  const [coderKZ, setCoderKZ] = useState(null);
  const [errors, setErrors] = useState({});

  const [wood, setWood] = useState({ description: WOOD_EXPENSE_KEY, amount: 0, currency: 'RUB' });
  const [fixedExpenses, setFixedExpenses] = useState({});
  const [extraExpenses, setExtraExpenses] = useState([]);
  const [bundles, setBundles] = useState([]);

  const handleOk = () => {
    const errs = {};
    if (!isMashina && (!wagonCode || wagonCode.length !== 8)) errs.wagonCode = true;
    if (isMashina && !wagonCode) errs.wagonCode = true;
    if (!origin) errs.origin = true;
    if (!destination) errs.destination = true;
    if (Object.keys(errs).length) {
      setErrors(errs);
      message.warning(t('mandatoryFields'));
      return;
    }
    const expenses = [];
    if (wood.amount > 0) expenses.push({ description: WOOD_EXPENSE_KEY, amount: wood.amount, currency: 'RUB' });
    // Kod xarajatlari endi expenses ga qo'shilmaydi, alohida fieldlarda saqlanadi
    FIXED_EXPENSES.forEach((name) => {
      const val = fixedExpenses[name];
      if (val > 0) expenses.push({ description: name, amount: val, currency: 'USD' });
    });
    extraExpenses.forEach((e) => {
      if (e.description && e.amount > 0) expenses.push({ description: e.description, amount: e.amount, currency: e.currency || 'USD' });
    });
    onSave({
      type: transportType,
      wagonCode, origin, destination,
      supplier: supplier || null,
      tonnage: tonnage || 0,
      uzCode: codeUZName || undefined,
      uzCostPerTon: codeUZ || 0,
      coderUZ: coderUZ || undefined,
      kzCode: codeKZName || undefined,
      kzCostPerTon: codeKZ || 0,
      coderKZ: coderKZ || undefined,
      sentDate: sentDate?.toISOString() || null,
      arrivedDate: arrivedDate?.toISOString() || null,
      expenses,
      woodBundles: bundles.filter((b) => b.thickness && b.width && b.length && b.count),
    });
  };

  const handleAfterClose = () => {
    setWagonCode(''); setOrigin(''); setDestination(''); setSentDate(null); setArrivedDate(null); setSupplier(null);
    setTonnage(0); setCodeUZName(''); setCodeUZ(0); setCoderUZ(null);
    setCodeKZName(''); setCodeKZ(0); setCoderKZ(null); setFixedExpenses({}); setExtraExpenses([]);
    setWood({ description: WOOD_EXPENSE_KEY, amount: 0, currency: 'RUB' });
    setBundles([]); setErrors({});
  };

  return (
    <Modal title={isMashina ? t('newTruck') : t('newWagon')} open={open} onCancel={onCancel} onOk={handleOk}
      confirmLoading={loading} afterClose={handleAfterClose} width={700}
      okText={t('create')} cancelText={t('cancel')}>

      {/* Basic info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ ...labelS, width: 160 }}>{isMashina ? t('truckCode') : t('wagonCode')} <span style={{ color: '#ff4d4f' }}>*</span></td>
            <td style={cellS}>
              {isMashina ? (
                <Input size="small" value={wagonCode}
                  onChange={(e) => { const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); setWagonCode(v); if (v) setErrors((p) => ({ ...p, wagonCode: false })); }}
                  status={errors.wagonCode ? 'error' : undefined} placeholder={t('truckCode')} />
              ) : (
                <Input size="small" value={wagonCode}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 8); setWagonCode(v); if (v) setErrors((p) => ({ ...p, wagonCode: false })); }}
                  status={errors.wagonCode ? 'error' : undefined} placeholder="8 ta raqam"
                  maxLength={8} suffix={<Text type="secondary">{wagonCode.length}/8</Text>} />
              )}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>{t('sentDate')}</td>
            <td style={cellS}>
              <DatePicker size="small" value={sentDate} style={{ width: '100%' }} onChange={setSentDate} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>{t('arrivedDate')}</td>
            <td style={cellS}>
              <DatePicker size="small" value={arrivedDate} style={{ width: '100%' }} onChange={setArrivedDate} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>{t('origin')} <span style={{ color: '#ff4d4f' }}>*</span></td>
            <td style={cellS}>
              <Input size="small" value={origin} status={errors.origin ? 'error' : undefined}
                onChange={(e) => { setOrigin(e.target.value); setErrors((p) => ({ ...p, origin: false })); }} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>{t('destination')} <span style={{ color: '#ff4d4f' }}>*</span></td>
            <td style={cellS}>
              <Input size="small" value={destination} status={errors.destination ? 'error' : undefined}
                onChange={(e) => { setDestination(e.target.value); setErrors((p) => ({ ...p, destination: false })); }} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>Tonna</td>
            <td style={cellS}>
              <InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="0"
                value={tonnage || undefined} onChange={(v) => setTonnage(v || 0)} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>Rus yetkazib beruvchi</td>
            <td style={cellS}>
              <Select size="small" style={{ width: '100%' }} allowClear placeholder="Tanlang"
                value={supplier} onChange={setSupplier}
                options={(suppliers || []).map(s => ({ value: s._id, label: s.name }))} />
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>Kod UZ</td>
            <td style={cellS}>
              <Space.Compact style={{ width: '100%' }}>
                <Input size="small" style={{ width: '25%' }} placeholder="Kod nomi"
                  value={codeUZName} onChange={(e) => setCodeUZName(e.target.value)} />
                <InputNumber size="small" style={{ width: '25%' }} min={0} placeholder="$/t"
                  value={codeUZ || undefined} onChange={(v) => setCodeUZ(v || 0)} />
                <Select size="small" style={{ width: '30%' }} allowClear placeholder="Kodchi"
                  value={coderUZ} onChange={setCoderUZ} showSearch optionFilterProp="label"
                  options={(coders || []).map(c => ({ value: c._id, label: c.name }))} />
                <InputNumber size="small" style={{ width: '20%' }} readOnly variant="filled"
                  value={tonnage && codeUZ ? Math.round(tonnage * codeUZ * 100) / 100 : undefined}
                  placeholder="Jami" suffix="$" />
              </Space.Compact>
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelS}>Kod KZ</td>
            <td style={cellS}>
              <Space.Compact style={{ width: '100%' }}>
                <Input size="small" style={{ width: '25%' }} placeholder="Kod nomi"
                  value={codeKZName} onChange={(e) => setCodeKZName(e.target.value)} />
                <InputNumber size="small" style={{ width: '25%' }} min={0} placeholder="$/t"
                  value={codeKZ || undefined} onChange={(v) => setCodeKZ(v || 0)} />
                <Select size="small" style={{ width: '30%' }} allowClear placeholder="Kodchi"
                  value={coderKZ} onChange={setCoderKZ} showSearch optionFilterProp="label"
                  options={(coders || []).map(c => ({ value: c._id, label: c.name }))} />
                <InputNumber size="small" style={{ width: '20%' }} readOnly variant="filled"
                  value={tonnage && codeKZ ? Math.round(tonnage * codeKZ * 100) / 100 : undefined}
                  placeholder="Jami" suffix="$" />
              </Space.Compact>
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
        {t('addWood')}
      </Button>

      {/* Wood purchase (RUB only) */}
      <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Yog'och xaridi (RUB)</Divider>
      {(() => {
        const totalM3 = bundles.reduce((s, b) => {
          if (!b.thickness || !b.width || !b.length || !b.count) return s;
          return s + ((b.thickness * b.width * b.length) / 1e6) * b.count;
        }, 0);
        const pricePerM3 = totalM3 > 0 && wood.amount > 0 ? wood.amount / totalM3 : 0;
        const rate = globalRate || 0;
        const rubInUsd = rate > 0 ? (wood.amount || 0) / rate : 0;
        const tannarx = totalM3 > 0 ? rubInUsd / totalM3 : 0;
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fffbe6' }}>
                <td style={labelS}>Narx/m³ (RUB)</td>
                <td style={{ ...cellS, textAlign: 'right' }}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0}
                    value={pricePerM3 ? Math.round(pricePerM3) : undefined}
                    onChange={(v) => setWood((p) => ({ ...p, amount: totalM3 > 0 ? Math.round((v || 0) * totalM3) : p.amount }))}
                    placeholder="0" />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fffbe6' }}>
                <td style={labelS}>Jami summa (RUB)</td>
                <td style={{ ...cellS, textAlign: 'right' }}>
                  <InputNumber size="small" style={{ width: '100%' }} min={0}
                    value={wood.amount || undefined}
                    onChange={(v) => setWood((p) => ({ ...p, amount: v || 0 }))}
                    placeholder="0" />
                </td>
              </tr>
              {rate > 0 && wood.amount > 0 && (
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={labelS}>USD ekvivalent</td>
                  <td style={{ ...cellS, textAlign: 'right' }}>
                    {(wood.amount || 0).toLocaleString('ru-RU')} ÷ {rate} = {rubInUsd.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD
                  </td>
                </tr>
              )}
              {rate === 0 && wood.amount > 0 && (
                <tr><td colSpan={2} style={cellS}><Text type="danger">Kurs belgilanmagan!</Text></td></tr>
              )}
              {tannarx > 0 && (
                <tr style={{ background: '#f6ffed' }}>
                  <td style={{ ...labelS, fontWeight: 700 }}>Tannarx/m³</td>
                  <td style={{ ...cellS, textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#1677ff' }}>
                    {tannarx.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
      })()}

      {/* Xarajatlar */}
      <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Xarajatlar (USD)</Divider>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          {FIXED_EXPENSES.map((name) => (
            <tr key={name} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ ...labelS, width: 160 }}>{name}</td>
              <td style={cellS}>
                <InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="0"
                  value={fixedExpenses[name] || undefined}
                  onChange={(v) => setFixedExpenses((p) => ({ ...p, [name]: v || 0 }))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {extraExpenses.map((e, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <Input size="small" style={{ flex: 1 }} placeholder="Nomi" value={e.description}
            onChange={(ev) => setExtraExpenses(p => p.map((x, i) => i === idx ? { ...x, description: ev.target.value } : x))} />
          <InputNumber size="small" style={{ width: 120 }} min={0} placeholder="Summa" value={e.amount || undefined}
            onChange={(v) => setExtraExpenses(p => p.map((x, i) => i === idx ? { ...x, amount: v || 0 } : x))} />
          <Select size="small" style={{ width: 80 }} value={e.currency}
            onChange={(v) => setExtraExpenses(p => p.map((x, i) => i === idx ? { ...x, currency: v } : x))}
            options={[{ value: 'USD', label: 'USD' }, { value: 'RUB', label: 'RUB' }]} />
          <MinusCircleOutlined style={{ color: '#ff4d4f', cursor: 'pointer', lineHeight: '24px' }}
            onClick={() => setExtraExpenses(p => p.filter((_, i) => i !== idx))} />
        </div>
      ))}
      <Button size="small" type="dashed" icon={<PlusOutlined />} block style={{ marginBottom: 8 }}
        onClick={() => setExtraExpenses(p => [...p, { description: '', amount: 0, currency: 'USD' }])}>
        Qo'shimcha xarajat
      </Button>
    </Modal>
  );
}

// ===================== DETAIL MODAL =====================
function WagonDetailModal({ wagon, open, onClose, onUpdate, onDelete, updating, deleting, globalRate, onWarehouse, warehouseLoading, suppliers = [] }) {
  const { t } = useLanguage();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [wood, setWood] = useState({ description: WOOD_EXPENSE_KEY, amount: 0, currency: 'RUB' });
  const [bundles, setBundles] = useState([]);
  const [deductOpen, setDeductOpen] = useState(false);
  const [deductBundleIdx, setDeductBundleIdx] = useState(null);
  const [deductReason, setDeductReason] = useState('');
  const [deductCount, setDeductCount] = useState(null);

  const openEdit = () => {
    setFormData({
      wagonCode: wagon.wagonCode, origin: wagon.origin, destination: wagon.destination,
      sentDate: wagon.sentDate, arrivedDate: wagon.arrivedDate, exchangeRate: wagon.exchangeRate || 0,
      supplier: wagon.supplier?._id || wagon.supplier || null,
    });
    setWood(getWoodExpense(wagon.expenses));
    setBundles((wagon.woodBundles || []).map((b) => ({ ...b, deductions: b.deductions || [] })));
    setEditMode(true);
  };

  const handleSave = () => {
    // Preserve existing non-wood expenses, only update wood purchase
    const existingNonWood = (wagon.expenses || []).filter(e => e.description !== WOOD_EXPENSE_KEY);
    const woodExpense = wood.amount > 0 ? [{ description: WOOD_EXPENSE_KEY, amount: wood.amount, currency: 'RUB' }] : [];
    onUpdate({
      ...formData,
      sentDate: formData.sentDate || null,
      arrivedDate: formData.arrivedDate || null,
      expenses: [...woodExpense, ...existingNonWood],
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
        <Button key="cancel" onClick={() => setEditMode(false)}>{t('cancel')}</Button>,
        <Button key="save" type="primary" loading={updating} onClick={handleSave}>{t('save')}</Button>,
      ] : [
        <Popconfirm key="del" title={t('deleteConfirm')} onConfirm={() => onDelete(wagon._id)}>
          <Button danger loading={deleting}>{t('delete')}</Button>
        </Popconfirm>,
        <Button key="edit" type="primary" onClick={openEdit}>{t('edit')}</Button>,
      ]}>

      {!editMode ? (
        <>
          {/* View mode */}
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label={wagon.type === 'mashina' ? t('truckCode') : t('wagonCode')}>{wagon.wagonCode}</Descriptions.Item>
            <Descriptions.Item label={t('status')}><Tag color={statusColors[wagon.status]}>{statusLabels[wagon.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label={t('sentDate')}>{formatDate(wagon.sentDate)}</Descriptions.Item>
            <Descriptions.Item label={t('arrivedDate')}>{formatDate(wagon.arrivedDate)}</Descriptions.Item>
            <Descriptions.Item label={t('origin')}>{wagon.origin || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('destination')}>{wagon.destination || '-'}</Descriptions.Item>
            <Descriptions.Item label="Kurs (RUB/USD)">{rate || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('totalM3')}>{formatM3(totalM3)}</Descriptions.Item>
            <Descriptions.Item label={t('supplier')} span={2}>
              {wagon.supplier?.name || '—'}
            </Descriptions.Item>
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
            <Popconfirm title={t('allToWarehouseConfirm')} onConfirm={() => onWarehouse(wagon._id)}>
              <Button type="primary" icon={<InboxOutlined />} loading={warehouseLoading} style={{ marginTop: 8 }}>
                Barchasini omborga o'tkazish
              </Button>
            </Popconfirm>
          )}

          {/* Expenses view */}
          <Divider titlePlacement="left" style={{ margin: '8px 0' }}>{t('expenses')}</Divider>
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
            <Descriptions.Item label={t('rubInUsd')}>{rate > 0 ? formatMoney(rubInUsd) : '-'}</Descriptions.Item>
            <Descriptions.Item label={t('totalCost')}><Text strong>{formatMoney(totalExpUsd)}</Text></Descriptions.Item>
            <Descriptions.Item label={t('totalM3')}><Text strong>{formatM3(totalM3)}</Text></Descriptions.Item>
            <Descriptions.Item label={t('costPerM3')}>
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
                [wagon.type === 'mashina' ? t('truckCode') : t('wagonCode'),
                  wagon.type === 'mashina'
                    ? <Input size="small" value={formData.wagonCode}
                        onChange={(e) => setFormData((p) => ({ ...p, wagonCode: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() }))} />
                    : <Input size="small" value={formData.wagonCode} maxLength={8}
                        onChange={(e) => setFormData((p) => ({ ...p, wagonCode: e.target.value.replace(/\D/g, '').slice(0, 8) }))} />],
                [t('sentDate'), <DatePicker size="small" style={{ width: '100%' }} value={formData.sentDate ? dayjs(formData.sentDate) : null}
                  onChange={(d) => setFormData((p) => ({ ...p, sentDate: d?.toISOString() || null }))} />],
                [t('arrivedDate'), <DatePicker size="small" style={{ width: '100%' }} value={formData.arrivedDate ? dayjs(formData.arrivedDate) : null}
                  onChange={(d) => setFormData((p) => ({ ...p, arrivedDate: d?.toISOString() || null }))} />],
                [t('origin'), <Input size="small" value={formData.origin} onChange={(e) => setFormData((p) => ({ ...p, origin: e.target.value }))} />],
                [t('destination'), <Input size="small" value={formData.destination} onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))} />],
                ['Kurs (RUB/USD)', <InputNumber size="small" style={{ width: '100%' }} min={0} step={0.01} value={formData.exchangeRate}
                  onChange={(v) => setFormData((p) => ({ ...p, exchangeRate: v || 0 }))} placeholder="Masalan: 90" />],
                [t('supplier'), <Select size="small" style={{ width: '100%' }} allowClear placeholder="Tanlang"
                  value={formData.supplier || null}
                  onChange={(v) => setFormData((p) => ({ ...p, supplier: v || null }))}
                  options={(suppliers || []).map(s => ({ value: s._id, label: s.name }))} />],
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
            {t('addWood')}
          </Button>

          {/* Edit wood purchase only — other expenses managed in Expenses page */}
          <Divider titlePlacement="left" style={{ margin: '12px 0 8px' }}>Yog'och xaridi (RUB)</Divider>
          {(() => {
            const editM3 = bundles.reduce((s, b) => {
              if (!b.thickness || !b.width || !b.length || !b.count) return s;
              const deducted = (b.deductions || []).reduce((ds, d) => ds + (d.count || 0), 0);
              const remaining = b.count - deducted;
              return s + ((b.thickness * b.width * b.length) / 1e6) * remaining;
            }, 0);
            const editRate = formData.exchangeRate || globalRate || 0;
            const woodRub = wood.amount || 0;
            const woodUsd = editRate > 0 ? woodRub / editRate : 0;
            const pricePerM3 = editM3 > 0 && woodRub > 0 ? woodRub / editM3 : 0;
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fffbe6' }}>
                    <td style={labelS}>Narx/m³ (RUB)</td>
                    <td style={{ ...cellS, textAlign: 'right' }}>
                      <InputNumber size="small" style={{ width: '100%' }} min={0}
                        value={pricePerM3 ? Math.round(pricePerM3) : undefined}
                        onChange={(v) => setWood((p) => ({ ...p, amount: editM3 > 0 ? Math.round((v || 0) * editM3) : p.amount }))}
                        placeholder="0" />
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fffbe6' }}>
                    <td style={labelS}>Jami summa (RUB)</td>
                    <td style={{ ...cellS, textAlign: 'right' }}>
                      <InputNumber size="small" style={{ width: '100%' }} min={0}
                        value={woodRub || undefined}
                        onChange={(v) => setWood((p) => ({ ...p, amount: v || 0 }))}
                        placeholder="0" />
                    </td>
                  </tr>
                  {editRate > 0 && woodRub > 0 && (
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={labelS}>USD ekvivalent</td>
                      <td style={{ ...cellS, textAlign: 'right' }}>
                        {woodRub.toLocaleString('ru-RU')} ÷ {editRate} = {woodUsd.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USD
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })()}

        </>
      )}

      {/* Deduction modal — outside of edit/view conditional */}
      <Modal title={t('deductWood')} open={deductOpen}
        onCancel={() => { setDeductOpen(false); setDeductReason(''); setDeductCount(null); }}
        onOk={submitDeduction} okText="Ayirish" cancelText={t('cancel')} width={400}
        zIndex={1100}>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Input placeholder={t('deductReason')} value={deductReason} onChange={(e) => setDeductReason(e.target.value)} />
          <InputNumber placeholder="Nechta" min={1} style={{ width: '100%' }} value={deductCount} onChange={setDeductCount} />
        </Space>
      </Modal>
    </Modal>
  );
}

// ===================== WAGON CARD (grid view) =====================
function WagonCard({ wagon, onClick, isArchive, onSell }) {
  const { t } = useLanguage();
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
            {t('sell')}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ===================== BUNDLE SELL MODAL =====================
function BundleSellModal({ wagon, open, onClose }) {
  const { t } = useLanguage();
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
    <Modal title={`${t('sell')} — ${wagon?.type === 'mashina' ? 'Mashina' : 'Vagon'} ${wagon?.wagonCode || ''}`} open={open} onCancel={handleClose}
      footer={<Button onClick={handleClose}>{t('close')}</Button>} width={600}>
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
                      {t('add')}
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
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: undefined, startDate: undefined, endDate: undefined });
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState('vagon');
  const [selectedWagon, setSelectedWagon] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [sellWagon, setSellWagon] = useState(null);

  const { data: wagons = [], isLoading } = useQuery({ queryKey: ['wagons', filters], queryFn: () => getWagons(filters) });
  const { data: rateData } = useQuery({ queryKey: ['exchangeRate'], queryFn: getExchangeRate });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const { data: codersList = [] } = useQuery({ queryKey: ['coders'], queryFn: getCoders });

  const createMutation = useMutation({
    mutationFn: (data) => createWagon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wagons'] });
      setCreateOpen(false);
      message.success(createType === 'mashina' ? t('truckCreated') : t('wagonCreated'));
    },
    onError: () => message.error('Yaratishda xatolik'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateWagon(id, data),
    onSuccess: (updated) => { queryClient.invalidateQueries({ queryKey: ['wagons'] }); setSelectedWagon(updated); message.success(t('updated')); },
    onError: () => message.error('Saqlashda xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWagon,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wagons'] }); setSelectedWagon(null); message.success(t('deleted')); },
  });

  const warehouseMutation = useMutation({
    mutationFn: allBundlesToWarehouse,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wagons'] }); setSelectedWagon(null); message.success(t('warehouseDone')); },
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
    { title: 'Raqam', dataIndex: 'wagonCode', key: 'wagonCode', width: 120 },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (s) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag> },
    { title: "Jo'natilgan", dataIndex: 'sentDate', key: 'sentDate', width: 110, render: formatDate },
    { title: 'Kelgan', dataIndex: 'arrivedDate', key: 'arrivedDate', width: 110, render: formatDate },
    { title: 'Qayerdan', dataIndex: 'origin', key: 'origin', width: 100 },
    { title: 'Qayerga', dataIndex: 'destination', key: 'destination', width: 100 },
    { title: 'Jami m³', dataIndex: 'totalM3', key: 'totalM3', width: 110, render: formatM3 },
    { title: 'Tannarx/m³', dataIndex: 'costPricePerM3', key: 'costPricePerM3', width: 120, render: (v) => formatMoney(v) },
    { title: 'Rus', key: 'supplier', width: 100, render: (_, r) => r.supplier?.name || '—' },
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateType('vagon'); setCreateOpen(true); }}>{t('newWagon')}</Button>
          <Button icon={<CarOutlined />} onClick={() => { setCreateType('mashina'); setCreateOpen(true); }}>{t('newTruck')}</Button>
        </Space>
      </div>

      <Card className="summary-card" style={{ marginBottom: 16 }}>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Jami</span>
            <span className="summary-stat-value">{wagons.length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Kelyapti</span>
            <span className="summary-stat-value">{wagons.filter(w => w.status === 'kelyapti').length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Faol</span>
            <span className="summary-stat-value highlight">{activeWagons.filter(w => w.status === 'faol').length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{t('archive')}</span>
            <span className="summary-stat-value">{archivedWagons.length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Jami m³</span>
            <span className="summary-stat-value">{formatM3(wagons.reduce((s, w) => s + (w.totalM3 || 0), 0))}</span>
          </div>
        </div>
      </Card>

      <Tabs defaultActiveKey="active" items={[
        {
          key: 'active',
          label: `Vagonlar (${activeWagons.length})`,
          children: renderList(activeWagons, columns),
        },
        {
          key: 'archive',
          label: `${t('archive')} (${archivedWagons.length})`,
          children: renderList(archivedWagons, archiveColumns, true),
        },
        {
          key: 'deliveries',
          label: t('deliveriesTab'),
          children: <DeliveriesTab />,
        },
      ]} />

      <CreateWagonModal open={createOpen} onCancel={() => setCreateOpen(false)}
        onSave={(data) => createMutation.mutate(data)} loading={createMutation.isPending}
        globalRate={rateData?.rate || 0} transportType={createType} suppliers={suppliers} coders={codersList} />

      <WagonDetailModal wagon={selectedWagon} open={!!selectedWagon} onClose={() => setSelectedWagon(null)}
        onUpdate={(data) => updateMutation.mutate({ id: selectedWagon._id, data })}
        onDelete={(id) => deleteMutation.mutate(id)} updating={updateMutation.isPending}
        deleting={deleteMutation.isPending} globalRate={rateData?.rate || 0}
        onWarehouse={(id) => warehouseMutation.mutate(id)} warehouseLoading={warehouseMutation.isPending}
        suppliers={suppliers} />

      <BundleSellModal wagon={sellWagon} open={!!sellWagon} onClose={() => setSellWagon(null)} />
    </div>
  );
}
