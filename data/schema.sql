CREATE TABLE students (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  year_level INTEGER NOT NULL,
  class_code TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  teacher_name TEXT,
  colour TEXT,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  estimated_minutes INTEGER,
  priority TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE study_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  planned_start TEXT,
  planned_end TEXT,
  actual_start TEXT,
  actual_end TEXT,
  completed INTEGER DEFAULT 0,
  reflection TEXT,
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE TABLE evidence_items (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content_path_or_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE TABLE teacher_posts (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  resource_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO students (
  id, school_id, class_id, name, created_at
) VALUES (
  'student-001',
  'school-001',
  'class-001',
  'Test Student',
  datetime('now')
);

CREATE TABLE IF NOT EXISTS student_classes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);