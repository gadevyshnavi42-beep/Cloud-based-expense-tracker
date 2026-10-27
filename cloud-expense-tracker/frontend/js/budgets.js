initPrivatePage('budgets');
let editId = null;
fillSelect('category', ['Overall', ...CATEGORIES]);
$('month').value = thisMonth();
$('viewMonth').value = thisMonth();
$('viewMonth').addEventListener('change', load);

function resetForm() { editId = null; $('budgetForm').reset(); $('month').value = $('viewMonth').value || thisMonth(); $('saveBtn').textContent = 'Save Budget'; $('cancelEdit').classList.add('d-none'); }

async function load() {
  try {
    const month = $('viewMonth').value || thisMonth();
    const d = await api('/budgets/summary?month=' + month);
    $('list').innerHTML = d.items.length ? d.items.map((b) => {
      const color = b.status === 'exceeded' ? 'danger' : b.status === 'warning' ? 'warning' : 'success';
      return `<div class="col-md-6"><div class="card h-100"><div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <h2 class="h6 mb-1">${esc(b.category)}</h2>
          <span class="badge text-bg-${color}">${b.status === 'exceeded' ? 'Exceeded' : b.status === 'warning' ? 'Near limit' : 'On track'}</span>
        </div>
        <div class="small text-muted mb-2">${money(b.spent)} spent of ${money(b.monthlyLimit)}</div>
        <div class="progress" role="progressbar" aria-valuenow="${Math.min(b.percent, 100)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar bg-${color}" style="width:${Math.min(b.percent, 100)}%"></div></div>
        <div class="d-flex justify-content-between mt-2 small"><span>${b.percent}% used</span><span>${b.remaining >= 0 ? money(b.remaining) + ' left' : money(-b.remaining) + ' over'}</span></div>
        <div class="mt-3"><button class="btn btn-sm btn-outline-primary" data-edit='${esc(JSON.stringify({ id: b._id, category: b.category, month: b.month, limit: b.monthlyLimit }))}'>Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-del="${esc(b._id)}">Delete</button></div>
      </div></div></div>`;
    }).join('') : `<div class="col-12">${emptyState('bi-piggy-bank', 'No budgets for this month. Create one using the form.')}</div>`;
  } catch (err) { toast(err.message, 'error'); }
}

$('budgetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = { category: $('category').value, month: $('month').value, monthlyLimit: Number($('monthlyLimit').value) };
  if (!body.month) return toast('Choose a month', 'error');
  if (!(body.monthlyLimit > 0)) return toast('Limit must be greater than 0', 'error');
  try {
    if (editId) await api('/budgets/' + editId, { method: 'PUT', body });
    else await api('/budgets', { method: 'POST', body });
    toast(editId ? 'Budget updated' : 'Budget created');
    $('viewMonth').value = body.month;
    resetForm();
    load();
  } catch (err) { toast(err.message, 'error'); }
});
$('cancelEdit').addEventListener('click', resetForm);
$('list').addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-del]');
  if (ed) {
    const b = JSON.parse(ed.dataset.edit);
    editId = b.id; $('category').value = b.category; $('month').value = b.month; $('monthlyLimit').value = b.limit;
    $('saveBtn').textContent = 'Update Budget'; $('cancelEdit').classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (del && confirm('Delete this budget?')) {
    try { await api('/budgets/' + del.dataset.del, { method: 'DELETE' }); toast('Budget deleted'); load(); } catch (err) { toast(err.message, 'error'); }
  }
});
load();
