const API_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3333`;

export type TransactionType = 'INCOME' | 'EXPENSE';
export type Transaction = {
  id: string;
  title: string;
  amount: number;
  transactionDate: string;
  type: TransactionType;
};
export type TransactionInput = Omit<Transaction, 'id'>;
export type Summary = { balance: number; income: number; expense: number };
export type Subscription = { plan: 'FREE' | 'PREMIUM'; transactionCount: number; limit: number | null };
export type AuthResponse = {
  token: string;
  user: { userId: string; tenantId: string; email: string; name: string };
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API. Verifique se o servidor está ligado.');
  }

  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => ({}));
  const data = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  if (!response.ok) {
    throw new ApiError(response.status, typeof data.message === 'string' ? data.message : 'Não foi possível concluir a operação.', typeof data.code === 'string' ? data.code : undefined);
  }
  return body as T;
}
