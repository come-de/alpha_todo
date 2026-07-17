"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Status = "todo" | "progress" | "done";

type Comment = {
  id: string;
  text: string;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  owner: string;
  startDate: string;
  endDate: string;
  status: Status;
  comments: Comment[];
  createdAt: string;
};

type TaskDraft = Omit<Task, "id" | "comments" | "createdAt">;

const STORAGE_KEY = "petit-suivi-taches-v1";

const initialTasks: Task[] = [
  {
    id: "demo-1",
    title: "Finaliser la présentation client",
    description: "Relire les chiffres, harmoniser les slides et préparer la version PDF.",
    owner: "Sophie",
    startDate: "2026-07-15",
    endDate: "2026-07-18",
    status: "progress",
    comments: [
      {
        id: "comment-1",
        text: "Les chiffres sont validés. Il reste la mise en forme des deux dernières slides.",
        createdAt: "2026-07-17T09:30:00.000Z",
      },
    ],
    createdAt: "2026-07-14T10:00:00.000Z",
  },
  {
    id: "demo-2",
    title: "Réserver la salle pour l’atelier",
    description: "Salle pour 12 personnes avec écran et tableau blanc.",
    owner: "Marc",
    startDate: "2026-07-17",
    endDate: "2026-07-17",
    status: "todo",
    comments: [],
    createdAt: "2026-07-15T14:00:00.000Z",
  },
  {
    id: "demo-3",
    title: "Envoyer le compte rendu",
    description: "Partager les décisions et les prochaines étapes avec toute l’équipe.",
    owner: "Inès",
    startDate: "2026-07-12",
    endDate: "2026-07-14",
    status: "done",
    comments: [
      {
        id: "comment-2",
        text: "Envoyé à toute l’équipe lundi après-midi.",
        createdAt: "2026-07-14T15:10:00.000Z",
      },
    ],
    createdAt: "2026-07-12T08:00:00.000Z",
  },
  {
    id: "demo-4",
    title: "Mettre à jour le planning éditorial",
    description: "Ajouter les publications d’août et attribuer les relectures.",
    owner: "Sophie",
    startDate: "2026-07-10",
    endDate: "2026-07-16",
    status: "todo",
    comments: [],
    createdAt: "2026-07-10T08:00:00.000Z",
  },
];

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  owner: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  status: "todo",
};

const statusLabels: Record<Status, string> = {
  todo: "À faire",
  progress: "En cours",
  done: "Terminée",
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function dateValue(date: string) {
  return new Date(`${date}T12:00:00`).getTime();
}

function isLate(task: Task) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return task.status !== "done" && dateValue(task.endDate || task.startDate) < today.getTime();
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

function dateLabel(task: Task) {
  if (!task.endDate || task.endDate === task.startDate) return formatDate(task.startDate);
  return `${formatDate(task.startDate)} → ${formatDate(task.endDate)}`;
}

function ownerInitials(owner: string) {
  return owner
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status | "late">("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sort, setSort] = useState<"date" | "recent">("date");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTasks(JSON.parse(saved));
    } catch {
      // A malformed local backup should never block the app.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const owners = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.owner).filter(Boolean))).sort(),
    [tasks],
  );

  const stats = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((task) => task.status === "todo").length,
      progress: tasks.filter((task) => task.status === "progress").length,
      done: tasks.filter((task) => task.status === "done").length,
      late: tasks.filter(isLate).length,
    }),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return tasks
      .filter((task) => {
        const matchesText =
          !normalized ||
          `${task.title} ${task.description} ${task.owner}`.toLocaleLowerCase("fr").includes(normalized);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "late" ? isLate(task) : task.status === statusFilter);
        const matchesOwner = ownerFilter === "all" || task.owner === ownerFilter;
        return matchesText && matchesStatus && matchesOwner;
      })
      .sort((a, b) =>
        sort === "recent"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : dateValue(a.endDate || a.startDate) - dateValue(b.endDate || b.startDate),
      );
  }, [tasks, query, statusFilter, ownerFilter, sort]);

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;

  function openNewTask() {
    setEditingId(null);
    setDraft({ ...emptyDraft, startDate: new Date().toISOString().slice(0, 10) });
    setEditorOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      description: task.description,
      owner: task.owner,
      startDate: task.startDate,
      endDate: task.endDate,
      status: task.status,
    });
    setEditorOpen(true);
  }

  function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.owner.trim() || !draft.startDate) return;

    const cleanDraft = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      owner: draft.owner.trim(),
      endDate: draft.endDate && draft.endDate < draft.startDate ? draft.startDate : draft.endDate,
    };

    if (editingId) {
      setTasks((current) =>
        current.map((task) => (task.id === editingId ? { ...task, ...cleanDraft } : task)),
      );
      setToast("Tâche mise à jour");
    } else {
      const newTask: Task = {
        ...cleanDraft,
        id: uid("task"),
        comments: [],
        createdAt: new Date().toISOString(),
      };
      setTasks((current) => [newTask, ...current]);
      setToast("Tâche ajoutée");
    }
    setEditorOpen(false);
  }

  function changeStatus(taskId: string, status: Status) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
    setToast(`Statut : ${statusLabels[status]}`);
  }

  function addComment(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !comment.trim()) return;
    const newComment: Comment = {
      id: uid("comment"),
      text: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    setTasks((current) =>
      current.map((task) =>
        task.id === selectedId ? { ...task, comments: [newComment, ...task.comments] } : task,
      ),
    );
    setComment("");
    setToast("Commentaire ajouté");
  }

  function deleteTask(taskId: string) {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setSelectedId(null);
    setToast("Tâche supprimée");
  }

  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mes-taches-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Sauvegarde téléchargée");
  }

  async function importTasks(file: File | undefined) {
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported)) throw new Error("invalid");
      setTasks(imported);
      setToast("Tâches importées");
    } catch {
      setToast("Ce fichier n’est pas valide");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">✓</div>
          <div>
            <span>Petit suivi</span>
            <small>Mes tâches, simplement</small>
          </div>
        </div>
        <div className="header-actions">
          <div className="storage-note"><span aria-hidden="true">●</span> Sauvegardé sur cet appareil</div>
          <button className="button primary" onClick={openNewTask} data-testid="new-task">
            <span aria-hidden="true">＋</span> Nouvelle tâche
          </button>
        </div>
      </header>

      <section className="content">
        <div className="hero-row">
          <div>
            <p className="eyebrow">Vue d’ensemble</p>
            <h1>Bonjour, voici où en sont vos tâches.</h1>
            <p className="hero-copy">Visualisez les priorités, mettez à jour l’avancement et gardez le contexte au même endroit.</p>
          </div>
          <div className="backup-menu">
            <button className="button quiet" onClick={exportTasks} title="Télécharger une sauvegarde">⇩ Exporter</button>
            <button className="button quiet" onClick={() => importRef.current?.click()} title="Restaurer une sauvegarde">⇧ Importer</button>
            <input
              ref={importRef}
              className="sr-only"
              type="file"
              accept="application/json"
              onChange={(event) => importTasks(event.target.files?.[0])}
            />
          </div>
        </div>

        <div className="stats-grid" aria-label="Résumé des tâches">
          <button className={`stat-card neutral ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>
            <span className="stat-icon">≡</span><span><strong>{stats.all}</strong><small>Toutes les tâches</small></span>
          </button>
          <button className={`stat-card amber ${statusFilter === "todo" ? "active" : ""}`} onClick={() => setStatusFilter("todo")}>
            <span className="stat-icon">○</span><span><strong>{stats.todo}</strong><small>À faire</small></span>
          </button>
          <button className={`stat-card blue ${statusFilter === "progress" ? "active" : ""}`} onClick={() => setStatusFilter("progress")}>
            <span className="stat-icon">◒</span><span><strong>{stats.progress}</strong><small>En cours</small></span>
          </button>
          <button className={`stat-card green ${statusFilter === "done" ? "active" : ""}`} onClick={() => setStatusFilter("done")}>
            <span className="stat-icon">✓</span><span><strong>{stats.done}</strong><small>Terminées</small></span>
          </button>
          <button className={`stat-card red ${statusFilter === "late" ? "active" : ""}`} onClick={() => setStatusFilter("late")}>
            <span className="stat-icon">!</span><span><strong>{stats.late}</strong><small>En retard</small></span>
          </button>
        </div>

        <section className="task-panel">
          <div className="panel-heading">
            <div>
              <h2>Liste des tâches</h2>
              <p>{filteredTasks.length} tâche{filteredTasks.length > 1 ? "s" : ""} affichée{filteredTasks.length > 1 ? "s" : ""}</p>
            </div>
            <div className="filters">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une tâche…" aria-label="Rechercher une tâche" />
              </label>
              <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} aria-label="Filtrer par responsable">
                <option value="all">Tous les responsables</option>
                {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value as "date" | "recent")} aria-label="Trier les tâches">
                <option value="date">Échéance proche</option>
                <option value="recent">Ajout récent</option>
              </select>
            </div>
          </div>

          <div className="status-tabs" role="group" aria-label="Filtrer par statut">
            {([
              ["all", "Toutes"],
              ["todo", "À faire"],
              ["progress", "En cours"],
              ["done", "Terminées"],
              ["late", "En retard"],
            ] as const).map(([value, label]) => (
              <button key={value} className={statusFilter === value ? "active" : ""} onClick={() => setStatusFilter(value)}>{label}</button>
            ))}
          </div>

          <div className="table-wrap">
            <div className="task-table table-head" aria-hidden="true">
              <span>Tâche</span><span>Responsable</span><span>Dates</span><span>Statut</span><span>Note en cours</span><span></span>
            </div>
            {filteredTasks.length ? filteredTasks.map((task) => {
              const latestComment = task.comments[0];
              return (
                <article className={`task-table task-row ${isLate(task) ? "is-late" : ""}`} key={task.id}>
                  <button className="task-main" onClick={() => setSelectedId(task.id)} aria-label={`Ouvrir ${task.title}`}>
                    <span className={`completion-box ${task.status === "done" ? "checked" : ""}`} aria-hidden="true">{task.status === "done" ? "✓" : ""}</span>
                    <span><strong>{task.title}</strong><small>{task.description || "Aucune description"}</small></span>
                  </button>
                  <div className="owner"><span className="avatar">{ownerInitials(task.owner)}</span><span>{task.owner}</span></div>
                  <div className="date-cell"><span>{dateLabel(task)}</span>{isLate(task) && <small>En retard</small>}</div>
                  <label className={`status-select status-${task.status}`}>
                    <span className="status-dot" aria-hidden="true"></span>
                    <select value={task.status} onChange={(event) => changeStatus(task.id, event.target.value as Status)} aria-label={`Statut de ${task.title}`}>
                      <option value="todo">À faire</option><option value="progress">En cours</option><option value="done">Terminée</option>
                    </select>
                  </label>
                  <button className={`note-preview ${latestComment ? "has-note" : ""}`} onClick={() => setSelectedId(task.id)}>
                    <span aria-hidden="true">{latestComment ? "●" : "+"}</span>
                    <span>{latestComment?.text || "Ajouter une note"}</span>
                  </button>
                  <button className="icon-button" onClick={() => openEditTask(task)} aria-label={`Modifier ${task.title}`}>•••</button>
                </article>
              );
            }) : (
              <div className="empty-state">
                <span>✓</span><h3>Aucune tâche ici</h3><p>Modifiez les filtres ou ajoutez une nouvelle tâche.</p><button className="button primary" onClick={openNewTask}>Nouvelle tâche</button>
              </div>
            )}
          </div>
        </section>
      </section>

      {editorOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditorOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <div className="modal-header">
              <div><p className="eyebrow">{editingId ? "Modification" : "Nouvelle tâche"}</p><h2 id="editor-title">{editingId ? "Mettre à jour la tâche" : "Que faut-il faire ?"}</h2></div>
              <button className="close-button" onClick={() => setEditorOpen(false)} aria-label="Fermer">×</button>
            </div>
            <form onSubmit={saveTask} className="task-form">
              <label className="field full"><span>Tâche *</span><input autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex. Préparer la réunion mensuelle" /></label>
              <label className="field full"><span>Description</span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Ajoutez les informations utiles…" /></label>
              <label className="field"><span>Responsable *</span><input required list="owners" value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} placeholder="Prénom ou équipe" /><datalist id="owners">{owners.map((owner) => <option key={owner} value={owner} />)}</datalist></label>
              <label className="field"><span>Statut</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}><option value="todo">À faire</option><option value="progress">En cours</option><option value="done">Terminée</option></select></label>
              <label className="field"><span>Date de début *</span><input required type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
              <label className="field"><span>Date de fin <small>(facultative)</small></span><input type="date" min={draft.startDate} value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
              <div className="form-actions"><button type="button" className="button quiet" onClick={() => setEditorOpen(false)}>Annuler</button><button type="submit" className="button primary">{editingId ? "Enregistrer" : "Ajouter la tâche"}</button></div>
            </form>
          </section>
        </div>
      )}

      {selectedTask && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedId(null)}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="drawer-header">
              <span className={`status-pill status-${selectedTask.status}`}><span className="status-dot"></span>{statusLabels[selectedTask.status]}</span>
              <button className="close-button" onClick={() => setSelectedId(null)} aria-label="Fermer">×</button>
            </div>
            <h2 id="detail-title">{selectedTask.title}</h2>
            <p className="detail-description">{selectedTask.description || "Aucune description ajoutée."}</p>
            <div className="detail-grid">
              <div><small>Responsable</small><span className="owner"><span className="avatar">{ownerInitials(selectedTask.owner)}</span>{selectedTask.owner}</span></div>
              <div><small>{selectedTask.endDate ? "Période" : "Date"}</small><strong>{formatFullDate(selectedTask.startDate)}{selectedTask.endDate && selectedTask.endDate !== selectedTask.startDate ? ` → ${formatFullDate(selectedTask.endDate)}` : ""}</strong></div>
            </div>
            <div className="quick-status">
              <span>Avancement</span>
              <div>{(["todo", "progress", "done"] as Status[]).map((status) => <button key={status} onClick={() => changeStatus(selectedTask.id, status)} className={selectedTask.status === status ? "active" : ""}>{statusLabels[status]}</button>)}</div>
            </div>
            <div className="comments-section">
              <h3>Commentaires <span>{selectedTask.comments.length}</span></h3>
              <form onSubmit={addComment} className="comment-form"><textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Où en est cette tâche ? Ajoutez une note…" aria-label="Nouveau commentaire" /><button className="button primary" disabled={!comment.trim()} type="submit">Ajouter la note</button></form>
              <div className="comment-list">
                {selectedTask.comments.length ? selectedTask.comments.map((item) => <article className="comment" key={item.id}><span className="comment-mark">●</span><div><p>{item.text}</p><small>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</small></div></article>) : <p className="no-comment">Aucun commentaire pour le moment.</p>}
              </div>
            </div>
            <div className="drawer-actions"><button className="button quiet" onClick={() => openEditTask(selectedTask)}>Modifier</button><button className="button danger" onClick={() => deleteTask(selectedTask.id)}>Supprimer</button></div>
          </aside>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
