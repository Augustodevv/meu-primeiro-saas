import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, AuthResponse, Subscription, Summary, Transaction, TransactionInput } from '../lib/api';

type DashboardProps = { session: AuthResponse; onSignOut: () => void };
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const localDate = () => new Date().toLocaleDateString('en-CA');
const emptyForm = (): TransactionInput => ({ title: '', amount: 0, transactionDate: localDate(), type: 'EXPENSE' });
const shortDate = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');

export function Dashboard({ session, onSignOut }: DashboardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestId = useRef(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [filter, setFilter] = useState<'month' | 'all'>('month');
  const [form, setForm] = useState<TransactionInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (selectedFilter: 'month' | 'all') => {
    const id = ++requestId.current;
    try {
      const month = localDate().slice(0, 7);
      const [nextSummary, nextTransactions, nextSubscription] = await Promise.all([
        api<Summary>(`/dashboard/summary?month=${month}`, {}, session.token),
        api<Transaction[]>(`/transactions${selectedFilter === 'month' ? `?month=${month}` : ''}`, {}, session.token),
        api<Subscription>('/subscription', {}, session.token),
      ]);
      if (id !== requestId.current) return;
      setSummary(nextSummary);
      setTransactions(nextTransactions);
      setSubscription(nextSubscription);
      setError(null);
    } catch (caught) {
      if (id !== requestId.current) return;
      if (caught instanceof ApiError && caught.status === 401) { onSignOut(); return; }
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o painel.');
    } finally { if (id === requestId.current) setLoading(false); }
  }, [session.token, onSignOut]);

  useEffect(() => { void load(filter); }, [load, filter]);

  useEffect(() => { if (showForm) dialogRef.current?.showModal(); }, [showForm]);

  function openNew() { setForm(emptyForm()); setEditingId(null); setFormError(null); setShowForm(true); }
  function openEdit(transaction: Transaction) {
    setForm({ title: transaction.title, amount: transaction.amount, transactionDate: transaction.transactionDate.slice(0, 10), type: transaction.type });
    setEditingId(transaction.id); setFormError(null); setShowForm(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !Number.isFinite(form.amount) || form.amount <= 0 || Math.abs(Math.round(form.amount * 100) - form.amount * 100) > 0.000001) {
      setFormError('Informe um título e um valor positivo com até duas casas decimais.'); return;
    }
    setSaving(true); setFormError(null);
    try {
      await api<Transaction>(editingId ? `/transactions/${editingId}` : '/transactions', {
        method: editingId ? 'PUT' : 'POST', body: JSON.stringify({ ...form, title: form.title.trim() }),
      }, session.token);
      setShowForm(false); setEditingId(null);
      await load(filter);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Não foi possível salvar a transação.');
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    setSaving(true);
    try { await api<void>(`/transactions/${id}`, { method: 'DELETE' }, session.token); setDeletingId(null); await load(filter); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível excluir a transação.'); }
    finally { setSaving(false); }
  }

  const firstName = session.user.name?.split(' ')[0] ?? 'você';
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3 text-lg font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">F</span> fluxo.</div>
        <div className="flex items-center gap-4"><span className="hidden text-sm text-slate-500 sm:inline">{session.user.email}</span><button onClick={onSignOut} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Sair</button></div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8">{session.token === "portfolio-demo" && <p role="status" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Demonstração de portfólio · Dados fictícios, salvos apenas nesta aba. Sem conexão bancária ou cobrança.</p>}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Visão geral · {monthLabel}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Olá, {firstName} 👋</h1><p className="mt-2 text-slate-500">Aqui está o resumo das suas finanças.</p></div>
        <button onClick={openNew} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">+ Nova transação</button>
      </div>
      {error && <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button onClick={() => { setLoading(true); void load(filter); }} className="font-semibold underline">Tentar novamente</button></div>}
      {loading ? <p role="status" className="rounded-2xl bg-white p-8 text-slate-500">Carregando painel…</p> : <>
        <section aria-label="Resumo financeiro" className="grid gap-4 md:grid-cols-3">
          <Metric label="Saldo total" value={summary?.balance ?? 0} icon="◈" tone="slate" />
          <Metric label="Receitas do mês" value={summary?.income ?? 0} icon="↗" tone="green" />
          <Metric label="Despesas do mês" value={summary?.expense ?? 0} icon="↘" tone="red" />
        </section>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
          <div><p className="font-semibold text-indigo-950">Plano {subscription?.plan === 'PREMIUM' ? 'Premium' : 'Free'}</p><p className="text-sm text-indigo-700">{subscription?.plan === 'PREMIUM' ? 'Premium demonstrativo · sem cobrança' : `${subscription?.transactionCount ?? 0} de 50 transações utilizadas`}</p></div>
          {subscription?.plan !== 'PREMIUM' && <div className="h-2 w-full max-w-44 overflow-hidden rounded-full bg-indigo-200"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min((subscription?.transactionCount ?? 0) * 2, 100)}%` }} /></div>}
        </div>
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><h2 className="text-xl font-bold">Transações</h2><p className="mt-1 text-sm text-slate-500">Entradas e saídas registradas</p></div><label className="text-sm font-medium text-slate-600">Período <select value={filter} onChange={(event) => setFilter(event.target.value as 'month' | 'all')} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="month">Este mês</option><option value="all">Todas</option></select></label></div>
          {transactions.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl text-slate-400">↗</div><h3 className="mt-4 font-semibold">Nenhuma transação por aqui</h3><p className="mt-1 text-sm text-slate-500">Adicione uma transação para começar a acompanhar seu dinheiro.</p><button onClick={openNew} className="mt-5 font-semibold text-indigo-600 hover:underline">Adicionar transação</button></div> : <div className="divide-y divide-slate-100">{transactions.map((transaction) => <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"><div className="flex min-w-0 items-center gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${transaction.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{transaction.type === 'INCOME' ? '↗' : '↘'}</span><div><p className="font-semibold">{transaction.title}</p><p className="text-sm text-slate-500">{shortDate(transaction.transactionDate)} · {transaction.type === 'INCOME' ? 'Receita' : 'Despesa'}</p></div></div><div className="flex items-center gap-4"><strong className={transaction.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}>{transaction.type === 'INCOME' ? '+' : '−'} {currency.format(transaction.amount)}</strong><button onClick={() => openEdit(transaction)} className="text-sm font-medium text-indigo-600 hover:underline">Editar</button><button onClick={() => setDeletingId(transaction.id)} className="text-sm font-medium text-slate-500 hover:text-rose-600">Excluir</button></div>{deletingId === transaction.id && <div className="flex w-full items-center justify-end gap-3 text-sm"><span>Excluir esta transação?</span><button onClick={() => setDeletingId(null)} className="font-medium text-slate-500">Cancelar</button><button disabled={saving} onClick={() => void remove(transaction.id)} className="font-semibold text-rose-600 disabled:opacity-50">Confirmar</button></div>}</div>)}</div>}
        </section>
      </>}
    </main>
    {showForm && <dialog ref={dialogRef} onCancel={(event) => { if (saving) event.preventDefault(); else setShowForm(false); }} onClose={() => setShowForm(false)} aria-labelledby="transaction-form-title" className="w-full max-w-lg rounded-2xl p-0 backdrop:bg-slate-950/60"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Seu financeiro</p><h2 id="transaction-form-title" className="mt-1 text-2xl font-bold">{editingId ? 'Editar transação' : 'Nova transação'}</h2></div><button disabled={saving} aria-label="Fechar" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">✕</button></div><form onSubmit={save} className="mt-6 space-y-4"><label className="block text-sm font-medium">Título<input autoFocus required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Supermercado" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Valor (R$)<input required min="0.01" step="0.01" type="number" value={form.amount || ''} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} placeholder="0,00" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><label className="block text-sm font-medium">Data<input required type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label></div><fieldset><legend className="mb-2 text-sm font-medium">Tipo</legend><div className="grid grid-cols-2 gap-3"><TypeChoice label="Despesa" value="EXPENSE" selected={form.type === 'EXPENSE'} onSelect={() => setForm({ ...form, type: 'EXPENSE' })} /><TypeChoice label="Receita" value="INCOME" selected={form.type === 'INCOME'} onSelect={() => setForm({ ...form, type: 'INCOME' })} /></div></fieldset>{formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}<div className="flex justify-end gap-3 pt-3"><button disabled={saving} type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-3 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar transação'}</button></div></form></section></dialog>}
  </div>;
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: 'slate' | 'green' | 'red' }) {
  const palette = { slate: 'bg-indigo-50 text-indigo-600', green: 'bg-emerald-50 text-emerald-600', red: 'bg-rose-50 text-rose-600' };
  return <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${palette[tone]}`}>{icon}</span></div><p className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{currency.format(value)}</p></article>;
}

function TypeChoice({ label, value, selected, onSelect }: { label: string; value: string; selected: boolean; onSelect: () => void }) {
  return <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}><input type="radio" name="transactionType" value={value} checked={selected} onChange={onSelect} className="accent-indigo-600" />{label}</label>;
}