import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin } from 'antd';
import {
  DollarOutlined,
  WarningOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../../api';
import { formatMoney, formatDate, statusLabels, statusColors } from '../../utils/format';

const salesColumns = [
  {
    title: 'Mijoz',
    dataIndex: ['customer', 'name'],
    key: 'customer',
  },
  {
    title: 'Sana',
    dataIndex: 'date',
    key: 'date',
    render: (val) => formatDate(val),
  },
  {
    title: 'Summa',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    render: (val) => formatMoney(val),
  },
  {
    title: "To'langan",
    dataIndex: 'paidAmount',
    key: 'paidAmount',
    render: (val) => formatMoney(val),
  },
];

const wagonColumns = [
  {
    title: 'Vagon kodi',
    dataIndex: 'wagonCode',
    key: 'wagonCode',
  },
  {
    title: 'Kelib chiqishi',
    dataIndex: 'origin',
    key: 'origin',
  },
  {
    title: "Jo'natilgan sana",
    dataIndex: 'sentDate',
    key: 'sentDate',
    render: (val) => formatDate(val),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (val) => (
      <Tag color={statusColors[val]}>{statusLabels[val] || val}</Tag>
    ),
  },
];

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
        Ma'lumotlar yuklanmadi
      </div>
    );
  }

  const { totalSales = {}, totalDebt = {}, balance, recentSales, incomingWagons } = data;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Savdo USD"
              value={totalSales.USD}
              prefix={<DollarOutlined />}
              formatter={(val) => formatMoney(val, 'USD')}
            />
            {totalSales.RUB > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                RUB: {formatMoney(totalSales.RUB, 'RUB')}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Qarz USD"
              value={totalDebt.USD}
              prefix={<WarningOutlined />}
              styles={{ content: { color: totalDebt.USD > 0 ? '#cf1322' : undefined } }}
              formatter={(val) => formatMoney(val, 'USD')}
            />
            {totalDebt.RUB > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#cf1322' }}>
                RUB: {formatMoney(totalDebt.RUB, 'RUB')}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Kassa USD"
              value={balance?.USD}
              prefix={<WalletOutlined />}
              formatter={(val) => formatMoney(val, 'USD')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Kassa RUB"
              value={balance?.RUB}
              prefix={<WalletOutlined />}
              formatter={(val) => formatMoney(val, 'RUB')}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Oxirgi savdolar">
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
          <Card title="Kelayotgan vagonlar">
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
