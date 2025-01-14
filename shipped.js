/***********************************************************
  shipped.js
  يعرض الزبائن الذين حالتهم "shipped"
  مع إمكانية نقلهم إلى "archived"
  - ترتيب الأعمدة وفق: [اسم الزبون, رقم الهاتف, الحالة, الإجراءات]
***********************************************************/

let customers = [];
const shippedTableBody = document.getElementById('shippedTableBody');

async function fetchCustomers() {
  try {
    const res = await fetch('http://localhost:3003/api/customers');
    customers = await res.json();
    displayShippedCustomers();
  } catch (err) {
    console.error('Error fetching customers:', err);
    alert('تعذّر جلب الزبائن من السيرفر');
  }
}

function displayShippedCustomers() {
  shippedTableBody.innerHTML = '';

  const shippedCustomers = customers.filter(c => c.status === 'shipped');

  shippedCustomers.forEach(cust => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <!-- العمود الأول: اسم الزبون -->
      <td>${cust.name}</td>

      <!-- العمود الثاني: رقم الهاتف -->
      <td>${cust.phone}</td>

      <!-- العمود الثالث: الحالة -->
      <td>${cust.status}</td>

      <!-- العمود الرابع: الإجراءات -->
      <td>
        <button class="btn-stage btn-archive" onclick="moveToArchive(${cust.id})">
          <i class="fa fa-archive"></i> أرشفة الطلب
        </button>
      </td>
    `;
    shippedTableBody.appendChild(row);
  });
}

async function moveToArchive(custId) {
  const cIndex = customers.findIndex(c => c.id === custId);
  if (cIndex === -1) {
    alert('لم يتم العثور على هذا الزبون!');
    return;
  }

  const updated = { ...customers[cIndex], status: 'archived' };
  if (!updated.activityLog) updated.activityLog = [];
  updated.activityLog.push({
    time: new Date().toLocaleString(),
    action: 'أرشفة الطلب'
  });

  try {
    const res = await fetch(`http://localhost:3003/api/customers/${custId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (!res.ok) throw new Error('فشل تحديث حالة الزبون');
    await res.json();
    fetchCustomers();
  } catch (err) {
    console.error(err);
    alert('تعذّر أرشفة الطلب');
  }
}

fetchCustomers();