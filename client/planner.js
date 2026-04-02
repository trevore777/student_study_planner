const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

function generatePlannerId() {
  return `planner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function taskSort(a, b) {
  if (a.status === 'done' && b.status !== 'done') return 1;
  if (a.status !== 'done' && b.status === 'done') return -1;
  return String(a.dueDate).localeCompare(String(b.dueDate));
}

async function populatePlannerTaskDropdown() {
  const select = document.getElementById('plannedTaskId');
  if (!select) return;

  const tasks = (await getAllTasks())
    .filter((task) => task.status !== 'done')
    .sort(taskSort);

  select.innerHTML = '<option value="">Select a task</option>';

  tasks.forEach((task) => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = `${task.subject} — ${task.title} (Due ${task.dueDate})`;
    select.appendChild(option);
  });
}

function taskCard(task) {
  return `
    <article class="task-card">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p class="muted">${escapeHtml(task.subject)}</p>
        </div>
        <div class="task-badges">
          <span class="badge">Due ${escapeHtml(task.dueDate)}</span>
        </div>
      </div>

      <p class="muted"><strong>Estimated:</strong> ${escapeHtml(task.estimatedMinutes)} mins</p>
      ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}
    </article>
  `;
}

async function renderPlannerTaskList() {
  const taskList = document.getElementById('plannerTaskList');
  if (!taskList) return;

  const tasks = (await getAllTasks())
    .filter((task) => task.status !== 'done')
    .sort(taskSort);

  taskList.innerHTML = tasks.length
    ? tasks.map(taskCard).join('')
    : '<p>No open tasks to plan yet.</p>';
}

function buildTaskMap(tasks) {
  const map = {};
  tasks.forEach((task) => {
    map[task.id] = task;
  });
  return map;
}

function plannerItemCard(item, task) {
  return `
    <article class="planner-item-card">
      <div class="planner-item-top">
        <strong>${escapeHtml(item.timeBlock)}</strong>
        <div class="actions">
          <button
            class="button small primary"
            data-action="start-study"
            data-task-id="${item.taskId}"
          >
            Start
          </button>
          <button
            class="button small danger"
            data-action="delete-planner-item"
            data-id="${item.id}"
          >
            Delete
          </button>
        </div>
      </div>

      <p><strong>${escapeHtml(task ? task.title : 'Unknown task')}</strong></p>
      <p class="muted">${escapeHtml(task ? task.subject : 'No subject')}</p>
      ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
    </article>
  `;
}

async function renderPlannerWeek() {
  const [items, tasks] = await Promise.all([getAllPlannerItems(), getAllTasks()]);
  const taskMap = buildTaskMap(tasks);

  WEEK_DAYS.forEach((day) => {
    const container = document.querySelector(`.planner-day-list[data-day="${day}"]`);
    if (!container) return;

    const dayItems = items.filter((item) => item.day === day);

    container.innerHTML = dayItems.length
      ? dayItems.map((item) => plannerItemCard(item, taskMap[item.taskId])).join('')
      : '<p>No study blocks planned.</p>';
  });
}

async function handlePlannerFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const item = {
    id: generatePlannerId(),
    taskId: formData.get('plannedTaskId'),
    day: formData.get('plannedDay'),
    timeBlock: formData.get('plannedTime'),
    notes: formData.get('plannerNotes'),
    createdAt: new Date().toISOString()
  };

  await addPlannerItem(item);
  form.reset();
  await populatePlannerTaskDropdown();
  await renderPlannerTaskList();
  await renderPlannerWeek();
}

async function handlePlannerActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  if (button.dataset.action !== 'delete-planner-item') return;

  await deletePlannerItem(button.dataset.id);
  await renderPlannerWeek();
}

document.addEventListener('DOMContentLoaded', async () => {
  const plannerForm = document.getElementById('plannerForm');

  if (plannerForm) {
    plannerForm.addEventListener('submit', handlePlannerFormSubmit);
  }

  document.body.addEventListener('click', handlePlannerActions);

  if (button.dataset.action === 'start-study') {
  const taskId = button.dataset.taskId;
  window.location.href = `/study?taskId=${taskId}`;
}

  await populatePlannerTaskDropdown();
  await renderPlannerTaskList();
  await renderPlannerWeek();
});