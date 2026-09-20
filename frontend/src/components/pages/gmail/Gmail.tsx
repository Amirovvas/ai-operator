"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Trash2 } from "lucide-react";
import { useGetGmail } from "@/hooks/gmail/useGetGmail";
import { useGetGmailThread } from "@/hooks/gmail/useGetGmailThread";
import { useReplyGmail } from "@/hooks/gmail/useReplyGmail";
import { useDeleteGmail } from "@/hooks/gmail/useDeleteGmail";
import css from "./gmail.module.css";
import { CiStar } from "react-icons/ci";
import { IoSearchSharp } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const getHeader = (gmail: any, name: string) =>
  gmail?.payload?.headers?.find((header: any) => header.name === name)
    ?.value || "";

// "Иван Иванов" <ivan@mail.com> -> Иван Иванов, а без имени — сам адрес
const getSenderName = (from: string) =>
  from.replace(/<.*>/, "").replace(/"/g, "").trim() ||
  from.replace(/[<>]/g, "");

const getErrorInfo = (error: unknown) => {
  const err = error as {
    response?: { status?: number; data?: { message?: string } };
  };
  return {
    message:
      err?.response?.data?.message ||
      "Something went wrong. Please try again.",
    // 403 у Gmail — у токена нет прав на запись, нужно заново войти через Google
    needsReconnect: err?.response?.status === 403,
  };
};

const Gmail = () => {
  const { data: gmails } = useGetGmail();
  const [search, setSearch] = useState("");

  const [threadId, setThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [actionError, setActionError] = useState<{
    message: string;
    needsReconnect: boolean;
  } | null>(null);

  const {
    data: thread,
    isLoading: isThreadLoading,
    error: threadError,
  } = useGetGmailThread(threadId);
  const { mutate: sendReply, isPending: isSending } = useReplyGmail();
  const {
    mutate: deleteThread,
    isPending: isDeleting,
    variables: deletingThreadId,
  } = useDeleteGmail();

  const filteredGmails = gmails?.filter((gmail: any) => {
    const from = getHeader(gmail, "From");
    const subject = getHeader(gmail, "Subject");
    return `${from} ${subject} ${gmail.snippet || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const openThread = (id: string) => {
    setThreadId(id);
    setReplyText("");
    setActionError(null);
  };

  const closeThread = () => {
    setThreadId(null);
    setReplyText("");
    setActionError(null);
  };

  const handleDelete = (id: string) => {
    setActionError(null);
    deleteThread(id, {
      onSuccess: () => {
        if (id === threadId) closeThread();
      },
      onError: (error) => setActionError(getErrorInfo(error)),
    });
  };

  const handleReply = (event?: FormEvent) => {
    event?.preventDefault();
    const text = replyText.trim();
    if (!threadId || !text) return;

    setActionError(null);
    sendReply(
      { threadId, body: text },
      {
        onSuccess: () => setReplyText(""),
        onError: (error) => setActionError(getErrorInfo(error)),
      },
    );
  };

  // Ctrl/Cmd + Enter — отправить, как в самом Gmail
  const handleReplyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      handleReply();
    }
  };

  const lastMessage = thread?.messages.at(-1);
  // отвечаем на последнее письмо; если оно моё — его получателю
  const replyTarget = lastMessage
    ? getSenderName(lastMessage.isMine ? lastMessage.to : lastMessage.from)
    : "";

  const listError = threadError ? getErrorInfo(threadError) : null;

  return (
    <div className={css.container}>
      <div className="container">
        <div className={css.mainContainer}>
          <div className={css.top}>
            <span>
              <IoSearchSharp />
            </span>
            <input
              type="text"
              placeholder="search emails"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className={css.main}>
            <div className={css.topMain}>
              <h2>Inbox</h2>
              <p>{filteredGmails?.length || 0} messages</p>
            </div>

            {actionError && !threadId && (
              <div className={css.errorBox}>
                {actionError.message}
                {actionError.needsReconnect && (
                  <a href="http://localhost:5000/auth/google">Reconnect Google</a>
                )}
              </div>
            )}

            <div className={css.list}>
              {filteredGmails?.map((gmail: any) => {
                const from = getHeader(gmail, "From");
                const senderName = getSenderName(from);
                const subject = getHeader(gmail, "Subject");
                const isBeingDeleted =
                  isDeleting && deletingThreadId === gmail.threadId;

                return (
                  <div
                    className={`${css.message} ${css.messageRow} ${
                      isBeingDeleted ? css.deleting : ""
                    }`}
                    key={gmail.id}
                    onClick={() => openThread(gmail.threadId)}
                  >
                    <div className={css.messageTop}>
                      <input
                        type="checkbox"
                        onClick={(event) => event.stopPropagation()}
                      />

                      <span>
                        <CiStar />
                      </span>

                      <h5>{senderName}</h5>

                      <p>
                        {new Date(
                          Number(gmail.internalDate),
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      <button
                        className={css.trashBtn}
                        title="Delete conversation"
                        aria-label="Delete conversation"
                        disabled={isBeingDeleted}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(gmail.threadId);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <p className={css.subject}>{subject}</p>

                    <p className={css.preview}>{gmail.snippet.slice(0, 45)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Sheet
        open={!!threadId}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeThread();
        }}
      >
        <SheetContent className="w-full sm:max-w-xl">
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader>
              <SheetTitle className="pr-8">
                {thread?.subject || "Conversation"}
              </SheetTitle>
              <SheetDescription>
                {thread
                  ? `${thread.messages.length} ${
                      thread.messages.length === 1 ? "message" : "messages"
                    } in this conversation`
                  : "Loading conversation..."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4">
              {isThreadLoading && (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}

              {listError && (
                <div className={css.errorBox}>
                  {listError.message}
                  {listError.needsReconnect && (
                    <a href="http://localhost:5000/auth/google">
                      Reconnect Google
                    </a>
                  )}
                </div>
              )}

              {thread?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`${css.threadMessage} ${
                    message.isMine ? css.mine : ""
                  }`}
                >
                  <div className={css.threadMeta}>
                    <strong>
                      {message.isMine ? "You" : getSenderName(message.from)}
                    </strong>
                    <span>
                      {message.date
                        ? new Date(message.date).toLocaleString([], {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <div className={css.threadTo}>
                    to {message.isMine ? getSenderName(message.to) : "me"}
                  </div>
                  <div className={css.threadBody}>{message.body}</div>
                </div>
              ))}
            </div>

            {thread && (
              <form onSubmit={handleReply} className={css.replyForm}>
                {actionError && (
                  <div className={css.errorBox}>
                    {actionError.message}
                    {actionError.needsReconnect && (
                      <a href="http://localhost:5000/auth/google">
                        Reconnect Google
                      </a>
                    )}
                  </div>
                )}

                <label className="text-xs font-medium text-muted-foreground">
                  Reply to {replyTarget}
                </label>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder="Write your reply... (Ctrl+Enter to send)"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                  >
                    {isSending ? "Sending..." : "Send reply"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => threadId && handleDelete(threadId)}
                  >
                    <Trash2 size={14} /> Delete conversation
                  </Button>
                </div>
              </form>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Gmail;
