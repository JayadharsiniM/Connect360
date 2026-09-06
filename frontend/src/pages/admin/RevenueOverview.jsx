import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import DashboardLayout from '../../components/DashboardLayout';

const CATEGORY_COLORS = ['bg-secondary', 'bg-primary', 'bg-surface-tint', 'bg-secondary-container', 'bg-primary-fixed-dim'];

// Inline SVG line chart built from real trend data (no Chart.js dependency).
function TrendChart({ trend }) {
  const width = 640;
  const height = 260;
  const pad = 8;

  if (!trend || trend.length === 0) {
    return (
      <div className="h-[260px] flex flex-col items-center justify-center text-on-surface-variant">
        <span className="material-symbols-outlined text-[40px] mb-2">show_chart</span>
        <p className="font-hanken text-body-sm">No revenue data yet</p>
      </div>
    );
  }

  const amounts = trend.map((t) => t.amount);
  const maxAmt = Math.max(...amounts, 1);
  const n = trend.length;
  const stepX = n > 1 ? (width - pad * 2) / (n - 1) : 0;

  const points = trend.map((t, i) => {
    const x = pad + i * stepX;
    const y = height - pad - (t.amount / maxAmt) * (height - pad * 2);
    return { x, y, ...t };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[260px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rev-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#085ac0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#085ac0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#rev-grad)" />
        <path d={linePath} fill="none" stroke="#085ac0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#085ac0" strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between mt-2 px-1">
        {trend.map((t) => (
          <span key={t.month} className="font-hanken text-label-sm text-on-surface-variant">{t.month.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

export default function RevenueOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getRevenue();
      setData(res.data);
    } catch (err) {
      setError('Failed to load revenue analytics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse flex flex-col gap-stack-lg">
          <div className="h-9 bg-surface-container-high rounded-lg w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-surface-container-high rounded-xl" />)}
          </div>
          <div className="h-[400px] bg-surface-container-high rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
          <h3 className="font-manrope text-headline-sm text-on-surface mb-2">Error</h3>
          <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
          <button onClick={load} className="btn-primary mt-4">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  const summary = data?.summary || {};
  const categories = data?.by_category || [];
  const trend = data?.trend || [];
  const transactions = data?.transactions || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-stack-lg pt-6 lg:pt-0 px-margin-mobile lg:px-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-manrope text-headline-lg text-primary">Revenue Overview</h2>
            <p className="font-hanken text-body-md text-on-surface-variant mt-1">Financial performance across all completed services.</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="bg-surface-container-lowest rounded-lg border border-outline-slate p-stack-lg flex flex-col justify-between">
            <div>
              <h3 className="font-hanken text-label-md text-on-surface-variant mb-2 uppercase">Total Revenue</h3>
              <div className="font-manrope text-display-lg text-primary">₹{(summary.total_revenue || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="mt-stack-md flex items-center text-secondary">
              <span className="material-symbols-outlined mr-1 text-sm">payments</span>
              <span className="font-hanken text-label-md">From {summary.completed_bookings || 0} completed bookings</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-lg border border-outline-slate p-stack-md flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <span className="font-hanken text-label-sm bg-surface-container px-2 py-1 rounded text-on-surface-variant">Completed Bookings</span>
            </div>
            <div className="font-manrope text-headline-md text-primary">{summary.completed_bookings || 0}</div>
            <p className="font-hanken text-body-sm text-on-surface-variant mt-1">Paid & completed</p>
          </div>
          <div className="bg-surface-container-lowest rounded-lg border border-outline-slate p-stack-md flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">local_offer</span>
              </div>
              <span className="font-hanken text-label-sm bg-surface-container px-2 py-1 rounded text-on-surface-variant">Avg. Ticket</span>
            </div>
            <div className="font-manrope text-headline-md text-primary">₹{(summary.avg_ticket || 0).toLocaleString('en-IN')}</div>
            <p className="font-hanken text-body-sm text-on-surface-variant mt-1">Across all categories</p>
          </div>
        </div>

        {/* Trend + category */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-lg border border-outline-slate p-stack-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-manrope text-headline-sm text-primary">Revenue Trend</h3>
              <span className="font-hanken text-label-sm text-on-surface-variant">Monthly</span>
            </div>
            <TrendChart trend={trend} />
          </div>

          <div className="lg:col-span-1 bg-surface-container-lowest rounded-lg border border-outline-slate p-stack-md">
            <h3 className="font-manrope text-headline-sm text-primary mb-6">By Category</h3>
            {categories.length > 0 ? (
              <div className="flex flex-col gap-6">
                {categories.map((cat, i) => (
                  <div key={cat.name}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-hanken text-label-md text-primary flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} block`} />
                        {cat.name}
                      </span>
                      <span className="font-hanken text-body-md font-semibold text-primary">₹{cat.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div className={`${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} h-full rounded-full`} style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-hanken text-body-sm text-on-surface-variant text-center py-8">No category data yet</p>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-slate overflow-hidden">
          <div className="p-stack-md border-b border-outline-slate">
            <h3 className="font-manrope text-headline-sm text-primary">Recent Transactions</h3>
          </div>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-slate">
                    <th className="p-4 font-hanken text-label-md text-on-surface-variant uppercase tracking-wider">Date</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface-variant uppercase tracking-wider">Customer</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface-variant uppercase tracking-wider">Service</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface-variant uppercase tracking-wider text-right">Amount</th>
                    <th className="p-4 font-hanken text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="font-hanken text-body-sm text-on-surface">
                  {transactions.map((t, i) => (
                    <tr key={t.id || i} className="border-b border-surface-variant hover:bg-surface/50 transition-colors last:border-0">
                      <td className="p-4">{t.date}</td>
                      <td className="p-4">{t.customer_name || '—'}</td>
                      <td className="p-4">{t.service_name}</td>
                      <td className="p-4 text-right font-medium">₹{(t.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="p-4"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-stack-lg text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[40px] mb-2">receipt_long</span>
              <p className="font-hanken text-body-md text-on-surface-variant">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
