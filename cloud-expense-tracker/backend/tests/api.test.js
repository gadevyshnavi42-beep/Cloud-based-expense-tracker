process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Budget = require('../models/Budget');
const { currentMonth } = require('../utils/helpers');

let mongod;
const month = currentMonth();
const day = `${month}-15`;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const tx = (o = {}) => ({ title: 'Lunch', amount: 100, type: 'expense', category: 'Food', transactionDate: day, paymentMethod: 'UPI', ...o });

async function signup(email) {
  const r = await request(app).post('/api/auth/register').send({ name: 'Test User', email, password: 'Password1' });
  return r.body.data.token;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  await Budget.init();
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

describe('Authentication', () => {
  test('registers a user and never returns the password hash', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'Asha', email: 'asha@test.com', password: 'Password1' });
    expect(r.status).toBe(201);
    expect(r.body.data.token).toBeDefined();
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash/);
  });
  test('rejects invalid registration data', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'A', email: 'bad', password: '123' });
    expect(r.status).toBe(400);
  });
  test('rejects duplicate email', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'Asha', email: 'ASHA@test.com', password: 'Password1' });
    expect(r.status).toBe(409);
  });
  test('login works with the right password only', async () => {
    const ok = await request(app).post('/api/auth/login').send({ email: 'asha@test.com', password: 'Password1' });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ email: 'asha@test.com', password: 'wrong' });
    expect(bad.status).toBe(401);
  });
  test('blocks requests without a valid token', async () => {
    expect((await request(app).get('/api/transactions')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth('fake'))).status).toBe(401);
  });
});

describe('Transactions', () => {
  let token;
  beforeAll(async () => { token = await signup('tx@test.com'); });

  test('create, edit and delete a transaction', async () => {
    const c = await request(app).post('/api/transactions').set(auth(token)).send(tx());
    expect(c.status).toBe(201);
    const id = c.body.data.transaction._id;
    const u = await request(app).put(`/api/transactions/${id}`).set(auth(token)).send(tx({ amount: 250.5 }));
    expect(u.body.data.transaction.amount).toBe(250.5);
    expect((await request(app).delete(`/api/transactions/${id}`).set(auth(token))).status).toBe(200);
    expect((await request(app).get(`/api/transactions/${id}`).set(auth(token))).status).toBe(404);
  });
  test('rejects invalid amount, date, category', async () => {
    for (const bad of [{ amount: -5 }, { amount: 'abc' }, { amount: 0 }, { transactionDate: '2026-02-31' }, { category: 'Nope' }]) {
      expect((await request(app).post('/api/transactions').set(auth(token)).send(tx(bad))).status).toBe(400);
    }
  });
  test('another user cannot read, edit or delete my record', async () => {
    const other = await signup('other@test.com');
    const c = await request(app).post('/api/transactions').set(auth(token)).send(tx({ title: 'Private' }));
    const id = c.body.data.transaction._id;
    expect((await request(app).get(`/api/transactions/${id}`).set(auth(other))).status).toBe(404);
    expect((await request(app).put(`/api/transactions/${id}`).set(auth(other)).send(tx())).status).toBe(404);
    expect((await request(app).delete(`/api/transactions/${id}`).set(auth(other))).status).toBe(404);
    const list = await request(app).get('/api/transactions').set(auth(other));
    expect(list.body.data.total).toBe(0);
  });
  test('search, filter and pagination', async () => {
    const t = await signup('filter@test.com');
    await request(app).post('/api/transactions').set(auth(t)).send(tx({ title: 'Pizza', amount: 300 }));
    await request(app).post('/api/transactions').set(auth(t)).send(tx({ title: 'Bus', category: 'Transport', amount: 50 }));
    await request(app).post('/api/transactions').set(auth(t)).send(tx({ title: 'Pay', type: 'income', category: 'Salary', amount: 1000 }));
    expect((await request(app).get('/api/transactions?search=piz').set(auth(t))).body.data.total).toBe(1);
    expect((await request(app).get('/api/transactions?type=income').set(auth(t))).body.data.total).toBe(1);
    const p = await request(app).get('/api/transactions?limit=2&sortBy=amount&order=asc').set(auth(t));
    expect(p.body.data.items).toHaveLength(2);
    expect(p.body.data.items[0].amount).toBe(50);
    expect(p.body.data.totalPages).toBe(2);
  });
});

describe('Budgets, dashboard and reports', () => {
  let token;
  beforeAll(async () => {
    token = await signup('budget@test.com');
    await request(app).post('/api/transactions').set(auth(token)).send(tx({ amount: 900 }));
    await request(app).post('/api/transactions').set(auth(token)).send(tx({ title: 'Salary', type: 'income', category: 'Salary', amount: 5000 }));
  });

  test('budget usage is calculated from real expenses and flags exceeded limits', async () => {
    await request(app).post('/api/budgets').set(auth(token)).send({ category: 'Food', month, monthlyLimit: 1000 });
    await request(app).post('/api/budgets').set(auth(token)).send({ category: 'Overall', month, monthlyLimit: 800 });
    const r = await request(app).get(`/api/budgets/summary?month=${month}`).set(auth(token));
    const food = r.body.data.items.find((b) => b.category === 'Food');
    const overall = r.body.data.items.find((b) => b.category === 'Overall');
    expect(food.spent).toBe(900);
    expect(food.status).toBe('warning');
    expect(food.remaining).toBe(100);
    expect(overall.status).toBe('exceeded');
  });
  test('duplicate budget for same category and month is rejected', async () => {
    const r = await request(app).post('/api/budgets').set(auth(token)).send({ category: 'Food', month, monthlyLimit: 2000 });
    expect(r.status).toBe(409);
  });
  test('dashboard totals', async () => {
    const r = await request(app).get('/api/dashboard/summary').set(auth(token));
    expect(r.body.data.monthlyIncome).toBe(5000);
    expect(r.body.data.monthlyExpense).toBe(900);
    expect(r.body.data.monthlyNet).toBe(4100);
    expect(r.body.data.expensesByCategory[0].category).toBe('Food');
  });
  test('reports filter by date range', async () => {
    const inside = await request(app).get(`/api/reports/date-range?from=${month}-01&to=${month}-28`).set(auth(token));
    expect(inside.body.data.expense).toBe(900);
    const outside = await request(app).get('/api/reports/date-range?from=2000-01-01&to=2000-01-31').set(auth(token));
    expect(outside.body.data.expense).toBe(0);
    expect((await request(app).get('/api/reports/date-range?from=bad&to=bad').set(auth(token))).status).toBe(400);
  });
  test('CSV export', async () => {
    const r = await request(app).get(`/api/reports/export-csv?from=${month}-01&to=${month}-28`).set(auth(token));
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.text.split('\n')[0]).toContain('Description');
    expect(r.text).toContain('"Lunch"');
  });
});
