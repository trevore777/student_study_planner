function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

async function renderTodayTasks() {
  const mount = document.getElementById('today-tasks');
  if (!mount) return;
  const tasks = await getAllTasks();
  if (!tasks.length) {
    mount.innerHTML = '<p>No tasks saved yet.</p>';
    return;
  }
  mount.innerHTML = '<ul class="tight-list">' + tasks
    .sort((a,b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .map(t => `<li><strong>${t.title}</strong> — ${t.subject} — due ${t.dueDate || 'TBC'}</li>`)
    .join('') + '</ul>';
}

async function seedDemoData() {
  const items = [
    { title: 'English persuasive paragraph', subject: 'English', dueDate: '2026-04-03', minutes: 25 },
    { title: 'Maths worksheet corrections', subject: 'Maths', dueDate: '2026-04-04', minutes: 20 },
    { title: 'Science quiz revision', subject: 'Science', dueDate: '2026-04-05', minutes: 15 },
  ];
  for (const item of items) {
    await addTask({ id: uid(), ...item, status: 'todo', createdAt: new Date().toISOString() });
  }
  renderTodayTasks();
}

document.addEventListener('DOMContentLoaded', () => {
  renderTodayTasks();
  const form = document.getElementById('task-form');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const task = {
        id: uid(),
        title: formData.get('title'),
        subject: formData.get('subject'),
        dueDate: formData.get('dueDate'),
        minutes: Number(formData.get('minutes') || 0),
        status: 'todo',
        createdAt: new Date().toISOString()
      };
      await addTask(task);
      form.reset();
      renderTodayTasks();
    });
  }
});