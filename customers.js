/***********************************************************
  customers.js (مُعدَّل)
  - يعتمد الآن على الخادم بدلًا من Local Storage
  - رفع الملف المضغوط ما زال عبر /upload-zip
  - إضافة/جلب/حذف/تعديل الزبائن عبر /api/customers
  - الإصلاح: استدعاء المسار بالحقل id بدل phone عند الحذف
***********************************************************/

// مراجع لعناصر HTML
const addCustomerForm = document.getElementById('addCustomerForm');
const customerTableBody = document.getElementById('customerTableBody');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const uploadZipBtn = document.getElementById('uploadZipBtn');
const folderInput = document.getElementById('folderInput');
const searchInput = document.getElementById('searchInput');

// مصفوفة العملاء (سنملؤها عبر الخادم)
let customers = [];

// متغيّرات لإدارة الملف المضغوط
let selectedFolderFiles = [];
let finalZipName = '';

/**
 * 1) دالة لجلب قائمة الزبائن من السيرفر
 */
async function fetchCustomers() {
  try {
    const res = await fetch('http://localhost:3003/api/customers');
    customers = await res.json(); 
    displayCustomers(); 
  } catch (err) {
    console.error('Error fetching customers:', err);
    alert('تعذّر جلب الزبائن من السيرفر');
  }
}

/**
 * 2) دالة لعرض الزبائن (فقط من حالتهم "notDistributed")
 *    يمكن استلام قائمة مفلترة لعرضها، وإلّا يتم عرض القائمة الرئيسية
 */
function displayCustomers(list) {
  // لو وصلنا لائحة مفلترة، نعرضها، وإلا نعرض customers كامل
  const baseList = list || customers;
  // نعرض فقط من حالته "notDistributed"
  const filteredList = baseList.filter(c => c.status === 'notDistributed');

  customerTableBody.innerHTML = '';

  filteredList.forEach((cust, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cust.name}</td>
      <td>${cust.phone}</td>
      <td>${cust.address || ''}</td>
      <td>${cust.notes || ''}</td>
      <td>${cust.zipName || ''}</td>
      <td class="actions">
        <button class="edit-btn" onclick="editCustomer(${index})">تعديل</button>
        <button class="delete-btn" onclick="deleteCustomer(${index})">حذف</button>
      </td>
    `;
    customerTableBody.appendChild(row);
  });
}

/**
 * 3) دالة لإضافة زبون (ترسل طلب POST للسيرفر)
 */
async function addCustomer(name, phone, address, notes, zipName) {
  try {
    const newC = {
      name,
      phone,
      address,
      notes,
      zipName,
      status: "notDistributed",
      activityLog: []
    };

    const res = await fetch('http://localhost:3003/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newC)
    });

    if (!res.ok) {
      throw new Error('فشل إضافة الزبون');
    }

    const data = await res.json();
    console.log('Customer added:', data);

    // بعد الإضافة، نجلب القائمة مجددًا
    fetchCustomers();

  } catch (err) {
    console.error(err);
    alert('تعذّر إضافة الزبون عبر السيرفر');
  }
}

/**
 * 4) دالة لحذف زبون عبر DELETE
 *    - نستخدم now الزبون id في الرابط بدل الهاتف
 */
async function deleteCustomer(index) {
  // نستخرج الزبون المستهدف من الحالة "notDistributed"
  const filteredList = customers.filter(c => c.status === "notDistributed");
  const c = filteredList[index];
  if (!c) return;

  try {
    // نستخدم c.id بدل c.phone في الرابط
    const res = await fetch(`http://localhost:3003/api/customers/${c.id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error('فشل حذف الزبون من السيرفر');
    }
    const data = await res.json();
    console.log('Deleted:', data);

    // أعد جلب القائمة
    fetchCustomers();

  } catch (err) {
    console.error(err);
    alert('تعذّر حذف الزبون');
  }
}

/**
 * 5) دالة لتعديل الزبون (تستدعي PUT)
 */
async function editCustomer(index) {
  const filteredList = customers.filter(c => c.status === "notDistributed");
  const oldC = filteredList[index];
  if (!oldC) return;

  // نبحث عن الزبون في المصفوفة الأصلية
  const mainIndex = customers.findIndex(x => x.id === oldC.id);
  if (mainIndex === -1) return;

  const newName = prompt("اسم الزبون:", oldC.name);
  if (newName === null) return;
  const newPhone = prompt("رقم الهاتف:", oldC.phone);
  if (newPhone === null) return;
  const newAddress = prompt("العنوان:", oldC.address || '');
  if (newAddress === null) return;
  const newNotes = prompt("الملاحظات:", oldC.notes || '');
  if (newNotes === null) return;

  const updatedC = {
    ...oldC,
    name: newName.trim(),
    phone: newPhone.trim(),
    address: newAddress.trim(),
    notes: newNotes.trim()
  };

  try {
    // استدعاء PUT مع تمرير oldC.id
    const res = await fetch(`http://localhost:3003/api/customers/${oldC.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedC)
    });
    if (!res.ok) {
      throw new Error('فشل تعديل الزبون في السيرفر');
    }
    const data = await res.json();
    console.log('Edited:', data);

    // بعد التعديل، أعد جلب القائمة
    fetchCustomers();

  } catch (err) {
    console.error(err);
    alert('تعذّر تعديل الزبون');
  }
}

/**
 * 6) الاستماع لإرسال نموذج إضافة زبون
 */
addCustomerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();
  const notes = document.getElementById('customerNotes').value.trim();

  addCustomer(name, phone, address, notes, finalZipName);

  // تنظيف النموذج
  addCustomerForm.reset();
  selectedFolderFiles = [];
  finalZipName = '';
  uploadZipBtn.style.display = 'none';
});

/* زر اختيار مجلد (لرفع الملف المضغوط) */
selectFolderBtn.addEventListener('click', () => {
  folderInput.click();
});

folderInput.addEventListener('change', (e) => {
  selectedFolderFiles = Array.from(e.target.files);
  if (selectedFolderFiles.length > 0) {
    uploadZipBtn.style.display = 'inline-block';
  }
});

/**
 * زر "ضغط الملف" ورفعه
 */
uploadZipBtn.addEventListener('click', async () => {
  if (selectedFolderFiles.length === 0) return;
  const zip = new JSZip();
  let folderName = '';

  for (let file of selectedFolderFiles) {
    const pathParts = file.webkitRelativePath.split('/');
    folderName = pathParts[0];
    const arrayBuffer = await file.arrayBuffer();
    const relativePath = file.webkitRelativePath;
    zip.file(relativePath, arrayBuffer);
  }

  finalZipName = folderName + '.zip';
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const formData = new FormData();
  formData.append('zipfile', zipBlob, finalZipName);

  try {
    const res = await fetch('http://localhost:3003/upload-zip', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message + '\nالمسار: ' + data.filePath);
      finalZipName = data.filePath;
    } else {
      alert(data.error || 'حدث خطأ في الرفع');
    }
  } catch (err) {
    console.error(err);
    alert('تعذّر الاتصال بالخادم');
  }
  uploadZipBtn.style.display = 'none';
});

/**
 * البحث في قائمة الزبائن
 */
searchInput.addEventListener('input', () => {
  const val = searchInput.value.toLowerCase();
  const filtered = customers.filter(c =>
    c.status === "notDistributed" &&
    (c.name.toLowerCase().includes(val) ||
     c.phone.includes(val) ||
     (c.address && c.address.includes(val)) ||
     (c.notes && c.notes.includes(val)))
  );
  displayCustomers(filtered);
});

// عند فتح الصفحة أول مرة
fetchCustomers();
