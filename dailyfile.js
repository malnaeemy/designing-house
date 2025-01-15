/***************************************************************
  dailyfile.js
  - يعرض/ينشئ مجلدات اليوم (dailyFolders) من السيرفر
  - إضافة زبون إلى المجلد (تغيير حالته إلى dailyFile)
  - نقل الزبون من dailyFile إلى inPrinting
  - يستخدم id
  - يمكن عرض folderName
***************************************************************/

/* استبدل هذا بعنوان موقعك على Railway */
const BASE_URL = "https://designing-house-production.up.railway.app";

let allCustomers = [];
let dailyFolders = [];

// مراجع العناصر
const addFolderForm = document.getElementById('addFolderForm');
const folderNameInput = document.getElementById('folderName');
const folderDateInput = document.getElementById('folderDate');

const addCustomerToFolderForm = document.getElementById('addCustomerToFolderForm');
const customerSelect = document.getElementById('customerSelect');
const folderSelect = document.getElementById('folderSelect');

const folderTableBody = document.getElementById('folderTableBody');

// 1) جلب جميع الزبائن
async function fetchAllCustomers() {
  try {
    const res = await fetch(`${BASE_URL}/api/customers`);
    allCustomers = await res.json();
  } catch (err) {
    console.error('Error fetching customers:', err);
    alert('تعذّر جلب الزبائن');
    allCustomers = [];
  }
}

// 2) جلب المجلدات اليومية
async function fetchDailyFolders() {
  try {
    const res = await fetch(`${BASE_URL}/api/dailyfolders`);
    dailyFolders = await res.json();
    displayFolders();
  } catch (err) {
    console.error('Error fetching folders:', err);
    alert('تعذّر جلب المجلدات');
    dailyFolders = [];
  }
}

// 3) عرض المجلدات
function displayFolders() {
  folderTableBody.innerHTML = '';
  const grouped = {};

  dailyFolders.forEach((folder, fIndex) => {
    const d = folder.date || 'بدون تاريخ';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push({ data: folder, index: fIndex });
  });

  for (const dateKey in grouped) {
    const dateRow = document.createElement('tr');
    dateRow.innerHTML = `
      <td colspan="4" style="background-color:#e9e9f0; font-weight:bold;">
        ${dateKey}
      </td>
    `;
    folderTableBody.appendChild(dateRow);

    grouped[dateKey].forEach(({ data: folder, index: fIndex }) => {
      const dailyFileCusts = (folder.customers || []).filter(c => c.status === 'dailyFile');
      const countDailyFile = dailyFileCusts.length;

      const folderRow = document.createElement('tr');
      folderRow.innerHTML = `
        <td>${folder.name}</td>
        <td>${countDailyFile} زبائن</td>
        <td>
          <button onclick="downloadFolder('${folder.date}','${folder.name}')">تحميل الملفات</button>
        </td>
        <td>
          <button onclick="editFolder(${fIndex})">تعديل</button>
          <button onclick="deleteFolder(${fIndex})">حذف</button>
        </td>
      `;
      folderTableBody.appendChild(folderRow);

      dailyFileCusts.forEach((cust) => {
        const custRow = document.createElement('tr');
        custRow.innerHTML = `
          <td colspan="2" style="padding-left:30px;">
            - ${cust.name} (ID: ${cust.id}, phone: ${cust.phone})
            ${cust.folderName ? `<br><span style="color:gray;">[المجلد: ${cust.folderName}]</span>` : ''}
          </td>
          <td>
            <button onclick="moveCustomerToPrinting(${cust.id})">انقل إلى قيد الطبع</button>
          </td>
          <td></td>
        `;
        folderTableBody.appendChild(custRow);
      });
    });
  }
}

// 4) تعديل المجلد
async function editFolder(folderIndex) {
  if (folderIndex < 0 || folderIndex >= dailyFolders.length) {
    alert('فهرس المجلد غير صحيح');
    return;
  }
  const folderObj = dailyFolders[folderIndex];
  const newName = prompt('اسم المجلد:', folderObj.name);
  if (newName === null) return;
  const newDate = prompt('تاريخ المجلد (yyyy-mm-dd):', folderObj.date || '');
  if (newDate === null) return;

  try {
    const res = await fetch(`${BASE_URL}/api/dailyfolders/${folderIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, date: newDate })
    });
    if (!res.ok) throw new Error('فشل تعديل المجلد في السيرفر');
    await res.json();
    fetchDailyFolders();
  } catch (err) {
    console.error(err);
    alert('تعذّر تعديل المجلد');
  }
}

// 5) حذف المجلد
async function deleteFolder(folderIndex) {
  if (folderIndex < 0 || folderIndex >= dailyFolders.length) {
    alert('فهرس المجلد غير صالح');
    return;
  }
  const confirmDelete = confirm(`هل أنت متأكد من حذف المجلد "${dailyFolders[folderIndex].name}"؟`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${BASE_URL}/api/dailyfolders/${folderIndex}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('فشل حذف المجلد من السيرفر');
    await res.json();
    fetchDailyFolders();
  } catch (err) {
    console.error(err);
    alert('تعذّر حذف المجلد');
  }
}

// 6) مثال لتنزيل الملفات
async function downloadFolder(folderDate, folderName) {
  alert(`تحميل ملفات المجلد [${folderName}] بتاريخ [${folderDate}]`);
}

// 7) نقل الزبون إلى قيد الطبع
async function moveCustomerToPrinting(custId) {
  const cust = allCustomers.find(c => c.id === custId);
  if (!cust) {
    alert('لم يتم العثور على هذا الزبون!');
    return;
  }

  const updated = { ...cust, status: 'inPrinting' };
  if (!updated.activityLog) updated.activityLog = [];
  updated.activityLog.push({
    time: new Date().toLocaleString(),
    action: 'نقل إلى قيد الطبع'
  });

  try {
    const res = await fetch(`${BASE_URL}/api/customers/${custId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (!res.ok) throw new Error('فشل تعديل حالة الزبون');
    await fetchAllCustomers();
    await fetchDailyFolders();
  } catch (err) {
    console.error(err);
    alert('تعذّر نقل الزبون إلى قيد الطبع');
  }
}

// 8) إضافة مجلد جديد
async function addFolder(name, date) {
  try {
    const newFolder = { name, date };
    const res = await fetch(`${BASE_URL}/api/dailyfolders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFolder)
    });
    if (!res.ok) throw new Error('فشل إنشاء المجلد');
    await res.json();
    fetchDailyFolders();
  } catch (err) {
    console.error(err);
    alert('تعذّر إنشاء المجلد');
  }
}

// 9) إضافة زبون إلى مجلد
async function addCustomerToFolder(folderIndex, custObj) {
  try {
    await fetch(`${BASE_URL}/api/dailyfolders/${folderIndex}/add-customer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: custObj.id })
    });
    fetchDailyFolders();
  } catch (err) {
    console.error(err);
    alert('تعذّر إضافة الزبون للمجلد');
  }
}

// استماع للفورمات
addFolderForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = folderNameInput.value.trim();
  const date = folderDateInput.value.trim();
  if (!name) {
    alert('يجب إدخال اسم المجلد');
    return;
  }
  if (!date) {
    alert('يجب إدخال تاريخ المجلد');
    return;
  }
  addFolder(name, date);
  addFolderForm.reset();
});

addCustomerToFolderForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const custIdx = parseInt(customerSelect.value, 10);
  const folderIdx = parseInt(folderSelect.value, 10);
  if (isNaN(custIdx) || isNaN(folderIdx)) {
    alert('يجب اختيار زبون ومجلد');
    return;
  }
  const custObj = allCustomers[custIdx];
  if (!custObj) {
    alert('لم يتم العثور على هذا الزبون!');
    return;
  }
  addCustomerToFolder(folderIdx, custObj);
});

// تعبئة القوائم
function fillCustomerSelect() {
  customerSelect.innerHTML = '';
  allCustomers.forEach((cust, i) => {
    if (!cust.status || cust.status === 'notDistributed') {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${cust.name} (ID: ${cust.id})`;
      customerSelect.appendChild(opt);
    }
  });
}

function updateFolderSelect() {
  folderSelect.innerHTML = '';
  dailyFolders.forEach((folder, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${folder.name} (${folder.date || 'بدون تاريخ'})`;
    folderSelect.appendChild(opt);
  });
}

(async function initPage() {
  await fetchAllCustomers();
  await fetchDailyFolders();
  fillCustomerSelect();
  updateFolderSelect();
})();
