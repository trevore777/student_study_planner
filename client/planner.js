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

function toISODate(date) {
  return date.toISOString().split('T')[0];
}

function todayISO() {
  return toISODate(new Date());
}

function isOverdue(task) {
  return task?.status !== 'done' && task?.dueDate && task.dueDate < todayISO();
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

function getWeekDatesMap(weekOffset = 0) {
  const monday = getStartOfCurrentWeekMonday();
  monday.setDate(monday.getDate() + weekOffset * 7);

  const map = {};

  WEEK_DAYS.forEach((dayName, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    date.setHours(0, 0, 0, 0);

    map[dayName] = date;
  });

  return map;
}

function getDateForDay(day, weekOffset = 0) {
  const map = getWeekDatesMap(Number(weekOffset) || 0);
  return map[day];
}

function renderPlannerDayDates() {
  [0, 1].forEach((weekOffset) => {
    WEEK_DAYS.forEach((dayName) => {
      const el = document.querySelector(`[data-day-date="${dayName}"][data-week-offset="${weekOffset}"]`);
      if (!el) return;

      el.textContent = formatDateAU(getDateForDay(dayName, weekOffset));
    });
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
  const overdueBadge = isOverdue(task)
    ? '<span class="badge badge-danger">Overdue</span>'
    : '';

  return `
    <article class="task-card ${isSelected ? 'task-card-selected' : ''}">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p class="muted">${escapeHtml(task.subject)}</p>
        </div>
        <div class="task-badges">
          ${overdueBadge}
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

function getStrategyNote(studyType, dayNumber, totalDays) {
  if (studyType === 'memorisation') {
    const steps = [
      'Read and understand',
      'Cover and recall',
      'Practise from memory',
      'Check and fix mistakes',
      'Final recall test'
    ];
    return steps[Math.min(dayNumber - 1, steps.length - 1)];
  }

  if (studyType === 'assignment') {
    const steps = [
      'Understand the task',
      'Research and gather notes',
      'Draft the main sections',
      'Improve and edit',
      'Final check and submit'
    ];
    return steps[Math.min(dayNumber - 1, steps.length - 1)];
  }

  if (studyType === 'exam-prep') {
    return `Revision block ${dayNumber} of ${totalDays}: practise, check mistakes, and revise weak areas.`;
  }

  if (studyType === 'reading') {
    return `Reading block ${dayNumber} of ${totalDays}: read, summarise, and note key ideas.`;
  }

  if (studyType === 'revision') {
    return `Revision block ${dayNumber} of ${totalDays}: review notes and answer practice questions.`;
  }

  return `Study block ${dayNumber} of ${totalDays}.`;
}

function plannerItemCard(item, task) {
  const weekLabel = item.weekOffset === 1 ? 'Next week' : 'This week';
  const strategy = item.studyType ? `<span class="badge">${escapeHtml(item.studyType)}</span>` : '';

  return `
    <article class="planner-item-card">
      <div class="planner-item-top">
        <strong>${escapeHtml(item.timeBlock || 'Study block')}</strong>
        <div class="actions">
          <button class="button small primary" data-action="start-study" data-task-id="${item.taskId}" type="button">
            Start
          </button>
          <button class="button small danger" data-action="delete-planner-item" data-id="${item.id}" type="button">
            Delete
          </button>
        </div>
      </div>

      <p><strong>${escapeHtml(task ? task.title : 'Unknown task')}</strong></p>
      <p class="muted">${escapeHtml(task ? task.subject : 'No subject')} — ${weekLabel}</p>
      ${strategy}
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

  [0, 1].forEach((weekOffset) => {
    WEEK_DAYS.forEach((day) => {
      const container = document.querySelector(`.planner-day-list[data-day="${day}"][data-week-offset="${weekOffset}"]`);
      if (!container) return;

      const dayItems = items.filter((item) => {
        const itemWeekOffset = Number(item.weekOffset || 0);
        return item.day === day && itemWeekOffset === weekOffset;
      });

      container.innerHTML = dayItems.length
        ? dayItems.map((item) => plannerItemCard(item, taskMap[item.taskId])).join('')
        : '<p>No study blocks planned.</p>';
    });
  });
}

async function quickPlanToDay(day, weekOffset = 0) {
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

  const plannedDate = getDateForDay(day, Number(weekOffset) || 0);
  const planningMessage = getPlanningDateMessage(selectedTask, plannedDate);

  if (planningMessage?.type === 'blocked') {
    alert(planningMessage.message);
    return;
  }

  if (planningMessage?.type === 'warning') {
    const proceed = window.confirm(`${planningMessage.message}\n\nDo you still want to plan it for this day?`);
    if (!proceed) return;
  }

  const studyType = document.getElementById('studyType')?.value || 'homework';
  const dailyMinutes = Number(document.getElementById('dailyMinutes')?.value) || selectedTask.estimatedMinutes || 20;

  const item = {
    id: generatePlannerId(),
    taskId: selectedTask.id,
    day,
    weekOffset: Number(weekOffset) || 0,
    plannedDate: toISODate(plannedDate),
    timeBlock: `${dailyMinutes} min ${studyType}`,
    studyType,
    notes: getStrategyNote(studyType, 1, 1),
    createdAt: new Date().toISOString()
  };

  await addPlannerItem(item);
  await renderPlannerWeek();
}

function getDatesBetween(startDateValue, endDateValue) {
  const start = new Date(startDateValue);
  const end = new Date(endDateValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) return [];

  const dates = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function getPlannerPositionForDate(date) {
  const monday = getStartOfCurrentWeekMonday();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - monday.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0 || diffDays > 13) {
    return null;
  }

  const weekOffset = diffDays >= 7 ? 1 : 0;
  const dayIndex = diffDays % 7;

  return {
    weekOffset,
    day: WEEK_DAYS[dayIndex]
  };
}

async function addMultiDayTask() {
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

  const startDate = document.getElementById('multiStartDate')?.value;
  const endDate = document.getElementById('multiEndDate')?.value;
  const studyType = document.getElementById('studyType')?.value || 'revision';
  const dailyMinutes = Number(document.getElementById('dailyMinutes')?.value) || 20;

  const dates = getDatesBetween(startDate, endDate);

  if (!dates.length) {
    alert('Choose a valid start and end date.');
    return;
  }

  const validDates = dates
    .map((date) => ({
      date,
      position: getPlannerPositionForDate(date)
    }))
    .filter((entry) => entry.position);

  if (!validDates.length) {
    alert('The selected dates must be inside this week or next week.');
    return;
  }

  for (let index = 0; index < validDates.length; index += 1) {
    const entry = validDates[index];
    const planningMessage = getPlanningDateMessage(selectedTask, entry.date);

    if (planningMessage?.type === 'blocked') {
      continue;
    }

    await addPlannerItem({
      id: generatePlannerId(),
      taskId: selectedTask.id,
      day: entry.position.day,
      weekOffset: entry.position.weekOffset,
      plannedDate: toISODate(entry.date),
      timeBlock: `${dailyMinutes} min ${studyType}`,
      studyType,
      notes: getStrategyNote(studyType, index + 1, validDates.length),
      createdAt: new Date().toISOString()
    });
  }

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
    await quickPlanToDay(button.dataset.day, button.dataset.weekOffset || 0);
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
  const weekOffset = card.dataset.weekOffset || 0;

  await quickPlanToDay(day, weekOffset);
}

function handleScheduleTypeChange() {
  const scheduleType = document.getElementById('scheduleType')?.value;
  const multiBox = document.getElementById('multiDayOptions');

  if (!multiBox) return;

  multiBox.style.display = scheduleType === 'multi' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  document.body.addEventListener('click', handlePlannerActions);

  const thisWeekGrid = document.getElementById('plannerWeekGridThis');
  const nextWeekGrid = document.getElementById('plannerWeekGridNext');

  if (thisWeekGrid) {
    thisWeekGrid.addEventListener('click', handleDayCardClick);
  }

  if (nextWeekGrid) {
    nextWeekGrid.addEventListener('click', handleDayCardClick);
  }

  const scheduleType = document.getElementById('scheduleType');
  if (scheduleType) {
    scheduleType.addEventListener('change', handleScheduleTypeChange);
  }

  const addMultiButton = document.getElementById('addMultiDayTask');
  if (addMultiButton) {
    addMultiButton.addEventListener('click', addMultiDayTask);
  }

  renderPlannerDayDates();
  handleScheduleTypeChange();

  await renderPlannerTaskList();
  await renderSelectedTaskPanel();
  await renderPlannerWeek();
});