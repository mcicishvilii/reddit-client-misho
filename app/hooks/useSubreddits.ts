import { useCallback, useEffect, useReducer } from "react";
import { fetchSubreddit, normalizeSubredditInput, SubredditBlock } from "../lib/reddit";

type State = {
  subreddits: SubredditBlock[];
  isAdding: boolean;
  loadingByKey: Record<string, boolean>;
  errorMessage: string | null;
};

type Action =
  | { type: "INIT"; payload: SubredditBlock[] }
  | { type: "ERROR"; message: string }
  | { type: "ADD_LOADING" }
  | { type: "ADD_SUCCESS"; payload: SubredditBlock }
  | { type: "REFRESH_LOADING"; key: string }
  | { type: "REFRESH_SUCCESS"; payload: SubredditBlock }
  | { type: "REMOVE"; key: string }
  | { type: "CLEAR" };

const STORAGE_KEY = "subreddits:v1";

const initialState: State = {
  subreddits: [],
  isAdding: false,
  loadingByKey: {},
  errorMessage: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return { ...state, subreddits: action.payload };

    case "ERROR":
      return { ...state, isAdding: false, errorMessage: action.message };

    case "ADD_LOADING":
      return { ...state, isAdding: true, errorMessage: null };

    case "ADD_SUCCESS": {
      const exists = state.subreddits.some((s) => s.key === action.payload.key);
      if (exists) return { ...state, isAdding: false, errorMessage: "Already added" };
      return {
        ...state,
        isAdding: false,
        errorMessage: null,
        subreddits: [...state.subreddits, action.payload],
      };
    }

    case "REFRESH_LOADING":
      return {
        ...state,
        errorMessage: null,
        loadingByKey: { ...state.loadingByKey, [action.key]: true },
      };

    case "REFRESH_SUCCESS": {
      const key = action.payload.key;
      const next = { ...state.loadingByKey };
      delete next[key];

      return {
        ...state,
        errorMessage: null,
        loadingByKey: next,
        subreddits: state.subreddits.map((s) => (s.key === key ? action.payload : s)),
      };
    }

    case "REMOVE": {
      const next = { ...state.loadingByKey };
      delete next[action.key];

      return {
        ...state,
        subreddits: state.subreddits.filter((s) => s.key !== action.key),
        loadingByKey: next,
      };
    }

    case "CLEAR":
      return { ...state, subreddits: [], loadingByKey: {} };

    default:
      return state;
  }
}

function safeParseSubreddits(value: string | null): SubredditBlock[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = safeParseSubreddits(window.localStorage.getItem(STORAGE_KEY));
    dispatch({ type: "INIT", payload: saved });
  }, []);

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

    dispatch({ type: "ADD_LOADING" });

    try {
      const block = await fetchSubreddit(normalized);
      dispatch({ type: "ADD_SUCCESS", payload: block });
    } catch (e: any) {
      dispatch({ type: "ERROR", message: e?.message ?? "Failed to add subreddit" });
    }
  }, []);

  const refreshSubreddit = useCallback(async (key: string, subName: string) => {
    dispatch({ type: "REFRESH_LOADING", key });

    try {
      const block = await fetchSubreddit(subName);
      dispatch({ type: "REFRESH_SUCCESS", payload: { ...block, key } });
    } catch (e: any) {
      dispatch({ type: "REFRESH_SUCCESS", payload: { key, sub_name: subName, posts: [] } as any });
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
    isAdding: state.isAdding,
    loadingByKey: state.loadingByKey,
    errorMessage: state.errorMessage,
    addSubreddit,
    refreshSubreddit,
    removeSubreddit,
    clearAll,
  };
}
