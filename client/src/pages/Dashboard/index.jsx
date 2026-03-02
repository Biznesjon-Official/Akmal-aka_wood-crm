import { Card, Row, Col, Spin, Progress, Typography, Space } from 'antd';
import {
  WarningOutlined, WalletOutlined,
  CarOutlined, ArrowUpOutlined, ArrowDownOutlined, SendOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../../api';
import { formatMoney, formatDate, statusLabels, statusColors } from '../../utils/format';
import { Table, Tag } from 'antd';
import { useLanguage } from '../../context/LanguageContext';

const { Text } = Typography;

function KpiCard({ title, value, color, prefix, suffix, extra }) {
  return (
    <Card size="small" style={{ borderTop: `3px solid ${color || '#1677ff'}` }}>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || '#1d1d1d' }}>
        {prefix && <span style={{ marginRight: 4, fontSize: 14 }}>{prefix}</span>}
        {value}
        {suffix && <span style={{ marginLeft: 4, fontSize: 13, color: '#888' }}>{suffix}</span>}
      </div>
      {extra && <div style={{ marginTop: 4, fontSize: 11, color: '#aaa' }}>{extra}</div>}
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();

  const salesColumns = [
    { title: t('customer'), dataIndex: ['customer', 'name'], key: 'customer' },
    { title: t('date'), dataIndex: 'createdAt', key: 'date', render: (v) => formatDate(v) },
    { title: t('amount'), dataIndex: 'totalAmount', key: 'totalAmount', render: (v, r) => formatMoney(v, r.currency) },
    {
      title: t('debt'), key: 'debt',
      render: (_, r) => {
        const debt = Math.max(0, (r.totalAmount || 0) - (r.paidAmount || 0));
        return debt > 0
          ? <Text type="danger">{formatMoney(debt, r.currency)}</Text>
          : <Text type="success">{t('full')}</Text>;
      },
    },
  ];

  const wagonColumns = [
    { title: 'Vagon', dataIndex: 'wagonCode', key: 'wagonCode', render: (v) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
    { title: t('fromWhere'), dataIndex: 'origin', key: 'origin' },
    { title: t('date'), dataIndex: 'sentDate', key: 'sentDate', render: (v) => formatDate(v) },
    { title: t('status'), dataIndex: 'status', key: 'status', render: (v) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag> },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>{t('loading')}</div>;
  }

  const {
    totalDebt = {}, balance = {},
    wagonCounts = {}, totalWagons = 0,
    deliveryStats = {}, thisMonth = {}, monthCash = {},
    recentSales = [], incomingWagons = [],
  } = data;

  const soldCount = wagonCounts.sotildi || 0;
  const activeCount = wagonCounts.faol || 0;
  const comingCount = wagonCounts.kelyapti || 0;
  const warehouseCount = wagonCounts.omborda || 0;
  const activeTotal = comingCount + activeCount + warehouseCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPI Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <KpiCard
            title={t('cashUsd')}
            value={formatMoney(balance.USD, 'USD')}
            color={balance.USD >= 0 ? '#389e0d' : '#cf1322'}
            prefix={<WalletOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <KpiCard
            title={t('cashRub')}
            value={formatMoney(balance.RUB, 'RUB')}
            color={balance.RUB >= 0 ? '#1677ff' : '#cf1322'}
            prefix={<WalletOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <KpiCard
            title={t('monthSales')}
            value={formatMoney(thisMonth.USD, 'USD')}
            color="#722ed1"
            prefix={<ArrowUpOutlined />}
            extra={thisMonth.RUB > 0 ? `+ ${formatMoney(thisMonth.RUB, 'RUB')}` : undefined}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <KpiCard
            title={t('totalDebt')}
            value={formatMoney(totalDebt.USD, 'USD')}
            color={totalDebt.USD > 0 ? '#cf1322' : '#52c41a'}
            prefix={<WarningOutlined />}
            extra={totalDebt.RUB > 0 ? `RUB: ${formatMoney(totalDebt.RUB, 'RUB')}` : undefined}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <KpiCard
            title={t('activeWagons')}
            value={`${activeTotal} ta`}
            color="#1677ff"
            prefix={<CarOutlined />}
            extra={`Sotildi: ${soldCount} ta`}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <KpiCard
            title={t('deliveryRemaining')}
            value={formatMoney(deliveryStats.remaining, 'USD')}
            color={deliveryStats.remaining > 0 ? '#d46b08' : '#52c41a'}
            prefix={<SendOutlined />}
            extra={`${deliveryStats.active || 0} ta aktiv`}
          />
        </Col>
      </Row>

      {/* Second row: Wagon pipeline + Delivery + Month cash */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card title={t('wagonStatus')} size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: t('coming'), count: comingCount, color: '#faad14' },
                { label: t('active'), count: activeCount, color: '#1677ff' },
                { label: t('inWarehouse'), count: warehouseCount, color: '#722ed1' },
                { label: t('sold'), count: soldCount, color: '#52c41a' },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <Text style={{ color }}>{label}</Text>
                    <Text strong>{count} ta</Text>
                  </div>
                  <Progress
                    percent={totalWagons > 0 ? Math.round((count / totalWagons) * 100) : 0}
                    strokeColor={color}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title={t('deliveries_stat')} size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('totalDeliveries')}</Text>
                <Text strong>{deliveryStats.total || 0} ta</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('activeDeliveries')}</Text>
                <Text strong style={{ color: '#1677ff' }}>{deliveryStats.active || 0} ta</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('totalDebt2')}</Text>
                <Text strong>{formatMoney(deliveryStats.totalDebt, 'USD')}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('paid2')}</Text>
                <Text strong style={{ color: '#52c41a' }}>{formatMoney(deliveryStats.paidAmount, 'USD')}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('remaining2')}</Text>
                <Text strong style={{ color: '#cf1322' }}>{formatMoney(deliveryStats.remaining, 'USD')}</Text>
              </div>
              {deliveryStats.totalDebt > 0 && (
                <Progress
                  percent={Math.round((deliveryStats.paidAmount / deliveryStats.totalDebt) * 100)}
                  strokeColor="#52c41a"
                  size="small"
                />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title={t('monthCash')} size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  <Text type="secondary">{t('incomeUsd')}</Text>
                </Space>
                <Text strong style={{ color: '#52c41a' }}>{formatMoney(monthCash.kirimUSD, 'USD')}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <ArrowDownOutlined style={{ color: '#cf1322' }} />
                  <Text type="secondary">{t('expenseUsd')}</Text>
                </Space>
                <Text strong style={{ color: '#cf1322' }}>{formatMoney(monthCash.chiqimUSD, 'USD')}</Text>
              </div>
              <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('netUsd')}</Text>
                <Text strong style={{ color: (monthCash.kirimUSD - monthCash.chiqimUSD) >= 0 ? '#389e0d' : '#cf1322', fontSize: 15 }}>
                  {formatMoney(monthCash.kirimUSD - monthCash.chiqimUSD, 'USD')}
                </Text>
              </div>
              {(monthCash.kirimRUB > 0 || monthCash.chiqimRUB > 0) && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space><ArrowUpOutlined style={{ color: '#52c41a' }} /><Text type="secondary">{t('incomeRub')}</Text></Space>
                    <Text strong style={{ color: '#52c41a' }}>{formatMoney(monthCash.kirimRUB, 'RUB')}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space><ArrowDownOutlined style={{ color: '#cf1322' }} /><Text type="secondary">{t('expenseRub')}</Text></Space>
                    <Text strong style={{ color: '#cf1322' }}>{formatMoney(monthCash.chiqimRUB, 'RUB')}</Text>
                  </div>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent tables */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card title={t('recentSales')} size="small">
            <Table
              columns={salesColumns}
              dataSource={recentSales}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('comingWagons')} size="small">
            <Table
              columns={wagonColumns}
              dataSource={incomingWagons}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

    </div>
  );
}
