/***********************************************************
  printing.js
  يعرض الزبائن الذين حالتهم "inPrinting"
  مع إمكانية نقلهم إلى "shipped"
  - نستخدم id بدل phone للتمييز
  - ترتيب الأعمدة وفق: [اسم الزبون, رقم الهاتف, الحالة, الإجراءات]
***********************************************************/

let customers = [];
const printingTableBody = document.getElementById('printingTableBody');

async function fetchCustomers() {
  try {
    const res = await fetch('http://localhost:3003/api/customers');
    customers = await res.json();
    displayPrintingCustomers();
  } catch (err) {
    console.error('Error fetching customers:', err);
    alert('تعذّر جلب الزبائن من السيرفر');
  }
}

function displayPrintingCustomers() {
  printingTableBody.innerHTML = '';

  const printingCustomers = customers.filter(c => c.status === 'inPrinting');

  printingCustomers.forEach(cust => {
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
        <button class="btn-stage btn-ship" onclick="moveToShipped(${cust.id})">
          <i class="fa fa-shipping-fast"></i> انقل إلى شُحنت
        </button>
      </td>
    `;
    printingTableBody.appendChild(row);
  });
}

async function moveToShipped(custId) {
  const cIndex = customers.findIndex(c => c.id === custId);
  if (cIndex === -1) {
    alert('لم يتم العثور على هذا الزبون!');
    return;
  }

  const updated = { ...customers[cIndex], status: 'shipped' };
  if (!updated.activityLog) updated.activityLog = [];
  updated.activityLog.push({
    time: new Date().toLocaleString(),
    action: 'نقل إلى شُحنت'
  });

  try {
    const res = await fetch(`http://localhost:3003/api/customers/${custId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (!res.ok) throw new Error('فشل تعديل حالة الزبون');
    await res.json();
    fetchCustomers();
  } catch (err) {
    console.error(err);
    alert('تعذّر نقل الزبون إلى شُحنت');
  }
}

fetchCustomers();
