"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Status = "todo" | "progress" | "done";
type Priority = "low" | "medium" | "high";
type Density = "compact" | "comfortable";
type ViewMode = "list" | "matrix";
type DurationBucket = "short" | "medium" | "long" | "unset";

type Comment = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

type CompletionNotification = {
  personId: string;
  sentAt: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  owner: string;
  assigneeId: string | null;
  startDate: string;
  endDate: string;
  estimatedHours: number | null;
  status: Status;
  priority: Priority;
  comments: Comment[];
  completionNotifications: CompletionNotification[];
  createdAt: string;
};

type Person = {
  id: string;
  name: string;
  active: boolean;
  hasEmail: boolean;
  createdAt: string;
};

type PersonDraft = {
  id: string | null;
  name: string;
  email: string;
  active: boolean;
};

type TaskDraft = Omit<Task, "id" | "comments" | "completionNotifications" | "createdAt">;

const AUTHOR_KEY = "petit-suivi-auteur-v2";
const DENSITY_KEY = "petit-suivi-densite-v2";

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  owner: "",
  assigneeId: null,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  estimatedHours: null,
  status: "todo",
  priority: "medium",
};

const emptyPersonDraft: PersonDraft = {
  id: null,
  name: "",
  email: "",
  active: true,
};

const statusLabels: Record<Status, string> = {
  todo: "A faire",
  progress: "En cours",
  done: "Terminee",
};

const priorityLabels: Record<Priority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

const priorityRank: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const matrixPriorities: Priority[] = ["high", "medium", "low"];

const durationBuckets: { value: DurationBucket; label: string; hint: string }[] = [
  { value: "short", label: "Courte", hint: "≤ 1 h" },
  { value: "medium", label: "Moyenne", hint: "1 h à 4 h" },
  { value: "long", label: "Longue", hint: "> 4 h" },
  { value: "unset", label: "Sans durée", hint: "à préciser" },
];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function dateValue(date: string) {
  if (!date) return Number.POSITIVE_INFINITY;
  return new Date(`${date}T12:00:00`).getTime();
}

function todayValue() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today.getTime();
}

function daysFromToday(date: string) {
  const day = 24 * 60 * 60 * 1000;
  return Math.round((dateValue(date) - todayValue()) / day);
}

function isLate(task: Task) {
  return task.status !== "done" && Boolean(task.endDate) && daysFromToday(task.endDate) < 0;
}

function formatDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function naturalDateLabel(task: Task) {
  const target = task.endDate || task.startDate;
  const delta = daysFromToday(target);
  const date = formatDate(target);

  if (task.status === "done") return task.endDate ? `Terminee le ${date}` : "Terminee";
  if (task.endDate && delta < 0) return `En retard de ${Math.abs(delta)} j`;
  if (delta === 0) return "Aujourd'hui";
  if (delta === 1) return "Demain";
  if (delta <= 7) return `Dans ${delta} jours`;
  return date;
}

function formatDuration(hours: number | null) {
  if (!hours) return "Non renseignee";
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${wholeHours} h ${minutes} min` : `${wholeHours} h`;
}

function durationBucket(hours: number | null): DurationBucket {
  if (!hours) return "unset";
  if (hours <= 1) return "short";
  if (hours <= 4) return "medium";
  return "long";
}

function dateLabel(task: Task) {
  if (!task.endDate || task.endDate === task.startDate) return formatDate(task.startDate);
  return `${formatDate(task.startDate)} -> ${formatDate(task.endDate)}`;
}

function ownerInitials(owner: string) {
  return owner
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeTask(raw: Partial<Task>): Task {
  return {
    id: raw.id || uid("task"),
    title: raw.title || "",
    description: raw.description || "",
    owner: raw.owner || "",
    assigneeId: raw.assigneeId || null,
    startDate: raw.startDate || new Date().toISOString().slice(0, 10),
    endDate: raw.endDate || "",
    estimatedHours:
      typeof raw.estimatedHours === "number" && Number.isFinite(raw.estimatedHours) && raw.estimatedHours > 0
        ? raw.estimatedHours
        : null,
    status: raw.status === "progress" || raw.status === "done" ? raw.status : "todo",
    priority:
      raw.priority === "low" || raw.priority === "high" || raw.priority === "medium"
        ? raw.priority
        : "medium",
    comments: Array.isArray(raw.comments)
      ? raw.comments.map((comment) => ({
          id: comment.id || uid("comment"),
          text: comment.text || "",
          author: comment.author || "Anonyme",
          createdAt: comment.createdAt || new Date().toISOString(),
        }))
      : [],
    completionNotifications: Array.isArray(raw.completionNotifications)
      ? raw.completionNotifications.map((item) => ({
          personId: item.personId,
          sentAt: item.sentAt,
        }))
      : [],
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function normalizePerson(raw: Partial<Person>): Person {
  return {
    id: raw.id || uid("person"),
    name: raw.name || "",
    active: raw.active !== false,
    hasEmail: Boolean(raw.hasEmail),
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status | "late">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [density, setDensity] = useState<Density>(() =>
    typeof window === "undefined" || localStorage.getItem(DENSITY_KEY) !== "comfortable"
      ? "compact"
      : "comfortable",
  );
  const [authorName, setAuthorName] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(AUTHOR_KEY) || "",
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [sendAssignmentEmail, setSendAssignmentEmail] = useState(true);
  const [personDraft, setPersonDraft] = useState<PersonDraft>(emptyPersonDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notifyTaskId, setNotifyTaskId] = useState<string | null>(null);
  const [notifyRecipients, setNotifyRecipients] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const loadTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setSyncError("");
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) throw new Error("load-failed");
      const data = (await response.json()) as { tasks?: Partial<Task>[] };
      setTasks(Array.isArray(data.tasks) ? data.tasks.map(normalizeTask) : []);
      setLoaded(true);
      setSyncError("");
    } catch {
      setLoaded(true);
      setSyncError("Synchronisation indisponible pour le moment");
    }
  }, []);

  const loadPeople = useCallback(async () => {
    try {
      const response = await fetch("/api/people", { cache: "no-store" });
      if (!response.ok) throw new Error("load-people-failed");
      const data = (await response.json()) as { people?: Partial<Person>[] };
      setPeople(Array.isArray(data.people) ? data.people.map(normalizePerson) : []);
    } catch {
      setToast("Liste des personnes indisponible");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTasks();
      void loadPeople();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTasks, loadPeople]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadTasks(true);
      void loadPeople();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadTasks, loadPeople]);

  useEffect(() => {
    if (authorName.trim()) localStorage.setItem(AUTHOR_KEY, authorName.trim());
  }, [authorName]);

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const activePeople = useMemo(() => people.filter((person) => person.active), [people]);

  const owners = useMemo(
    () =>
      Array.from(
        new Set([
          ...tasks.map((task) => task.owner).filter(Boolean),
          ...people.map((person) => person.name).filter(Boolean),
        ]),
      ).sort(),
    [tasks, people],
  );

  const stats = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((task) => task.status !== "done").length,
      todo: tasks.filter((task) => task.status === "todo").length,
      progress: tasks.filter((task) => task.status === "progress").length,
      done: tasks.filter((task) => task.status === "done").length,
      late: tasks.filter(isLate).length,
      high: tasks.filter((task) => task.priority === "high" && task.status !== "done").length,
    }),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return tasks
      .filter((task) => {
        const latestComment = task.comments[0];
        const assignee = task.assigneeId ? peopleById.get(task.assigneeId)?.name || "" : "";
        const matchesText =
          !normalized ||
          `${task.title} ${task.description} ${task.owner} ${assignee} ${latestComment?.text || ""}`
            .toLocaleLowerCase("fr")
            .includes(normalized);
        const matchesStatus =
          statusFilter === "all"
            ? task.status !== "done"
            : statusFilter === "late"
              ? isLate(task)
              : task.status === statusFilter;
        const matchesOwner = ownerFilter === "all" || task.owner === ownerFilter || assignee === ownerFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
        return matchesText && matchesStatus && matchesOwner && matchesPriority;
      })
      .sort((a, b) => {
        if (a.status === "done" && b.status !== "done") return 1;
        if (a.status !== "done" && b.status === "done") return -1;
        if (priorityRank[a.priority] !== priorityRank[b.priority]) {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }
        return dateValue(a.endDate || a.startDate) - dateValue(b.endDate || b.startDate);
      });
  }, [tasks, query, statusFilter, ownerFilter, priorityFilter, peopleById]);

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;
  const notifyTask = tasks.find((task) => task.id === notifyTaskId) ?? null;
  const notifiablePeople = people.filter((person) => person.active);
  const draftAssignee = draft.assigneeId ? peopleById.get(draft.assigneeId) : null;
  const editingTask = editingId ? tasks.find((task) => task.id === editingId) ?? null : null;
  const assignmentChanged = Boolean(draft.assigneeId && draft.assigneeId !== editingTask?.assigneeId);

  async function saveSharedTasks(nextTasks: Task[], message: string, notifyAssignments = true) {
    setSaving(true);
    setSyncError("");
    setTasks(nextTasks);
    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: nextTasks, notifyAssignments, sendAssignmentEmail: notifyAssignments }),
      });
      if (!response.ok) throw new Error("save-failed");
      await loadTasks(true);
      setToast(message);
    } catch {
      setSyncError("Sauvegarde impossible, rechargez la page avant de continuer");
      setToast("Sauvegarde impossible");
    } finally {
      setSaving(false);
    }
  }

  async function savePeople(nextPeople: PersonDraft[], message: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/people", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ people: nextPeople }),
      });
      if (!response.ok) throw new Error("save-people-failed");
      const data = (await response.json()) as { people?: Partial<Person>[] };
      setPeople(Array.isArray(data.people) ? data.people.map(normalizePerson) : []);
      setToast(message);
    } catch {
      setToast("Personnes non sauvegardees");
    } finally {
      setSaving(false);
    }
  }

  function openNewTask() {
    setEditingId(null);
    setDraft({ ...emptyDraft, startDate: new Date().toISOString().slice(0, 10) });
    setSendAssignmentEmail(true);
    setEditorOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      description: task.description,
      owner: task.owner,
      assigneeId: task.assigneeId,
      startDate: task.startDate,
      endDate: task.endDate,
      estimatedHours: task.estimatedHours,
      status: task.status,
      priority: task.priority,
    });
    setSendAssignmentEmail(true);
    setEditorOpen(true);
  }

  function selectAssignee(personId: string) {
    const person = peopleById.get(personId);
    setDraft({
      ...draft,
      assigneeId: person?.id || null,
      owner: person?.name || draft.owner,
    });
    setSendAssignmentEmail(Boolean(person?.hasEmail));
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.owner.trim() || !draft.startDate || saving) return;

    const cleanDraft = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      owner: draft.owner.trim(),
      estimatedHours:
        typeof draft.estimatedHours === "number" && Number.isFinite(draft.estimatedHours) && draft.estimatedHours > 0
          ? draft.estimatedHours
          : null,
      endDate: draft.endDate && draft.endDate < draft.startDate ? draft.startDate : draft.endDate,
    };
    const shouldSendAssignmentEmail = Boolean(sendAssignmentEmail && draftAssignee?.hasEmail && assignmentChanged);

    if (editingId) {
      await saveSharedTasks(
        tasks.map((task) => (task.id === editingId ? { ...task, ...cleanDraft } : task)),
        "Tache mise a jour",
        shouldSendAssignmentEmail,
      );
    } else {
      await saveSharedTasks(
        [
          {
            ...cleanDraft,
            id: uid("task"),
            comments: [],
            completionNotifications: [],
            createdAt: new Date().toISOString(),
          },
          ...tasks,
        ],
        "Tache ajoutee",
        shouldSendAssignmentEmail,
      );
    }
    setEditorOpen(false);
  }

  async function changeStatus(taskId: string, status: Status) {
    await saveSharedTasks(
      tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
      `Statut : ${statusLabels[status]}`,
      false,
    );
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    const author = authorName.trim();
    if (!selectedId || !comment.trim() || !author || saving) return;
    const newComment: Comment = {
      id: uid("comment"),
      text: comment.trim(),
      author,
      createdAt: new Date().toISOString(),
    };
    await saveSharedTasks(
      tasks.map((task) =>
        task.id === selectedId ? { ...task, comments: [newComment, ...task.comments] } : task,
      ),
      "Commentaire ajoute",
      false,
    );
    setComment("");
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm("Supprimer cette tache ?")) return;
    await saveSharedTasks(tasks.filter((task) => task.id !== taskId), "Tache supprimee", false);
    setSelectedId(null);
  }

  function openPerson(person?: Person) {
    setPersonDraft(
      person
        ? { id: person.id, name: person.name, email: "", active: person.active }
        : emptyPersonDraft,
    );
    setPeopleOpen(true);
  }

  async function savePerson(event: FormEvent) {
    event.preventDefault();
    if (!personDraft.name.trim()) return;
    const nextPerson: PersonDraft = {
      ...personDraft,
      id: personDraft.id || uid("person"),
      name: personDraft.name.trim(),
      email: personDraft.email.trim(),
    };
    const otherPeople = people
      .filter((person) => person.id !== nextPerson.id)
      .map((person) => ({ ...person, email: "" }));
    await savePeople([...otherPeople, nextPerson], "Personne sauvegardee");
    setPersonDraft(emptyPersonDraft);
  }

  function openCompletionNotice(task: Task) {
    setNotifyTaskId(task.id);
    setNotifyRecipients([]);
    setNotifyOpen(true);
  }

  async function sendCompletionNotice(event: FormEvent) {
    event.preventDefault();
    if (!notifyTask || !notifyRecipients.length) return;
    setNotifying(true);
    try {
      const response = await fetch(`/api/tasks/${notifyTask.id}/notify-completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: notifyRecipients }),
      });
      if (!response.ok) throw new Error("notify-failed");
      const data = (await response.json()) as { sent?: number; tasks?: Partial<Task>[] };
      if (Array.isArray(data.tasks)) setTasks(data.tasks.map(normalizeTask));
      setToast(`${data.sent || 0} email(s) envoye(s)`);
      setNotifyOpen(false);
      setNotifyRecipients([]);
    } catch {
      setToast("Notification impossible");
    } finally {
      setNotifying(false);
    }
  }

  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taches-partagees-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Sauvegarde telechargee");
  }

  async function importTasks(file: File | undefined) {
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported)) throw new Error("invalid");
      if (!window.confirm("Remplacer toutes les taches partagees par ce fichier ?")) return;
      await saveSharedTasks(imported.map(normalizeTask), "Taches importees", false);
    } catch {
      setToast("Ce fichier n'est pas valide");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <main className={`app-shell density-${density}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">✓</div>
          <div>
            <span>Petit suivi</span>
            <small>Taches partagees sans connexion</small>
          </div>
        </div>
        <div className="header-actions">
          <div className={`storage-note ${syncError ? "error" : ""}`}>
            <span aria-hidden="true">●</span>
            {saving ? "Sauvegarde..." : syncError || "Synchronise en ligne"}
          </div>
          <button className="button quiet" onClick={() => openPerson()} disabled={saving}>
            Personnes
          </button>
          <button className="button primary" onClick={openNewTask} disabled={saving}>
            <span aria-hidden="true">＋</span> Nouvelle tache
          </button>
        </div>
      </header>

      <section className="content">
        <div className="stats-grid" aria-label="Resume des taches">
          <button className={`stat-card neutral ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
            <span className="stat-icon">≡</span><span><strong>{stats.active}</strong><small>Actives</small></span>
          </button>
          <button className={`stat-card red ${statusFilter === "late" ? "active" : ""}`} onClick={() => setStatusFilter("late")}>
            <span className="stat-icon">!</span><span><strong>{stats.late}</strong><small>En retard</small></span>
          </button>
          <button className={`stat-card violet ${priorityFilter === "high" ? "active" : ""}`} onClick={() => setPriorityFilter(priorityFilter === "high" ? "all" : "high")}>
            <span className="stat-icon">↑</span><span><strong>{stats.high}</strong><small>Priorite haute</small></span>
          </button>
          <button className={`stat-card blue ${statusFilter === "progress" ? "active" : ""}`} onClick={() => setStatusFilter("progress")}>
            <span className="stat-icon">◒</span><span><strong>{stats.progress}</strong><small>En cours</small></span>
          </button>
          <button className={`stat-card green ${statusFilter === "done" ? "active" : ""}`} onClick={() => setStatusFilter("done")}>
            <span className="stat-icon">✓</span><span><strong>{stats.done}</strong><small>Terminees</small></span>
          </button>
        </div>

        <section className="task-panel">
          <div className="panel-heading">
            <div>
              <h2>Liste partagee</h2>
              <p>
                {!loaded
                  ? "Chargement..."
                  : `${filteredTasks.length} tache${filteredTasks.length > 1 ? "s" : ""} affichee${filteredTasks.length > 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="filters">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher..." aria-label="Rechercher une tache" />
              </label>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "all" | Priority)} aria-label="Filtrer par priorite">
                <option value="all">Toutes priorites</option>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
              <button className="density-toggle" onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")} title="Changer la densite d'affichage">
                {density === "compact" ? "Compact" : "Confort"}
              </button>
              <button className="mini-action" onClick={() => { void loadTasks(); void loadPeople(); }} disabled={saving}>↻</button>
              <button className="mini-action" onClick={exportTasks} disabled={!tasks.length}>⇩</button>
              <button className="mini-action" onClick={() => importRef.current?.click()} disabled={saving}>⇧</button>
              <input
                ref={importRef}
                className="sr-only"
                type="file"
                accept="application/json"
                onChange={(event) => importTasks(event.target.files?.[0])}
              />
            </div>
          </div>

          <div className="owner-strip" aria-label="Filtrer par responsable">
            <button className={ownerFilter === "all" ? "active" : ""} onClick={() => setOwnerFilter("all")}>
              Tous <span>{tasks.length}</span>
            </button>
            {owners.map((owner) => (
              <button key={owner} className={ownerFilter === owner ? "active" : ""} onClick={() => setOwnerFilter(owner)}>
                <span className="avatar">{ownerInitials(owner)}</span>{owner}
              </button>
            ))}
          </div>

          <div className="status-tabs" role="group" aria-label="Filtrer par statut">
            {([
              ["all", "Actives"],
              ["todo", "A faire"],
              ["progress", "En cours"],
              ["done", "Terminees"],
              ["late", "En retard"],
            ] as const).map(([value, label]) => (
              <button key={value} className={statusFilter === value ? "active" : ""} onClick={() => setStatusFilter(value)}>{label}</button>
            ))}
          </div>

          <div className="view-tabs" role="group" aria-label="Changer de vue">
            <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>Liste</button>
            <button className={viewMode === "matrix" ? "active" : ""} onClick={() => setViewMode("matrix")}>Priorite × duree</button>
          </div>

          {viewMode === "matrix" ? (
            <div className="matrix-view">
              <div className="matrix-head" aria-hidden="true">
                <span></span>
                {durationBuckets.map((bucket) => (
                  <strong key={bucket.value}>{bucket.label}<small>{bucket.hint}</small></strong>
                ))}
              </div>
              {matrixPriorities.map((priority) => (
                <section className={`matrix-row matrix-priority-${priority}`} key={priority}>
                  <div className="matrix-priority-label">
                    <span className={`priority-pill priority-${priority}`}>{priorityLabels[priority]}</span>
                  </div>
                  {durationBuckets.map((bucket) => {
                    const bucketTasks = filteredTasks.filter(
                      (task) => task.priority === priority && durationBucket(task.estimatedHours) === bucket.value,
                    );
                    return (
                      <div className="matrix-cell" key={bucket.value}>
                        <div className="matrix-mobile-label">{bucket.label} · {bucket.hint}</div>
                        {bucketTasks.length ? bucketTasks.map((task) => {
                          const assignee = task.assigneeId ? peopleById.get(task.assigneeId) : null;
                          return (
                            <button className={`matrix-card ${isLate(task) ? "is-late" : ""}`} key={task.id} onClick={() => setSelectedId(task.id)}>
                              <strong>{task.title}</strong>
                              <span>{assignee?.name || task.owner} · {formatDuration(task.estimatedHours)}</span>
                              <small>{naturalDateLabel(task)}</small>
                            </button>
                          );
                        }) : <span className="matrix-empty">—</span>}
                      </div>
                    );
                  })}
                </section>
              ))}
              {loaded && !filteredTasks.length && (
                <div className="empty-state matrix-empty-state">
                  <span>✓</span>
                  <h3>Aucune tache a afficher</h3>
                  <p>Creez une tache ou changez les filtres pour remplir la matrice.</p>
                  <button className="button primary" onClick={openNewTask}>Creer une tache</button>
                </div>
              )}
            </div>
          ) : (
          <div className="table-wrap">
            <div className="task-table table-head" aria-hidden="true">
              <span>Tache</span><span>Responsable</span><span>Echeance</span><span>Duree</span><span>Priorite</span><span>Statut</span><span>Dernier commentaire</span><span></span>
            </div>
            {loaded && filteredTasks.length ? filteredTasks.map((task) => {
              const latestComment = task.comments[0];
              const assignee = task.assigneeId ? peopleById.get(task.assigneeId) : null;
              return (
                <article className={`task-table task-row priority-${task.priority} ${isLate(task) ? "is-late" : ""} ${task.status === "done" ? "is-done" : ""}`} key={task.id}>
                  <button className="task-main" onClick={() => setSelectedId(task.id)} aria-label={`Ouvrir ${task.title}`}>
                    <span className={`completion-box ${task.status === "done" ? "checked" : ""}`} aria-hidden="true">{task.status === "done" ? "✓" : ""}</span>
                    <span><strong>{task.title}</strong><small>{task.description || "Aucune description"}</small></span>
                  </button>
                  <div className="owner"><span className="avatar">{ownerInitials(assignee?.name || task.owner)}</span><span>{assignee?.name || task.owner}</span></div>
                  <div className="date-cell"><strong>{naturalDateLabel(task)}</strong><span>{dateLabel(task)}</span></div>
                  <span className="duration-pill">{formatDuration(task.estimatedHours)}</span>
                  <span className={`priority-pill priority-${task.priority}`}>{priorityLabels[task.priority]}</span>
                  <label className={`status-select status-${task.status}`}>
                    <span className="status-dot" aria-hidden="true"></span>
                    <select value={task.status} onChange={(event) => changeStatus(task.id, event.target.value as Status)} aria-label={`Statut de ${task.title}`} disabled={saving}>
                      <option value="todo">A faire</option><option value="progress">En cours</option><option value="done">Terminee</option>
                    </select>
                  </label>
                  <button className={`note-preview ${latestComment ? "has-note" : ""}`} onClick={() => setSelectedId(task.id)}>
                    <span aria-hidden="true">{latestComment ? "●" : "+"}</span>
                    <span>{latestComment ? `${latestComment.author} : ${latestComment.text}` : "Ajouter une note"}</span>
                  </button>
                  <button className="icon-button" onClick={() => openEditTask(task)} aria-label={`Modifier ${task.title}`}>•••</button>
                </article>
              );
            }) : (
              <div className="empty-state">
                <span>{loaded ? "✓" : "…"}</span>
                <h3>{loaded ? "Aucune tache partagee" : "Chargement des taches"}</h3>
                <p>{loaded ? "Creez la premiere tache pour demarrer le suivi collectif." : "Connexion au tableau partage..."}</p>
                {loaded && <button className="button primary" onClick={openNewTask}>Creer la premiere tache</button>}
              </div>
            )}
          </div>
          )}
        </section>
      </section>

      {editorOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditorOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <div className="modal-header">
              <div><p className="eyebrow">{editingId ? "Modification" : "Nouvelle tache"}</p><h2 id="editor-title">{editingId ? "Mettre a jour la tache" : "Que faut-il faire ?"}</h2></div>
              <button className="close-button" onClick={() => setEditorOpen(false)} aria-label="Fermer">×</button>
            </div>
            <form onSubmit={saveTask} className="task-form">
              <label className="field full"><span>Tache *</span><input autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex. Preparer la reunion mensuelle" /></label>
              <label className="field full"><span>Description</span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Ajoutez les informations utiles..." /></label>
              <label className="field">
                <span>Assigner a une personne</span>
                <select value={draft.assigneeId || ""} onChange={(event) => selectAssignee(event.target.value)}>
                  <option value="">Aucune personne enregistree</option>
                  {activePeople.map((person) => <option key={person.id} value={person.id}>{person.name}{person.hasEmail ? " - email enregistre" : " - sans email"}</option>)}
                </select>
              </label>
              <label className="field"><span>Responsable *</span><input required list="owners" value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value, assigneeId: null })} placeholder="Prenom ou equipe" /><datalist id="owners">{owners.map((owner) => <option key={owner} value={owner} />)}</datalist></label>
              <label className="field"><span>Priorite</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option></select></label>
              <label className="field"><span>Statut</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}><option value="todo">A faire</option><option value="progress">En cours</option><option value="done">Terminee</option></select></label>
              <label className="field"><span>Duree estimee <small>(heures)</small></span><input type="number" min="0" step="0.25" value={draft.estimatedHours ?? ""} onChange={(event) => setDraft({ ...draft, estimatedHours: event.target.value ? Number(event.target.value) : null })} placeholder="Ex. 2.5" /></label>
              <label className="field"><span>Date de debut *</span><input required type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
              <label className="field"><span>Date de fin <small>(facultative)</small></span><input type="date" min={draft.startDate} value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
              {draft.assigneeId && (
                <label className="field checkbox-field assignment-email-field">
                  <input type="checkbox" checked={sendAssignmentEmail} disabled={!draftAssignee?.hasEmail || !assignmentChanged} onChange={(event) => setSendAssignmentEmail(event.target.checked)} />
                  <span>
                    Envoyer un email d&apos;assignation
                    <small>
                      {!draftAssignee?.hasEmail
                        ? "pas d'email enregistre"
                        : assignmentChanged
                          ? "email enregistre"
                          : "assignation inchangee : aucun nouvel email"}
                    </small>
                  </span>
                </label>
              )}
              <div className="form-actions"><button type="button" className="button quiet" onClick={() => setEditorOpen(false)}>Annuler</button><button type="submit" className="button primary" disabled={saving}>{saving ? "Sauvegarde..." : editingId ? "Enregistrer" : "Ajouter la tache"}</button></div>
            </form>
          </section>
        </div>
      )}

      {peopleOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPeopleOpen(false)}>
          <section className="modal people-modal" role="dialog" aria-modal="true" aria-labelledby="people-title">
            <div className="modal-header">
              <div><p className="eyebrow">Equipe</p><h2 id="people-title">Personnes et notifications</h2></div>
              <button className="close-button" onClick={() => setPeopleOpen(false)} aria-label="Fermer">×</button>
            </div>
            <form onSubmit={savePerson} className="task-form people-form">
              <label className="field"><span>Nom *</span><input required value={personDraft.name} onChange={(event) => setPersonDraft({ ...personDraft, name: event.target.value })} placeholder="Ex. Sophie" /></label>
              <label className="field"><span>Email masque</span><input type="email" value={personDraft.email} onChange={(event) => setPersonDraft({ ...personDraft, email: event.target.value })} placeholder={personDraft.id ? "Laisser vide pour conserver" : "exemple@domaine.fr"} /></label>
              <label className="field checkbox-field"><input type="checkbox" checked={personDraft.active} onChange={(event) => setPersonDraft({ ...personDraft, active: event.target.checked })} /><span>Personne active</span></label>
              <div className="form-actions"><button type="button" className="button quiet" onClick={() => setPersonDraft(emptyPersonDraft)}>Nouveau</button><button type="submit" className="button primary" disabled={saving}>Sauvegarder</button></div>
            </form>
            <div className="people-list">
              {people.length ? people.map((person) => (
                <button className="person-row" key={person.id} onClick={() => openPerson(person)}>
                  <span className="avatar">{ownerInitials(person.name)}</span>
                  <span><strong>{person.name}</strong><small>{person.active ? "Active" : "Inactive"} · {person.hasEmail ? "email enregistre" : "email manquant"}</small></span>
                </button>
              )) : <p className="no-comment people-empty">Aucune personne enregistree.</p>}
            </div>
          </section>
        </div>
      )}

      {selectedTask && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedId(null)}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="drawer-header">
              <div className="drawer-pills">
                <span className={`status-pill status-${selectedTask.status}`}><span className="status-dot"></span>{statusLabels[selectedTask.status]}</span>
                <span className={`priority-pill priority-${selectedTask.priority}`}>{priorityLabels[selectedTask.priority]}</span>
              </div>
              <button className="close-button" onClick={() => setSelectedId(null)} aria-label="Fermer">×</button>
            </div>
            <h2 id="detail-title">{selectedTask.title}</h2>
            <p className="detail-description">{selectedTask.description || "Aucune description ajoutee."}</p>
            <div className="detail-grid">
              <div><small>Responsable</small><span className="owner"><span className="avatar">{ownerInitials(peopleById.get(selectedTask.assigneeId || "")?.name || selectedTask.owner)}</span>{peopleById.get(selectedTask.assigneeId || "")?.name || selectedTask.owner}</span></div>
              <div><small>{selectedTask.endDate ? "Periode" : "Date"}</small><strong>{formatFullDate(selectedTask.startDate)}{selectedTask.endDate && selectedTask.endDate !== selectedTask.startDate ? ` -> ${formatFullDate(selectedTask.endDate)}` : ""}</strong></div>
              <div><small>Duree estimee</small><strong>{formatDuration(selectedTask.estimatedHours)}</strong></div>
            </div>
            <div className="quick-status">
              <span>Avancement</span>
              <div>{(["todo", "progress", "done"] as Status[]).map((status) => <button key={status} onClick={() => changeStatus(selectedTask.id, status)} className={selectedTask.status === status ? "active" : ""} disabled={saving}>{statusLabels[status]}</button>)}</div>
            </div>
            {selectedTask.status === "done" && (
              <div className="completion-box-panel">
                <button className="button primary" onClick={() => openCompletionNotice(selectedTask)}>Choisir qui notifier</button>
                <p>
                  {selectedTask.completionNotifications.length
                    ? `${selectedTask.completionNotifications.length} notification(s) deja envoyee(s).`
                    : "Aucune notification de fin envoyee."}
                </p>
              </div>
            )}
            <div className="comments-section">
              <h3>Commentaires <span>{selectedTask.comments.length}</span></h3>
              <form onSubmit={addComment} className="comment-form">
                <label className="author-field"><span>Votre nom</span><input value={authorName} onChange={(event) => setAuthorName(event.target.value)} placeholder="Ex. Sophie" /></label>
                <textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ou en est cette tache ? Ajoutez une note..." aria-label="Nouveau commentaire" />
                <button className="button primary" disabled={!comment.trim() || !authorName.trim() || saving} type="submit">Ajouter la note</button>
              </form>
              <div className="comment-list">
                {selectedTask.comments.length ? selectedTask.comments.map((item) => <article className="comment" key={item.id}><span className="comment-mark">●</span><div><p>{item.text}</p><small>{item.author} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</small></div></article>) : <p className="no-comment">Aucun commentaire pour le moment.</p>}
              </div>
            </div>
            <div className="drawer-actions"><button className="button quiet" onClick={() => openEditTask(selectedTask)}>Modifier</button><button className="button danger" onClick={() => deleteTask(selectedTask.id)} disabled={saving}>Supprimer</button></div>
          </aside>
        </div>
      )}

      {notifyOpen && notifyTask && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setNotifyOpen(false)}>
          <section className="modal notify-modal" role="dialog" aria-modal="true" aria-labelledby="notify-title">
            <div className="modal-header">
              <div><p className="eyebrow">Tache terminee</p><h2 id="notify-title">Choisir les destinataires</h2></div>
              <button className="close-button" onClick={() => setNotifyOpen(false)} aria-label="Fermer">×</button>
            </div>
            <form onSubmit={sendCompletionNotice} className="notify-form">
              <p className="detail-description">Selectionnez les personnes qui doivent recevoir un email indiquant clairement que la tache “{notifyTask.title}” est terminee.</p>
              <div className="recipient-list">
                {notifiablePeople.length ? notifiablePeople.map((person) => {
                  const alreadyNotified = notifyTask.completionNotifications.some((item) => item.personId === person.id);
                  return (
                    <label className={`recipient-row ${!person.hasEmail ? "disabled" : ""}`} key={person.id}>
                      <input
                        type="checkbox"
                        disabled={!person.hasEmail}
                        checked={notifyRecipients.includes(person.id)}
                        onChange={(event) => {
                          setNotifyRecipients((current) =>
                            event.target.checked
                              ? [...current, person.id]
                              : current.filter((id) => id !== person.id),
                          );
                        }}
                      />
                      <span className="avatar">{ownerInitials(person.name)}</span>
                      <span><strong>{person.name}</strong><small>{person.hasEmail ? "email enregistre" : "email manquant"}{alreadyNotified ? " · deja notifie" : ""}</small></span>
                    </label>
                  );
                }) : <p className="no-comment">Ajoutez d&apos;abord des personnes.</p>}
              </div>
              <div className="form-actions"><button type="button" className="button quiet" onClick={() => setNotifyOpen(false)}>Annuler</button><button type="submit" className="button primary" disabled={!notifyRecipients.length || notifying}>{notifying ? "Envoi..." : "Envoyer"}</button></div>
            </form>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
