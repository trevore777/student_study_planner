let timer = 20 * 60;
let interval = null;
let currentTask = null;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateDisplay() {
  document.getElementById('timerDisplay').textContent = formatTime(timer);
}

function startTimer() {
  if (interval) return;

  interval = setInterval(() => {
    timer--;
    updateDisplay();

    if (timer <= 0) {
      clearInterval(interval);
      interval = null;
      alert('Time complete. Add your reflection.');
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(interval);
  interval = null;
}

function resetTimer() {
  pauseTimer();
  timer = 20 * 60;
  updateDisplay();
}

function getTaskIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('taskId');
}

async function loadTask() {
  const taskId = getTaskIdFromURL();
  if (!taskId) return;

  const tasks = await getAllTasks();
  currentTask = tasks.find(t => t.id === taskId);

  if (!currentTask) return;

  document.getElementById('studyTaskTitle').textContent = currentTask.title;
  document.getElementById('studyTaskSubject').textContent = currentTask.subject;
}

async function handleReflectionSubmit(event) {
  event.preventDefault();

  const text = document.getElementById('studyReflection').value;

  if (!currentTask) return;

  const evidence = {
    id: `evidence-${Date.now()}`,
    taskId: currentTask.id,
    type: 'study-session',
    text,
    createdAt: new Date().toISOString()
  };

  await addEvidence(evidence);

  alert('Great work. Evidence saved.');

  window.location.href = '/dashboard';
}

document.addEventListener('DOMContentLoaded', async () => {
  updateDisplay();
  await loadTask();

  document.getElementById('startTimer').addEventListener('click', startTimer);
  document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
  document.getElementById('resetTimer').addEventListener('click', resetTimer);

  document.getElementById('studyReflectionForm')
    .addEventListener('submit', handleReflectionSubmit);
});