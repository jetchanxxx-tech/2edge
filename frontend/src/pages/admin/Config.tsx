import { useEffect, useState } from 'react';
import { Card, Form, Input, Switch, Button, message } from 'antd';
import { apiRequest } from '../../api/client';

export default function Config() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setLoading(true);
    apiRequest<{ data: Record<string, string> }>('/admin/config')
      .then(r => form.setFieldsValue({
        site_name: r.data.site_name,
        register_enabled: r.data.register_enabled === 'true',
        default_traffic_gb: r.data.default_traffic_gb,
      }))
      .catch(() => message.error('加载配置失败'))
      .finally(() => setLoading(false));
  }, [form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        site_name: String(values.site_name),
        register_enabled: String(values.register_enabled === true),
        default_traffic_gb: String(values.default_traffic_gb),
      };
      await apiRequest('/admin/config', { method: 'PUT', body: payload });
      message.success('配置已更新');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header"><h2>系统配置</h2></div>
      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
          <Form.Item name="site_name" label="站点名称">
            <Input />
          </Form.Item>
          <Form.Item name="register_enabled" label="开放注册" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="default_traffic_gb" label="默认流量配额 (GB)">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>保存配置</Button>
        </Form>
      </Card>
    </div>
  );
}
