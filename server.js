/************************************************************
 server.js (معدّل وكامل مع المهام tasks)
 خادم محلي باستخدام Node.js + Express + Multer + Archiver
 - يقدّم الملفات الثابتة (HTML, CSS, JS) بعد التحقق من الجلسة
 - يرفع الملفات المضغوطة (POST /upload-zip)
 - يولّد ملفات مضغوطة عند الطلب (POST /download-customers-zips)
 - يدير الزبائن (customers) والمجلدات (dailyFolders)
 - يمكّن التذكيرات (reminders)
 - يستخدم id كمعرّف رئيسي للزبون
 - أضفنا folderName عند وضع الزبون في مجلد
 - أضفنا نظام تسجيل دخول بسيط لمستخدمين admin و Engsamar (أو غيرهما)
 - أضفنا منطق orders (تخزين الطلبات) + مسار /api/orders
 - أضفنا /api/reports لعرض الزبائن المتكررين وغير النشطين
 - تم إضافة /api/tasks لإدارة المهام
*************************************************************/

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

/* 1) إضافة مكتبة الجلسات */
const session = require('express-session');

const app = express();
/* قراءة المنفذ من process.env.PORT وإلا 3003 */
const PORT = process.env.PORT || 3003;

/* 2) مستخدمان فقط مصرح لهما بالدخول */
const validUsers = [
  { username: 'malnaeemy', password: '0991481846' },
  { username: 'Engsamar', password: '19931028' }
];

/* تجهيز مجلد الرفع "uploads" إن لم يكن موجوداً */
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

/* تمكين قراءة JSON في الطلبات */
app.use(express.json());

/* إعداد الجلسات */
app.use(session({
  secret: 'MY_SUPER_SECRET_KEY',
  resave: false,
  saveUninitialized: false
}));

/* مسار تسجيل الدخول (POST /login) */
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const found = validUsers.find(u => u.username === username && u.password === password);
  if (!found) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور خاطئة' });
  }
  // نجعل المستخدم "مسجل دخول" في الجلسة
  req.session.loggedIn = true;
  req.session.username = username;
  res.json({ message: 'تم تسجيل الدخول بنجاح' });
});

/* مسار تسجيل الخروج (اختياري) */
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

/* 3) مسار ثابت لصفحة login.html */
app.use('/login.html', express.static(path.join(__dirname, 'login.html')));

/* 4) ميدل وير يتحقق من الجلسة لأي طلب آخر */
app.use((req, res, next) => {
  // السماح إذا كان المستخدم مسجَّل دخوله
  if (req.session.loggedIn) {
    return next();
  }
  // السماح لمسار /login (POST) ولصفحة /login.html فقط
  const allowList = [
    '/login',     // POST
    '/login.html' // GET
  ];
  if (allowList.includes(req.url)) {
    return next();
  }
  // إن لم يكن مسجلاً دخوله: إعادة توجيه
  return res.redirect('/login.html');
});

/* 5) تقديم الملفات الثابتة (HTML, CSS, JS) للمستخدم المسجل */
app.use(cors());
app.use(express.static(path.join(__dirname)));

/* ============= دوال قراءة/كتابة data.json ============= */
function loadDataFromJson() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8');
    const data = JSON.parse(raw);
    return {
      customers: Array.isArray(data.customers) ? data.customers : [],
      dailyFolders: Array.isArray(data.dailyFolders) ? data.dailyFolders : [],
      reminders: Array.isArray(data.reminders) ? data.reminders : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : []
    };
  } catch (err) {
    console.error('Error reading data.json:', err);
    return {
      customers: [],
      dailyFolders: [],
      reminders: [],
      orders: [],
      tasks: []
    };
  }
}

function saveDataToJson(customers, dailyFolders, reminders, orders, tasks) {
  try {
    const obj = { customers, dailyFolders, reminders, orders, tasks };
    fs.writeFileSync(
      path.join(__dirname, 'data.json'),
      JSON.stringify(obj, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error('Error writing data.json:', err);
  }
}

/* تحميل البيانات عند بدء الخادم */
let { customers, dailyFolders, reminders, orders, tasks } = loadDataFromJson();

/* ------------- رفع ملف مضغوط ------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage }).single('zipfile');

app.post('/upload-zip', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('Error uploading file:', err);
      return res.status(500).json({ error: 'Error uploading file' });
    }
    console.log('File uploaded to:', req.file.path);
    res.json({
      message: 'تم رفع الملف بنجاح إلى الخادم',
      filePath: req.file.path
    });
  });
});

/* ----------- توليد ملف مضغوط من قائمة filePaths ----------- */
app.post('/download-customers-zips', async (req, res) => {
  try {
    const filePaths = req.body.filePaths || [];
    res.attachment('customers-files.zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const fp of filePaths) {
      archive.file(fp, { name: path.basename(fp) });
    }
    await archive.finalize();
  } catch (err) {
    console.error('Error creating zip:', err);
    res.status(500).send('Error creating zip');
  }
});

/* ------------- مسارات الزبائن (customers) ------------- */
app.get('/api/customers', (req, res) => {
  res.json(customers);
});

app.post('/api/customers', (req, res) => {
  const newC = req.body;
  const maxId = customers.reduce((m, c) => Math.max(m, c.id || 0), 0);
  newC.id = maxId + 1;

  customers.push(newC);
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);

  console.log('Customer added:', newC.name, newC.phone);
  res.status(201).json({ message: 'Customer added', customer: newC });
});

app.delete('/api/customers/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = customers.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const deleted = customers.splice(index, 1)[0];
  // احذفه أيضاً من dailyFolders
  dailyFolders.forEach(folder => {
    folder.customers = folder.customers.filter(cc => cc.id !== id);
  });
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);
  res.json({
    message: 'Customer deleted',
    customer: deleted
  });
});

app.put('/api/customers/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = customers.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const oldStatus = customers[idx].status;
  customers[idx] = { ...customers[idx], ...req.body };
  const newStatus = customers[idx].status;

  if (oldStatus === 'dailyFile' && newStatus !== 'dailyFile') {
    dailyFolders.forEach(folder => {
      folder.customers = folder.customers.filter(c => c.id !== id);
    });
  }

  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);
  res.json({
    message: 'Customer updated',
    customer: customers[idx]
  });
});

/* -------------- مسارات dailyFolders -------------- */
app.get('/api/dailyfolders', (req, res) => {
  res.json(dailyFolders);
});

app.post('/api/dailyfolders', (req, res) => {
  const newFolder = {
    name: req.body.name,
    date: req.body.date,
    customers: []
  };
  dailyFolders.push(newFolder);
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);

  res.status(201).json({ message: 'Folder created', folder: newFolder });
});

app.put('/api/dailyfolders/:folderIndex', (req, res) => {
  const fIdx = parseInt(req.params.folderIndex, 10);
  if (fIdx < 0 || fIdx >= dailyFolders.length) {
    return res.status(404).json({ error: 'Folder not found' });
  }
  const { name, date } = req.body;
  if (name !== undefined) dailyFolders[fIdx].name = name;
  if (date !== undefined) dailyFolders[fIdx].date = date;

  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);
  res.json({
    message: 'Folder updated',
    folder: dailyFolders[fIdx]
  });
});

app.delete('/api/dailyfolders/:folderIndex', (req, res) => {
  const fIdx = parseInt(req.params.folderIndex, 10);
  if (fIdx < 0 || fIdx >= dailyFolders.length) {
    return res.status(404).json({ error: 'Folder not found' });
  }
  const removed = dailyFolders.splice(fIdx, 1)[0];
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);
  res.json({ message: 'Folder deleted', folder: removed });
});

app.put('/api/dailyfolders/:folderIndex/add-customer', (req, res) => {
  const fIdx = parseInt(req.params.folderIndex, 10);
  if (fIdx < 0 || fIdx >= dailyFolders.length) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const { id } = req.body;
  const custIdx = customers.findIndex(c => c.id === id);
  if (custIdx === -1) {
    return res.status(404).json({ error: 'Customer not found in system' });
  }

  customers[custIdx].status = 'dailyFile';
  if (!customers[custIdx].activityLog) {
    customers[custIdx].activityLog = [];
  }
  customers[custIdx].activityLog.push({
    time: new Date().toLocaleString(),
    action: 'تغيير الحالة إلى dailyFile'
  });

  customers[custIdx].folderName = dailyFolders[fIdx].name;
  dailyFolders[fIdx].customers.push({ ...customers[custIdx] });
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);
  res.json({
    message: 'Customer added to folder',
    folder: dailyFolders[fIdx]
  });
});

/* -------------- مسارات reminders (التذكير) -------------- */
app.get('/api/reminders', (req, res) => {
  res.json(reminders);
});

app.post('/api/reminders', (req, res) => {
  const newR = req.body;
  const maxId = reminders.reduce((m, r) => Math.max(m, r.id || 0), 0);
  newR.id = maxId + 1;
  reminders.push(newR);
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);
  res.status(201).json({ message: 'Reminder added', reminder: newR });
});

app.delete('/api/reminders/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Reminder not found' });
  }
  const removed = reminders.splice(idx, 1)[0];
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);
  res.json({ message: 'Reminder deleted', reminder: removed });
});

app.put('/api/reminders/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Reminder not found' });
  }
  reminders[idx] = { ...reminders[idx], ...req.body };
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);
  res.json({ message: 'Reminder updated', reminder: reminders[idx] });
});

/* ============== منطق الطلبات (Orders) ============== */
app.post('/api/orders', (req, res) => {
  const { customerId, orderType, date } = req.body;

  const cIndex = customers.findIndex(c => c.id === Number(customerId));
  if (cIndex === -1) {
    return res.status(404).json({ error: 'الزبون غير موجود!' });
  }

  const maxOrderId = orders.reduce((m, o) => Math.max(m, o.id || 0), 0);
  const newOrderId = maxOrderId + 1;

  const newOrder = {
    id: newOrderId,
    customerId: Number(customerId),
    orderType: orderType || 'طلب غير محدد',
    date: date || new Date().toISOString()
  };

  orders.push(newOrder);

  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);

  console.log('New order added:', newOrder);
  return res.status(201).json({ message: 'تم إضافة الطلب', order: newOrder });
});

/* ============== مسار التقارير (Reports) ============== */
app.get('/api/reports', (req, res) => {
  try {
    const orderCountMap = {};
    const lastOrderMap = {};

    orders.forEach(order => {
      const cId = order.customerId;
      if (!orderCountMap[cId]) {
        orderCountMap[cId] = 0;
      }
      orderCountMap[cId]++;

      const orderDate = new Date(order.date);
      if (!lastOrderMap[cId] || new Date(lastOrderMap[cId]) < orderDate) {
        lastOrderMap[cId] = order.date;
      }
    });

    // الزبائن المتكررين
    const frequentCustomers = customers
      .map(cust => {
        const cId = cust.id;
        const count = orderCountMap[cId] || 0;
        return {
          ...cust,
          orderCount: count
        };
      })
      .filter(c => c.orderCount > 1)
      .sort((a, b) => b.orderCount - a.orderCount);

    // الزبائن غير النشطين منذ 30 يوم
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const inactiveCustomers = customers.filter(c => {
      const cId = c.id;
      if (!lastOrderMap[cId]) {
        return true;
      }
      return new Date(lastOrderMap[cId]) < thirtyDaysAgo;
    });

    res.json({ frequentCustomers, inactiveCustomers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حصل خطأ أثناء إنشاء التقارير' });
  }
});

/* ============== منطق المهام (Tasks) ============== */
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, status, dueDate } = req.body;
  const maxTaskId = tasks.reduce((m, t) => Math.max(m, t.id || 0), 0);
  const newTaskId = maxTaskId + 1;

  const newTask = {
    id: newTaskId,
    title: title || 'مهمة بدون عنوان',
    status: status || 'pending',
    dueDate: dueDate || ''
  };
  tasks.push(newTask);

  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);

  res.status(201).json({ message: 'تمت إضافة المهمة', task: newTask });
});

app.put('/api/tasks/:id', (req, res) => {
  const tId = parseInt(req.params.id, 10);
  const idx = tasks.findIndex(t => t.id === tId);
  if (idx === -1) {
    return res.status(404).json({ error: 'المهمة غير موجودة!' });
  }

  tasks[idx] = { ...tasks[idx], ...req.body };
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);

  res.json({ message: 'تم تحديث المهمة', task: tasks[idx] });
});

app.delete('/api/tasks/:id', (req, res) => {
  const tId = parseInt(req.params.id, 10);
  const idx = tasks.findIndex(t => t.id === tId);
  if (idx === -1) {
    return res.status(404).json({ error: 'المهمة غير موجودة!' });
  }
  const removed = tasks.splice(idx, 1)[0];
  saveDataToJson(customers, dailyFolders, reminders, orders, tasks);

  res.json({ message: 'تم حذف المهمة', task: removed });
});

/* المسار الرئيسي */
app.get('/', (req, res) => {
  res.send('مرحباً! لقد سجلت الدخول بنجاح، ويمكنك الوصول لباقي الصفحات الآن.');
});

/* بدء الخادم على المنفذ (PORT) من البيئة أو 3003 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
