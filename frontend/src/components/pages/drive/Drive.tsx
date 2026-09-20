"use client";

import { useState } from "react";
import css from "./drive.module.css";
import { CiFolderOn } from "react-icons/ci";
import { CiFileOn } from "react-icons/ci";
import { useGetDrive, type IDriveFile } from "@/hooks/drive/useGetDrive";

const FOLDER_MIME = "application/vnd.google-apps.folder";

const iconStyles: { match: (mimeType: string) => boolean; bg: string; color: string }[] = [
  { match: (m) => m.includes("pdf"), bg: "#fde3e1", color: "#e0523f" },
  { match: (m) => m.includes("document") || m.includes("word"), bg: "#e2e9fd", color: "#4169e1" },
  { match: (m) => m.includes("spreadsheet") || m.includes("sheet"), bg: "#e1f5e6", color: "#2fa84f" },
  { match: (m) => m.includes("presentation"), bg: "#fdf1dc", color: "#d99a2b" },
  { match: (m) => m.includes("image"), bg: "#f3e8fd", color: "#8b5cf6" },
];

const getIconStyle = (mimeType: string) =>
  iconStyles.find((style) => style.match(mimeType)) || {
    bg: "#f1f0ee",
    color: "#6b6b6b",
  };

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const formatSize = (value?: string) => {
  if (!value) return "—";
  const bytes = Number(value);
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const Disk = () => {
  const { data: driveFiles, isLoading } = useGetDrive();
  const [search, setSearch] = useState("");

  const items: IDriveFile[] = driveFiles || [];
  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const folders = filtered.filter((item) => item.mimeType === FOLDER_MIME);
  const files = filtered.filter((item) => item.mimeType !== FOLDER_MIME);

  return (
    <div className={css.container}>
      {/* Top bar */}
      <div className={css.topBar}>
        <button className={css.sidebarToggle} aria-label="Toggle sidebar">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect
              x="1"
              y="1"
              width="16"
              height="16"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1="7"
              y1="1"
              x2="7"
              y2="17"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>

        <div className={css.searchBar}>
          <svg
            className={css.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle
              cx="7"
              cy="7"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1="11"
              y1="11"
              x2="15"
              y2="15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search in Drive..."
            className={css.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className={css.topBarRight}>
          <div className={css.viewToggle}>
            <button className={css.viewToggleBtn} aria-label="List view" />
            <button className={css.viewToggleBtn} aria-label="Grid view" />
          </div>
          <button className={css.uploadButton}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 10V2M7 2L4 5M7 2L10 5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M1 11V12.5C1 12.7761 1.22386 13 1.5 13H12.5C12.7761 13 13 12.7761 13 12.5V11"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Upload
          </button>
        </div>
      </div>

      {/* Header */}
      <div className={css.header}>
        <h1 className={css.heading}>My Drive</h1>
        <button className={css.newButton}>+ New</button>
      </div>

      {isLoading && <p className={css.sectionLabel}>Loading files...</p>}

      {!isLoading && items.length === 0 && (
        <p className={css.sectionLabel}>
          No Drive files found. Make sure your Google account is connected.
        </p>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <section className={css.section}>
          <h2 className={css.sectionLabel}>Folders</h2>
          <div className={css.folderGrid}>
            {folders.map((folder) => (
              <a
                key={folder.id}
                href={folder.webViewLink}
                target="_blank"
                rel="noreferrer"
                className={css.folderCard}
              >
                <span className={css.folderIcon}>
                  <span>
                    <CiFolderOn />
                  </span>
                </span>
                <span className={css.folderName}>{folder.name}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Files */}
      {files.length > 0 && (
        <section className={css.section}>
          <h2 className={css.sectionLabel}>Files</h2>
          <div className={css.table}>
            <div className={css.tableHeaderRow}>
              <span className={css.colName}>NAME</span>
              <span className={css.colOwner}>OWNER</span>
              <span className={css.colModified}>LAST MODIFIED</span>
              <span className={css.colSize}>FILE SIZE</span>
            </div>

            {files.map((file) => {
              const iconStyle = getIconStyle(file.mimeType);

              return (
                <a
                  key={file.id}
                  href={file.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className={css.tableRow}
                >
                  <span className={css.colName}>
                    <span
                      className={css.fileIcon}
                      style={{ background: iconStyle.bg, color: iconStyle.color }}
                    >
                      <CiFileOn />
                    </span>
                    <span className={css.fileName}>{file.name}</span>
                    {file.starred && <span className={css.star}>★</span>}
                  </span>
                  <span className={css.colOwner}>
                    {file.owners?.[0]?.displayName || "me"}
                  </span>
                  <span className={css.colModified}>
                    {formatDate(file.modifiedTime)}
                  </span>
                  <span className={css.colSize}>{formatSize(file.size)}</span>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default Disk;
