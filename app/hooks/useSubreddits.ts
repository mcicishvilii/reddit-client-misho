import { useCallback, useEffect, useReducer } from "react";
import { fetchSubreddit, normalizeSubredditInput, SubredditBlock } from "../lib/reddit";

type State = {
  subreddits: SubredditBlock[];
  isLoading: boolean;
  errorMessage: string | null;
};

type Action =
  | { type: "LOADING" }
  | { type: "ERROR"; message: string }
  | { type: "ADD"; payload: SubredditBlock }
  | { type: "REFRESH"; payload: SubredditBlock }
  | { type: "REMOVE"; key: string }
  | { type: "CLEAR" }
  | { type: "INIT"; payload: SubredditBlock[] };

const STORAGE_KEY = "subreddits:v1";

const initialState: State = {
  subreddits: [],
  isLoading: false,
  errorMessage: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return { ...state, subreddits: action.payload };

    case "LOADING":
      return { ...state, isLoading: true, errorMessage: null };

    case "ERROR":
      return { ...state, isLoading: false, errorMessage: action.message };

    case "ADD": {
      const exists = state.subreddits.some((s) => s.key === action.payload.key);
      if (exists) return { ...state, isLoading: false, errorMessage: "Already added" };
      return {
        ...state,
        isLoading: false,
        errorMessage: null,
        subreddits: [...state.subreddits, action.payload],
      };
    }

    case "REFRESH":
      return {
        ...state,
        isLoading: false,
        errorMessage: null,
        subreddits: state.subreddits.map((s) =>
          s.key === action.payload.key ? action.payload : s
        ),
      };

    case "REMOVE":
      return {
        ...state,
        subreddits: state.subreddits.filter((s) => s.key !== action.key),
      };

    case "CLEAR":
      return { ...state, subreddits: [] };

    default:
      return state;
  }
}

function safeParseSubreddits(value: string | null): SubredditBlock[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    // basic shape validation
    return parsed
      .filter((x) => x && typeof x.key === "string" && typeof x.sub_name === "string")
      .map((x) => ({
        key: String(x.key),
        sub_name: String(x.sub_name),
        posts: Array.isArray(x.posts)
          ? x.posts.map((p: any) => ({
              id: String(p?.id ?? ""),
              title: String(p?.title ?? ""),
              votes: Number(p?.votes ?? 0),
              permalink: String(p?.permalink ?? ""),
              url: String(p?.url ?? ""),
            }))
          : [],
      }));
  } catch {
    return [];
  }
}

export function useSubreddits() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 1) Load once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = safeParseSubreddits(window.localStorage.getItem(STORAGE_KEY));
    dispatch({ type: "INIT", payload: saved });
  }, []);

  // 2) Persist whenever list changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.subreddits));
  }, [state.subreddits]);

  const addSubreddit = useCallback(async (input: string) => {
    const normalized = normalizeSubredditInput(input);
    if (!normalized) {
      dispatch({ type: "ERROR", message: "Type a subreddit name" });
      return;
    }

    dispatch({ type: "LOADING" });

    try {
      const block = await fetchSubreddit(normalized);
      dispatch({ type: "ADD", payload: block });
    } catch (e: any) {
      dispatch({ type: "ERROR", message: e?.message ?? "Failed to add subreddit" });
    }
  }, []);

  const refreshSubreddit = useCallback(async (key: string, subName: string) => {
    dispatch({ type: "LOADING" });

    try {
      const block = await fetchSubreddit(subName);
      dispatch({ type: "REFRESH", payload: { ...block, key } });
    } catch (e: any) {
      dispatch({ type: "ERROR", message: e?.message ?? "Failed to refresh subreddit" });
    }
  }, []);

  const removeSubreddit = useCallback((key: string) => {
    dispatch({ type: "REMOVE", key });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  return {
    subreddits: state.subreddits,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    addSubreddit,
    refreshSubreddit,
    removeSubreddit,
    clearAll,
  };
}
