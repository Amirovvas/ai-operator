import { pool } from "../plugins/pg";
import { apiErrors } from "../utils/apiErrors";

export type DealStage = "new" | "in_progress" | "won" | "lost";

interface IDealBody {
  title?: string;
  contact_id?: number | null;
  amount?: number | null;
  stage?: DealStage;
  notes?: string;
}

const DEAL_SELECT = `
  select
    d.id, d.title, d.amount, d.stage, d.notes, d.contact_id,
    c.name as contact_name,
    d.created_at, d.updated_at
  from deals d
  left join contacts c on c.id = d.contact_id
`;

export const getDealsService = async (userId: number) => {
  const res = await pool.query(
    `${DEAL_SELECT} where d.user_id = $1 order by d.created_at desc`,
    [userId],
  );

  return res.rows;
};

export const getDealService = async (userId: number, dealId: number) => {
  const res = await pool.query(
    `${DEAL_SELECT} where d.id = $1 and d.user_id = $2`,
    [dealId, userId],
  );

  if (!res.rows[0]) throw apiErrors.notFound("Deal not found");

  return res.rows[0];
};

const assertContactBelongsToUser = async (
  userId: number,
  contactId: number,
) => {
  const res = await pool.query(
    `select id from contacts where id = $1 and user_id = $2`,
    [contactId, userId],
  );

  if (!res.rows[0]) throw apiErrors.badRequest("Contact not found");
};

export const createDealService = async (userId: number, body: IDealBody) => {
  if (!body.title || !body.title.trim())
    throw apiErrors.badRequest("Deal title is required");

  if (!body.contact_id) throw apiErrors.badRequest("Contact is required");
  await assertContactBelongsToUser(userId, body.contact_id);

  const res = await pool.query(
    `
    insert into deals
    (user_id, contact_id, title, amount, stage, notes)
    values ($1, $2, $3, $4, $5, $6)
    returning id
    `,
    [
      userId,
      body.contact_id,
      body.title,
      body.amount ?? null,
      body.stage || "new",
      body.notes || "",
    ],
  );

  return getDealService(userId, res.rows[0].id);
};

export const updateDealService = async (
  userId: number,
  dealId: number,
  body: IDealBody,
) => {
  const existing = await pool.query(
    `select * from deals where id = $1 and user_id = $2`,
    [dealId, userId],
  );

  if (!existing.rows[0]) throw apiErrors.notFound("Deal not found");

  if (body.contact_id) await assertContactBelongsToUser(userId, body.contact_id);

  await pool.query(
    `
    update deals
    set title = $1, contact_id = $2, amount = $3, stage = $4, notes = $5, updated_at = now()
    where id = $6 and user_id = $7
    `,
    [
      body.title ?? existing.rows[0].title,
      body.contact_id ?? existing.rows[0].contact_id,
      body.amount !== undefined ? body.amount : existing.rows[0].amount,
      body.stage ?? existing.rows[0].stage,
      body.notes ?? existing.rows[0].notes,
      dealId,
      userId,
    ],
  );

  return getDealService(userId, dealId);
};

export const deleteDealService = async (userId: number, dealId: number) => {
  const res = await pool.query(
    `
    delete from deals
    where id = $1 and user_id = $2
    returning *
    `,
    [dealId, userId],
  );

  if (!res.rows[0]) throw apiErrors.notFound("Deal not found");

  return res.rows[0];
};
