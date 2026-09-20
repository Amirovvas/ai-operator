"use client";

import {
  memo,
  useCallback,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import scss from "./deals.module.css";
import { useGetDeals } from "@/hooks/deals/useGetDeals";
import { useCreateDeal } from "@/hooks/deals/useCreateDeal";
import { useUpdateDeal } from "@/hooks/deals/useUpdateDeal";
import { useDeleteDeal } from "@/hooks/deals/useDeleteDeal";
import { useGetContacts } from "@/hooks/contacts/useGetContacts";
import type { IContact } from "@/components/pages/contacts/Contacts";

type DealStage = "new" | "in_progress" | "won" | "lost";

interface IDeal {
  id: number;
  title: string;
  contact_id: number | null;
  contact_name: string | null;
  amount: string | number | null;
  stage: DealStage;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface IDealForm {
  title: string;
  contact_id: string;
  amount: string;
  stage: DealStage;
  notes: string;
}

const columns: { stage: DealStage; label: string }[] = [
  { stage: "new", label: "New" },
  { stage: "in_progress", label: "In progress" },
  { stage: "won", label: "Won" },
  { stage: "lost", label: "Lost" },
];

const dotClass: Record<DealStage, string> = {
  new: scss.dotNew,
  in_progress: scss.dotIn_progress,
  won: scss.dotWon,
  lost: scss.dotLost,
};

const emptyForm = (stage: DealStage): IDealForm => ({
  title: "",
  contact_id: "",
  amount: "",
  stage,
  notes: "",
});

const formatAmount = (value: string | number | null) => {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

interface ICardProps {
  deal: IDeal;
  onEdit: (deal: IDeal) => void;
  onDelete: (id: number) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: number) => void;
}

const DealCard = memo(function DealCard({
  deal,
  onEdit,
  onDelete,
  onDragStart,
}: ICardProps) {
  const amount = formatAmount(deal.amount);

  return (
    <div
      className={scss.card}
      draggable
      onDragStart={(event) => onDragStart(event, deal.id)}
    >
      <div className={scss.cardTop}>
        <strong className={scss.cardTitleText}>{deal.title}</strong>

        <div className={scss.cardActions}>
          <button className={scss.iconButton} onClick={() => onEdit(deal)}>
            <Pencil size={13} />
          </button>

          <button className={scss.iconButton} onClick={() => onDelete(deal.id)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {deal.contact_name && (
        <p className={scss.cardContact}>{deal.contact_name}</p>
      )}

      {amount && (
        <div className={scss.cardFooter}>
          <span className={scss.cardAmount}>{amount}</span>
        </div>
      )}
    </div>
  );
});

const Deals = () => {
  const { data: deals, isLoading } = useGetDeals();
  const { data: contacts } = useGetContacts();
  const { mutate: createDeal, isPending: isCreating } = useCreateDeal();
  const { mutate: updateDeal, isPending: isUpdating } = useUpdateDeal();
  const { mutate: deleteDeal } = useDeleteDeal();

  const [search, setSearch] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<DealStage | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<IDeal | null>(null);
  const [form, setForm] = useState<IDealForm>(emptyForm("new"));

  const list: IDeal[] = deals || [];
  const contactList: IContact[] = contacts || [];

  // без useMemo пересчитывалось бы на каждый keystroke в модалке создания/
  // редактирования сделки — та печать не имеет отношения к поиску
  const filteredDeals = useMemo(
    () =>
      list.filter((deal) =>
        `${deal.title} ${deal.contact_name || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [list, search],
  );

  const openCreateModal = (stage: DealStage) => {
    setEditingDeal(null);
    setForm(emptyForm(stage));
    setModalOpen(true);
  };

  const openEditModal = useCallback((deal: IDeal) => {
    setEditingDeal(deal);
    setForm({
      title: deal.title,
      contact_id: deal.contact_id ? String(deal.contact_id) : "",
      amount: deal.amount !== null ? String(deal.amount) : "",
      stage: deal.stage,
      notes: deal.notes,
    });
    setModalOpen(true);
  }, []);

  const closeModal = () => setModalOpen(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.contact_id) return;

    const body = {
      title: form.title,
      contact_id: Number(form.contact_id),
      amount: form.amount ? Number(form.amount) : null,
      stage: form.stage,
      notes: form.notes,
    };

    if (editingDeal) {
      updateDeal({ id: editingDeal.id, ...body }, { onSuccess: closeModal });
    } else {
      createDeal(body, { onSuccess: closeModal });
    }
  };

  const handleDelete = useCallback(
    (id: number) => {
      deleteDeal(id);
    },
    [deleteDeal],
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, id: number) => {
      event.dataTransfer.setData("text/plain", String(id));
      event.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = (event: DragEvent<HTMLDivElement>, stage: DealStage) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== stage) setDragOverColumn(stage);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, stage: DealStage) => {
    event.preventDefault();
    setDragOverColumn(null);

    const dealId = Number(event.dataTransfer.getData("text/plain"));
    const deal = list.find((item) => item.id === dealId);
    if (!deal || deal.stage === stage) return;

    updateDeal({ id: dealId, stage });
  };

  return (
    <main className={scss.page}>
      <header className={scss.header}>
        <h1>Deals</h1>

        <div className={scss.headerRight}>
          <div className={scss.search}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Search deals..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <span className={scss.count}>{list.length} deals</span>

          <button
            className={scss.newDealButton}
            onClick={() => openCreateModal("new")}
            disabled={contactList.length === 0}
          >
            <Plus size={14} /> New deal
          </button>
        </div>
      </header>

      <div className={scss.board}>
        {columns.map((column) => {
          const columnDeals = filteredDeals.filter(
            (deal) => deal.stage === column.stage,
          );
          const columnTotal = columnDeals.reduce(
            (sum, deal) => sum + (Number(deal.amount) || 0),
            0,
          );

          return (
            <section key={column.stage} className={scss.column}>
              <div className={scss.columnHeader}>
                <div className={scss.columnTitle}>
                  <span className={`${scss.dot} ${dotClass[column.stage]}`} />
                  {column.label}
                  <span className={scss.columnSum}>
                    {columnDeals.length}
                    {columnTotal > 0 ? ` · ${formatAmount(columnTotal)}` : ""}
                  </span>
                </div>

                <button
                  className={scss.addButton}
                  onClick={() => openCreateModal(column.stage)}
                  disabled={isCreating || contactList.length === 0}
                  title={
                    contactList.length === 0
                      ? "Add a contact first"
                      : undefined
                  }
                >
                  <Plus size={14} />
                </button>
              </div>

              <div
                className={`${scss.columnBody} ${
                  dragOverColumn === column.stage ? scss.columnBodyOver : ""
                }`}
                onDragOver={(event) => handleDragOver(event, column.stage)}
                onDragLeave={handleDragLeave}
                onDrop={(event) => handleDrop(event, column.stage)}
              >
                {isLoading && <p className={scss.hint}>Loading...</p>}

                {!isLoading && columnDeals.length === 0 && (
                  <p className={scss.hint}>No deals here yet.</p>
                )}

                {columnDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {modalOpen && (
        <div className={scss.modalOverlay} onClick={closeModal}>
          <div
            className={scss.modalBox}
            onClick={(event) => event.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className={scss.modalHeader}>
                <h2>{editingDeal ? "Edit deal" : "New deal"}</h2>
                <button
                  type="button"
                  className={scss.iconButton}
                  onClick={closeModal}
                >
                  <X size={16} />
                </button>
              </div>

              <div className={scss.modalBody}>
                <div className={scss.modalField}>
                  <label>Title</label>
                  <input
                    autoFocus
                    value={form.title}
                    placeholder="Deal title"
                    onChange={(event) =>
                      setForm((f) => ({ ...f, title: event.target.value }))
                    }
                  />
                </div>

                <div className={scss.modalField}>
                  <label>Contact</label>
                  <select
                    value={form.contact_id}
                    onChange={(event) =>
                      setForm((f) => ({ ...f, contact_id: event.target.value }))
                    }
                  >
                    <option value="" disabled>
                      Select a contact
                    </option>
                    {contactList.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={scss.modalRow}>
                  <div className={scss.modalField}>
                    <label>Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      placeholder="0"
                      onChange={(event) =>
                        setForm((f) => ({ ...f, amount: event.target.value }))
                      }
                    />
                  </div>

                  <div className={scss.modalField}>
                    <label>Stage</label>
                    <select
                      value={form.stage}
                      onChange={(event) =>
                        setForm((f) => ({
                          ...f,
                          stage: event.target.value as DealStage,
                        }))
                      }
                    >
                      {columns.map((column) => (
                        <option key={column.stage} value={column.stage}>
                          {column.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={scss.modalField}>
                  <label>Notes</label>
                  <textarea
                    value={form.notes}
                    placeholder="Notes about this deal..."
                    rows={3}
                    onChange={(event) =>
                      setForm((f) => ({ ...f, notes: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className={scss.modalFooter}>
                <button
                  type="button"
                  className={scss.secondaryButton}
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={scss.primaryButton}
                  disabled={
                    !form.title.trim() ||
                    !form.contact_id ||
                    isCreating ||
                    isUpdating
                  }
                >
                  {editingDeal ? "Save changes" : "Create deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Deals;
