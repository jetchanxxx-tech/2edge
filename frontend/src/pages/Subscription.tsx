import { useEffect, useState } from 'react';
import { Card, Typography, Button, message, Space, Tag } from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiRequest } from '../api/client';

interface SubInfo {
  token: string;
  subscribe_url: string;
  uuid: string;
}

export default function Subscription() {
  const [sub, setSub] = useState<SubInfo | null>(null);

  const loadSub = () => {
    apiRequest<{ data: SubInfo }>('/user/subscription').then(r => setSub(r.data)).catch(() => {});
  };

  useEffect(() => { loadSub(); }, []);

  const copyUrl = () => {
    if (sub) {
      navigator.clipboard.writeText(sub.subscribe_url);
      message.success('订阅地址已复制');
    }
  };

  const copyUUID = () => {
    if (sub) {
      navigator.clipboard.writeText(sub.uuid);
      message.success('UUID 已复制');
    }
  };

  return (
    <div>
      <div className="page-header"><h2>订阅信息</h2></div>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>订阅地址</Typography.Text>
            <Typography.Paragraph copyable style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              {sub?.subscribe_url || '加载中...'}
            </Typography.Paragraph>
            <Button icon={<CopyOutlined />} onClick={copyUrl} size="small">复制</Button>
          </div>
          <div>
            <Typography.Text strong>UUID</Typography.Text>
            <Typography.Paragraph copyable={{ text: sub?.uuid }} style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4, fontFamily: 'monospace' }}>
              {sub?.uuid || '加载中...'}
            </Typography.Paragraph>
            <Button icon={<CopyOutlined />} onClick={copyUUID} size="small">复制</Button>
          </div>
          <div>
            <Typography.Text strong>客户端配置</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Tag>VLESS + WS + TLS</Tag>
              <Tag>端口: 443</Tag>
              <Tag>传输: WebSocket</Tag>
            </div>
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              支持的客户端: v2rayN, v2rayNG, Clash Meta, Sing-box, Shadowrocket 等。
              将订阅地址粘贴到客户端的订阅功能中即可自动配置。
            </Typography.Paragraph>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadSub}>刷新</Button>
        </Space>
      </Card>
    </div>
  );
}
