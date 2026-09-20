import { pool } from "../plugins/pg";
import { apiErrors } from "../utils/apiErrors";

interface INoteBody {
  title?: string;
  content?: string;
}

export const getNotesService = async (userId: number) => {
  const res = await pool.query(
    `
    select id, title, content, created_at, updated_at
    from notes
    where user_id = $1
    order by updated_at desc
    `,
    [userId],
  );

  return res.rows;
};

export const getNoteService = async (userId: number, noteId: number) => {
  const res = await pool.query(
    `
    select id, title, content, created_at, updated_at
    from notes
    where id = $1 and user_id = $2
    `,
    [noteId, userId],
  );

  if (!res.rows[0]) throw apiErrors.notFound("Note not found");

  return res.rows[0];
};

export const createNoteService = async (userId: number, body: INoteBody) => {
  const res = await pool.query(
    `
    insert into notes
    (user_id, title, content)
    values ($1, $2, $3)
    returning id, title, content, created_at, updated_at
    `,
    [userId, body.title || "Untitled note", body.content || ""],
  );

  return res.rows[0];
};

export const updateNoteService = async (
  userId: number,
  noteId: number,
  body: INoteBody,
) => {
  const existing = await pool.query(
    `
    select * from notes
    where id = $1 and user_id = $2
    `,
    [noteId, userId],
  );

  if (!existing.rows[0]) throw apiErrors.notFound("Note not found");

  const res = await pool.query(
    `
    update notes
    set title = $1, content = $2, updated_at = now()
    where id = $3 and user_id = $4
    returning id, title, content, created_at, updated_at
    `,
    [
      body.title ?? existing.rows[0].title,
      body.content ?? existing.rows[0].content,
      noteId,
      userId,
    ],
  );

  return res.rows[0];
};

export const deleteNoteService = async (userId: number, noteId: number) => {
  const res = await pool.query(
    `
    delete from notes
    where id = $1 and user_id = $2
    returning *
    `,
    [noteId, userId],
  );

  if (!res.rows[0]) throw apiErrors.notFound("Note not found");

  return res.rows[0];
};
