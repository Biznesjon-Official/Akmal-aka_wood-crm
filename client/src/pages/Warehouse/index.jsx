import React, { useMemo, useState } from 'react';
import { Table, InputNumber, Card, Typography, Space, Spin, Tag, Row, Col, Segmented, Progress, Button, Popover, Tabs, message } from 'antd';
import { AppstoreOutlined, BarsOutlined, WarningOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getWagons } from '../../api';
import { formatM3, formatMoney, calcM3PerPiece } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import '../styles/cards.css';

const { Text } = Typography;

// Quantity popover for adding to cart
function SellPopover({ bundle, children }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    addItem({
      wagonId: bundle.wagonId,
      wagonCode: bundle.wagonCode,
      bundleIndex: bundle.bundleIndex,
      thickness: bundle.thickness,
      width: bundle.width,
      length: bundle.length,
      m3PerPiece: bundle.m3PerPiece || calcM3PerPiece(bundle.thickness, bundle.width, bundle.length),
      quantity: qty,
      maxQuantity: bundle.remainingCount,
      costPricePerM3: bundle.costPricePerM3 || 0,
    });
    message.success(`${qty} dona savatchaga qo'shildi`);
    setQty(1);
    setOpen(false);
  };

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      content={
        <Space>
          <InputNumber size="small" min={1} max={bundle.remainingCount}
            value={qty} onChange={setQty} style={{ width: 80 }} />
          <Button size="small" type="primary" onClick={handleAdd}>Qo'shish</Button>
        </Space>
      }
      title="Nechta?"
    >
      {children}
    </Popover>
  );
}

export default function Warehouse() {
  const [filters, setFilters] = useState({ thickness: null, width: null, length: null });
  const [viewMode, setViewMode] = useState('table');

  const { data: wagons, isLoading } = useQuery({
    queryKey: ['wagons'],
    queryFn: getWagons,
  });

  // Group bundles by wagon
  const warehouseGroups = useMemo(() => {
    if (!wagons) return [];
    const wagonList = Array.isArray(wagons) ? wagons : wagons.data || [];
    const groups = [];
    wagonList.forEach((wagon) => {
      const bundles = [];
      (wagon.woodBundles || []).forEach((bundle, idx) => {
        if (bundle.location === 'ombor') {
          bundles.push({
            ...bundle,
            wagonId: wagon._id,
            wagonCode: wagon.wagonCode,
            bundleIndex: idx,
            costPricePerM3: wagon.costPricePerM3 || 0,
            _key: `${wagon._id}-${idx}`,
          });
        }
      });
      if (bundles.length > 0) {
        groups.push({
          wagon: {
            _id: wagon._id,
            wagonCode: wagon.wagonCode,
            origin: wagon.origin,
            destination: wagon.destination,
            sentDate: wagon.sentDate,
            arrivedDate: wagon.arrivedDate,
            costPricePerM3: wagon.costPricePerM3 || 0,
            exchangeRate: wagon.exchangeRate || 0,
            totalM3: wagon.totalM3 || 0,
          },
          bundles,
        });
      }
    });
    groups.sort((a, b) => new Date(a.wagon.arrivedDate || a.wagon.sentDate || 0) - new Date(b.wagon.arrivedDate || b.wagon.sentDate || 0));
    return groups;
  }, [wagons]);

  // Apply filters and split active/archived
  const { filteredGroups, totalRemainingM3, totalBundles, flatBundles, archivedBundles } = useMemo(() => {
    let totalM3 = 0;
    let count = 0;
    const flat = [];
    const archived = [];
    const groups = warehouseGroups.map((group) => {
      const filtered = group.bundles.filter((b) => {
        if (filters.thickness != null && b.thickness !== filters.thickness) return false;
        if (filters.width != null && b.width !== filters.width) return false;
        if (filters.length != null && b.length !== filters.length) return false;
        return true;
      });
      filtered.forEach((b) => {
        if ((b.remainingCount || 0) === 0) {
          archived.push(b);
        } else {
          totalM3 += (b.m3PerPiece || 0) * (b.remainingCount || 0);
          count += 1;
          flat.push(b);
        }
      });
      return { ...group, bundles: filtered };
    }).filter((g) => g.bundles.length > 0);
    return { filteredGroups: groups, totalRemainingM3: totalM3, totalBundles: count, flatBundles: flat, archivedBundles: archived };
  }, [warehouseGroups, filters]);

  const baseColumns = [
    { title: 'Vagon', dataIndex: 'wagonCode', key: 'wagonCode', render: (code) => <Tag color="blue">{code}</Tag> },
    { title: 'Qalinlik (mm)', dataIndex: 'thickness', key: 'thickness' },
    { title: 'Eni (mm)', dataIndex: 'width', key: 'width' },
    { title: 'Uzunlik (m)', dataIndex: 'length', key: 'length' },
    { title: 'Jami soni', dataIndex: 'count', key: 'count' },
    { title: 'Qoldiq', dataIndex: 'remainingCount', key: 'remainingCount',
      render: (val, r) => <Text type={val < r.count ? 'warning' : undefined}>{val}</Text> },
    { title: 'm³/dona', dataIndex: 'm3PerPiece', key: 'm3PerPiece', render: formatM3 },
    { title: 'Jami m³', key: 'totalM3', render: (_, r) => formatM3((r.m3PerPiece || 0) * (r.remainingCount || 0)) },
    { title: 'Tannarx/m³', dataIndex: 'costPricePerM3', key: 'costPricePerM3', render: (v) => v > 0 ? formatMoney(v) : '—' },
  ];

  const tableColumns = [
    ...baseColumns,
    {
      title: '', key: 'sell', width: 80,
      render: (_, r) => r.remainingCount > 0 ? (
        <SellPopover bundle={r}>
          <Button size="small" type="primary" icon={<ShoppingCartOutlined />}>Sotish</Button>
        </SellPopover>
      ) : null,
    },
  ];

  const archiveColumns = [...baseColumns];

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Space size="large" wrap>
            <div>
              <Text type="secondary">Qalinlik (mm)</Text><br />
              <InputNumber placeholder="Qalinlik" value={filters.thickness}
                onChange={(val) => setFilters((f) => ({ ...f, thickness: val }))} style={{ width: 140 }} allowClear />
            </div>
            <div>
              <Text type="secondary">Eni (mm)</Text><br />
              <InputNumber placeholder="Eni" value={filters.width}
                onChange={(val) => setFilters((f) => ({ ...f, width: val }))} style={{ width: 140 }} allowClear />
            </div>
            <div>
              <Text type="secondary">Uzunlik (m)</Text><br />
              <InputNumber placeholder="Uzunlik" value={filters.length}
                onChange={(val) => setFilters((f) => ({ ...f, length: val }))} style={{ width: 140 }} allowClear />
            </div>
          </Space>
          <Segmented value={viewMode} onChange={setViewMode}
            options={[
              { value: 'table', icon: <BarsOutlined /> },
              { value: 'card', icon: <AppstoreOutlined /> },
            ]} />
        </div>
      </Card>

      <Tabs defaultActiveKey="active" items={[
        {
          key: 'active',
          label: `Ombor (${flatBundles.length})`,
          children: (
            <>
              {viewMode === 'table' ? (
                <Table columns={tableColumns} dataSource={flatBundles} rowKey="_key"
                  pagination={{ pageSize: 20 }} size="small"
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={7}><Text strong>Jami qoldiq m³:</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={7} colSpan={3}><Text strong>{formatM3(totalRemainingM3)}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                  )} />
              ) : (
                <Row gutter={[16, 16]}>
                  {flatBundles.map((b) => {
                    const bundleM3 = (b.m3PerPiece || 0) * (b.remainingCount || 0);
                    const usedPercent = b.count > 0 ? Math.round((b.remainingCount / b.count) * 100) : 0;
                    return (
                      <Col key={b._key} xs={24} sm={12} md={8} lg={6}>
                        <Card className="warehouse-card">
                          <div className="warehouse-card-top">
                            <Tag color="blue">{b.wagonCode}</Tag>
                            {b.costPricePerM3 > 0 && (
                              <span className="warehouse-card-tannarx">{formatMoney(b.costPricePerM3)}</span>
                            )}
                          </div>
                          <div className="warehouse-card-dimension">
                            {b.thickness}mm<span> × </span>{b.width}mm<span> × </span>{b.length}m
                          </div>
                          <div className="warehouse-card-info">
                            <div className="warehouse-card-row">
                              <Text type="secondary">Soni</Text>
                              <Text strong>{b.count} dona</Text>
                            </div>
                            <div className="warehouse-card-row">
                              <Text type="secondary">Qoldiq</Text>
                              <Text strong type={b.remainingCount < b.count ? 'warning' : undefined}>
                                {b.remainingCount} dona
                              </Text>
                            </div>
                          </div>
                          <div className="warehouse-card-progress">
                            <Progress
                              percent={usedPercent}
                              size="small"
                              strokeColor={usedPercent > 50 ? '#52c41a' : usedPercent > 20 ? '#faad14' : '#ff4d4f'}
                              format={() => `${b.remainingCount}/${b.count}`}
                            />
                          </div>
                          {(b.deductions || []).length > 0 && (
                            <div className="warehouse-card-deductions">
                              {b.deductions.map((d, di) => (
                                <div key={di} className="warehouse-card-deduction-item">
                                  <WarningOutlined /> -{d.count}: {d.reason}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="warehouse-card-footer">
                            <div>
                              <Text type="secondary" style={{ fontSize: 11 }}>m³/dona: {formatM3(b.m3PerPiece)}</Text>
                            </div>
                            <span className="warehouse-card-m3">{formatM3(bundleM3)} m³</span>
                          </div>
                          {b.remainingCount > 0 && (
                            <div className="warehouse-card-sell">
                              <SellPopover bundle={b}>
                                <Button type="primary" icon={<ShoppingCartOutlined />} block>
                                  Sotish
                                </Button>
                              </SellPopover>
                            </div>
                          )}
                        </Card>
                      </Col>
                    );
                  })}
                  {flatBundles.length === 0 && <Col span={24}><Text type="secondary">Omborda mahsulot yo'q</Text></Col>}
                </Row>
              )}
              {flatBundles.length > 0 && (
                <Card className="summary-card" style={{ marginTop: 16 }}>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <span className="summary-stat-label">Vagonlar</span>
                      <span className="summary-stat-value">{filteredGroups.length}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-stat-label">Pozitsiyalar</span>
                      <span className="summary-stat-value">{totalBundles}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="summary-stat-label">Jami qoldiq</span>
                      <span className="summary-stat-value highlight">{formatM3(totalRemainingM3)} m³</span>
                    </div>
                  </div>
                </Card>
              )}
            </>
          ),
        },
        {
          key: 'archive',
          label: `Arxiv (${archivedBundles.length})`,
          children: viewMode === 'table' ? (
            <Table columns={archiveColumns} dataSource={archivedBundles} rowKey="_key"
              pagination={{ pageSize: 20 }} size="small" />
          ) : (
            <Row gutter={[16, 16]}>
              {archivedBundles.map((b) => (
                <Col key={b._key} xs={24} sm={12} md={8} lg={6}>
                  <Card className="warehouse-card" style={{ opacity: 0.7 }}>
                    <div className="warehouse-card-top">
                      <Tag color="blue">{b.wagonCode}</Tag>
                      <Tag color="default">Sotildi</Tag>
                    </div>
                    <div className="warehouse-card-dimension">
                      {b.thickness}mm<span> × </span>{b.width}mm<span> × </span>{b.length}m
                    </div>
                    <div className="warehouse-card-info">
                      <div className="warehouse-card-row">
                        <Text type="secondary">Jami soni</Text>
                        <Text strong>{b.count} dona</Text>
                      </div>
                      <div className="warehouse-card-row">
                        <Text type="secondary">Tannarx/m³</Text>
                        <Text strong>{b.costPricePerM3 > 0 ? formatMoney(b.costPricePerM3) : '—'}</Text>
                      </div>
                    </div>
                    <div className="warehouse-card-footer">
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>m³/dona: {formatM3(b.m3PerPiece)}</Text>
                      </div>
                      <span className="warehouse-card-m3">{formatM3((b.m3PerPiece || 0) * b.count)} m³</span>
                    </div>
                  </Card>
                </Col>
              ))}
              {archivedBundles.length === 0 && <Col span={24}><Text type="secondary">Arxivda mahsulot yo'q</Text></Col>}
            </Row>
          ),
        },
      ]} />
    </div>
  );
}
