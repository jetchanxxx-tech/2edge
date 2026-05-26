import { useEffect, useState } from 'react';
import { Card, Row, Col, Progress, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CloudServerOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../api/client';

interface Profile {
  transfer_enable: number;
  u: number;
  d: number;
  expired_at: number | null;
  uuid: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    apiRequest<{ data: Profile }>('/user/profile').then(r => setProfile(r.data)).catch(() => {});
  }, []);

  const used = profile ? profile.u + profile.d : 0;
  const total = profile?.transfer_enable || 1;
  const percent = Math.min(Math.round((used / total) * 100), 100);

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
  };

  return (
    <div>
      <div className="page-header"><h2>概览</h2></div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card><Statistic title="流量配额" value={formatBytes(total)} prefix={<CloudServerOutlined />} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="上传" value={formatBytes(profile?.u || 0)} prefix={<ArrowUpOutlined />} valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="下载" value={formatBytes(profile?.d || 0)} prefix={<ArrowDownOutlined />} valueStyle={{ color: '#cf1322' }} /></Card>
        </Col>
      </Row>
      <Card style={{ marginTop: 16 }}>
        <h4>流量使用情况</h4>
        <Progress percent={percent} format={() => `${formatBytes(used)} / ${formatBytes(total)}`} />
      </Card>
      {user?.is_admin === 1 && (
        <Card style={{ marginTop: 16 }}><a href="/admin">进入管理后台 →</a></Card>
      )}
    </div>
  );
}
