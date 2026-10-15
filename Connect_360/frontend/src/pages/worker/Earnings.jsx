import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentsService } from '../../services/paymentsService';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import PaymentReceiptModal from '../../components/PaymentReceiptModal';
import DashboardLayout from '../../components/DashboardLayout';

/**
 * Worker Earnings & Payments
 *
 * Shows the worker's own booking-wise payments and an aggregated earnings
 * summary from GET /api/worker/payments. All data is worker-scoped by the
 * backend (their own jobs only; no customer internal id). Presentation reuses
 * the existing dashboard tokens, cards, badges and modal patterns.
 */
export default function WorkerEarnings() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all'); // all | SUCCESSFUL | PENDING | FAILED
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [receipt, setReceipt] = useState(null); // payment shown in the modal

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await paymentsService.listWorker();
      const list = res.data.payments || [];
      setPayments(list);
      setSummary(res.data.summary || null);
      setSelected(list[0] || null);
    } catch (err) {
      setError(t('earnings.loadFailed'));
      console.error('Error loading worker payments:', err);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: 'all', labelKey: 'earnings.all' },
    { key: 'SUCCESSFUL', labelKey: 'earnings.paid' },
    { key: 'PENDING', labelKey: 'earnings.pending' },
    { key: 'FAILED', labelKey: 'earnings.failed' },
  ];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (tab !== 'all') {
        if (tab === 'PENDING' && !['PENDING', 'AUTHORIZED'].includes(p.status)) return false;
        if (tab !== 'PENDING' && p.status !== tab) return false;
      }
      if (!term) return true;
      const hay = `${p.service_name} ${p.customer_name} ${p.razorpay_order_id || ''} ${p.razorpay_payment_id || ''} ${p.booking_id}`.toLowerCase();
      return hay.includes(term);
    });
  }, [payments, tab, search]);

  const money = (v) => `₹${(v ?? 0).toLocaleString('en-IN')}`;

  const metrics = summary ? [
    { label: t('earnings.totalEarned'), value: money(summary.total_earned), icon: 'account_balance_wallet', tint: 'text-secondary', bg: 'bg-secondary-container/40', hint: t('earnings.capturedNet') },
    { label: t('earnings.thisMonth'), value: money(summary.this_month), icon: 'calendar_month', tint: 'text-primary', bg: 'bg-surface-container', hint: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }) },
    { label: t('earnings.completedPayments'), value: summary.completed_payments ?? 0, icon: 'task_alt', tint: 'text-primary', bg: 'bg-surface-container-high', hint: t('earnings.successfullyPaid') },
    { label: t('earnings.pendingPayments'), value: money(summary.pending), icon: 'schedule', tint: 'text-warning', bg: 'bg-warning-container/60', hint: t('earnings.awaitingCapture') },
  ] : [];

  return (
    <DashboardLayout>
      <div className="pt-6 lg:pt-0 px-margin-mobile lg:px-0 max-w-container mx-auto flex flex-col gap-stack-lg pb-24 lg:pb-0">
        {/* Header */}
        <section className="flex flex-col gap-stack-sm">
          <h1 className="font-manrope text-headline-lg-mobile lg:text-headline-lg text-primary">{t('earnings.title')}</h1>
          <p className="font-hanken text-body-md text-on-surface-variant">
            {t('earnings.subtitle')}
          </p>
        </section>

        {/* Metric cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : metrics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-surface-container-lowest p-5 rounded-xl shadow-level-1 border border-outline-slate flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-hanken text-label-sm uppercase tracking-wider text-on-surface-variant">{m.label}</span>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.bg} ${m.tint}`}>
                    <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                  </span>
                </div>
                <div>
                  <div className={`font-manrope text-headline-lg ${m.tint}`}>{m.value}</div>
                  <p className="font-hanken text-label-sm text-on-surface-variant mt-1">{m.hint}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs + search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {tabs.map((tabItem) => {
              const count = tabItem.key === 'all'
                ? payments.length
                : payments.filter((p) => (tabItem.key === 'PENDING' ? ['PENDING', 'AUTHORIZED'].includes(p.status) : p.status === tabItem.key)).length;
              return (
                <button
                  key={tabItem.key}
                  onClick={() => setTab(tabItem.key)}
                  className={`flex-none px-4 py-2 rounded-full font-hanken text-body-sm border transition-all whitespace-nowrap ${
                    tab === tabItem.key
                      ? 'bg-primary-container text-on-primary border-primary-container'
                      : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
                  }`}
                >
                  {t(tabItem.labelKey)} ({count})
                </button>
              );
            })}
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('earnings.searchPlaceholder')}
              aria-label={t('earnings.searchAria')}
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-lowest border border-outline-slate font-hanken text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none"
            />
          </div>
        </div>

        {/* Main grid: list + detail panel */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-container-high rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">error</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('earnings.error')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{error}</p>
            <button onClick={load} className="btn-primary mt-4">{t('common.retry')}</button>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-12 text-center shadow-level-1">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-3">payments</span>
            <h3 className="font-manrope text-headline-sm text-on-surface mb-2">{t('earnings.noPayments')}</h3>
            <p className="font-hanken text-body-md text-on-surface-variant">{t('earnings.noPaymentsDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg items-start">
            {/* List */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              {filtered.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-10 text-center">
                  <p className="font-hanken text-body-md text-on-surface-variant">{t('earnings.noMatchFilter')}</p>
                </div>
              ) : filtered.map((p) => {
                const active = selected && selected.booking_id === p.booking_id;
                return (
                  <div
                    key={p.booking_id}
                    onClick={() => setSelected(p)}
                    className={`cursor-pointer bg-surface-container-lowest rounded-xl p-5 shadow-level-1 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-level-2 transition-all ${
                      active ? 'border-2 border-secondary' : 'border border-outline-slate'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <span className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                        <span className="material-symbols-outlined text-[22px]">handyman</span>
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-hanken text-label-md text-primary font-bold truncate">{p.service_name || t('earnings.serviceFallback')}</span>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <p className="font-hanken text-body-sm text-on-surface-variant">
                          {p.customer_name || t('earnings.customerFallback')}{p.scheduled_date && ` · ${p.scheduled_date}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 flex-shrink-0">
                      <div className="font-manrope text-headline-sm text-primary">₹{p.amount_display}</div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelected(p); setReceipt(p); }}
                        className="font-hanken text-label-sm text-secondary flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span> {t('earnings.view')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail panel (desktop quick-view) */}
            <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20">
              {selected ? (
                <DetailPanel payment={selected} money={money} />
              ) : (
                <div className="bg-surface-container-lowest rounded-xl border border-outline-slate p-6 text-center text-on-surface-variant font-hanken text-body-sm">
                  {t('earnings.selectPayment')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Receipt modal — works on every screen size (opened via "View") */}
      <PaymentReceiptModal
        open={!!receipt}
        booking={receipt ? {
          service_name: receipt.service_name,
          worker_name: null,
          scheduled_date: receipt.scheduled_date,
          scheduled_time: receipt.scheduled_time,
        } : null}
        payment={receipt}
        onClose={() => setReceipt(null)}
      />
    </DashboardLayout>
  );
}

function DetailPanel({ payment, money }) {
  const { t } = useTranslation();
  const rows = [
    [t('earnings.service'), payment.service_name],
    [t('earnings.customer'), payment.customer_name],
    [t('earnings.bookingDate'), payment.scheduled_date
      ? `${payment.scheduled_date}${payment.scheduled_time ? ` · ${payment.scheduled_time}` : ''}` : null],
    [t('earnings.paidOn'), payment.captured_at ? new Date(payment.captured_at).toLocaleString() : null],
    [t('earnings.razorpayOrderId'), payment.razorpay_order_id],
    [t('earnings.razorpayPaymentId'), payment.razorpay_payment_id],
  ].filter(([, v]) => v);

  const refunded = payment.refunded_amount > 0 ? payment.refunded_amount / 100 : 0;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-level-1 border border-outline-slate flex flex-col gap-5">
      <div className="flex items-center gap-2 pb-3 border-b border-outline-slate">
        <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
        </span>
        <div>
          <h3 className="font-manrope text-headline-sm text-primary">{t('earnings.paymentDetails')}</h3>
          <p className="font-hanken text-label-sm text-on-surface-variant">{t('earnings.bookingShort', { id: String(payment.booking_id).slice(0, 8) })}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-slate flex flex-col gap-2">
        <span className="font-hanken text-label-sm text-on-surface-variant uppercase tracking-wider">{t('earnings.serviceAmount')}</span>
        <div className="font-manrope text-headline-md text-secondary">₹{payment.amount_display}</div>
        <PaymentStatusBadge status={payment.status} />
        {refunded > 0 && (
          <p className="font-hanken text-body-sm text-on-surface-variant">{t('earnings.refunded', { amount: money(refunded) })}</p>
        )}
      </div>

      <dl className="flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt className="font-hanken text-label-sm text-on-surface-variant flex-shrink-0">{label}</dt>
            <dd className={`font-hanken text-body-sm text-on-surface text-right break-all ${/ID$/.test(label) ? 'font-mono text-label-sm' : 'font-medium'}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
