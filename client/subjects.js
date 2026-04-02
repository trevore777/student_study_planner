function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function renderSubjects() {
  const subjects = await getAllSubjects();
  const subjectsList = document.getElementById('subjectsList');

  if (!subjectsList) return;

  subjectsList.innerHTML = subjects.length
    ? subjects
        .map(
          (subject) => `
            <article class="task-card">
              <div class="task-top">
                <div>
                  <h3>${escapeHtml(subject.name)}</h3>
                  <p class="muted">Available for homework and planning</p>
                </div>
                <div class="task-badges">
                  <span class="badge">Subject</span>
                </div>
              </div>

              <div class="actions">
                <button
                  class="button small danger"
                  data-action="delete-subject"
                  data-id="${subject.id}"
                  data-name="${escapeHtml(subject.name)}"
                >
                  Delete
                </button>
              </div>
            </article>
          `
        )
        .join('')
    : '<p>No subjects yet.</p>';
}

async function handleSubjectFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const input = document.getElementById('subjectName');
  const name = input.value.trim();

  if (!name) return;

  const subjects = await getAllSubjects();
  const exists = subjects.some(
    (subject) => subject.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    alert('That subject already exists.');
    return;
  }

  const subject = {
    id: createSlugId(name),
    name,
    active: true,
    createdAt: new Date().toISOString()
  };

  await addSubject(subject);
  form.reset();
  await renderSubjects();
}

async function handleSubjectActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  if (button.dataset.action !== 'delete-subject') return;

  const id = button.dataset.id;
  const name = button.dataset.name;

  const confirmed = window.confirm(
    `Delete subject "${name}"? Existing tasks will keep their current subject text.`
  );

  if (!confirmed) return;

  await deleteSubject(id);
  await renderSubjects();
}

document.addEventListener('DOMContentLoaded', async () => {
  const subjectForm = document.getElementById('subjectForm');

  if (subjectForm) {
    subjectForm.addEventListener('submit', handleSubjectFormSubmit);
  }

  document.body.addEventListener('click', handleSubjectActions);

  await renderSubjects();
});