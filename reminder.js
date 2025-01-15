/***************************************************************
  reminder.js
  - جلب التذكيرات من السيرفر (GET /api/reminders)
  - إضافة تذكير جديد (POST /api/reminders)
  - حذف تذكير (DELETE /api/reminders/:id)
  - تعديل التذكير (PUT /api/reminders/:id) لقلب done
***************************************************************/

/* استبدل هذا بعنوان موقعك على Railway */
const BASE_URL = "https://designing-house-production.up.railway.app";

const addReminderForm = document.getElementById('addReminderForm');
const reminderTextInput = document.getElementById('reminderText');
const reminderTableBody = document.getElementById('reminderTableBody');

// مصفوفة التذكيرات
let reminders = [];

/* 1) جلب جميع التذكيرات */
async function fetchReminders() {
  try {
    const res = await fetch(`${BASE_URL}/api/reminders`);
    reminders = await res.json();
    displayReminders();
  } catch (err) {
    console.error('Error fetching reminders:', err);
    alert('تعذّر جلب التذكيرات من السيرفر');
  }
}

/* 2) عرض التذكيرات في الجدول */
function displayReminders() {
  reminderTableBody.innerHTML = '';

  reminders.forEach(r => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${r.id}</td>
      <td>${r.text}</td>
      <td>${r.done ? 'نعم' : 'لا'}</td>
      <td>
        <button class="delete-btn" onclick="deleteReminder(${r.id})">حذف</button>
        <button class="edit-btn" onclick="toggleDone(${r.id}, ${r.done ? 'false' : 'true'})">
          ${r.done ? 'أرجعه لغير منجز' : 'منجز'}
        </button>
      </td>
    `;
    reminderTableBody.appendChild(row);
  });
}

/* 3) إضافة تذكير جديد (POST) */
addReminderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const txt = reminderTextInput.value.trim();
  if (!txt) return;

  const newReminder = {
    text: txt,
    done: false
  };

  try {
    const res = await fetch(`${BASE_URL}/api/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReminder)
    });
    if (!res.ok) throw new Error('فشل إضافة التذكير');
    await res.json();
    addReminderForm.reset();
    fetchReminders();
  } catch (err) {
    console.error(err);
    alert('تعذّر إضافة التذكير');
  }
});

/* 4) حذف تذكير */
async function deleteReminder(id) {
  try {
    const res = await fetch(`${BASE_URL}/api/reminders/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('فشل حذف التذكير');
    await res.json();
    fetchReminders();
  } catch (err) {
    console.error(err);
    alert('تعذّر حذف التذكير');
  }
}

/* 5) تعديل التذكير (قلب حقل done) */
async function toggleDone(id, newDone) {
  try {
    const res = await fetch(`${BASE_URL}/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: newDone })
    });
    if (!res.ok) throw new Error('فشل تعديل التذكير');
    await res.json();
    fetchReminders();
  } catch (err) {
    console.error(err);
    alert('تعذّر تعديل التذكير');
  }
}

/* عند فتح الصفحة */
fetchReminders();
