import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const base = 'http://127.0.0.1:3338';
const request = async (path, method = 'GET', body, token) => {
  const response = await fetch(base + path, {method, headers: {...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
  return {status:response.status, data:response.status === 204 ? null : await response.json()};
};
test('PostgreSQL: autenticação, CRUD, isolamento e limite concorrente', {timeout:60000}, async () => {
  assert.ok(process.env.DATABASE_URL, 'Use um banco de teste com schema.sql aplicado.');
  const child = spawn(process.execPath, ['apps/api/dist/server.js'], {env:{...process.env,PORT:'3338',JWT_SECRET:'test-only-secret-with-more-than-32-characters'},stdio:'ignore'});
  const pool = new pg.Pool({connectionString:process.env.DATABASE_URL});
  const tenants = [];
  try {
    let ready = false;
    for (let i=0;i<80;i++) { try { if ((await request('/health')).status === 200) { ready=true; break; } } catch {} await delay(250); }
    assert.ok(ready, 'API precisa iniciar com acesso ao banco.');
    assert.equal((await request('/transactions')).status,401);
    const slug = 'test-' + randomUUID();
    const credentials = {name:'Teste',tenantName:'Teste automático',tenantSlug:slug,email:'teste@example.com',password:'test-password-123'};
    const a=await request('/auth/register','POST',credentials);assert.equal(a.status,201);tenants.push(a.data.user.tenantId);
    const b=await request('/auth/register','POST',{...credentials,tenantSlug:slug+'-b'});assert.equal(b.status,201);tenants.push(b.data.user.tenantId);
    assert.equal((await request('/auth/login','POST',{...credentials,password:'wrong-pass'})).status,401);
    assert.equal((await request('/auth/login','POST',credentials)).status,200);
    const claims=JSON.parse(Buffer.from(a.data.token.split('.')[1],'base64url'));assert.ok(claims.exp > claims.iat);
    const tx={title:'Teste',amount:125.50,transactionDate:'2026-10-16',type:'INCOME'};
    assert.equal((await request('/transactions','POST',{...tx,amount:-1},a.data.token)).status,400);
    const made=await request('/transactions','POST',tx,a.data.token);assert.equal(made.status,201);
    assert.equal((await request('/transactions','GET',null,b.data.token)).data.length,0);
    assert.equal((await request('/transactions/'+made.data.id,'PUT',tx,b.data.token)).status,404);
    assert.equal((await request('/transactions/'+made.data.id,'DELETE',null,b.data.token)).status,404);
    assert.equal((await request('/dashboard/summary?month=2026-10','GET',null,a.data.token)).data.income,125.5);
    assert.equal((await request('/transactions/'+made.data.id,'PUT',{...tx,amount:150},a.data.token)).data.amount,150);
    assert.equal((await request('/transactions/'+made.data.id,'DELETE',null,a.data.token)).status,204);
    const batch=await Promise.all(Array.from({length:52},()=>request('/transactions','POST',tx,a.data.token)));
    assert.equal(batch.filter(r=>r.status===201).length,50);assert.equal(batch.filter(r=>r.status===403).length,2);
    assert.equal((await request('/subscription','GET',null,a.data.token)).data.transactionCount,50);
  } finally {
    if(tenants.length) await pool.query('DELETE FROM transactions WHERE tenant_id = ANY($1::uuid[])',[tenants]);
    if(tenants.length) await pool.query('DELETE FROM tenants WHERE id = ANY($1::uuid[])',[tenants]);
    await pool.end();child.kill();
  }
});