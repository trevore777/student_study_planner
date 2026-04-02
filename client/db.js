const DB_NAME = 'studytrack_db';
const DB_VERSION = 1;
const TASK_STORE = 'tasks';

function openStudyTrackDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(TASK_STORE)) {
        const store = db.createObjectStore(TASK_STORE, { keyPath: 'id' });
        store.createIndex('dueDate', 'dueDate', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('subject', 'subject', { unique: false });
      }
    };
  });
}

async function getAllTasks() {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_STORE, 'readonly');
    const store = tx.objectStore(TASK_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function addTask(task) {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_STORE, 'readwrite');
    const store = tx.objectStore(TASK_STORE);
    const request = store.add(task);

    request.onsuccess = () => resolve(task);
    request.onerror = () => reject(request.error);
  });
}

async function updateTask(task) {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_STORE, 'readwrite');
    const store = tx.objectStore(TASK_STORE);
    const request = store.put(task);

    request.onsuccess = () => resolve(task);
    request.onerror = () => reject(request.error);
  });
}

async function deleteTask(id) {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_STORE, 'readwrite');
    const store = tx.objectStore(TASK_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}