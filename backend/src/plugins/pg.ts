import { Pool } from "pg";

export const pool = new Pool({
  database: process.env.DB_NAME!,
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
});

pool.connect().then(async () => {
  console.log(`DB connected`);

  await pool.query(`
    create table if not exists tasks (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      title text not null,
      description text default '',
      status text not null default 'todo',
      due_date date,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `);

  await pool.query(`
    alter table tasks add column if not exists due_date date
  `);

  // CRM: "clients" переехал в "contacts" (без status) + новая сущность "deals" —
  // переименовываем существующую таблицу один раз, если она ещё не мигрирована
  await pool.query(`
    alter table if exists clients rename to contacts
  `);
  await pool.query(`
    alter table if exists contacts drop column if exists status
  `);

  await pool.query(`
    create table if not exists contacts (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      name text not null,
      email text default '',
      phone text default '',
      company text default '',
      notes text default '',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `);

  // срок действия кода восстановления пароля — иначе старый reset_code
  // остаётся рабочим бесконечно
  await pool.query(`
    alter table users add column if not exists reset_code_expires_at timestamp
  `);

  // name был varchar(15): displayName из Google длиннее 15 символов
  // ("value too long") ломал создание аккаунта при входе через Google
  await pool.query(`
    alter table users alter column name type varchar(100)
  `);

  await pool.query(`
    create table if not exists deals (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      contact_id integer references contacts(id) on delete set null,
      title text not null,
      amount numeric,
      stage text not null default 'new',
      notes text default '',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `);
});
