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
    return String(a.dueDate).localeCompare(String(b.dueDate));
  });
}

function isOverdue(task) {
  return task.status !== 'done' && task.dueDate < todayISO();
}

function isDueToday(task) {
  return task.status !== 'done' && task.dueDate === todayISO();
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

function buildTaskStatusMap(plannerItems, evidenceItems) {
  const plannedMap = {};
  const evidenceMap = {};

  plannerItems.forEach(item => {
    plannedMap[item.taskId] = true;
  });

  evidenceItems.forEach(item => {
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

      <p class="muted"><strong>Due:</strong> ${escapeHtml(task.dueDate)}</p>
      <p class="muted"><strong>Estimated:</strong> ${escapeHtml(task.estimatedMinutes)} mins</p>

      ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}

      <div class="actions">
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
      ? dueTodayTasks.map(task => taskCard(task, statusMap)).join('')
      : '<p>No tasks due today.</p>';
  }

  if (overdueList) {
    overdueList.innerHTML = overdueTasks.length
      ? overdueTasks.map(task => taskCard(task, statusMap)).join('')
      : '<p>No overdue tasks.</p>';
  }

  if (allTasksList) {
    allTasksList.innerHTML = sortedTasks.length
      ? sortedTasks.map(task => taskCard(task, statusMap)).join('')
      : '<p>No homework added yet.</p>';
  }
}

async function handleTaskFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

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
  form.reset();
  document.getElementById('estimatedMinutes').value = 20;

  await populateSubjectDropdown();
  await renderDashboard();
}

async function handleTaskActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  const tasks = await getAllTasks();
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

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

  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskFormSubmit);
  }

  document.body.addEventListener('click', handleTaskActions);

  await populateSubjectDropdown();
  await renderDashboard();
});