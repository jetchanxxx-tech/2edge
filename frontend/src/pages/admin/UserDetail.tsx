import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Button, message, Spin, Popconfirm, Space } from 'antd';
import { apiRequest } from '../../api/client';

interface User {
  id: number; email: string; uuid: string; transfer_enable: number;
  speed_limit: number | null; expired_at: number | null; banned: number; created_at: number;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id === 'new') return;
    setLoading(true);
    apiRequest<{ data: User }>(`/admin/users/${id}`)
      .then(r => { setUser(r.data); form.setFieldsValue(r.data); })
      .catch(() => message.error('加载用户失败'))
      .finally(() => setLoading(false));
  }, [id, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (id === 'new') {
        await apiRequest('/admin/users', { method: 'POST', body: { email: values.email, password: values.password } });
        message.success('用户创建成功');
      } else {
        await apiRequest(`/admin/users/${id}`, { method: 'PUT', body: values });
        message.success('用户信息已更新');
      }
      navigate('/admin/users');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleBan = async () => {
    await apiRequest(`/admin/users/${id}/ban`, { method: 'POST' });
    message.success(user?.banned ? '用户已解封' : '用户已封禁');
    setUser(u => u ? { ...u, banned: u.banned ? 0 : 1 } : null);
  };

  if (loading) return <Spin />;

  return (
    <div>
      <div className="page-header"><h2>{id === 'new' ? '创建用户' : `编辑用户 #${id}`}</h2></div>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          {(id === 'new') && (
            <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="transfer_enable" label="流量配额 (字节)">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="speed_limit" label="速度限制 (bps, 留空=不限)">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expired_at" label="过期时间 (Unix 时间戳, 0=永不过期)">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
            {id !== 'new' && (
              <Popconfirm title="确认封禁/解封？" onConfirm={toggleBan}>
                <Button danger>{user?.banned ? '解封用户' : '封禁用户'}</Button>
              </Popconfirm>
            )}
            <Button onClick={() => navigate('/admin/users')}>返回</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
