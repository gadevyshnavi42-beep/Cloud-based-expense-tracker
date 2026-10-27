initPrivatePage('reports');
let yearChart, catChart;
const COLORS = ['#5b4bdb', '#7a6af0', '#20c997', '#fd7e14', '#dc3545', '#0dcaf0', '#ffc107', '#6f42c1', '#198754', '#6c757d'];
$('year').value = new Date().getFullYear();
$('from').value = thisMonth() + '-01';
$('to').value = today();

async function loadYear() {
  try {
    const d = await api('/reports/monthly?year=' + $('year').value);
    $('yearRows').innerHTML = d.months.map((m) => `<tr><td>${m.month}</td><td class="text-income">${money(m.income)}</td><td class="text-expense">${money(m.expense)}</td><td class="${m.net < 0 ? 'text-expense' : ''}">${money(m.net)}</td></tr>`).join('')
      + `<tr class="fw-bold"><td>Total</td><td>${money(d.totals.income)}</td><td>${money(d.totals.expense)}</td><td>${money(d.totals.net)}</td></tr>`;
    if (yearChart) yearChart.destroy();
    yearChart = new Chart($('yearChart'), { type: 'bar',
      data: { labels: d.months.map((m) => m.month.slice(5)), datasets: [
        { label: 'Income', data: d.months.map((m) => m.income), backgroundColor: '#198754' },
        { label: 'Expenses', data: d.months.map((m) => m.expense), backgroundColor: '#dc3545' }] },
      options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });
  } catch (err) { toast(err.message, 'error'); }
}

async function loadRange() {
  const q = `from=${$('from').value}&to=${$('to').value}`;
  try {
    const [cat, range] = await Promise.all([api('/reports/category-wise?' + q), api('/reports/date-range?' + q)]);
    $('rIncome').textContent = money(range.income);
    $('rExpense').textContent = money(range.expense);
    $('rNet').textContent = money(range.net);
    $('catRows').innerHTML = cat.categories.length ? cat.categories.map((c) => `<tr><td>${esc(c.category)}</td><td>${c.count}</td><td>${money(c.total)}</td><td>${c.percent}%</td></tr>`).join('')
      : `<tr><td colspan="4">${emptyState('bi-pie-chart', 'No expenses in this range')}</td></tr>`;
    if (catChart) catChart.destroy();
    $('catChart').style.display = cat.categories.length ? 'block' : 'none';
    if (cat.categories.length) {
      catChart = new Chart($('catChart'), { type: 'doughnut',
        data: { labels: cat.categories.map((c) => c.category), datasets: [{ data: cat.categories.map((c) => c.total), backgroundColor: COLORS }] },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
    }
  } catch (err) { toast(err.message, 'error'); }
}

$('yearBtn').addEventListener('click', loadYear);
$('rangeForm').addEventListener('submit', (e) => { e.preventDefault(); loadRange(); });
$('exportBtn').addEventListener('click', async () => {
  try { await downloadCsv(`from=${$('from').value}&to=${$('to').value}`); } catch (err) { toast(err.message, 'error'); }
});
loadYear();
loadRange();
