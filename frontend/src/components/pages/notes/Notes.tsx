"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import scss from "./notes.module.css";
import { useGetNotes } from "@/hooks/notes/useGetNotes";
import { useCreateNote } from "@/hooks/notes/useCreateNote";
import { useUpdateNote } from "@/hooks/notes/useUpdateNote";
import { useDeleteNote } from "@/hooks/notes/useDeleteNote";

const formatDate = (value: string) => {
  const date = new Date(value);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Notes = () => {
  const { data: notes, isLoading } = useGetNotes();
  const { mutate: createNote, isPending: isCreating } = useCreateNote();
  const { mutate: updateNote } = useUpdateNote();
  const { mutate: deleteNote } = useDeleteNote();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const selectedNote =
    notes?.find((note: any) => note.id === selectedId) || null;

  useEffect(() => {
    if (!notes || notes.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !notes.some((note: any) => note.id === selectedId)) {
      setSelectedId(notes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  useEffect(() => {
    isFirstRender.current = true;
    setTitle(selectedNote?.title || "");
    setContent(selectedNote?.content || "");
    setSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!selectedId) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    setSaveState("saving");
    saveTimeout.current = setTimeout(() => {
      updateNote(
        { id: selectedId, title, content },
        {
          onSuccess: () => setSaveState("saved"),
        },
      );
    }, 700);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  const handleCreate = () => {
    createNote(
      { title: "Untitled note", content: "" },
      {
        onSuccess: (note) => setSelectedId(note.id),
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteNote(id, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(null);
      },
    });
  };

  // без useMemo список пересчитывался бы на каждый keystroke в редакторе
  // заметки (title/content), хотя к фильтрации это не имеет отношения
  const filteredNotes = useMemo(
    () =>
      notes?.filter((note: any) =>
        `${note.title} ${note.content}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [notes, search],
  );

  return (
    <main className={scss.page}>
      <section className={scss.list}>
        <div className={scss.listHeader}>
          <h1>Notes</h1>
          <button
            className={scss.newButton}
            onClick={handleCreate}
            disabled={isCreating}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className={scss.search}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className={scss.items}>
          {isLoading && <p className={scss.hint}>Loading notes...</p>}

          {!isLoading && filteredNotes?.length === 0 && (
            <p className={scss.hint}>No notes yet. Create your first one.</p>
          )}

          {filteredNotes?.map((note: any) => (
            <button
              key={note.id}
              className={`${scss.item} ${
                note.id === selectedId ? scss.itemActive : ""
              }`}
              onClick={() => setSelectedId(note.id)}
            >
              <div className={scss.itemTop}>
                <strong>{note.title || "Untitled note"}</strong>
                <time>{formatDate(note.updated_at)}</time>
              </div>

              <p>{note.content || "No content yet"}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={scss.editor}>
        {!selectedNote && (
          <div className={scss.empty}>
            <span>Select a note or create a new one</span>
          </div>
        )}

        {selectedNote && (
          <>
            <div className={scss.editorToolbar}>
              <span className={scss.saveState}>
                {saveState === "saving" && "Saving..."}
                {saveState === "saved" && "Saved"}
              </span>

              <button
                className={scss.deleteButton}
                onClick={() => handleDelete(selectedNote.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <input
              className={scss.titleInput}
              value={title}
              placeholder="Untitled note"
              onChange={(event) => setTitle(event.target.value)}
            />

            <textarea
              className={scss.contentInput}
              value={content}
              placeholder="Write something..."
              onChange={(event) => setContent(event.target.value)}
            />
          </>
        )}
      </section>
    </main>
  );
};

export default Notes;
