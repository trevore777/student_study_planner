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

function taskCard(task) {
  const overdueBadge = isOverdue(task)
    ? '<span class="badge badge-danger">Overdue</span>'
    : '';

  const doneBadge = task.status === 'done'
    ? '<span class="badge badge-success">Done</span>'
    : '<span class="badge">To do</span>';

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
  const tasks = sortTasks(await getAllTasks());

  const totalTasks = document.getElementById('totalTasks');
  const dueTodayCount = document.getElementById('dueTodayCount');
  const overdueCount = document.getElementById('overdueCount');
  const doneCount = document.getElementById('doneCount');

  const dueTodayList = document.getElementById('dueTodayList');
  const overdueList = document.getElementById('overdueList');
  const allTasksList = document.getElementById('allTasksList');

  const dueTodayTasks = tasks.filter(isDueToday);
  const overdueTasks = tasks.filter(isOverdue);
  const doneTasks = tasks.filter((task) => task.status === 'done');

  totalTasks.textContent = tasks.length;
  dueTodayCount.textContent = dueTodayTasks.length;
  overdueCount.textContent = overdueTasks.length;
  doneCount.textContent = doneTasks.length;

  dueTodayList.innerHTML = dueTodayTasks.length
    ? dueTodayTasks.map(taskCard).join('')
    : '<p>No tasks due today.</p>';

  overdueList.innerHTML = overdueTasks.length
    ? overdueTasks.map(taskCard).join('')
    : '<p>No overdue tasks.</p>';

  allTasksList.innerHTML = tasks.length
    ? tasks.map(taskCard).join('')
    : '<p>No homework added yet.</p>';
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
  const pageBody = document.body;

  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskFormSubmit);
  }

  pageBody.addEventListener('click', handleTaskActions);

  await renderDashboard();
});