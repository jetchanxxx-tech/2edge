import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined, StopOutlined } from '@ant-design/icons';
import { apiRequest } from '../../api/client';

interface User {
  id: number;
  email: string;
  uuid: string;
  is_admin: number;
  banned: number;
  transfer_enable: number;
  u: number;
  d: number;
  last_login_at: number | null;
  created_at: number;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const r = await apiRequest<{ data: User[]; meta: { total: number } }>(`/admin/users?${params}`);
      setUsers(r.data);
      setTotal(r.meta.total);
    } catch { message.error('加载用户列表失败'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleBan = async (id: number) => {
    await apiRequest(`/admin/users/${id}/ban`, { method: 'POST' });
    message.success('操作成功');
    fetchUsers();
  };

  const deleteUser = async (id: number) => {
    await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    message.success('用户已删除');
    fetchUsers();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '角色', dataIndex: 'is_admin',
      render: (v: number) => v ? <Tag color="red">管理员</Tag> : <Tag>用户</Tag>
    },
    {
      title: '状态', dataIndex: 'banned',
      render: (v: number) => v ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>
    },
    {
      title: '流量', render: (_: unknown, r: User) => {
        const used = r.u + r.d;
        const total = r.transfer_enable;
        const pct = total ? Math.round(used / total * 100) : 0;
        return `${pct}% (${(used / 1073741824).toFixed(1)}/${(total / 1073741824).toFixed(1)} GB)`;
      }
    },
    {
      title: '注册时间', dataIndex: 'created_at',
      render: (v: number) => new Date(v * 1000).toLocaleDateString('zh-CN')
    },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, r: User) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/admin/users/${r.id}`)}>编辑</Button>
          <Popconfirm title="确认封禁/解封？" onConfirm={() => toggleBan(r.id)}>
            <Button size="small" icon={<StopOutlined />}>{r.banned ? '解封' : '封禁'}</Button>
          </Popconfirm>
          <Popconfirm title="确认删除？此操作不可恢复" onConfirm={() => deleteUser(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>用户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/users/new')}>创建用户</Button>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索邮箱"
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          allowClear
        />
        <Select value={status} onChange={v => { setStatus(v); setPage(1); }} style={{ width: 120 }} allowClear placeholder="状态">
          <Select.Option value="active">正常</Select.Option>
          <Select.Option value="banned">封禁</Select.Option>
          <Select.Option value="admin">管理员</Select.Option>
        </Select>
      </Space>
      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        size="small"
      />
    </div>
  );
}
