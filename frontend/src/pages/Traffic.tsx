import { useEffect, useState } from 'react';
import { Card, Table, Select, Typography } from 'antd';
import { apiRequest } from '../api/client';

interface TrafficRow {
  u: number;
  d: number;
  recorded_at: number;
}

export default function Traffic() {
  const [daily, setDaily] = useState<TrafficRow[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiRequest<{ data: { daily: TrafficRow[] } }>(`/user/traffic?days=${days}`)
      .then(r => setDaily(r.data.daily))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const formatBytes = (b: number) => {
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
    if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
  };

  const columns = [
    { title: '日期', dataIndex: 'recorded_at', render: (t: number) => new Date(t * 1000).toLocaleDateString('zh-CN') },
    { title: '上传', dataIndex: 'u', render: (v: number) => formatBytes(v) },
    { title: '下载', dataIndex: 'd', render: (v: number) => formatBytes(v) },
    { title: '合计', render: (_: unknown, r: TrafficRow) => formatBytes(r.u + r.d) },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>流量统计</h2>
      </div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Typography.Text>显示最近 </Typography.Text>
          <Select value={days} onChange={setDays} style={{ width: 100 }}>
            <Select.Option value={7}>7 天</Select.Option>
            <Select.Option value={30}>30 天</Select.Option>
            <Select.Option value={90}>90 天</Select.Option>
          </Select>
        </div>
        <Table
          dataSource={daily}
          loading={loading}
          rowKey="recorded_at"
          columns={columns}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
