initPrivatePage('transactions');
let page = 1;
fillSelect('category', CATEGORIES, 'All categories');

function filters(extra = {}) {
  const p = new URLSearchParams();
  ['search', 'type', 'category', 'from', 'to', 'sortBy', 'order'].forEach((k) => { const v = $(k).value.trim(); if (v) p.set(k, v); });
  Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  return p;
}

async function load() {
  try {
    const d = await api('/transactions?' + filters({ page, limit: 10 }));
    $('rows').innerHTML = d.items.length ? d.items.map((t) => `
      <tr>
        <td>${fmtDate(t.transactionDate)}</td>
        <td><i class="bi ${iconFor(t.type)}"></i> ${esc(t.title)}${t.notes ? `<div class="small text-muted">${esc(t.notes)}</div>` : ''}</td>
        <td><span class="badge bg-accent-soft">${esc(t.category)}</span></td>
        <td>${esc(t.paymentMethod)}</td>
        <td class="text-end ${t.type === 'income' ? 'text-income' : 'text-expense'}">${t.type === 'income' ? '+' : '-'}${money(t.amount)}</td>
        <td class="text-end text-nowrap">
          <a class="btn btn-sm btn-outline-primary" href="add-transaction.html?id=${esc(t._id)}" aria-label="Edit"><i class="bi bi-pencil"></i></a>
          <button class="btn btn-sm btn-outline-danger" data-del="${esc(t._id)}" aria-label="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('') : `<tr><td colspan="6">${emptyState('bi-inbox', 'No transactions found')}</td></tr>`;
    $('pageInfo').textContent = `Page ${d.page} of ${Math.max(d.totalPages, 1)} (${d.total} records)`;
    $('prev').disabled = d.page <= 1;
    $('next').disabled = d.page >= d.totalPages;
  } catch (err) { toast(err.message, 'error'); }
}

$('filterForm').addEventListener('submit', (e) => { e.preventDefault(); page = 1; load(); });
$('reset').addEventListener('click', () => { $('filterForm').reset(); page = 1; load(); });
$('prev').addEventListener('click', () => { page--; load(); });
$('next').addEventListener('click', () => { page++; load(); });
$('rows').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-del]');
  if (!btn || !confirm('Delete this transaction? This cannot be undone.')) return;
  try { await api('/transactions/' + btn.dataset.del, { method: 'DELETE' }); toast('Transaction deleted'); load(); }
  catch (err) { toast(err.message, 'error'); }
});
$('exportBtn').addEventListener('click', async () => {
  const from = $('from').value, to = $('to').value;
  if (!from || !to) return toast('Pick a From and To date to export', 'warning');
  try { await downloadCsv(`from=${from}&to=${to}`); } catch (err) { toast(err.message, 'error'); }
});
load();
