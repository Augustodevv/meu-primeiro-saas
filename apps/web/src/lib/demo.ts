import type { AuthResponse, Transaction, TransactionInput } from './api';

export const demoSession: AuthResponse = { token: 'portfolio-demo', user: { userId: 'demo', tenantId: 'demo', email: 'visitante@example.com', name: 'Visitante' } };
const key = 'fluxo-demo-v1';
function initial(): Transaction[] {
  const month = new Date().toLocaleDateString('en-CA').slice(0, 7);
  return [
    { id: 'demo-1', title: 'Projeto de site (exemplo)', amount: 4200, type: 'INCOME', transactionDate: `${month}-05` },
    { id: 'demo-2', title: 'Internet (exemplo)', amount: 120, type: 'EXPENSE', transactionDate: `${month}-10` },
    { id: 'demo-3', title: 'Curso (exemplo)', amount: 180, type: 'EXPENSE', transactionDate: `${month}-12` },
  ];
}
export async function demoRequest<T>(path: string, options: RequestInit): Promise<T> {
  let rows: Transaction[];
  try { rows = JSON.parse(sessionStorage.getItem(key) ?? 'null') ?? initial(); } catch { rows = initial(); }
  const url = new URL(path, 'https://demo.invalid');
  const method = options.method ?? 'GET';
  const month = url.searchParams.get('month');
  const filtered = rows.filter(row => !month || row.transactionDate.startsWith(month));
  let result: unknown;
  if (url.pathname === '/subscription') result = { plan: 'FREE', transactionCount: rows.length, limit: 50 };
  else if (url.pathname === '/dashboard/summary') result = {
    balance: rows.reduce((sum, row) => sum + (row.type === 'INCOME' ? row.amount : -row.amount), 0),
    income: filtered.filter(row => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0),
    expense: filtered.filter(row => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0),
  };
  else if (method === 'GET') result = filtered.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  else {
    const id = url.pathname.split('/')[2];
    if (method === 'DELETE') rows = rows.filter(row => row.id !== id);
    else {
      const data = JSON.parse(String(options.body)) as TransactionInput;
      if (!data.title.trim() || !Number.isFinite(data.amount) || data.amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.transactionDate)) throw new Error('Confira o título, valor e data.');
      if (method === 'POST' && rows.length >= 50) throw new Error('Limite demonstrativo de 50 transações. Remova um registro para continuar.');
      result = { ...data, id: method === 'POST' ? crypto.randomUUID() : id };
      rows = method === 'POST' ? [...rows, result as Transaction] : rows.map(row => row.id === id ? result as Transaction : row);
    }
  }
  sessionStorage.setItem(key, JSON.stringify(rows));
  return result as T;
}