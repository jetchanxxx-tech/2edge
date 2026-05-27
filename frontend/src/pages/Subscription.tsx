import { useEffect, useState } from 'react';
import { Card, Typography, Button, message, Space, Tag, Collapse, Divider } from 'antd';
import { CopyOutlined, ReloadOutlined, LinkOutlined } from '@ant-design/icons';
import { apiRequest } from '../api/client';

interface SubInfo {
  token: string;
  subscribe_url: string;
  uuid: string;
  transfer_enable: number;
  u: number;
  d: number;
}

export default function Subscription() {
  const [sub, setSub] = useState<SubInfo | null>(null);

  const loadSub = () => {
    apiRequest<{ data: SubInfo }>('/user/subscription').then(r => setSub(r.data)).catch(() => {});
  };

  useEffect(() => { loadSub(); }, []);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} 已复制`);
  };

  const formatBytes = (b: number) => {
    if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
  };

  return (
    <div>
      <div className="page-header"><h2>订阅信息</h2></div>

      <Card title="订阅地址" style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">
          将此地址填入代理客户端（v2rayN / Clash / Shadowrocket / Sing-box 等）的订阅功能中即可自动获取节点配置。
        </Typography.Text>
        <div style={{
          marginTop: 12, padding: 12, background: '#f6f8fa', borderRadius: 6,
          fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all',
        }}>
          {sub?.subscribe_url || '加载中...'}
        </div>
        <Space style={{ marginTop: 12 }}>
          <Button icon={<CopyOutlined />} onClick={() => sub && copy(sub.subscribe_url, '订阅地址')}>
            复制订阅地址
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadSub}>刷新</Button>
        </Space>
      </Card>

      {sub && (
        <Card title="流量使用" style={{ marginBottom: 16 }}>
          <Space>
            <Tag color="blue">上传 {formatBytes(sub.u)}</Tag>
            <Tag color="orange">下载 {formatBytes(sub.d)}</Tag>
            <Tag color="green">配额 {formatBytes(sub.transfer_enable)}</Tag>
          </Space>
        </Card>
      )}

      <Card title="客户端配置指南">
        <Collapse
          items={[
            {
              key: 'v2ray',
              label: 'v2rayN / v2rayNG (Windows / Android)',
              children: (
                <ol style={{ paddingLeft: 18 }}>
                  <li>打开 v2rayN，点击「订阅」→「订阅设置」</li>
                  <li>点击「添加」，粘贴订阅地址，填写备注「2Edge」</li>
                  <li>点击「确定」→「更新订阅」</li>
                  <li>在服务器列表中选择 2Edge 节点，开启系统代理</li>
                </ol>
              ),
            },
            {
              key: 'clash',
              label: 'Clash Meta / mihomo (Windows / macOS / Android)',
              children: (
                <ol style={{ paddingLeft: 18 }}>
                  <li>打开 Clash，点击「Profiles」→「Download」</li>
                  <li>粘贴订阅地址，点击「Download」</li>
                  <li>选择 2Edge 节点组，开启系统代理</li>
                </ol>
              ),
            },
            {
              key: 'shadowrocket',
              label: 'Shadowrocket (iOS)',
              children: (
                <ol style={{ paddingLeft: 18 }}>
                  <li>打开 Shadowrocket，点击右上角「+」</li>
                  <li>选择「Subscribe」，粘贴订阅地址</li>
                  <li>点击「Done」，选择 2Edge 节点，打开连接开关</li>
                </ol>
              ),
            },
            {
              key: 'singbox',
              label: 'Sing-box (通用)',
              children: (
                <ol style={{ paddingLeft: 18 }}>
                  <li>编辑 config.json，添加订阅地址到 outbounds</li>
                  <li>或使用 Sing-box 客户端直接导入订阅地址</li>
                </ol>
              ),
            },
          ]}
        />
        <Divider />
        <Typography.Text type="secondary">
          支持的协议: VLESS + WebSocket + TLS (端口 443) | Trojan + WebSocket + TLS | Shadowsocks AEAD。所有流量通过 Cloudflare 边缘网络转发。
        </Typography.Text>
      </Card>

      <Card title="节点信息" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>代理地址: </Typography.Text>
            <Tag>2edge-proxy.jet-s.workers.dev</Tag>
            <Button size="small" icon={<CopyOutlined />}
              onClick={() => copy('2edge-proxy.jet-s.workers.dev', '代理地址')} />
          </div>
          <div>
            <Typography.Text strong>端口: </Typography.Text>
            <Tag>443</Tag>
          </div>
          <div>
            <Typography.Text strong>传输: </Typography.Text>
            <Tag>WebSocket (WS)</Tag>
          </div>
          <div>
            <Typography.Text strong>TLS: </Typography.Text>
            <Tag color="green">开启</Tag>
          </div>
          <div>
            <Typography.Text strong>您的 UUID: </Typography.Text>
            <Typography.Text code copyable>{sub?.uuid || '加载中...'}</Typography.Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
