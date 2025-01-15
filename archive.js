/***********************************************************
  archive.js
  - يعرض الزبائن المؤرشفين (status="archived")
  - زر "إعادة تفعيل" يعيدهم إلى notDistributed
  - بحث بالاسم/الهاتف
  - نعرض folderName عند الرغبة
  - تمت إضافة عمود "الملاحظات" للعرض
***********************************************************/

/* استبدل هذا بعنوان موقعك على Railway */
const BASE_URL = "https://designing-house-production.up.railway.app";

let customers = [];
const archiveTableBody = document.getElementById('archiveTableBody');
const searchArchivedInput = document.getElementById('searchArchivedInput');

/* 1) جلب قائمة الزبائن */
async function fetchCustomers() {
  try {
    const res = await fetch(`${BASE_URL}/api/customers`);
    customers = await res.json();
    displayArchivedCustomers();
  } catch (err) {
    console.error(err);
    alert('تعذّر جلب الزبائن من السيرفر');
  }
}

/* 2) عرض الزبائن المؤرشفين */
function displayArchivedCustomers(filtered) {
  archiveTableBody.innerHTML = '';

  // إما القائمة المفلترة أو الجميع ممن status="archived"
  const archived = filtered || customers.filter(c => c.status === 'archived');

  archived.forEach(cust => {
    let activityHTML = '';
    if (cust.activityLog && cust.activityLog.length) {
      activityHTML = cust.activityLog.map(log => `
        <li>${log.time}: ${log.action}</li>
      `).join('');
    } else {
      activityHTML = '<li>لا يوجد سجل نشاط</li>';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cust.name}</td>
      <td>${cust.phone}</td>
      <td>${cust.status}</td>
      <!-- الملاحظات -->
      <td>${cust.notes || ''}</td>
      <td>
        <ul>${activityHTML}</ul>
        <!-- عرض folderName إن وُجد -->
        ${cust.folderName ? `<p style="color:gray;">[من المجلد: ${cust.folderName}]</p>` : ''}
        <button onclick="reactivateCustomer(${cust.id})">إعادة تفعيل</button>
      </td>
    `;
    archiveTableBody.appendChild(row);
  });
}

/* 3) إعادة تفعيل الزبون من الأرشيف */
async function reactivateCustomer(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;

  // غيّر الحالة إلى notDistributed
  const updated = { ...c, status: 'notDistributed' };
  if (!updated.activityLog) updated.activityLog = [];
  updated.activityLog.push({
    time: new Date().toLocaleString(),
    action: 'إعادة تفعيل من الأرشيف'
  });

  try {
    const res = await fetch(`${BASE_URL}/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (!res.ok) throw new Error('فشل إعادة التفعيل');
    await res.json();
    fetchCustomers(); // إعادة التحميل
  } catch (err) {
    console.error(err);
    alert('تعذّر إعادة التفعيل');
  }
}

/* 4) البحث بالاسم أو الهاتف */
searchArchivedInput.addEventListener('input', () => {
  const val = searchArchivedInput.value.toLowerCase().trim();
  const filtered = customers.filter(c =>
    c.status === 'archived' &&
    (
      c.name.toLowerCase().includes(val) ||
      (c.phone || '').includes(val)
    )
  );
  displayArchivedCustomers(filtered);
});

// عند فتح الصفحة
fetchCustomers();
