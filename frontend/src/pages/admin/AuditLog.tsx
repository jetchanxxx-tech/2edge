import { useEffect, useState, useCallback } from 'react';
import { Table, Tag } from 'antd';
import { apiRequest } from '../../api/client';

interface AuditEntry {
  id: number;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: number;
  details: string;
  created_at: number;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiRequest<{ data: AuditEntry[]; meta: { total: number } }>(`/admin/audit-log?page=${page}`);
      setLogs(r.data);
      setTotal(r.meta.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actionColors: Record<string, string> = {
    user_create: 'green', user_ban: 'red', user_unban: 'blue', user_delete: 'red', config_update: 'orange',
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '管理员', dataIndex: 'admin_email' },
    {
      title: '操作', dataIndex: 'action',
      render: (v: string) => <Tag color={actionColors[v] || 'default'}>{v}</Tag>
    },
    { title: '目标类型', dataIndex: 'target_type' },
    { title: '目标ID', dataIndex: 'target_id' },
    {
      title: '时间', dataIndex: 'created_at',
      render: (v: number) => new Date(v * 1000).toLocaleString('zh-CN')
    },
  ];

  return (
    <div>
      <div className="page-header"><h2>审计日志</h2></div>
      <Table
        dataSource={logs} columns={columns} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }} size="small"
      />
    </div>
  );
}
