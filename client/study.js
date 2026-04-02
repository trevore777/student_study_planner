let timerSeconds = 20 * 60;
let timerInterval = null;
let currentTask = null;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(timerSeconds);
  }
}

function getTaskIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('taskId');
}

async function loadCurrentTask() {
  const taskId = getTaskIdFromURL();
  if (!taskId) return;

  const tasks = await getAllTasks();
  currentTask = tasks.find((task) => task.id === taskId);

  if (!currentTask) {
    document.getElementById('studyTaskTitle').textContent = 'Task not found';
    return;
  }

  document.getElementById('studyTaskTitle').textContent = currentTask.title;
  document.getElementById('studyTaskSubject').textContent = currentTask.subject || '';
  document.getElementById('studyTaskDue').textContent = currentTask.dueDate
    ? `Due: ${currentTask.dueDate}`
    : '';
}

function startTimer() {
  if (timerInterval) return;

  timerInterval = window.setInterval(() => {
    timerSeconds -= 1;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      pauseTimer();
      timerSeconds = 0;
      updateTimerDisplay();
      alert('Study block complete. Add your reflection below.');
    }
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 20 * 60;
  updateTimerDisplay();
}

async function handleReflectionSubmit(event) {
  event.preventDefault();

  if (!currentTask) {
    alert('No task loaded for this study session.');
    return;
  }

  const reflection = document.getElementById('studyReflection').value.trim();
  const markTaskDone = document.getElementById('markTaskDone').checked;

  if (!reflection) {
    alert('Please add a short reflection before saving.');
    return;
  }

  const evidence = {
    id: `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    taskId: currentTask.id,
    type: 'study-session',
    text: reflection,
    createdAt: new Date().toISOString()
  };

  await addEvidence(evidence);

  if (markTaskDone) {
    currentTask.status = 'done';
    await updateTask(currentTask);
  }

  alert('Study session saved.');
  window.location.href = '/dashboard';
}

document.addEventListener('DOMContentLoaded', async () => {
  updateTimerDisplay();
  await loadCurrentTask();

  const startButton = document.getElementById('startTimer');
  const pauseButton = document.getElementById('pauseTimer');
  const resetButton = document.getElementById('resetTimer');
  const reflectionForm = document.getElementById('studyReflectionForm');

  if (startButton) startButton.addEventListener('click', startTimer);
  if (pauseButton) pauseButton.addEventListener('click', pauseTimer);
  if (resetButton) resetButton.addEventListener('click', resetTimer);
  if (reflectionForm) reflectionForm.addEventListener('submit', handleReflectionSubmit);
});