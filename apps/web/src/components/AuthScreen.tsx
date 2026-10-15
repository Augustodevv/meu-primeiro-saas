import { FormEvent, useState } from 'react';
import { api, AuthResponse } from '../lib/api';

type AuthScreenProps = { onAuthenticated: (session: AuthResponse) => void };

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const session = await api<AuthResponse>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(), password, tenantSlug: tenantSlug.trim().toLowerCase(),
          ...(mode === 'register' ? { name: name.trim(), tenantName: tenantName.trim() } : {}),
        }),
      });
      onAuthenticated(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível autenticar.');
    } finally { setPending(false); }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-32 top-28 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-lg font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500">F</span> fluxo.</div>
        <div className="relative max-w-xl"><p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">Clareza para crescer</p><h1 className="text-5xl font-semibold leading-tight tracking-tight">Sua vida financeira, em um lugar simples.</h1><p className="mt-6 max-w-md text-lg text-slate-400">Acompanhe receitas, despesas e saldo com uma visão clara do que importa.</p></div>
        <p className="relative text-sm text-slate-500">Organize hoje. Planeje o amanhã.</p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 text-xl font-bold lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">F</span> fluxo.</div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Bem-vindo ao Fluxo</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">{mode === 'register' ? 'Crie sua conta' : 'Acesse sua conta'}</h2>
          <p className="mt-2 text-slate-500">{mode === 'register' ? 'Comece gratuitamente. Sem cartão de crédito.' : 'Volte a acompanhar suas finanças.'}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === 'register' && <>
              <Field label="Seu nome" value={name} onChange={setName} autoComplete="name" required />
              <Field label="Nome da organização" value={tenantName} onChange={setTenantName} required />
            </>}
            <Field label="Identificador da organização" value={tenantSlug} onChange={setTenantSlug} placeholder="minha-familia" pattern="[a-z0-9-]+" maxLength={80} required />
            <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required />
            <Field label="Senha" type="password" value={password} onChange={setPassword} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} required />
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <button disabled={pending} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50">{pending ? 'Aguarde…' : mode === 'register' ? 'Criar conta grátis' : 'Entrar'}</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">{mode === 'register' ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <button className="font-semibold text-indigo-600 hover:underline" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(null); }}>{mode === 'register' ? 'Entrar' : 'Criar conta'}</button></p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></label>;
}
