import { useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Popconfirm } from 'antd';
import { apiRequest } from '../api/client';

export default function Profile() {
  const [pwLoading, setPwLoading] = useState(false);
  const [uuidLoading, setUuidLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const changePassword = async (values: { old_password: string; new_password: string }) => {
    setPwLoading(true);
    try {
      await apiRequest('/user/change-password', { method: 'POST', body: values });
      message.success('密码修改成功，请重新登录');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '修改失败');
    } finally {
      setPwLoading(false);
    }
  };

  const resetUUID = async () => {
    setUuidLoading(true);
    try {
      const r = await apiRequest<{ data: { uuid: string } }>('/user/reset-uuid', { method: 'POST' });
      message.success(`UUID 已重置: ${r.data.uuid}`);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '重置失败');
    } finally {
      setUuidLoading(false);
    }
  };

  const resetToken = async () => {
    setTokenLoading(true);
    try {
      await apiRequest('/user/reset-token', { method: 'POST' });
      message.success('订阅令牌已重置，请更新客户端配置');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '重置失败');
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header"><h2>个人设置</h2></div>
      <Card title="修改密码" style={{ marginBottom: 16 }}>
        <Form onFinish={changePassword} layout="vertical" style={{ maxWidth: 400 }}>
          <Form.Item name="old_password" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password placeholder="原密码" />
          </Form.Item>
          <Form.Item name="new_password" rules={[{ required: true, min: 6, message: '新密码至少6位' }]}>
            <Input.Password placeholder="新密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={pwLoading}>修改密码</Button>
        </Form>
      </Card>
      <Card title="安全设置">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Popconfirm title="重置后现有连接将断开，确认？" onConfirm={resetUUID}>
            <Button danger loading={uuidLoading}>重置 UUID</Button>
          </Popconfirm>
          <Popconfirm title="重置后订阅地址将改变，确认？" onConfirm={resetToken}>
            <Button danger loading={tokenLoading}>重置订阅令牌</Button>
          </Popconfirm>
        </div>
        <Divider />
        <p style={{ color: '#999' }}>重置 UUID 后所有现有连接将立即失效。重置订阅令牌后需要更新客户端配置。</p>
      </Card>
    </div>
  );
}
