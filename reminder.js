/***************************************************************
  reminder.js
  - جلب التذكيرات من السيرفر (GET /api/reminders)
  - إضافة تذكير جديد (POST /api/reminders)
  - حذف تذكير (DELETE /api/reminders/:id)
  - (اختياري) تعديل تذكير (PUT /api/reminders/:id)
***************************************************************/

const addReminderForm = document.getElementById('addReminderForm');
const reminderTextInput = document.getElementById('reminderText');
const reminderTableBody = document.getElementById('reminderTableBody');

// مصفوفة التذكيرات
let reminders = [];

/* 1) جلب جميع التذكيرات */
async function fetchReminders() {
  try {
    const res = await fetch('http://localhost:3003/api/reminders');
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
      <td>
        ${r.done ? 'نعم' : 'لا'}
      </td>
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

  // يمكنك إضافة أي حقول أخرى، مثلاً {text: txt, date: ..., done: false}
  const newReminder = {
    text: txt,
    done: false
  };

  try {
    const res = await fetch('http://localhost:3003/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReminder)
    });
    if (!res.ok) {
      throw new Error('فشل إضافة التذكير');
    }
    const data = await res.json();
    console.log('Reminder added:', data);

    addReminderForm.reset();
    // بعد الإضافة، أعد جلب القائمة
    fetchReminders();
  } catch (err) {
    console.error(err);
    alert('تعذّر إضافة التذكير');
  }
});

/* 4) حذف تذكير */
async function deleteReminder(id) {
  try {
    const res = await fetch(`http://localhost:3003/api/reminders/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error('فشل حذف التذكير');
    }
    const data = await res.json();
    console.log('Deleted reminder:', data);

    // بعد الحذف، أعد الجلب
    fetchReminders();
  } catch (err) {
    console.error(err);
    alert('تعذّر حذف التذكير');
  }
}

/* 5) تعديل التذكير (مثلاً قلب حقل done) */
async function toggleDone(id, newDone) {
  // newDone = true/false
  try {
    const res = await fetch(`http://localhost:3003/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: newDone })
    });
    if (!res.ok) {
      throw new Error('فشل تعديل التذكير');
    }
    const data = await res.json();
    console.log('Updated reminder:', data);

    // أعد الجلب
    fetchReminders();
  } catch (err) {
    console.error(err);
    alert('تعذّر تعديل التذكير');
  }
}

/* عند فتح الصفحة */
fetchReminders();
