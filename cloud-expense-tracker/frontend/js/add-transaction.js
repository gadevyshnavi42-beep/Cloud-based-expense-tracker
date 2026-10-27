initPrivatePage('add-transaction');
fillSelect('category', CATEGORIES);
fillSelect('paymentMethod', PAYMENT_METHODS);
$('transactionDate').value = today();
const editId = new URLSearchParams(location.search).get('id');

async function loadForEdit() {
  $('heading').textContent = 'Edit Transaction';
  try {
    const { transaction: t } = await api('/transactions/' + editId);
    $('title').value = t.title;
    $('amount').value = t.amount;
    $('type').value = t.type;
    $('category').value = t.category;
    $('transactionDate').value = t.transactionDate.slice(0, 10);
    $('paymentMethod').value = t.paymentMethod;
    $('notes').value = t.notes || '';
  } catch (err) { toast(err.message, 'error'); }
}
if (editId) loadForEdit();

$('txForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    title: $('title').value.trim(), amount: Number($('amount').value), type: $('type').value, category: $('category').value,
    transactionDate: $('transactionDate').value, paymentMethod: $('paymentMethod').value, notes: $('notes').value.trim(),
  };
  if (!body.title) return toast('Description is required', 'error');
  if (!(body.amount > 0)) return toast('Amount must be greater than 0', 'error');
  try {
    if (editId) await api('/transactions/' + editId, { method: 'PUT', body });
    else await api('/transactions', { method: 'POST', body });
    toast(editId ? 'Transaction updated' : 'Transaction added');
    setTimeout(() => { location.href = 'transactions.html'; }, 700);
  } catch (err) { toast(err.message, 'error'); }
});
