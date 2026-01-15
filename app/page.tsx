"use client";

import { useEffect, useRef, useState } from "react";
import { useSubreddits } from "./hooks/useSubreddits";
import styles from "./css/page.module.css";

export default function Home() {
  const {
    subreddits,
    isAdding,
    loadingByKey,
    errorMessage,
    addSubreddit,
    refreshSubreddit,
    removeSubreddit,
    clearAll,
  } = useSubreddits();

  const [input, setInput] = useState("");
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openAddDialog = () => dialogRef.current?.showModal();
  const closeAddDialog = () => dialogRef.current?.close();

  // close on ESC is native; this makes sure input clears on close
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;

    const onClose = () => setInput("");
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);

  return (
    <main className={styles.main}>
      <h1 className={styles.header}>Subreddits</h1>

      <div className={styles.controls}>
        <button
          className={styles.addCircleButton}
          onClick={openAddDialog}
          disabled={isAdding}
          aria-label="Add subreddit"
          title="Add subreddit"
        >
          +
        </button>

        {/* Clear should NOT be blocked by refresh of a single card */}
        <button onClick={clearAll} disabled={subreddits.length === 0}>
          Clear
        </button>
      </div>

      {/* Add dialog */}
      <dialog ref={dialogRef} className={styles.addDialog}>
        <form
          method="dialog"
          className={styles.addDialogContent}
          onSubmit={(e) => {
            e.preventDefault();
            addSubreddit(input);
            closeAddDialog();
          }}
        >
          <p className={styles.addDialogTitle}>Enter the name of subreddit</p>

          <input
            className={styles.addDialogInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Frontend or r/Frontend"
            autoFocus
          />

          <div className={styles.addDialogActions}>
            <button
              type="button"
              className={styles.addDialogCancel}
              onClick={closeAddDialog}
              disabled={isAdding}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={styles.addDialogSubmit}
              disabled={isAdding || input.trim().length === 0}
            >
              Add Subreddit
            </button>
          </div>
        </form>
      </dialog>

      {errorMessage && <div className={styles.error}>Error: {errorMessage}</div>}

      <div className={styles.subredditRow}>
        {subreddits.map((sub) => {
          const isMenuOpen = openMenuKey === sub.key;
          const isRefreshing = !!loadingByKey[sub.key];

          return (
            <section key={sub.key} className={styles.subredditCard}>
              <div className={styles.subredditHeader}>
                <h2 className={styles.subredditTitle}>{sub.sub_name}</h2>

                <div className={styles.menuWrap}>
                  <button
                    className={styles.menuButton}
                    onClick={() => setOpenMenuKey(isMenuOpen ? null : sub.key)}
                    disabled={isRefreshing}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    title="Menu"
                  >
                    {/* show spinner while this specific card is refreshing */}
                    {isRefreshing ? <span className={styles.spinner} /> : "⋯"}
                  </button>

                  {isMenuOpen && (
                    <div
                      className={styles.dropdown}
                      role="menu"
                      onMouseLeave={() => setOpenMenuKey(null)}
                    >
                      <button
                        className={styles.dropdownItem}
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuKey(null);
                          refreshSubreddit(sub.key, sub.sub_name);
                        }}
                        disabled={isRefreshing}
                      >
                        Refresh
                      </button>

                      <div className={styles.dropdownSeparator} />

                      <button
                        className={styles.dropdownItem}
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuKey(null);
                          removeSubreddit(sub.key);
                        }}
                        disabled={isRefreshing}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <ul className={styles.postList}>
                {sub.posts.map((p, idx) => (
                  <li key={p.id} className={styles.postItem}>
                    <div className={styles.postRow}>
                      <a
                        href={p.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.postLink}
                        title={p.title}
                      >
                        {p.title}
                      </a>
                      <span className={styles.votes}>{p.votes}↑</span>
                    </div>

                    {idx !== sub.posts.length - 1 && <hr className={styles.separator} />}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

    </main>
  );
}
