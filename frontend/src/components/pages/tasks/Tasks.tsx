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
import scss from "./tasks.module.css";
import { useGetTasks } from "@/hooks/tasks/useGetTasks";
import { useCreateTask } from "@/hooks/tasks/useCreateTask";
import { useUpdateTask } from "@/hooks/tasks/useUpdateTask";
import { useDeleteTask } from "@/hooks/tasks/useDeleteTask";

type TaskStatus = "todo" | "in_progress" | "done";

interface ITask {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ITaskForm {
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string;
}

const columns: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

const dotClass: Record<TaskStatus, string> = {
  todo: scss.dotTodo,
  in_progress: scss.dotIn_progress,
  done: scss.dotDone,
};

const emptyForm = (status: TaskStatus): ITaskForm => ({
  title: "",
  description: "",
  status,
  due_date: "",
});

const formatDueDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

interface ICardProps {
  task: ITask;
  onEdit: (task: ITask) => void;
  onDelete: (id: number) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: number) => void;
}

const TaskCard = memo(function TaskCard({
  task,
  onEdit,
  onDelete,
  onDragStart,
}: ICardProps) {
  return (
    <div
      className={scss.card}
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
    >
      <div className={scss.cardTop}>
        <strong className={scss.cardTitleText}>{task.title}</strong>

        <div className={scss.cardActions}>
          <button className={scss.iconButton} onClick={() => onEdit(task)}>
            <Pencil size={13} />
          </button>

          <button
            className={scss.iconButton}
            onClick={() => onDelete(task.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {task.description && (
        <p className={scss.cardDescText}>{task.description}</p>
      )}

      {task.due_date && (
        <span className={scss.cardDue}>Due {formatDueDate(task.due_date)}</span>
      )}
    </div>
  );
});

const Tasks = () => {
  const { data: tasks, isLoading } = useGetTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();

  const [search, setSearch] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(
    null,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [form, setForm] = useState<ITaskForm>(emptyForm("todo"));

  const list: ITask[] = tasks || [];
  // без useMemo пересчитывалось бы на каждый keystroke в модалке создания/
  // редактирования задачи — та печать не имеет отношения к поиску
  const filteredTasks = useMemo(
    () =>
      list.filter((task) =>
        `${task.title} ${task.description}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [list, search],
  );

  const openCreateModal = (status: TaskStatus) => {
    setEditingTask(null);
    setForm(emptyForm(status));
    setModalOpen(true);
  };

  const openEditModal = useCallback((task: ITask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
    });
    setModalOpen(true);
  }, []);

  const closeModal = () => setModalOpen(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    const body = { ...form, due_date: form.due_date || null };

    if (editingTask) {
      updateTask(
        { id: editingTask.id, ...body },
        { onSuccess: closeModal },
      );
    } else {
      createTask(body, { onSuccess: closeModal });
    }
  };

  const handleDelete = useCallback(
    (id: number) => {
      deleteTask(id);
    },
    [deleteTask],
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, id: number) => {
      event.dataTransfer.setData("text/plain", String(id));
      event.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    status: TaskStatus,
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== status) setDragOverColumn(status);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    status: TaskStatus,
  ) => {
    event.preventDefault();
    setDragOverColumn(null);

    const taskId = Number(event.dataTransfer.getData("text/plain"));
    const task = list.find((item) => item.id === taskId);
    if (!task || task.status === status) return;

    updateTask({ id: taskId, status });
  };

  return (
    <main className={scss.page}>
      <header className={scss.header}>
        <h1>Tasks</h1>

        <div className={scss.headerRight}>
          <div className={scss.search}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <span className={scss.count}>{list.length} tasks</span>

          <button
            className={scss.newTaskButton}
            onClick={() => openCreateModal("todo")}
          >
            <Plus size={14} /> New task
          </button>
        </div>
      </header>

      <div className={scss.board}>
        {columns.map((column) => {
          const columnTasks = filteredTasks.filter(
            (task) => task.status === column.status,
          );

          return (
            <section key={column.status} className={scss.column}>
              <div className={scss.columnHeader}>
                <div className={scss.columnTitle}>
                  <span className={`${scss.dot} ${dotClass[column.status]}`} />
                  {column.label}
                  <span className={scss.columnCount}>{columnTasks.length}</span>
                </div>

                <button
                  className={scss.addButton}
                  onClick={() => openCreateModal(column.status)}
                  disabled={isCreating}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div
                className={`${scss.columnBody} ${
                  dragOverColumn === column.status ? scss.columnBodyOver : ""
                }`}
                onDragOver={(event) => handleDragOver(event, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={(event) => handleDrop(event, column.status)}
              >
                {isLoading && <p className={scss.hint}>Loading...</p>}

                {!isLoading && columnTasks.length === 0 && (
                  <p className={scss.hint}>No tasks here yet.</p>
                )}

                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
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
                <h2>{editingTask ? "Edit task" : "New task"}</h2>
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
                    placeholder="Task title"
                    onChange={(event) =>
                      setForm((f) => ({ ...f, title: event.target.value }))
                    }
                  />
                </div>

                <div className={scss.modalField}>
                  <label>Description</label>
                  <textarea
                    value={form.description}
                    placeholder="Add a description..."
                    rows={4}
                    onChange={(event) =>
                      setForm((f) => ({
                        ...f,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className={scss.modalRow}>
                  <div className={scss.modalField}>
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((f) => ({
                          ...f,
                          status: event.target.value as TaskStatus,
                        }))
                      }
                    >
                      {columns.map((column) => (
                        <option key={column.status} value={column.status}>
                          {column.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={scss.modalField}>
                    <label>Due date</label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, due_date: event.target.value }))
                      }
                    />
                  </div>
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
                  disabled={!form.title.trim() || isCreating || isUpdating}
                >
                  {editingTask ? "Save changes" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Tasks;
