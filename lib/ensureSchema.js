const db = require('./turso');

let schemaReady = false;

async function columnExists(tableName, columnName) {
  const result = await db.execute(`PRAGMA table_info(${tableName})`);
  const columns = result.rows || [];
  return columns.some((col) => col.name === columnName);
}

async function addColumnIfMissing(tableName, columnName, columnDefinition) {
  const exists = await columnExists(tableName, columnName);
  if (!exists) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    console.log(`Added missing column ${columnName} to ${tableName}`);
  }
}

async function ensureSchema() {
  if (!db) {
    throw new Error('Database is not configured.');
  }

  if (schemaReady) return;

  console.log('Ensuring schema...');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'teacher',
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      teacher_id TEXT,
      name TEXT NOT NULL,
      year_level TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS teacher_homework (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      due_date TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL DEFAULT 20,
      created_at TEXT NOT NULL
    )
  `);

  // Migrate old teacher_homework table forward
  await addColumnIfMissing('teacher_homework', 'school_id', `TEXT NOT NULL DEFAULT 'school-001'`);
  await addColumnIfMissing('teacher_homework', 'teacher_id', `TEXT NOT NULL DEFAULT 'teacher-001'`);
  await addColumnIfMissing('teacher_homework', 'class_id', `TEXT NOT NULL DEFAULT 'class-001'`);

  await db.execute(`
    INSERT OR IGNORE INTO schools (
      id, name, short_code, created_at
    ) VALUES (
      'school-001',
      'Default School',
      'DEF',
      datetime('now')
    )
  `);

  await db.execute(`
    INSERT OR IGNORE INTO teachers (
      id, school_id, name, email, role, created_at
    ) VALUES (
      'teacher-001',
      'school-001',
      'Default Teacher',
      'teacher@school.local',
      'teacher',
      datetime('now')
    )
  `);

  await db.execute(`
    INSERT OR IGNORE INTO classes (
      id, school_id, teacher_id, name, year_level, created_at
    ) VALUES (
      'class-001',
      'school-001',
      'teacher-001',
      'Year 8A',
      '8',
      datetime('now')
    )
  `);

  schemaReady = true;
  console.log('Schema ready.');
}

module.exports = ensureSchema;