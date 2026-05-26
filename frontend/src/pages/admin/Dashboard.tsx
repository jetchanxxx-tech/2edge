import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { TeamOutlined, UserOutlined, StopOutlined, RiseOutlined } from '@ant-design/icons';
import { apiRequest } from '../../api/client';

interface Stats {
  total_users: number;
  active_users: number;
  banned_users: number;
  total_traffic_u: number;
  total_traffic_d: number;
  recent_registrations: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiRequest<{ data: Stats }>('/admin/dashboard').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const formatBytes = (b: number) => {
    if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
  };

  return (
    <div>
      <div className="page-header"><h2>管理仪表盘</h2></div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="总用户数" value={stats?.total_users || 0} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="活跃用户" value={stats?.active_users || 0} prefix={<UserOutlined />} valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="封禁用户" value={stats?.banned_users || 0} prefix={<StopOutlined />} valueStyle={{ color: '#cf1322' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="近7天注册" value={stats?.recent_registrations || 0} prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card><Statistic title="总上传流量" value={formatBytes(stats?.total_traffic_u || 0)} /></Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card><Statistic title="总下载流量" value={formatBytes(stats?.total_traffic_d || 0)} /></Card>
        </Col>
      </Row>
    </div>
  );
}
