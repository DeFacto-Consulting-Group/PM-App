export type DiaryEntry = {
  id: string;
  linked_project: string;
  follow_up_date: string; // YYYY-MM-DD
  notes: string;
  input_date: string; // ISO datetime
};

export const DIARY_STORAGE_KEY = "dfcg:diary_entries:v1";
export const DIARY_STORAGE_EVENT = "dfcg:diary_entries_updated";

const isBrowser = typeof window !== "undefined";

function emitDiaryUpdated() {
  if (!isBrowser) return;
  window.dispatchEvent(new Event(DIARY_STORAGE_EVENT));
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getSeedEntries(): DiaryEntry[] {
  return [
    {
      id: "seed-1200-classico",
      linked_project: "1200 Classico Holdings",
      follow_up_date: "2025-06-20",
      notes: "follow up with J.Moore if no contact",
      input_date: "2025-06-17T20:51:53.000Z",
    },
    {
      id: "seed-1180-marshall",
      linked_project: "1180 Marshall",
      follow_up_date: "2025-06-20",
      notes: "follow up with umpire to schedule panel meeting",
      input_date: "2025-06-17T20:17:03.000Z",
    },
    {
      id: "seed-1175-cinetek",
      linked_project: "1175 Cinetek",
      follow_up_date: "2025-06-23",
      notes: "Monday site visit ; follow up w/ client after",
      input_date: "2025-06-17T20:55:25.000Z",
    },
    {
      id: "seed-1171-mrs-lancaster",
      linked_project: "1171 MRS Lancaster",
      follow_up_date: "2025-06-19",
      notes: "Follow up with umpire to see site visit",
      input_date: "2025-06-17T20:14:19.000Z",
    },
    {
      id: "seed-1201-van-deven",
      linked_project: "1201 VanDeven",
      follow_up_date: "2025-06-18",
      notes: "Bring Ricoh",
      input_date: "2025-06-17T20:07:59.000Z",
    },
    {
      id: "seed-1057-san-antonio-isd",
      linked_project: "1057 San Antonio ISD",
      follow_up_date: "2025-05-06",
      notes: "",
      input_date: "2025-06-17T20:07:59.000Z",
    },
  ];
}

export function getDiaryEntries(): DiaryEntry[] {
  if (!isBrowser) return getSeedEntries();
  const parsed = safeParseJson<DiaryEntry[]>(
    window.localStorage.getItem(DIARY_STORAGE_KEY)
  );
  if (Array.isArray(parsed)) return parsed;
  const seed = getSeedEntries();
  window.localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

export function setDiaryEntries(entries: DiaryEntry[]) {
  if (!isBrowser) return;
  window.localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
  emitDiaryUpdated();
}

export function upsertDiaryEntry(entry: DiaryEntry) {
  if (!isBrowser) return;
  const prev = getDiaryEntries();
  const idx = prev.findIndex((e) => e.id === entry.id);
  const next =
    idx >= 0 ? prev.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...prev];
  setDiaryEntries(next);
}

export function deleteDiaryEntry(id: string) {
  if (!isBrowser) return;
  const prev = getDiaryEntries();
  setDiaryEntries(prev.filter((e) => e.id !== id));
}
