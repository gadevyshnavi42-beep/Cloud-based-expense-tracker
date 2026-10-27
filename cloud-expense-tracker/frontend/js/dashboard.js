initPrivatePage('dashboard');
let doughnut, bar;
$('month').value = thisMonth();
$('month').addEventListener('change', load);
const COLORS = ['#5b4bdb', '#7a6af0', '#20c997', '#fd7e14', '#dc3545', '#0dcaf0', '#ffc107', '#6f42c1', '#198754', '#6c757d'];

async function load() {
  try {
    const month = $('month').value || thisMonth();
    const [s, recent] = await Promise.all([api('/dashboard/summary?month=' + month), api('/dashboard/recent-transactions?limit=5')]);

    $('income').textContent = money(s.monthlyIncome);
    $('expense').textContent = money(s.monthlyExpense);
    $('net').textContent = money(s.monthlyNet);
    $('net').className = 'mb-0 ' + (s.monthlyNet < 0 ? 'text-expense' : 'text-income');
    $('allTime').textContent = 'All-time balance: ' + money(s.allTimeBalance);

    // budget usage (overall budget if set)
    const overall = s.budgetUtilization.find((b) => b.category === 'Overall');
    if (overall) {
      $('budgetText').textContent = `${overall.percent}% used`;
      $('budgetSub').textContent = `${money(overall.spent)} of ${money(overall.monthlyLimit)}`;
    } else { $('budgetText').textContent = 'No budget'; $('budgetSub').innerHTML = '<a href="budgets.html">Set a budget</a>'; }
    $('alerts').innerHTML = s.budgetUtilization.filter((b) => b.status !== 'ok').map((b) =>
      `<div class="alert alert-${b.status === 'exceeded' ? 'danger' : 'warning'} py-2">${b.status === 'exceeded' ? 'Budget exceeded' : 'Nearing limit'}: <strong>${esc(b.category)}</strong> (${b.percent}% used)</div>`).join('');

    // doughnut chart
    if (doughnut) doughnut.destroy();
    $('catEmpty').innerHTML = s.expensesByCategory.length ? '' : emptyState('bi-pie-chart', 'No expenses this month yet');
    $('catChart').style.display = s.expensesByCategory.length ? 'block' : 'none';
    if (s.expensesByCategory.length) {
      doughnut = new Chart($('catChart'), { type: 'doughnut',
        data: { labels: s.expensesByCategory.map((c) => c.category), datasets: [{ data: s.expensesByCategory.map((c) => c.total), backgroundColor: COLORS }] },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
    }
    // bar chart
    if (bar) bar.destroy();
    bar = new Chart($('trendChart'), { type: 'bar',
      data: { labels: s.monthlyTrend.map((m) => m.month), datasets: [
        { label: 'Income', data: s.monthlyTrend.map((m) => m.income), backgroundColor: '#198754' },
        { label: 'Expenses', data: s.monthlyTrend.map((m) => m.expense), backgroundColor: '#dc3545' }] },
      options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });

    $('top').innerHTML = s.topCategories.length
      ? s.topCategories.map((c, i) => `<li class="list-group-item d-flex justify-content-between"><span>${i + 1}. ${esc(c.category)}</span><strong>${money(c.total)}</strong></li>`).join('')
      : `<li class="list-group-item text-muted">No data</li>`;

    $('recent').innerHTML = recent.items.length ? recent.items.map((t) => `
      <tr><td><i class="bi ${iconFor(t.type)}"></i></td><td>${esc(t.title)}<div class="small text-muted">${esc(t.category)}</div></td>
      <td>${fmtDate(t.transactionDate)}</td><td class="text-end ${t.type === 'income' ? 'text-income' : 'text-expense'}">${t.type === 'income' ? '+' : '-'}${money(t.amount)}</td></tr>`).join('')
      : `<tr><td colspan="4">${emptyState('bi-receipt', 'No transactions yet. Add your first one!')}</td></tr>`;
  } catch (err) { toast(err.message, 'error'); }
}
load();
