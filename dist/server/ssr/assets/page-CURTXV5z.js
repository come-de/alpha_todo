import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/page.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var STORAGE_KEY = "petit-suivi-taches-v1";
var initialTasks = [
	{
		id: "demo-1",
		title: "Finaliser la présentation client",
		description: "Relire les chiffres, harmoniser les slides et préparer la version PDF.",
		owner: "Sophie",
		startDate: "2026-07-15",
		endDate: "2026-07-18",
		status: "progress",
		comments: [{
			id: "comment-1",
			text: "Les chiffres sont validés. Il reste la mise en forme des deux dernières slides.",
			createdAt: "2026-07-17T09:30:00.000Z"
		}],
		createdAt: "2026-07-14T10:00:00.000Z"
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
		createdAt: "2026-07-15T14:00:00.000Z"
	},
	{
		id: "demo-3",
		title: "Envoyer le compte rendu",
		description: "Partager les décisions et les prochaines étapes avec toute l’équipe.",
		owner: "Inès",
		startDate: "2026-07-12",
		endDate: "2026-07-14",
		status: "done",
		comments: [{
			id: "comment-2",
			text: "Envoyé à toute l’équipe lundi après-midi.",
			createdAt: "2026-07-14T15:10:00.000Z"
		}],
		createdAt: "2026-07-12T08:00:00.000Z"
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
		createdAt: "2026-07-10T08:00:00.000Z"
	}
];
var emptyDraft = {
	title: "",
	description: "",
	owner: "",
	startDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
	endDate: "",
	status: "todo"
};
var statusLabels = {
	todo: "À faire",
	progress: "En cours",
	done: "Terminée"
};
function uid(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function dateValue(date) {
	return (/* @__PURE__ */ new Date(`${date}T12:00:00`)).getTime();
}
function isLate(task) {
	const today = /* @__PURE__ */ new Date();
	today.setHours(12, 0, 0, 0);
	return task.status !== "done" && dateValue(task.endDate || task.startDate) < today.getTime();
}
function formatDate(date) {
	if (!date) return "";
	return new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "short"
	}).format(/* @__PURE__ */ new Date(`${date}T12:00:00`));
}
function formatFullDate(date) {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric"
	}).format(/* @__PURE__ */ new Date(`${date}T12:00:00`));
}
function dateLabel(task) {
	if (!task.endDate || task.endDate === task.startDate) return formatDate(task.startDate);
	return `${formatDate(task.startDate)} → ${formatDate(task.endDate)}`;
}
function ownerInitials(owner) {
	return owner.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
function Home() {
	const [tasks, setTasks] = (0, import_react.useState)(initialTasks);
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const [query, setQuery] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [ownerFilter, setOwnerFilter] = (0, import_react.useState)("all");
	const [sort, setSort] = (0, import_react.useState)("date");
	const [editorOpen, setEditorOpen] = (0, import_react.useState)(false);
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [draft, setDraft] = (0, import_react.useState)(emptyDraft);
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const [comment, setComment] = (0, import_react.useState)("");
	const [toast, setToast] = (0, import_react.useState)("");
	const importRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) setTasks(JSON.parse(saved));
		} catch {}
		setHydrated(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
	}, [tasks, hydrated]);
	(0, import_react.useEffect)(() => {
		if (!toast) return;
		const timer = window.setTimeout(() => setToast(""), 2600);
		return () => window.clearTimeout(timer);
	}, [toast]);
	const owners = (0, import_react.useMemo)(() => Array.from(new Set(tasks.map((task) => task.owner).filter(Boolean))).sort(), [tasks]);
	const stats = (0, import_react.useMemo)(() => ({
		all: tasks.length,
		todo: tasks.filter((task) => task.status === "todo").length,
		progress: tasks.filter((task) => task.status === "progress").length,
		done: tasks.filter((task) => task.status === "done").length,
		late: tasks.filter(isLate).length
	}), [tasks]);
	const filteredTasks = (0, import_react.useMemo)(() => {
		const normalized = query.trim().toLocaleLowerCase("fr");
		return tasks.filter((task) => {
			const matchesText = !normalized || `${task.title} ${task.description} ${task.owner}`.toLocaleLowerCase("fr").includes(normalized);
			const matchesStatus = statusFilter === "all" || (statusFilter === "late" ? isLate(task) : task.status === statusFilter);
			const matchesOwner = ownerFilter === "all" || task.owner === ownerFilter;
			return matchesText && matchesStatus && matchesOwner;
		}).sort((a, b) => sort === "recent" ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : dateValue(a.endDate || a.startDate) - dateValue(b.endDate || b.startDate));
	}, [
		tasks,
		query,
		statusFilter,
		ownerFilter,
		sort
	]);
	const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;
	function openNewTask() {
		setEditingId(null);
		setDraft({
			...emptyDraft,
			startDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
		});
		setEditorOpen(true);
	}
	function openEditTask(task) {
		setEditingId(task.id);
		setDraft({
			title: task.title,
			description: task.description,
			owner: task.owner,
			startDate: task.startDate,
			endDate: task.endDate,
			status: task.status
		});
		setEditorOpen(true);
	}
	function saveTask(event) {
		event.preventDefault();
		if (!draft.title.trim() || !draft.owner.trim() || !draft.startDate) return;
		const cleanDraft = {
			...draft,
			title: draft.title.trim(),
			description: draft.description.trim(),
			owner: draft.owner.trim(),
			endDate: draft.endDate && draft.endDate < draft.startDate ? draft.startDate : draft.endDate
		};
		if (editingId) {
			setTasks((current) => current.map((task) => task.id === editingId ? {
				...task,
				...cleanDraft
			} : task));
			setToast("Tâche mise à jour");
		} else {
			const newTask = {
				...cleanDraft,
				id: uid("task"),
				comments: [],
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			setTasks((current) => [newTask, ...current]);
			setToast("Tâche ajoutée");
		}
		setEditorOpen(false);
	}
	function changeStatus(taskId, status) {
		setTasks((current) => current.map((task) => task.id === taskId ? {
			...task,
			status
		} : task));
		setToast(`Statut : ${statusLabels[status]}`);
	}
	function addComment(event) {
		event.preventDefault();
		if (!selectedId || !comment.trim()) return;
		const newComment = {
			id: uid("comment"),
			text: comment.trim(),
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		setTasks((current) => current.map((task) => task.id === selectedId ? {
			...task,
			comments: [newComment, ...task.comments]
		} : task));
		setComment("");
		setToast("Commentaire ajouté");
	}
	function deleteTask(taskId) {
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
		link.download = `mes-taches-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
		setToast("Sauvegarde téléchargée");
	}
	async function importTasks(file) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "topbar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "brand",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "brand-mark",
						"aria-hidden": "true",
						children: "✓"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Petit suivi" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Mes tâches, simplement" })] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "header-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "storage-note",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: "●"
						}), " Sauvegardé sur cet appareil"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "button primary",
						onClick: openNewTask,
						"data-testid": "new-task",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: "＋"
						}), " Nouvelle tâche"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "content",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hero-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow",
								children: "Vue d’ensemble"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Bonjour, voici où en sont vos tâches." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hero-copy",
								children: "Visualisez les priorités, mettez à jour l’avancement et gardez le contexte au même endroit."
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "backup-menu",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "button quiet",
									onClick: exportTasks,
									title: "Télécharger une sauvegarde",
									children: "⇩ Exporter"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "button quiet",
									onClick: () => importRef.current?.click(),
									title: "Restaurer une sauvegarde",
									children: "⇧ Importer"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: importRef,
									className: "sr-only",
									type: "file",
									accept: "application/json",
									onChange: (event) => importTasks(event.target.files?.[0])
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "stats-grid",
						"aria-label": "Résumé des tâches",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `stat-card neutral ${statusFilter === "all" ? "active" : ""}`,
								onClick: () => setStatusFilter("all"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "stat-icon",
									children: "≡"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stats.all }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Toutes les tâches" })] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `stat-card amber ${statusFilter === "todo" ? "active" : ""}`,
								onClick: () => setStatusFilter("todo"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "stat-icon",
									children: "○"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stats.todo }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "À faire" })] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `stat-card blue ${statusFilter === "progress" ? "active" : ""}`,
								onClick: () => setStatusFilter("progress"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "stat-icon",
									children: "◒"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stats.progress }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "En cours" })] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `stat-card green ${statusFilter === "done" ? "active" : ""}`,
								onClick: () => setStatusFilter("done"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "stat-icon",
									children: "✓"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stats.done }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Terminées" })] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: `stat-card red ${statusFilter === "late" ? "active" : ""}`,
								onClick: () => setStatusFilter("late"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "stat-icon",
									children: "!"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: stats.late }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "En retard" })] })]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "task-panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "panel-heading",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Liste des tâches" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									filteredTasks.length,
									" tâche",
									filteredTasks.length > 1 ? "s" : "",
									" affichée",
									filteredTasks.length > 1 ? "s" : ""
								] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "filters",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "search-box",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												"aria-hidden": "true",
												children: "⌕"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: query,
												onChange: (event) => setQuery(event.target.value),
												placeholder: "Rechercher une tâche…",
												"aria-label": "Rechercher une tâche"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: ownerFilter,
											onChange: (event) => setOwnerFilter(event.target.value),
											"aria-label": "Filtrer par responsable",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "all",
												children: "Tous les responsables"
											}), owners.map((owner) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: owner,
												children: owner
											}, owner))]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: sort,
											onChange: (event) => setSort(event.target.value),
											"aria-label": "Trier les tâches",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "date",
												children: "Échéance proche"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "recent",
												children: "Ajout récent"
											})]
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "status-tabs",
								role: "group",
								"aria-label": "Filtrer par statut",
								children: [
									["all", "Toutes"],
									["todo", "À faire"],
									["progress", "En cours"],
									["done", "Terminées"],
									["late", "En retard"]
								].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: statusFilter === value ? "active" : "",
									onClick: () => setStatusFilter(value),
									children: label
								}, value))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "table-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "task-table table-head",
									"aria-hidden": "true",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Tâche" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Responsable" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Dates" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Statut" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Note en cours" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
									]
								}), filteredTasks.length ? filteredTasks.map((task) => {
									const latestComment = task.comments[0];
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: `task-table task-row ${isLate(task) ? "is-late" : ""}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												className: "task-main",
												onClick: () => setSelectedId(task.id),
												"aria-label": `Ouvrir ${task.title}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `completion-box ${task.status === "done" ? "checked" : ""}`,
													"aria-hidden": "true",
													children: task.status === "done" ? "✓" : ""
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: task.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: task.description || "Aucune description" })] })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "owner",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "avatar",
													children: ownerInitials(task.owner)
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: task.owner })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "date-cell",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: dateLabel(task) }), isLate(task) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "En retard" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: `status-select status-${task.status}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "status-dot",
													"aria-hidden": "true"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
													value: task.status,
													onChange: (event) => changeStatus(task.id, event.target.value),
													"aria-label": `Statut de ${task.title}`,
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "todo",
															children: "À faire"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "progress",
															children: "En cours"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "done",
															children: "Terminée"
														})
													]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												className: `note-preview ${latestComment ? "has-note" : ""}`,
												onClick: () => setSelectedId(task.id),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													"aria-hidden": "true",
													children: latestComment ? "●" : "+"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: latestComment?.text || "Ajouter une note" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "icon-button",
												onClick: () => openEditTask(task),
												"aria-label": `Modifier ${task.title}`,
												children: "•••"
											})
										]
									}, task.id);
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "empty-state",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Aucune tâche ici" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Modifiez les filtres ou ajoutez une nouvelle tâche." }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "button primary",
											onClick: openNewTask,
											children: "Nouvelle tâche"
										})
									]
								})]
							})
						]
					})
				]
			}),
			editorOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "modal-backdrop",
				role: "presentation",
				onMouseDown: (event) => event.target === event.currentTarget && setEditorOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "modal",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "editor-title",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "modal-header",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "eyebrow",
							children: editingId ? "Modification" : "Nouvelle tâche"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "editor-title",
							children: editingId ? "Mettre à jour la tâche" : "Que faut-il faire ?"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "close-button",
							onClick: () => setEditorOpen(false),
							"aria-label": "Fermer",
							children: "×"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: saveTask,
						className: "task-form",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "field full",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Tâche *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									autoFocus: true,
									required: true,
									value: draft.title,
									onChange: (event) => setDraft({
										...draft,
										title: event.target.value
									}),
									placeholder: "Ex. Préparer la réunion mensuelle"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "field full",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Description" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									rows: 3,
									value: draft.description,
									onChange: (event) => setDraft({
										...draft,
										description: event.target.value
									}),
									placeholder: "Ajoutez les informations utiles…"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "field",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Responsable *" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										required: true,
										list: "owners",
										value: draft.owner,
										onChange: (event) => setDraft({
											...draft,
											owner: event.target.value
										}),
										placeholder: "Prénom ou équipe"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
										id: "owners",
										children: owners.map((owner) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: owner }, owner))
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "field",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Statut" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: draft.status,
									onChange: (event) => setDraft({
										...draft,
										status: event.target.value
									}),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "todo",
											children: "À faire"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "progress",
											children: "En cours"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "done",
											children: "Terminée"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "field",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Date de début *" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									required: true,
									type: "date",
									value: draft.startDate,
									onChange: (event) => setDraft({
										...draft,
										startDate: event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "field",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Date de fin ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "(facultative)" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "date",
									min: draft.startDate,
									value: draft.endDate,
									onChange: (event) => setDraft({
										...draft,
										endDate: event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "form-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "button quiet",
									onClick: () => setEditorOpen(false),
									children: "Annuler"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									className: "button primary",
									children: editingId ? "Enregistrer" : "Ajouter la tâche"
								})]
							})
						]
					})]
				})
			}),
			selectedTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "drawer-backdrop",
				role: "presentation",
				onMouseDown: (event) => event.target === event.currentTarget && setSelectedId(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "drawer",
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "detail-title",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "drawer-header",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: `status-pill status-${selectedTask.status}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "status-dot" }), statusLabels[selectedTask.status]]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "close-button",
								onClick: () => setSelectedId(null),
								"aria-label": "Fermer",
								children: "×"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "detail-title",
							children: selectedTask.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "detail-description",
							children: selectedTask.description || "Aucune description ajoutée."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "detail-grid",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Responsable" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "owner",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "avatar",
									children: ownerInitials(selectedTask.owner)
								}), selectedTask.owner]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: selectedTask.endDate ? "Période" : "Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [formatFullDate(selectedTask.startDate), selectedTask.endDate && selectedTask.endDate !== selectedTask.startDate ? ` → ${formatFullDate(selectedTask.endDate)}` : ""] })] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "quick-status",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Avancement" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: [
								"todo",
								"progress",
								"done"
							].map((status) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => changeStatus(selectedTask.id, status),
								className: selectedTask.status === status ? "active" : "",
								children: statusLabels[status]
							}, status)) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "comments-section",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: ["Commentaires ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: selectedTask.comments.length })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: addComment,
									className: "comment-form",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										rows: 3,
										value: comment,
										onChange: (event) => setComment(event.target.value),
										placeholder: "Où en est cette tâche ? Ajoutez une note…",
										"aria-label": "Nouveau commentaire"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "button primary",
										disabled: !comment.trim(),
										type: "submit",
										children: "Ajouter la note"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "comment-list",
									children: selectedTask.comments.length ? selectedTask.comments.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: "comment",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "comment-mark",
											children: "●"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: item.text }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: new Intl.DateTimeFormat("fr-FR", {
											dateStyle: "medium",
											timeStyle: "short"
										}).format(new Date(item.createdAt)) })] })]
									}, item.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "no-comment",
										children: "Aucun commentaire pour le moment."
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "drawer-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "button quiet",
								onClick: () => openEditTask(selectedTask),
								children: "Modifier"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "button danger",
								onClick: () => deleteTask(selectedTask.id),
								children: "Supprimer"
							})]
						})
					]
				})
			}),
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "toast",
				role: "status",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓" }), toast]
			})
		]
	});
}
//#endregion
export { Home as default };
