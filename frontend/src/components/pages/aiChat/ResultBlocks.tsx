import type { ReactNode } from "react";
import css from "./aiChat.module.css";
import type { IChatBlock } from "@/hooks/chat/useSendMessage";

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  new: "New",
  won: "Won",
  lost: "Lost",
};

const formatAmount = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

const BlockTitle = ({ children }: { children: ReactNode }) => (
  <div className={css.blockTitle}>{children}</div>
);

const ResultBlock = ({ block }: { block: IChatBlock }) => {
  if (!block.items || block.items.length === 0) {
    return (
      <div className={css.resultBlock}>
        <p className={css.blockEmpty}>Nothing found.</p>
      </div>
    );
  }

  if (block.type === "gmail") {
    return (
      <div className={css.resultBlock}>
        <BlockTitle>Gmail</BlockTitle>
        {block.items.map((item) => (
          <div key={item.id} className={css.resultRow}>
            <div className={css.resultRowTop}>
              <strong>{item.subject || "(no subject)"}</strong>
              <span className={css.resultMeta}>{formatDate(item.date)}</span>
            </div>
            <p className={css.resultSub}>{item.from}</p>
            <p className={css.resultText}>{item.snippet}</p>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "calendar") {
    return (
      <div className={css.resultBlock}>
        <BlockTitle>Calendar</BlockTitle>
        {block.items.map((item) => (
          <div key={item.id} className={css.resultRow}>
            <div className={css.resultRowTop}>
              <strong>{item.title}</strong>
              <span className={css.resultMeta}>{formatDate(item.start)}</span>
            </div>
            {item.location && <p className={css.resultSub}>{item.location}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "drive") {
    return (
      <div className={css.resultBlock}>
        <BlockTitle>Drive</BlockTitle>
        {block.items.map((item) => (
          <a
            key={item.id}
            href={item.webViewLink}
            target="_blank"
            rel="noreferrer"
            className={css.resultRow}
          >
            <div className={css.resultRowTop}>
              <strong>{item.name}</strong>
              <span className={css.resultMeta}>{formatDate(item.modifiedTime)}</span>
            </div>
          </a>
        ))}
      </div>
    );
  }

  if (block.type === "notes") {
    return (
      <div className={css.resultBlock}>
        <BlockTitle>Notes</BlockTitle>
        {block.items.map((item) => (
          <div key={item.id} className={css.resultRow}>
            <div className={css.resultRowTop}>
              <strong>{item.title || "Untitled note"}</strong>
              <span className={css.resultMeta}>{formatDate(item.updated_at)}</span>
            </div>
            <p className={css.resultText}>{item.content}</p>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "tasks") {
    return (
      <div className={css.resultBlock}>
        <BlockTitle>Tasks</BlockTitle>
        {block.items.map((item) => (
          <div key={item.id} className={css.resultRow}>
            <div className={css.resultRowTop}>
              <strong>{item.title}</strong>
              <span className={css.resultBadge}>
                {statusLabel[item.status] || item.status}
              </span>
            </div>
            {item.description && <p className={css.resultText}>{item.description}</p>}
            {item.due_date && (
              <p className={css.resultSub}>Due {formatDate(item.due_date)}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "contacts") {
    return (
      <div className={css.resultBlock}>
        <BlockTitle>Contacts</BlockTitle>
        {block.items.map((item) => (
          <div key={item.id} className={css.resultRow}>
            <strong>{item.name}</strong>
            <p className={css.resultSub}>
              {[item.company, item.email, item.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "deals") {
    return (
      <div className={css.resultBlock}>
        <BlockTitle>Deals</BlockTitle>
        {block.items.map((item) => (
          <div key={item.id} className={css.resultRow}>
            <div className={css.resultRowTop}>
              <strong>{item.title}</strong>
              <span className={css.resultBadge}>
                {statusLabel[item.stage] || item.stage}
              </span>
            </div>
            <p className={css.resultSub}>
              {[item.contact_name, formatAmount(item.amount)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const ResultBlocks = ({ blocks }: { blocks: IChatBlock[] }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className={css.resultBlocks}>
      {blocks.map((block, index) => (
        <ResultBlock key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
};

export default ResultBlocks;
