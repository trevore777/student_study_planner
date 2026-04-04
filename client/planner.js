const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

let selectedTaskId = null;

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

function formatDateAU(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getStartOfCurrentWeekMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + diff);

  return monday;
}

function getWeekDatesMap() {
  const monday = getStartOfCurrentWeekMonday();
  const map = {};

  WEEK_DAYS.forEach((dayName, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    date.setHours(0, 0, 0, 0);
    map[dayName] = date;
  });

  return map;
}

function renderPlannerDayDates() {
  const weekDates = getWeekDatesMap();

  WEEK_DAYS.forEach((dayName) => {
    const el = document.querySelector(`[data-day-date="${dayName}"]`);
    if (!el) return;
    el.textContent = formatDateAU(weekDates[dayName]);
  });
}

function taskSort(a, b) {
  const aDue = a?.dueDate || '9999-12-31';
  const bDue = b?.dueDate || '9999-12-31';

  if (a?.status === 'done' && b?.status !== 'done') return 1;
  if (a?.status !== 'done' && b?.status === 'done') return -1;

  return String(aDue).localeCompare(String(bDue));
}

function buildTaskMap(tasks) {
  const map = {};
  tasks.forEach((task) => {
    map[task.id] = task;
  });
  return map;
}

function taskCard(task) {
  const isSelected = selectedTaskId === task.id;

  return `
    <article class="task-card ${isSelected ? 'task-card-selected' : ''}">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p class="muted">${escapeHtml(task.subject)}</p>
        </div>
        <div class="task-badges">
          <span class="badge">Due ${escapeHtml(formatDateAU(task.dueDate) || 'No due date')}</span>
        </div>
      </div>

      <p class="muted"><strong>Estimated:</strong> ${escapeHtml(task.estimatedMinutes || 20)} mins</p>
      ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}

      <div class="actions">
        <button
          class="button small primary"
          type="button"
          data-action="select-task"
          data-task-id="${task.id}"
        >
          ${isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </article>
  `;
}

function selectedTaskCard(task) {
  if (!task) {
    return 'No task selected. Tap a homework task to begin planning.';
  }

  return `
    <article class="task-card task-card-selected">
      <h3>${escapeHtml(task.title)}</h3>
      <p class="muted">${escapeHtml(task.subject)}</p>
      <p class="muted"><strong>Due:</strong> ${escapeHtml(formatDateAU(task.dueDate) || 'No due date')}</p>
      <p class="muted"><strong>Estimated:</strong> ${escapeHtml(task.estimatedMinutes || 20)} mins</p>
      ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}
    </article>
  `;
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
            type="button"
          >
            Start
          </button>
          <button
            class="button small danger"
            data-action="delete-planner-item"
            data-id="${item.id}"
            type="button"
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

function compareDatesOnly(a, b) {
  const first = new Date(a);
  const second = new Date(b);

  first.setHours(0, 0, 0, 0);
  second.setHours(0, 0, 0, 0);

  return first.getTime() - second.getTime();
}

function getPlanningDateMessage(task, plannedDate) {
  if (!task?.dueDate) return null;

  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return null;

  const comparison = compareDatesOnly(plannedDate, dueDate);

  if (comparison > 0) {
    return {
      type: 'blocked',
      message: `This needs to be done before ${formatDateAU(task.dueDate)}.`
    };
  }

  if (comparison === 0) {
    return {
      type: 'warning',
      message: `This task is due on ${formatDateAU(task.dueDate)}. Try to schedule it before then.`
    };
  }

  return null;
}

async function renderPlannerTaskList() {
  const taskList = document.getElementById('plannerTaskList');
  if (!taskList) return;

  const tasks = (await getAllTasks())
    .filter((task) => task && task.title && task.subject && task.status !== 'done')
    .sort(taskSort);

  taskList.innerHTML = tasks.length
    ? tasks.map(taskCard).join('')
    : '<p>No open tasks to plan yet. Add homework on the dashboard first.</p>';
}

async function renderSelectedTaskPanel() {
  const panel = document.getElementById('selectedTaskPanel');
  if (!panel) return;

  const tasks = await getAllTasks();
  const task = tasks.find((item) => item.id === selectedTaskId);

  panel.innerHTML = selectedTaskCard(task);
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

async function quickPlanToDay(day) {
  if (!selectedTaskId) {
    alert('Select a task first.');
    return;
  }

  const tasks = await getAllTasks();
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  if (!selectedTask) {
    alert('Selected task not found.');
    return;
  }

  const weekDates = getWeekDatesMap();
  const plannedDate = weekDates[day];
  const planningMessage = getPlanningDateMessage(selectedTask, plannedDate);

  if (planningMessage?.type === 'blocked') {
    alert(planningMessage.message);
    return;
  }

  if (planningMessage?.type === 'warning') {
    const proceed = window.confirm(`${planningMessage.message}\n\nDo you still want to plan it for this day?`);
    if (!proceed) return;
  }

  const item = {
    id: generatePlannerId(),
    taskId: selectedTask.id,
    day,
    timeBlock: 'Homework block',
    notes: '',
    createdAt: new Date().toISOString()
  };

  await addPlannerItem(item);
  await renderPlannerWeek();
}

async function handlePlannerActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;

  if (action === 'select-task') {
    selectedTaskId = button.dataset.taskId;
    await renderPlannerTaskList();
    await renderSelectedTaskPanel();
    return;
  }

  if (action === 'quick-add-day') {
    await quickPlanToDay(button.dataset.day);
    return;
  }

  if (action === 'delete-planner-item') {
    await deletePlannerItem(button.dataset.id);
    await renderPlannerWeek();
    return;
  }

  if (action === 'start-study') {
    const taskId = button.dataset.taskId;
    window.location.href = `/study?taskId=${taskId}`;
  }
}

async function handleDayCardClick(event) {
  const card = event.target.closest('[data-day-card]');
  if (!card) return;

  if (
    event.target.closest('button') ||
    event.target.closest('.planner-item-card')
  ) {
    return;
  }

  const day = card.dataset.dayCard;
  await quickPlanToDay(day);
}

document.addEventListener('DOMContentLoaded', async () => {
  document.body.addEventListener('click', handlePlannerActions);

  const plannerGrid = document.getElementById('plannerWeekGrid');
  if (plannerGrid) {
    plannerGrid.addEventListener('click', handleDayCardClick);
  }

  renderPlannerDayDates();
  await renderPlannerTaskList();
  await renderSelectedTaskPanel();
  await renderPlannerWeek();
});