export type RedditPost = {
    id: string;
    title: string;
    votes: number;
    permalink: string;
    url: string;
};

export type SubredditBlock = {
    key: string;
    sub_name: string;
    posts: RedditPost[];
};

export function normalizeSubredditInput(raw: string): string {
    const s = raw.trim();

    if (s.startsWith("r/")) return s.slice(2);

    try {
        const u = new URL(s);
        const parts = u.pathname.split("/").filter(Boolean);
        const rIndex = parts.indexOf("r");
        if (rIndex !== -1 && parts[rIndex + 1]) return parts[rIndex + 1];
    } catch { }

    return s;
}

export async function fetchSubreddit(rawName: string): Promise<SubredditBlock> {
    const name = normalizeSubredditInput(rawName);
    const key = name.toLowerCase();

    if (!name) throw new Error("Subreddit name is empty");
    if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error("Invalid subreddit name");

    const res = await fetch(`https://www.reddit.com/r/${name}.json`, {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Subreddit not accessible (${res.status})`);
    }

    const json = await res.json();
    const children = json?.data?.children;

    if (!Array.isArray(children)) {
        throw new Error("Invalid Reddit response");
    }

    const posts: RedditPost[] = children
        .map((item: any) => item?.data)
        .filter(Boolean)
        .slice(0, 10)
        .map((post: any) => ({
            id: String(post.id),
            title: String(post.title ?? ""),
            votes: Number(post.ups ?? 0),
            permalink: `https://www.reddit.com${post.permalink}`,
            url: String(post.url ?? ""),
        }));

    return {
        key,
        sub_name: `r/${name}`,
        posts,
    };
}
