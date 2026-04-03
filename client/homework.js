function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    return String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31'));
  });
}

function isOverdue(task) {
  return task.status !== 'done' && task.dueDate && task.dueDate < todayISO();
}

function isDueToday(task) {
  return task.status !== 'done' && task.dueDate === todayISO();
}

function formatStreakLabel(days) {
  return `${days} day${days === 1 ? '' : 's'}`;
}

function dateOnly(value) {
  return new Date(value).toISOString().split('T')[0];
}

function getLast7Dates() {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
}

function calculateCurrentStreak(sortedDatesDesc) {
  if (!sortedDatesDesc.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const uniqueDates = [...new Set(sortedDatesDesc)];
  let checkDate = new Date(today);

  for (let i = 0; i < uniqueDates.length; i += 1) {
    const expected = checkDate.toISOString().split('T')[0];

    if (uniqueDates[i] === expected) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayISO = yesterday.toISOString().split('T')[0];

      if (uniqueDates[i] === yesterdayISO) {
        checkDate = new Date(yesterday);
        streak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}

function calculateBestStreak(sortedDatesAsc) {
  if (!sortedDatesAsc.length) return 0;

  const uniqueDates = [...new Set(sortedDatesAsc)];
  let best = 1;
  let current = 1;

  for (let i = 1; i < uniqueDates.length; i += 1) {
    const previous = new Date(uniqueDates[i - 1]);
    const currentDate = new Date(uniqueDates[i]);

    previous.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((currentDate - previous) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }

  return best;
}

async function populateSubjectDropdown() {
  const subjectSelect = document.getElementById('subject');
  if (!subjectSelect) return;

  const subjects = await getAllSubjects();

  subjectSelect.innerHTML = '<option value="">Select subject</option>';

  subjects.forEach((subject) => {
    const option = document.createElement('option');
    option.value = subject.name;
    option.textContent = subject.name;
    subjectSelect.appendChild(option);
  });
}

async function populateTutorTaskDropdown() {
  const tutorTaskSelect = document.getElementById('tutorTaskId');
  if (!tutorTaskSelect) return;

  const tasks = sortTasks(await getAllTasks());

  tutorTaskSelect.innerHTML = '<option value="">Choose a task</option>';

  tasks.forEach((task) => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = `${task.subject} — ${task.title}`;
    tutorTaskSelect.appendChild(option);
  });
}

function buildTaskStatusMap(plannerItems, evidenceItems) {
  const plannedMap = {};
  const evidenceMap = {};

  plannerItems.forEach((item) => {
    plannedMap[item.taskId] = true;
  });

  evidenceItems.forEach((item) => {
    evidenceMap[item.taskId] = true;
  });

  return { plannedMap, evidenceMap };
}

function taskCard(task, statusMap) {
  const { plannedMap, evidenceMap } = statusMap;

  const overdueBadge = isOverdue(task)
    ? '<span class="badge badge-danger">Overdue</span>'
    : '';

  const doneBadge = task.status === 'done'
    ? '<span class="badge badge-success">Done</span>'
    : '<span class="badge">To do</span>';

  const plannedBadge = plannedMap[task.id]
    ? '<span class="badge">Planned</span>'
    : '';

  const evidenceBadge = evidenceMap[task.id]
    ? '<span class="badge badge-success">Evidence</span>'
    : '';

  return `
    <article class="task-card">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p class="muted">${escapeHtml(task.subject)}</p>
        </div>
        <div class="task-badges">
          ${overdueBadge}
          ${doneBadge}
          ${plannedBadge}
          ${evidenceBadge}
        </div>
      </div>

      <p class="muted"><strong>Due:</strong> ${escapeHtml(task.dueDate || 'No due date')}</p>
      <p class="muted"><strong>Estimated:</strong> ${escapeHtml(task.estimatedMinutes || 20)} mins</p>
      ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}

      <div class="actions">
        <button class="button small" data-action="edit" data-id="${task.id}">Edit</button>
        <button class="button small" data-action="tutor-task" data-id="${task.id}">Ask AI Tutor</button>
        ${
          task.status !== 'done'
            ? `<button class="button small primary" data-action="done" data-id="${task.id}">Mark done</button>`
            : `<button class="button small" data-action="undo" data-id="${task.id}">Mark not done</button>`
        }
        <button class="button small danger" data-action="delete" data-id="${task.id}">Delete</button>
      </div>
    </article>
  `;
}

function teacherHomeworkCard(item) {
  return `
    <article class="task-card">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="muted">${escapeHtml(item.class_name || item.className || '')} · ${escapeHtml(item.subject)}</p>
        </div>
        <div class="task-badges">
          <span class="badge">Due ${escapeHtml(item.due_date || item.dueDate || 'No due date')}</span>
        </div>
      </div>

      <p>${escapeHtml(item.description)}</p>
      <p class="muted"><strong>Estimated:</strong> ${escapeHtml(item.estimated_minutes || item.estimatedMinutes || 20)} mins</p>

      <div class="actions">
        <button
          class="button small primary"
          data-action="import-teacher-homework"
          data-id="${item.id}"
          data-subject="${escapeHtml(item.subject)}"
          data-title="${escapeHtml(item.title)}"
          data-description="${escapeHtml(item.description)}"
          data-due-date="${escapeHtml(item.due_date || item.dueDate || '')}"
          data-estimated-minutes="${escapeHtml(item.estimated_minutes || item.estimatedMinutes || 20)}"
        >
          Add to my planner
        </button>
      </div>
    </article>
  `;
}

function renderConsistency(evidenceItems) {
  const currentStreakEl = document.getElementById('currentStreak');
  const bestStreakEl = document.getElementById('bestStreak');
  const sessionsTodayEl = document.getElementById('sessionsToday');
  const evidenceThisWeekEl = document.getElementById('evidenceThisWeek');

  if (!currentStreakEl || !bestStreakEl || !sessionsTodayEl || !evidenceThisWeekEl) return;

  const studyEvidence = evidenceItems.filter((item) => item.type === 'study-session');
  const evidenceDates = studyEvidence.map((item) => dateOnly(item.createdAt));

  const sortedDatesDesc = [...evidenceDates].sort((a, b) => b.localeCompare(a));
  const sortedDatesAsc = [...evidenceDates].sort((a, b) => a.localeCompare(b));

  const currentStreak = calculateCurrentStreak(sortedDatesDesc);
  const bestStreak = evidenceDates.length ? calculateBestStreak(sortedDatesAsc) : 0;
  const todayCount = studyEvidence.filter((item) => dateOnly(item.createdAt) === todayISO()).length;

  const last7Dates = new Set(getLast7Dates());
  const thisWeekCount = evidenceItems.filter((item) => last7Dates.has(dateOnly(item.createdAt))).length;

  currentStreakEl.textContent = formatStreakLabel(currentStreak);
  bestStreakEl.textContent = formatStreakLabel(bestStreak);
  sessionsTodayEl.textContent = String(todayCount);
  evidenceThisWeekEl.textContent = String(thisWeekCount);
}

async function renderTeacherHomework() {
  const container = document.getElementById('teacherHomeworkList');
  if (!container) return;

  try {
    const response = await fetch('/api/teacher-homework');
    const items = await response.json();

    container.innerHTML = items.length
      ? items.map(teacherHomeworkCard).join('')
      : '<p>No teacher-posted homework yet.</p>';
  } catch (error) {
    container.innerHTML = '<p>Unable to load teacher-posted homework.</p>';
  }
}

function fillTaskForm(task) {
  document.getElementById('taskId').value = task.id;
  document.getElementById('subject').value = task.subject || '';
  document.getElementById('title').value = task.title || '';
  document.getElementById('dueDate').value = task.dueDate || '';
  document.getElementById('estimatedMinutes').value = task.estimatedMinutes || 20;
  document.getElementById('notes').value = task.notes || '';

  document.getElementById('saveTaskButton').textContent = 'Update homework';
  document.getElementById('cancelEditButton').style.display = 'inline-block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetTaskForm() {
  document.getElementById('taskForm').reset();
  document.getElementById('taskId').value = '';
  document.getElementById('estimatedMinutes').value = 20;
  document.getElementById('saveTaskButton').textContent = 'Save homework';
  document.getElementById('cancelEditButton').style.display = 'none';
}

async function askTutorForTask(task, questionText = '') {
  const statusEl = document.getElementById('tutorStatus');
  const replyEl = document.getElementById('tutorReply');
  const tutorTaskSelect = document.getElementById('tutorTaskId');
  const tutorQuestion = document.getElementById('tutorQuestion');
  const askTutorButton = document.getElementById('askTutorButton');

  if (tutorTaskSelect) {
    tutorTaskSelect.value = task.id;
  }

  if (statusEl) statusEl.textContent = 'AI Tutor is thinking...';
  if (replyEl) {
    replyEl.style.display = 'none';
    replyEl.innerHTML = '';
  }
  if (askTutorButton) askTutorButton.disabled = true;

  try {
    const response = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: task.subject || '',
        title: task.title || '',
        notes: task.notes || '',
        dueDate: task.dueDate || '',
        question: questionText || (tutorQuestion ? tutorQuestion.value.trim() : '')
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Tutor request failed.');
    }

    if (statusEl) statusEl.textContent = 'AI Tutor reply ready.';
    if (replyEl) {
      replyEl.style.display = 'block';
      replyEl.innerHTML = `<h3>AI Tutor</h3><p>${escapeHtml(data.reply).replace(/\n/g, '<br>')}</p>`;
    }
  } catch (error) {
    if (statusEl) statusEl.textContent = '';
    if (replyEl) {
      replyEl.style.display = 'block';
      replyEl.innerHTML = `<p>${escapeHtml(error.message || 'Unable to get tutor help.')}</p>`;
    }
  } finally {
    if (askTutorButton) askTutorButton.disabled = false;
  }
}

async function renderDashboard() {
  const [tasks, plannerItems, evidenceItems] = await Promise.all([
    getAllTasks(),
    getAllPlannerItems(),
    getAllEvidence()
  ]);

  const sortedTasks = sortTasks(tasks);
  const statusMap = buildTaskStatusMap(plannerItems, evidenceItems);

  const totalTasks = document.getElementById('totalTasks');
  const dueTodayCount = document.getElementById('dueTodayCount');
  const overdueCount = document.getElementById('overdueCount');
  const doneCount = document.getElementById('doneCount');

  const dueTodayList = document.getElementById('dueTodayList');
  const overdueList = document.getElementById('overdueList');
  const allTasksList = document.getElementById('allTasksList');

  const dueTodayTasks = sortedTasks.filter(isDueToday);
  const overdueTasks = sortedTasks.filter(isOverdue);
  const doneTasks = sortedTasks.filter((task) => task.status === 'done');

  if (totalTasks) totalTasks.textContent = sortedTasks.length;
  if (dueTodayCount) dueTodayCount.textContent = dueTodayTasks.length;
  if (overdueCount) overdueCount.textContent = overdueTasks.length;
  if (doneCount) doneCount.textContent = doneTasks.length;

  if (dueTodayList) {
    dueTodayList.innerHTML = dueTodayTasks.length
      ? dueTodayTasks.map((task) => taskCard(task, statusMap)).join('')
      : '<p>No tasks due today.</p>';
  }

  if (overdueList) {
    overdueList.innerHTML = overdueTasks.length
      ? overdueTasks.map((task) => taskCard(task, statusMap)).join('')
      : '<p>No overdue tasks.</p>';
  }

  if (allTasksList) {
    allTasksList.innerHTML = sortedTasks.length
      ? sortedTasks.map((task) => taskCard(task, statusMap)).join('')
      : '<p>No homework added yet.</p>';
  }

  renderConsistency(evidenceItems);
  await renderTeacherHomework();
  await populateTutorTaskDropdown();
}

async function handleTaskFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const editingId = formData.get('taskId');

  if (editingId) {
    const tasks = await getAllTasks();
    const existingTask = tasks.find((item) => item.id === editingId);

    if (!existingTask) {
      alert('Task not found.');
      return;
    }

    existingTask.subject = formData.get('subject');
    existingTask.title = formData.get('title');
    existingTask.dueDate = formData.get('dueDate');
    existingTask.estimatedMinutes = Number(formData.get('estimatedMinutes')) || 20;
    existingTask.notes = formData.get('notes');

    await updateTask(existingTask);
  } else {
    const task = {
      id: generateId(),
      subject: formData.get('subject'),
      title: formData.get('title'),
      dueDate: formData.get('dueDate'),
      estimatedMinutes: Number(formData.get('estimatedMinutes')) || 20,
      notes: formData.get('notes'),
      status: 'todo',
      createdAt: new Date().toISOString()
    };

    await addTask(task);
  }

  resetTaskForm();
  await populateSubjectDropdown();
  await renderDashboard();
}

async function importTeacherHomework(button) {
  const task = {
    id: generateId(),
    subject: button.dataset.subject,
    title: button.dataset.title,
    dueDate: button.dataset.dueDate || '',
    estimatedMinutes: Number(button.dataset.estimatedMinutes) || 20,
    notes: button.dataset.description,
    status: 'todo',
    source: 'teacher',
    sourceId: button.dataset.id,
    createdAt: new Date().toISOString()
  };

  const existingTasks = await getAllTasks();
  const alreadyImported = existingTasks.some(
    (item) => item.source === 'teacher' && item.sourceId === task.sourceId
  );

  if (alreadyImported) {
    alert('This teacher-posted homework is already in your planner.');
    return;
  }

  await addTask(task);
  await renderDashboard();
}

async function handleTutorFormSubmit(event) {
  event.preventDefault();

  const selectedTaskId = document.getElementById('tutorTaskId').value;
  if (!selectedTaskId) {
    alert('Choose a task first.');
    return;
  }

  const tasks = await getAllTasks();
  const task = tasks.find((item) => item.id === selectedTaskId);

  if (!task) {
    alert('Task not found.');
    return;
  }

  const questionText = document.getElementById('tutorQuestion').value.trim();
  await askTutorForTask(task, questionText);
}

async function handleTaskActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === 'import-teacher-homework') {
    await importTeacherHomework(button);
    return;
  }

  const tasks = await getAllTasks();
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  if (action === 'edit') {
    fillTaskForm(task);
    return;
  }

  if (action === 'tutor-task') {
    await askTutorForTask(task, 'Explain this homework and help me get started.');
    return;
  }

  if (action === 'done') {
    task.status = 'done';
    await updateTask(task);
  }

  if (action === 'undo') {
    task.status = 'todo';
    await updateTask(task);
  }

  if (action === 'delete') {
    await deleteTask(id);
  }

  await renderDashboard();
}

document.addEventListener('DOMContentLoaded', async () => {
  const taskForm = document.getElementById('taskForm');
  const cancelEditButton = document.getElementById('cancelEditButton');
  const tutorForm = document.getElementById('tutorForm');

  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskFormSubmit);
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener('click', resetTaskForm);
  }

  if (tutorForm) {
    tutorForm.addEventListener('submit', handleTutorFormSubmit);
  }

  document.body.addEventListener('click', handleTaskActions);

  await populateSubjectDropdown();
  await renderDashboard();
});