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
    : 'Due: No due date';

  document.getElementById('studyTaskNotes').innerHTML = currentTask.notes
    ? escapeHtml(currentTask.notes).replace(/\n/g, '<br>')
    : 'No task instructions available.';
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

async function askStudyTutor(questionText) {
  const statusEl = document.getElementById('studyTutorStatus');
  const replyEl = document.getElementById('studyTutorReply');
  const button = document.getElementById('studyTutorButton');

  if (!currentTask) {
    alert('No task loaded for tutoring.');
    return;
  }

  if (statusEl) statusEl.textContent = 'AI Tutor is thinking...';
  if (replyEl) {
    replyEl.style.display = 'none';
    replyEl.innerHTML = '';
  }
  if (button) button.disabled = true;

  try {
    const response = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: currentTask.subject || '',
        title: currentTask.title || '',
        notes: currentTask.notes || '',
        dueDate: currentTask.dueDate || '',
        question: questionText || 'Explain this homework and help me get started.'
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
    if (button) button.disabled = false;
  }
}

async function handleTutorSubmit(event) {
  event.preventDefault();
  const question = document.getElementById('studyTutorQuestion').value.trim();
  await askStudyTutor(question);
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
  const tutorForm = document.getElementById('studyTutorForm');

  if (startButton) startButton.addEventListener('click', startTimer);
  if (pauseButton) pauseButton.addEventListener('click', pauseTimer);
  if (resetButton) resetButton.addEventListener('click', resetTimer);
  if (reflectionForm) reflectionForm.addEventListener('submit', handleReflectionSubmit);
  if (tutorForm) tutorForm.addEventListener('submit', handleTutorSubmit);
});