"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import css from "./aiChat.module.css";

import { HiOutlineInboxArrowDown } from "react-icons/hi2";
import { CiCalendarDate } from "react-icons/ci";
import { CiFolderOn } from "react-icons/ci";
import { MdOutlineNoteAlt } from "react-icons/md";
import { IoMdSend } from "react-icons/io";
import { useSendMessage } from "@/hooks/chat/useSendMessage";
import type { IChatBlock } from "@/hooks/chat/useSendMessage";
import ResultBlocks from "./ResultBlocks";
import { LogoMark } from "@/components/layout/Logo";

interface IMessage {
  id: number;
  role: "user" | "ai";
  text: string;
  blocks?: IChatBlock[];
}

const suggestions = [
  {
    icon: <HiOutlineInboxArrowDown />,
    title: "Inbox summary",
    desc: "Summarize the most important emails in my inbox today",
  },
  {
    icon: <CiCalendarDate />,
    title: "Today's schedule",
    desc: "What's on my calendar for today?",
  },
  {
    icon: <CiFolderOn />,
    title: "Find a file",
    desc: "Find the latest budget file in my Drive",
  },
  {
    icon: <MdOutlineNoteAlt />,
    title: "Create a note",
    desc: "Create a note with today's meeting takeaways",
  },
];

const AiChatContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [input, setInput] = useState("");

  const { mutate: send, isPending: isThinking } = useSendMessage();

  // isPending обновляется асинхронно (через ре-рендер React), поэтому двойной
  // клик/Enter до этого обновления мог отправить сообщение дважды — ref блокирует
  // повторный вызов сразу, синхронно
  const isSendingRef = useRef(false);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || isThinking || isSendingRef.current) return;
    isSendingRef.current = true;

    const userMessage: IMessage = {
      id: Date.now(),
      role: "user",
      text: trimmed,
    };

    const history = messages.map((message) => ({
      role: message.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: message.text,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    send(
      {
        message: trimmed,
        history,
      },
      {
        onSuccess: ({ reply, blocks }) => {
          isSendingRef.current = false;
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "ai",
              text: reply,
              blocks,
            },
          ]);
        },

        onError: (error: any) => {
          isSendingRef.current = false;
          const status = error?.response?.status;

          let text = "Something went wrong. Try again in a moment.";
          if (status === 429) {
            text =
              "The AI is rate-limited right now — please wait a moment and try again.";
          } else if (status === 503) {
            text =
              "The AI service is temporarily overloaded — please try again in a moment.";
          }

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "ai",
              text,
            },
          ]);
        },
      },
    );
  };

  // приходя с дашборда через "Ask AI" (?q=...), сразу отправляем вопрос один раз
  useEffect(() => {
    const question = searchParams.get("q");
    if (!question) return;

    router.replace("/aiChat");
    sendMessage(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    sendMessage(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

      sendMessage(input);
    }
  };

  return (
    <div className={css.container}>
      <main className={css.main}>
        {messages.length === 0 ? (
          <>
            <div className={css.heroIcon}>
              <LogoMark size={26} />
            </div>

            <h1 className={css.heroTitle}>How can I help?</h1>

            <p className={css.heroSubtitle}>
              Ask me about your Gmail, Calendar, Drive or Notes — or try one of
              these.
            </p>

            <div className={css.suggestionGrid}>
              {suggestions.map((item) => (
                <button
                  key={item.title}
                  className={css.suggestionCard}
                  onClick={() => sendMessage(item.desc)}
                  disabled={isThinking}
                >
                  <span className={css.cardIcon}>{item.icon}</span>

                  <span className={css.cardText}>
                    <span className={css.cardTitle}>{item.title}</span>

                    <span className={css.cardDesc}>{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={css.messages}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${css.messageRow} ${
                  message.role === "user" ? css.userRow : css.aiRow
                }`}
              >
                <div className={css.messageGroup}>
                  {/* когда есть структурированные блоки, показываем только их —
                      сопроводительный текст модели (со списком заголовков для
                      контекста, "второй пункт" и т.п.) остаётся только в истории,
                      на экране он просто дублировал бы блоки */}
                  {message.text && !message.blocks?.length && (
                    <div
                      className={`${css.messageBubble} ${
                        message.role === "user" ? css.userBubble : css.aiBubble
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  {message.blocks && message.blocks.length > 0 && (
                    <ResultBlocks blocks={message.blocks} />
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className={`${css.messageRow} ${css.aiRow}`}>
                <div className={css.messageGroup}>
                  <div className={`${css.messageBubble} ${css.aiBubble}`}>
                    Thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </main>

      <form className={css.inputBar} onSubmit={handleSubmit}>
        <div className={css.inputWrapper}>
          <input
            type="text"
            className={css.chatInput}
            placeholder="Message AI Operator..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            type="submit"
            className={css.sendButton}
            disabled={!input.trim() || isThinking}
          >
            <IoMdSend />
          </button>
        </div>
      </form>
    </div>
  );
};

const AiChat = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AiChatContent />
    </Suspense>
  );
};

export default AiChat;
