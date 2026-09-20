import { pool } from "../plugins/pg";
import { apiErrors } from "../utils/apiErrors";

interface IContactBody {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export const getContactsService = async (userId: number) => {
  const res = await pool.query(
    `
    select id, name, email, phone, company, notes, created_at, updated_at
    from contacts
    where user_id = $1
    order by created_at desc
    `,
    [userId],
  );

  return res.rows;
};

export const getContactService = async (userId: number, contactId: number) => {
  const res = await pool.query(
    `
    select id, name, email, phone, company, notes, created_at, updated_at
    from contacts
    where id = $1 and user_id = $2
    `,
    [contactId, userId],
  );

  if (!res.rows[0]) throw apiErrors.notFound("Contact not found");

  return res.rows[0];
};

export const createContactService = async (
  userId: number,
  body: IContactBody,
) => {
  if (!body.name || !body.name.trim())
    throw apiErrors.badRequest("Contact name is required");

  const res = await pool.query(
    `
    insert into contacts
    (user_id, name, email, phone, company, notes)
    values ($1, $2, $3, $4, $5, $6)
    returning id, name, email, phone, company, notes, created_at, updated_at
    `,
    [
      userId,
      body.name,
      body.email || "",
      body.phone || "",
      body.company || "",
      body.notes || "",
    ],
  );

  return res.rows[0];
};

export const updateContactService = async (
  userId: number,
  contactId: number,
  body: IContactBody,
) => {
  const existing = await pool.query(
    `
    select * from contacts
    where id = $1 and user_id = $2
    `,
    [contactId, userId],
  );

  if (!existing.rows[0]) throw apiErrors.notFound("Contact not found");

  const res = await pool.query(
    `
    update contacts
    set name = $1, email = $2, phone = $3, company = $4, notes = $5, updated_at = now()
    where id = $6 and user_id = $7
    returning id, name, email, phone, company, notes, created_at, updated_at
    `,
    [
      body.name ?? existing.rows[0].name,
      body.email ?? existing.rows[0].email,
      body.phone ?? existing.rows[0].phone,
      body.company ?? existing.rows[0].company,
      body.notes ?? existing.rows[0].notes,
      contactId,
      userId,
    ],
  );

  return res.rows[0];
};

export const deleteContactService = async (userId: number, contactId: number) => {
  const res = await pool.query(
    `
    delete from contacts
    where id = $1 and user_id = $2
    returning *
    `,
    [contactId, userId],
  );

  if (!res.rows[0]) throw apiErrors.notFound("Contact not found");

  return res.rows[0];
};
