import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import DashboardLayout from '../../components/DashboardLayout';

const ROLE_TABS = [
  { key: '', label: 'All Users' },
  { key: 'customer', label: 'Customers' },
  { key: 'worker', label: 'Workers' },
  { key: 'admin', label: 'Admins' },
];

const ROLE_BADGE = {
  admin: 'bg-surface-container-highest text-on-surface-variant',
  customer: 'bg-surface-container text-on-surface border border-outline-slate',
  worker: 'bg-surface-dim text-on-surface',
};

function initials(name) {
  return (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleTab, setRoleTab] = useState('');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    load();
  }, [roleTab]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (roleTab) params.role = roleTab;
      if (search.trim()) params.q = search.trim();
      const res = await adminService.listUsers(params);
      setUsers(res.data.users || []);
      setCounts(res.data.counts || {});
    } catch (err) {
      setError('Failed to load users.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(user, newRole) {
    if (newRole === user.role) return;
    if (!window.confirm(`Change ${user.full_name}'s role from ${user.role} to ${newRole}? They must sign out and back in for it to take effect.`)) return;
    setActionId(user.id);
    try {
      await adminService.updateUser(user.id, { role: newRole });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    } finally {
      setActionId(null);
    }
  }

  async function toggleStatus(user) {
    const next = user.status === 'suspended' ? 'active' : 'suspended';
    const verb = next === 'suspended' ? 'Suspend' : 'Reactivate';
    if (!window.confirm(`${verb} ${user.full_name}? ${next === 'suspended' ? 'They will be blocked from signing in.' : 'They will regain access.'}`)) return;
    setActionId(user.id);
    try {
      await adminService.updateUser(user.id, { status: next });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionId(null);
    }
  }

  const metrics = [
    { label: 'Total Users', value: counts.total || 0, icon: 'group', tint: 'bg-primary-fixed/50 text-secondary' },
    { label: 'Customers', value: counts.customer || 0, icon: 'shopping_bag', tint: 'bg-secondary-fixed/50 text-secondary' },
    { label: 'Workers', value: counts.worker || 0, icon: 'engineering', tint: 'bg-surface-dim/50 text-primary-container' },
    { label: 'Suspended', value: counts.suspended || 0, icon: 'block', tint: 'bg-error-container/50 text-error' },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-stack-lg pt-6 lg:pt-0 px-margin-mobile lg:px-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-manrope text-headline-lg text-primary">User Management</h1>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">Manage platform users, roles, and account status.</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-gutter">
          {metrics.map((m) => (
            <div key={m.label} className="bg-surface-container-lowest border border-outline-slate rounded-lg p-stack-md flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="font-hanken text-label-md text-on-surface-variant">{m.label}</span>
                <div className={`p-2 rounded-full ${m.tint}`}>
                  <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                </div>
              </div>
              <div className="font-manrope text-headline-lg text-primary">{m.value.toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>

        {/* Table container */}
        <div className="bg-surface-container-lowest border border-outline-slate rounded-lg flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="p-stack-md border-b border-outline-slate flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-bright">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setRoleTab(tab.key)}
                  className={`px-4 py-2 rounded-lg font-hanken text-label-md whitespace-nowrap transition-colors ${
                    roleTab === tab.key ? 'bg-primary-container text-on-primary' : 'bg-transparent text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full lg:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                  placeholder="Search name or email..."
                  className="w-full pl-9 pr-3 h-10 bg-surface border border-outline-slate rounded-lg font-hanken text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                />
              </div>
              <button onClick={load} className="h-10 px-4 bg-primary-container text-on-primary rounded-lg font-hanken text-label-md hover:bg-primary transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-stack-lg flex flex-col gap-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-surface-container-high rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="p-stack-lg text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">error</span>
              <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
              <button onClick={load} className="btn-primary mt-4">Retry</button>
            </div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container text-on-surface-variant font-hanken text-label-md border-b border-outline-slate">
                    <th className="p-4 font-semibold">User</th>
                    <th className="p-4 font-semibold hidden sm:table-cell">Email</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold hidden md:table-cell">Joined</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-container font-manrope text-label-md shrink-0">
                            {initials(u.full_name)}
                          </div>
                          <div>
                            <div className="font-hanken text-label-md text-primary">{u.full_name}</div>
                            <div className="font-hanken text-body-sm text-on-surface-variant sm:hidden">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-on-surface-variant font-hanken text-body-sm hidden sm:table-cell">{u.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full font-hanken text-label-sm capitalize ${ROLE_BADGE[u.role] || ROLE_BADGE.customer}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.status === 'suspended' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/50 text-on-error-container font-hanken text-label-sm border border-error-container">
                            <span className="w-1.5 h-1.5 rounded-full bg-error" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant font-hanken text-label-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Active
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-on-surface-variant font-hanken text-body-sm hidden md:table-cell">
                        {(u.created_at || '').split('T')[0] || '—'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={u.role}
                            disabled={actionId === u.id}
                            onChange={(e) => changeRole(u, e.target.value)}
                            className="h-9 px-2 rounded-lg border border-outline-slate bg-surface-container-lowest font-hanken text-body-sm text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none cursor-pointer capitalize"
                            title="Change role"
                          >
                            <option value="customer">customer</option>
                            <option value="worker">worker</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            onClick={() => toggleStatus(u)}
                            disabled={actionId === u.id}
                            className={`p-2 rounded transition-colors ${
                              u.status === 'suspended'
                                ? 'text-secondary hover:bg-secondary-fixed/30'
                                : 'text-error hover:bg-error-container/40'
                            } disabled:opacity-50`}
                            title={u.status === 'suspended' ? 'Reactivate user' : 'Suspend user'}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {u.status === 'suspended' ? 'check_circle' : 'block'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-stack-lg text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">group_off</span>
              <p className="font-hanken text-body-md text-on-surface-variant">No users found</p>
            </div>
          )}

          <div className="p-4 border-t border-outline-slate bg-surface-container-lowest">
            <span className="font-hanken text-body-sm text-on-surface-variant">
              Showing {users.length} user{users.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <p className="font-hanken text-body-sm text-on-surface-variant">
          Note: role changes take effect after the affected user signs out and back in (token refresh).
        </p>
      </div>
    </DashboardLayout>
  );
}
