function generateEvidenceId() {
  return `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function populateEvidenceTaskDropdown() {
  const taskSelect = document.getElementById('taskId');
  if (!taskSelect) return;

  const tasks = await getAllTasks();
  const openTasks = tasks.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  taskSelect.innerHTML = '<option value="">Select a task</option>';

  openTasks.forEach((task) => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = `${task.subject} — ${task.title}`;
    taskSelect.appendChild(option);
  });
}

function buildTaskMap(tasks) {
  const map = {};
  tasks.forEach((task) => {
    map[task.id] = task;
  });
  return map;
}

function evidenceCard(item, taskMap) {
  const linkedTask = taskMap[item.taskId];

  return `
    <article class="task-card">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(linkedTask ? linkedTask.title : 'Unknown task')}</h3>
          <p class="muted">${escapeHtml(linkedTask ? linkedTask.subject : 'No subject')}</p>
        </div>
        <div class="task-badges">
          <span class="badge">${escapeHtml(item.type)}</span>
        </div>
      </div>

      <p><strong>Evidence:</strong> ${escapeHtml(item.text)}</p>
      <p class="muted"><strong>Saved:</strong> ${escapeHtml(new Date(item.createdAt).toLocaleString())}</p>

      <div class="actions">
        <button
          class="button small danger"
          data-action="delete-evidence"
          data-id="${item.id}"
        >
          Delete
        </button>
      </div>
    </article>
  `;
}

async function renderEvidence() {
  const evidenceList = document.getElementById('evidenceList');
  if (!evidenceList) return;

  const [evidenceItems, tasks] = await Promise.all([getAllEvidence(), getAllTasks()]);
  const taskMap = buildTaskMap(tasks);

  evidenceList.innerHTML = evidenceItems.length
    ? evidenceItems.map((item) => evidenceCard(item, taskMap)).join('')
    : '<p>No evidence added yet.</p>';
}

async function handleEvidenceFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const item = {
    id: generateEvidenceId(),
    taskId: formData.get('taskId'),
    type: formData.get('evidenceType'),
    text: formData.get('evidenceText'),
    createdAt: new Date().toISOString()
  };

  await addEvidence(item);
  form.reset();
  await populateEvidenceTaskDropdown();
  await renderEvidence();
}

async function handleEvidenceActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  if (button.dataset.action !== 'delete-evidence') return;

  const id = button.dataset.id;
  await deleteEvidence(id);
  await renderEvidence();
}

document.addEventListener('DOMContentLoaded', async () => {
  const evidenceForm = document.getElementById('evidenceForm');

  if (evidenceForm) {
    evidenceForm.addEventListener('submit', handleEvidenceFormSubmit);
  }

  document.body.addEventListener('click', handleEvidenceActions);

  await populateEvidenceTaskDropdown();
  await renderEvidence();
});