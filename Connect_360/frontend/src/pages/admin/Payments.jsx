import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService } from '../../services/adminService';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import DashboardLayout from '../../components/DashboardLayout';

const STATUSES = ['', 'PENDING', 'AUTHORIZED', 'SUCCESSFUL', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

const money = (v) => `₹${(v ?? 0).toLocaleString('en-IN')}`;

/**
 * Admin Revenue & Settlements (Razorpay TEST MODE)
 *
 * All figures are computed by the backend from REAL captured payment records
 * (GET /admin/payments/analytics) — commission, worker payouts, category split
 * and the monthly trend. Nothing is hardcoded; the trend only renders when at
 * least two real months exist, and growth % only when it is computable.
 */
export default function AdminPayments() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [listRes, analyticsRes] = await Promise.all([
        adminService.listPayments(filter || undefined),
        adminService.getPaymentAnalytics(),
      ]);
      setPayments(listRes.data.payments || []);
      setAnalytics(analyticsRes.data || null);
    } catch (err) {
      setError(t('adminPayments.loadFailed'));
      console.error('Error loading admin payments:', err);
    } finally {
      setLoading(false);
    }
  }

  const summary = analytics?.summary;
  const kpis = summary ? [
    { label: t('adminPayments.grossVolume'), value: money(summary.gmv), icon: 'payments', tint: 'text-secondary', bg: 'bg-secondary/10',
      foot: summary.growth_pct != null ? t('adminPayments.growthVsLastMonth', { sign: summary.growth_pct >= 0 ? '+' : '', pct: summary.growth_pct }) : t('adminPayments.capturedRevenue') },
    { label: t('adminPayments.platformCommission'), value: money(summary.commission), icon: 'account_balance_wallet', tint: 'text-primary', bg: 'bg-primary-container/10',
      foot: t('adminPayments.effectiveTake', { pct: summary.effective_take_rate }) },
    { label: t('adminPayments.workerPayouts'), value: money(summary.payouts), icon: 'send_money', tint: 'text-primary', bg: 'bg-surface-container',
      foot: t('adminPayments.settledPayments', { count: summary.captured_count }) },
    { label: t('adminPayments.pending'), value: money(summary.pending), icon: 'schedule', tint: 'text-warning', bg: 'bg-warning-container/60',
      foot: summary.refunded > 0 ? t('adminPayments.refundedAmount', { amount: money(summary.refunded) }) : t('adminPayments.awaitingCapture') },
  ] : [];

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((p) => {
      const hay = `${p.service_name} ${p.customer_name} ${p.worker_name} ${p.razorpay_payment_id || ''} ${p.razorpay_order_id || ''} ${p.booking_id}`.toLowerCase();
      return hay.includes(term);
    });
  }, [payments, search]);

  return (
    <DashboardLayout>
      <div className="pt-6 lg:pt-0 px-margin-mobile lg:px-0 max-w-container mx-auto flex flex-col gap-stack-lg pb-24 lg:pb-0">
        {/* Header */}
        <section className="flex flex-col gap-stack-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="font-hanken text-label-sm uppercase tracking-wider text-secondary font-semibold">{t('adminPayments.eyebrow')}</span>
          </div>
          <h1 className="font-manrope text-headline-lg-mobile lg:text-headline-lg text-primary">{t('adminPayments.title')}</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            {t('adminPayments.subtitle')}
          </p>
        </section>

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-stack-md">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-stack-md">
            {kpis.map((k) => (
              <div key={k.label} className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-slate shadow-level-1 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider">{k.label}</span>
                    <span className="font-manrope text-headline-lg text-primary mt-1">{k.value}</span>
                  </div>
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.bg} ${k.tint}`}>
                    <span className="material-symbols-outlined text-[22px]">{k.icon}</span>
                  </span>
                </div>
                <p className="font-hanken text-label-sm text-on-surface-variant pt-2 border-t border-outline-slate/40">{k.foot}</p>
              </div>
            ))}
          </div>
        )}

        {/* Analytics grid: trend (if available) + category breakdown */}
        {!loading && analytics && (analytics.by_category.length > 0 || analytics.trend.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">
            {/* Monthly trend — only when >= 2 months exist */}
            {analytics.trend.length >= 2 && (
              <div className="lg:col-span-7 bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-slate">
                <h3 className="font-manrope text-headline-sm text-primary">{t('adminPayments.monthlyGrossVolume')}</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5 mb-4">{t('adminPayments.capturedByMonth')}</p>
                <TrendChart trend={analytics.trend} />
              </div>
            )}

            {/* Category breakdown */}
            {analytics.by_category.length > 0 && (
              <div className={`${analytics.trend.length >= 2 ? 'lg:col-span-5' : 'lg:col-span-12'} bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-slate`}>
                <h3 className="font-manrope text-headline-sm text-primary">{t('adminPayments.revenueByCategory')}</h3>
                <p className="font-hanken text-body-sm text-on-surface-variant mt-0.5 mb-4">{t('adminPayments.shareOfGross')}</p>
                <div className="flex flex-col gap-4">
                  {analytics.by_category.map((c) => (
                    <div key={c.name} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-hanken text-body-sm text-primary font-medium">{c.name}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-hanken text-body-md text-primary font-bold">{money(c.amount)}</span>
                          <span className="font-hanken text-label-sm text-on-surface-variant">({c.pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(c.pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ledger toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex-none px-4 py-2 rounded-full font-hanken text-body-sm border transition-all whitespace-nowrap ${
                  filter === s
                    ? 'bg-primary-container text-on-primary border-primary-container'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
                }`}
              >
                {s || t('adminPayments.all')}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('adminPayments.searchPlaceholder')}
              aria-label={t('adminPayments.searchAria')}
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-lowest border border-outline-slate font-hanken text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none"
            />
          </div>
        </div>

        {/* Settlement ledger */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminPayments.error')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={load} className="btn-primary mt-4">{t('adminPayments.retry')}</button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">receipt_long</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('adminPayments.noPaymentsFound')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">
              {search ? t('adminPayments.noMatchSearch') : filter ? t('adminPayments.noFilterPayments', { status: filter }) : t('adminPayments.noPaymentsRecorded')}
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate shadow-level-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container border-b border-outline-slate">
                  <tr>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-on-surface">{t('adminPayments.referenceBooking')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-on-surface">{t('adminPayments.customerWorker')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-on-surface">{t('adminPayments.service')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-on-surface text-right">{t('adminPayments.gross')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-on-surface text-right">{t('adminPayments.commission')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-on-surface text-right">{t('adminPayments.payout')}</th>
                    <th className="py-3 px-stack-md font-hanken text-label-md text-on-surface">{t('adminPayments.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-slate/40 font-hanken text-body-sm text-on-surface-variant">
                  {filteredPayments.map((p) => (
                    <tr key={p.payment_id || p.razorpay_order_id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-stack-md whitespace-nowrap">
                        <div className="font-mono text-label-sm text-primary">{p.razorpay_payment_id || p.razorpay_order_id || '—'}</div>
                        <div className="font-mono text-label-sm text-on-surface-variant">#{String(p.booking_id).slice(0, 8)}</div>
                      </td>
                      <td className="py-3 px-stack-md whitespace-nowrap">
                        <div className="font-medium text-primary">{p.customer_name || '—'}</div>
                        <div className="text-label-sm text-secondary">{p.worker_name || '—'}</div>
                      </td>
                      <td className="py-3 px-stack-md whitespace-nowrap">{p.service_name || '—'}</td>
                      <td className="py-3 px-stack-md whitespace-nowrap text-right font-semibold text-primary">{money(p.amount_display)}</td>
                      <td className="py-3 px-stack-md whitespace-nowrap text-right text-secondary">
                        {p.commission_display != null ? `+${money(p.commission_display)}` : '—'}
                      </td>
                      <td className="py-3 px-stack-md whitespace-nowrap text-right font-medium text-primary">
                        {p.worker_payout_display != null && p.worker_payout_display > 0 ? money(p.worker_payout_display) : '—'}
                      </td>
                      <td className="py-3 px-stack-md whitespace-nowrap"><PaymentStatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-stack-md border-t border-outline-slate font-hanken text-label-sm text-on-surface-variant">
              {t('adminPayments.showingRecords', { shown: filteredPayments.length, total: payments.length })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/**
 * Minimal dependency-free SVG line chart for the monthly GMV trend. Scales to
 * the real data; renders nothing meaningful for <2 points (caller guards that).
 */
function TrendChart({ trend }) {
  const { t } = useTranslation();
  const w = 540; const h = 180; const pad = 10;
  const max = Math.max(...trend.map((m) => m.gmv), 1);
  const pts = trend.map((m, i) => {
    const x = pad + (i * (w - 2 * pad)) / (trend.length - 1);
    const y = h - pad - (m.gmv / max) * (h - 2 * pad);
    return [x, y];
  });
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <div className="w-full">
      <svg className="w-full h-48" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={t('adminPayments.monthlyGrossVolume')}>
        <defs>
          <linearGradient id="gmvGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#085ac0" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#085ac0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon fill="url(#gmvGrad)" points={area} />
        <polyline fill="none" stroke="#085ac0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={line} />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="#085ac0" strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between mt-2 font-hanken text-label-sm text-on-surface-variant">
        {trend.map((m) => <span key={m.month}>{m.month}</span>)}
      </div>
    </div>
  );
}
