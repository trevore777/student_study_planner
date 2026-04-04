function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normaliseYearLevel(value) {
  return String(value || '').trim().replace(/^year\s*/i, '');
}

function groupClassesById(items) {
  const grouped = {};

  items.forEach((item) => {
    const classId = item.class_id || item.classId;
    if (!classId) return;

    if (!grouped[classId]) {
      grouped[classId] = {
        id: classId,
        classId,
        className: item.class_name || item.className || item.class_name_linked || 'Unknown Class',
        teacherId: item.teacher_id || item.teacherId || '',
        teacherName: item.teacher_name || item.teacherName || 'Unknown Teacher',
        schoolId: item.school_id || item.schoolId || '',
        yearLevel: normaliseYearLevel(item.class_year_level || item.yearLevel || ''),
        subjects: new Set()
      };
    }

    const subject = item.subject || '';
    if (subject) grouped[classId].subjects.add(subject);
  });

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      subject: Array.from(item.subjects).sort().join(', ')
    }))
    .sort((a, b) => {
      const yearCompare = String(a.yearLevel).localeCompare(String(b.yearLevel), undefined, { numeric: true });
      if (yearCompare !== 0) return yearCompare;
      return String(a.className).localeCompare(String(b.className));
    });
}

async function fetchAvailableClasses() {
  const response = await fetch('/api/teacher-homework');
  if (!response.ok) {
    throw new Error('Unable to load classes.');
  }

  const items = await response.json();
  return groupClassesById(items);
}

function filterClassesByYearLevel(classes, yearLevel) {
  const cleanYear = normaliseYearLevel(yearLevel);

  if (!cleanYear) return classes;

  return classes.filter((item) => normaliseYearLevel(item.yearLevel) === cleanYear);
}

function renderAvailableClasses(classes, selections, yearLevel) {
  const container = document.getElementById('availableClassesList');
  const selectedClassIds = new Set(selections.map((item) => item.classId));

  if (!container) return;

  const filteredClasses = filterClassesByYearLevel(classes, yearLevel);

  if (!filteredClasses.length) {
    container.innerHTML = `
      <p>
        No classes found for ${yearLevel ? `Year ${escapeHtml(yearLevel)}` : 'this filter'} yet.
        Ask a teacher to post homework for that year level.
      </p>
    `;
    return;
  }

  container.innerHTML = `
    <form id="classSelectionForm" class="stack-form">
      ${filteredClasses.map((item) => `
        <label class="class-select-card">
          <input
            type="checkbox"
            name="selectedClass"
            value="${escapeHtml(item.classId)}"
            data-class-name="${escapeHtml(item.className)}"
            data-teacher-id="${escapeHtml(item.teacherId)}"
            data-teacher-name="${escapeHtml(item.teacherName)}"
            data-school-id="${escapeHtml(item.schoolId)}"
            data-subject="${escapeHtml(item.subject)}"
            data-year-level="${escapeHtml(item.yearLevel)}"
            ${selectedClassIds.has(item.classId) ? 'checked' : ''}
          />
          <div>
            <strong>${escapeHtml(item.className)}</strong>
            <p class="muted">
              ${item.yearLevel ? `Year ${escapeHtml(item.yearLevel)} · ` : ''}
              ${escapeHtml(item.teacherName)}
              ${item.subject ? ` · ${escapeHtml(item.subject)}` : ''}
            </p>
          </div>
        </label>
      `).join('')}

      <div class="actions">
        <button class="button primary" type="submit">Save class selections</button>
      </div>
    </form>
  `;
}

async function loadStudentProfileIntoForm() {
  const profile = await getStudentProfile();

  if (!profile) return;

  const studentName = document.getElementById('studentName');
  const yearLevel = document.getElementById('yearLevel');

  if (studentName) studentName.value = profile.studentName || '';
  if (yearLevel) yearLevel.value = profile.yearLevel || '';
}

async function handleStudentProfileSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const profile = {
    studentName: formData.get('studentName'),
    yearLevel: normaliseYearLevel(formData.get('yearLevel'))
  };

  await saveStudentProfile(profile);

  const status = document.getElementById('studentSetupStatus');
  if (status) status.textContent = 'Student profile saved. Class list updated below.';

  await initialiseClassSelectionArea();
}

async function handleClassSelectionSubmit(event) {
  event.preventDefault();

  const checkedInputs = Array.from(
    event.target.querySelectorAll('input[name="selectedClass"]:checked')
  );

  const selections = checkedInputs.map((input) => ({
    id: `selection-${input.value}`,
    classId: input.value,
    className: input.dataset.className || '',
    teacherId: input.dataset.teacherId || '',
    teacherName: input.dataset.teacherName || '',
    schoolId: input.dataset.schoolId || '',
    subject: input.dataset.subject || '',
    yearLevel: input.dataset.yearLevel || ''
  }));

  await saveStudentClassSelections(selections);

  const status = document.getElementById('studentSetupStatus');
  if (status) {
    status.textContent = selections.length
      ? `${selections.length} class selection(s) saved.`
      : 'No classes selected.';
  }
}

async function initialiseClassSelectionArea() {
  try {
    const [classes, selections, profile] = await Promise.all([
      fetchAvailableClasses(),
      getStudentClassSelections(),
      getStudentProfile()
    ]);

    const yearLevel = normaliseYearLevel(profile?.yearLevel || '');

    renderAvailableClasses(classes, selections, yearLevel);

    const classSelectionForm = document.getElementById('classSelectionForm');
    if (classSelectionForm) {
      classSelectionForm.addEventListener('submit', handleClassSelectionSubmit);
    }

    const status = document.getElementById('studentSetupStatus');
    if (status && selections.length) {
      status.textContent = `${selections.length} class selection(s) currently active.`;
    }
  } catch (error) {
    const container = document.getElementById('availableClassesList');
    if (container) {
      container.innerHTML = `<p>${escapeHtml(error.message || 'Unable to load classes.')}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const studentProfileForm = document.getElementById('studentProfileForm');

  if (studentProfileForm) {
    studentProfileForm.addEventListener('submit', handleStudentProfileSubmit);
  }

  await loadStudentProfileIntoForm();
  await initialiseClassSelectionArea();
});