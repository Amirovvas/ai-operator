import { pool } from "../plugins/pg";
import { apiErrors } from "../utils/apiErrors";

export type TaskStatus = "todo" | "in_progress" | "done";

interface ITaskBody {
  title?: string;
  description?: string;
  status?: TaskStatus;
  due_date?: string | null;
}

export const getTasksService = async (userId: number) => {
  const res = await pool.query(
    `
    select id, title, description, status, due_date, created_at, updated_at
    from tasks
    where user_id = $1
    order by created_at desc
    `,
    [userId],
  );

  return res.rows;
};

export const getTaskService = async (userId: number, taskId: number) => {
  const res = await pool.query(
    `
    select id, title, description, status, due_date, created_at, updated_at
    from tasks
    where id = $1 and user_id = $2
    `,
    [taskId, userId],
  );

  if (!res.rows[0]) throw apiErrors.notFound("Task not found");

  return res.rows[0];
};

export const createTaskService = async (userId: number, body: ITaskBody) => {
  const res = await pool.query(
    `
    insert into tasks
    (user_id, title, description, status, due_date)
    values ($1, $2, $3, $4, $5)
    returning id, title, description, status, due_date, created_at, updated_at
    `,
    [
      userId,
      body.title || "Untitled task",
      body.description || "",
      body.status || "todo",
      body.due_date || null,
    ],
  );

  return res.rows[0];
};

export const updateTaskService = async (
  userId: number,
  taskId: number,
  body: ITaskBody,
) => {
  const existing = await pool.query(
    `
    select * from tasks
    where id = $1 and user_id = $2
    `,
    [taskId, userId],
  );

  if (!existing.rows[0]) throw apiErrors.notFound("Task not found");

  const res = await pool.query(
    `
    update tasks
    set title = $1, description = $2, status = $3, due_date = $4, updated_at = now()
    where id = $5 and user_id = $6
    returning id, title, description, status, due_date, created_at, updated_at
    `,
    [
      body.title ?? existing.rows[0].title,
      body.description ?? existing.rows[0].description,
      body.status ?? existing.rows[0].status,
      body.due_date !== undefined ? body.due_date : existing.rows[0].due_date,
      taskId,
      userId,
    ],
  );

  return res.rows[0];
};

export const deleteTaskService = async (userId: number, taskId: number) => {
  const res = await pool.query(
    `
    delete from tasks
    where id = $1 and user_id = $2
    returning *
    `,
    [taskId, userId],
  );

  if (!res.rows[0]) throw apiErrors.notFound("Task not found");

  return res.rows[0];
};
