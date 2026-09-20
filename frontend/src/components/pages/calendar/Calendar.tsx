"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import css from "./calendar.module.css";
import { useGetCalendar, type IGoogleEvent } from "@/hooks/calendar/useGetCalendar";
import { useCreateCalendarEvent } from "@/hooks/calendar/useCreateCalendarEvent";
import { useUpdateCalendarEvent } from "@/hooks/calendar/useUpdateCalendarEvent";
import { useDeleteCalendarEvent } from "@/hooks/calendar/useDeleteCalendarEvent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type EventColor = "blue" | "purple" | "green" | "orange";

type Event = {
  id: string;
  title: string;
  time: string;
  color: EventColor;
  raw: IGoogleEvent;
};

interface IEventForm {
  summary: string;
  description: string;
  allDay: boolean;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  // на сколько дней конец события уходит за дату начала (0 — в тот же день);
  // нужно, чтобы при редактировании не "схлопнуть" многодневное событие
  spanDays: number;
}

const colors: EventColor[] = ["blue", "purple", "green", "orange"];

// стабильно назначаем цвет по id события (Google Calendar не отдаёт наш enum)
const colorForEvent = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
};

const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const formatKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatTimeInput = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

// разница в днях между двумя датами по календарным ключам (без влияния DST)
const daysBetween = (from: Date, to: Date) =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  );

const newEventForm = (date: Date): IEventForm => ({
  summary: "",
  description: "",
  allDay: false,
  date: formatKey(date),
  startTime: "09:00",
  endTime: "10:00",
  spanDays: 0,
});

const formFromEvent = (event: IGoogleEvent): IEventForm => {
  const base = {
    summary: event.summary || "",
    description: event.description || "",
  };

  if (event.start?.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end?.dateTime || event.start.dateTime);
    return {
      ...base,
      allDay: false,
      date: formatKey(start),
      startTime: formatTimeInput(start),
      endTime: formatTimeInput(end),
      spanDays: Math.max(0, daysBetween(start, end)),
    };
  }

  return {
    ...base,
    allDay: true,
    date: event.start?.date || "",
    startTime: "09:00",
    endTime: "10:00",
    spanDays: 0,
  };
};

const getErrorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message || "Something went wrong. Please try again.";

const Calendar = () => {
  const { data: googleEvents, isLoading } = useGetCalendar();
  const { mutate: createEvent, isPending: isCreating } =
    useCreateCalendarEvent();
  const { mutate: updateEvent, isPending: isUpdating } =
    useUpdateCalendarEvent();
  const { mutate: deleteEvent } = useDeleteCalendarEvent();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IEventForm>(() => newEventForm(new Date()));
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  const today = new Date();

  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const events = useMemo(() => {
    const grouped: Record<string, Event[]> = {};

    (googleEvents || []).forEach((event: IGoogleEvent) => {
      const start = event.start?.dateTime || event.start?.date;
      if (!start) return;

      const date = new Date(start);
      const key = formatKey(date);

      const time = event.start?.dateTime
        ? date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "All day";

      grouped[key] = grouped[key] || [];
      grouped[key].push({
        id: event.id,
        title: event.summary || "(no title)",
        time,
        color: colorForEvent(event.id),
        raw: event,
      });
    });

    return grouped;
  }, [googleEvents]);

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    const todayDate = new Date();

    setCurrentMonth(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));

    setSelectedDate(todayDate);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);

    if (
      date.getMonth() !== currentMonth.getMonth() ||
      date.getFullYear() !== currentMonth.getFullYear()
    ) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const openCreate = (date: Date = selectedDate) => {
    setEditingId(null);
    setForm(newEventForm(date));
    setFormError("");
    setActionError("");
    setOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingId(event.id);
    setForm(formFromEvent(event.raw));
    setFormError("");
    setActionError("");
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    setActionError("");
    deleteEvent(id, {
      onError: (error) => setActionError(getErrorMessage(error)),
    });
  };

  const handleSubmit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setFormError("");

    if (!form.summary.trim()) {
      setFormError("Title is required");
      return;
    }
    if (!form.date) {
      setFormError("Date is required");
      return;
    }

    let start: string;
    let end: string | undefined;

    if (form.allDay) {
      // событие на весь день — только дата, конец Google выставит сам
      start = form.date;
    } else {
      if (!form.startTime || !form.endTime) {
        setFormError("Start and end time are required");
        return;
      }
      const [year, month, day] = form.date.split("-").map(Number);
      const startDate = new Date(`${form.date}T${form.startTime}`);
      // конец: та же дата + spanDays (Date сам переносит месяцы/годы)
      const endDate = new Date(
        `${formatKey(new Date(year, month - 1, day + form.spanDays))}T${form.endTime}`,
      );
      if (endDate.getTime() <= startDate.getTime()) {
        setFormError("End time must be after start time");
        return;
      }
      start = startDate.toISOString();
      end = endDate.toISOString();
    }

    const body = {
      summary: form.summary.trim(),
      description: form.description,
      start,
      ...(end ? { end } : {}),
    };
    const options = {
      onSuccess: () => {
        setOpen(false);
        // переходим к дню сохранённого события, чтобы его было видно сразу
        const [y, m, d] = form.date.split("-").map(Number);
        selectDate(new Date(y, m - 1, d));
      },
      onError: (error: unknown) => setFormError(getErrorMessage(error)),
    };

    if (editingId) updateEvent({ id: editingId, ...body }, options);
    else createEvent(body, options);
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);

    // Monday = 0 ... Sunday = 6
    const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const previousMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, previousMonthDays - i));
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    // Next month
    let nextDay = 1;

    while (days.length < 42) {
      days.push(new Date(year, month + 1, nextDay));
      nextDay++;
    }

    return days;
  };

  const calendarDays = getCalendarDays();

  const selectedKey = formatKey(selectedDate);
  const selectedEvents = events[selectedKey] || [];

  const monthTitle = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedWeekday = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    );
  };

  return (
    <div className={css.calendar}>
      {/* HEADER */}
      <header className={css.header}>
        <div className={css.headerLeft}>
          <button className={css.todayButton} onClick={goToToday}>
            Today
          </button>

          <div className={css.navigation}>
            <button onClick={previousMonth}>‹</button>
            <button onClick={nextMonth}>›</button>
          </div>
        </div>

        <h1 className={css.monthTitle}>{monthTitle}</h1>

        <div className={css.headerRight}>
          <button className={css.newButton} onClick={() => openCreate()}>
            <Plus size={16} /> New event
          </button>
          <button className={css.iconButton}>⌕</button>
          <button className={css.iconButton}>⚙</button>

          <button className={css.viewButton}>
            Month
            <span>⌄</span>
          </button>
        </div>
      </header>

      {/* CALENDAR */}
      <div className={css.calendarContent}>
        <main className={css.monthCalendar}>
          {/* WEEK DAYS */}
          <div className={css.weekDays}>
            {weekDays.map((day) => (
              <div key={day} className={css.weekDay}>
                {day}
              </div>
            ))}
          </div>

          {/* DAYS */}
          <div className={css.daysGrid}>
            {calendarDays.map((date) => {
              const key = formatKey(date);
              const dayEvents = events[key] || [];

              const selected = isSameDay(date, selectedDate);

              const todayDay = isSameDay(date, today);

              return (
                <div
                  key={key}
                  className={`${css.dayCell} ${
                    !isCurrentMonth(date) ? css.otherMonth : ""
                  } ${selected ? css.selectedCell : ""}`}
                  onClick={() => selectDate(date)}
                >
                  <div className={css.dayNumberWrapper}>
                    <span
                      className={`${css.dayNumber} ${
                        todayDay ? css.todayNumber : ""
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className={css.events}>
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`${css.event} ${css[`event${event.color}`]}`}
                        onClick={(clickEvent) => {
                          // не даём клику дойти до ячейки дня — иначе выберется день
                          clickEvent.stopPropagation();
                          openEdit(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className={css.sidebar}>
          <div className={css.sidebarHeader}>
            <span className={css.sidebarWeekday}>{selectedWeekday}</span>

            <h2>
              {selectedDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </h2>

            <button className={css.addEventButton} onClick={() => openCreate()}>
              <Plus size={15} /> Add event
            </button>
          </div>

          <div className={css.sidebarEvents}>
            {actionError && <div className={css.errorBox}>{actionError}</div>}
            {selectedEvents.length > 0 ? (
              selectedEvents.map((event) => (
                <div key={event.id} className={css.sidebarEvent}>
                  <span
                    className={`${css.eventDot} ${css[`dot${event.color}`]}`}
                  />

                  <div className={css.eventText}>
                    <strong>{event.title}</strong>
                    <span>{event.time}</span>
                  </div>

                  <div className={css.eventActions}>
                    <button
                      title="Edit event"
                      aria-label="Edit event"
                      onClick={() => openEdit(event)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      title="Delete event"
                      aria-label="Delete event"
                      className={css.deleteAction}
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={css.noEvents}>
                {isLoading ? "Loading events..." : "No events"}
              </div>
            )}
          </div>
        </aside>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{editingId ? "Edit event" : "New event"}</SheetTitle>
              <SheetDescription>
                {editingId
                  ? "Update this Google Calendar event."
                  : "Add an event to your Google Calendar."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Title
                </label>
                <Input
                  value={form.summary}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, summary: event.target.value }))
                  }
                  placeholder="Event title"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Date
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, date: event.target.value }))
                  }
                  required
                />
              </div>

              {/* тип события (весь день / по времени) у уже созданного не меняем:
                  patch не превращает date в dateTime без явного end */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  disabled={!!editingId}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, allDay: event.target.checked }))
                  }
                />
                All day
              </label>

              {!form.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Start
                    </label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, startTime: event.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      End
                    </label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, endTime: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, description: event.target.value }))
                  }
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>

              {formError && <div className={css.errorBox}>{formError}</div>}
            </div>

            <SheetFooter>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add event"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    handleDelete(editingId);
                    setOpen(false);
                  }}
                >
                  Delete event
                </Button>
              )}
              <SheetClose render={<Button type="button" variant="outline" />}>
                Cancel
              </SheetClose>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Calendar;
