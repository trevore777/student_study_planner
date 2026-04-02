const DB_NAME = 'studytrack_db';
const DB_VERSION = 3;

const TASK_STORE = 'tasks';
const SUBJECT_STORE = 'subjects';
const EVIDENCE_STORE = 'evidence';

const DEFAULT_SUBJECTS = [
  'English',
  'Maths',
  'Science',
  'Humanities',
  'Digital Technologies',
  'Health'
];

function openStudyTrackDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(TASK_STORE)) {
        const taskStore = db.createObjectStore(TASK_STORE, { keyPath: 'id' });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        taskStore.createIndex('status', 'status', { unique: false });
        taskStore.createIndex('subject', 'subject', { unique: false });
      }

      let subjectStore;
      if (!db.objectStoreNames.contains(SUBJECT_STORE)) {
        subjectStore = db.createObjectStore(SUBJECT_STORE, { keyPath: 'id' });
        subjectStore.createIndex('name', 'name', { unique: true });
        subjectStore.createIndex('active', 'active', { unique: false });
      } else {
        subjectStore = event.target.transaction.objectStore(SUBJECT_STORE);
      }

      if (!db.objectStoreNames.contains(EVIDENCE_STORE)) {
        const evidenceStore = db.createObjectStore(EVIDENCE_STORE, { keyPath: 'id' });
        evidenceStore.createIndex('taskId', 'taskId', { unique: false });
        evidenceStore.createIndex('createdAt', 'createdAt', { unique: false });
        evidenceStore.createIndex('type', 'type', { unique: false });
      }

      const subjectCountRequest = subjectStore.count();
      subjectCountRequest.onsuccess = () => {
        if (subjectCountRequest.result === 0) {
          DEFAULT_SUBJECTS.forEach((name) => {
            subjectStore.add({
              id: createSlugId(name),
              name,
              active: true,
              createdAt: new Date().toISOString()
            });
          });
        }
      };
    };
  });
}

function createSlugId(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

async function getAllSubjects() {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUBJECT_STORE, 'readonly');
    const store = tx.objectStore(SUBJECT_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const subjects = (request.result || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      resolve(subjects);
    };
    request.onerror = () => reject(request.error);
  });
}

async function addSubject(subject) {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUBJECT_STORE, 'readwrite');
    const store = tx.objectStore(SUBJECT_STORE);
    const request = store.add(subject);

    request.onsuccess = () => resolve(subject);
    request.onerror = () => reject(request.error);
  });
}

async function updateSubject(subject) {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUBJECT_STORE, 'readwrite');
    const store = tx.objectStore(SUBJECT_STORE);
    const request = store.put(subject);

    request.onsuccess = () => resolve(subject);
    request.onerror = () => reject(request.error);
  });
}

async function deleteSubject(id) {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUBJECT_STORE, 'readwrite');
    const store = tx.objectStore(SUBJECT_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getAllEvidence() {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(EVIDENCE_STORE, 'readonly');
    const store = tx.objectStore(EVIDENCE_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const evidence = (request.result || []).sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );
      resolve(evidence);
    };
    request.onerror = () => reject(request.error);
  });
}

async function addEvidence(item) {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(EVIDENCE_STORE, 'readwrite');
    const store = tx.objectStore(EVIDENCE_STORE);
    const request = store.add(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

async function deleteEvidence(id) {
  const db = await openStudyTrackDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(EVIDENCE_STORE, 'readwrite');
    const store = tx.objectStore(EVIDENCE_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}