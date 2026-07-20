import { getStore } from "@netlify/blobs";

export type Status = "todo" | "progress" | "done";
export type Priority = "low" | "medium" | "high";

export type CompletionNotification = {
  personId: string;
  sentAt: string;
};

export type Task = {
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
  comments: {
    id: string;
    text: string;
    author: string;
    createdAt: string;
  }[];
  completionNotifications: CompletionNotification[];
  createdAt: string;
};

export type Person = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
};

export type PublicPerson = Omit<Person, "email"> & {
  hasEmail: boolean;
};

const STORE_NAME = "task-tracker";
export const TASKS_KEY = "tasks.json";
export const PEOPLE_KEY = "people.json";

const memory = globalThis as typeof globalThis & {
  __petitSuiviTasks?: Task[];
  __petitSuiviPeople?: Person[];
};

export function taskStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export function publicPerson(person: Person): PublicPerson {
  const { email: _email, ...rest } = person;
  return { ...rest, hasEmail: Boolean(_email) };
}

export function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isStatus(value: unknown): value is Status {
  return value === "todo" || value === "progress" || value === "done";
}

export function isPriority(value: unknown): value is Priority {
  return value === "low" || value === "medium" || value === "high";
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function sanitizePerson(raw: Record<string, unknown>, existing?: Person): Person {
  const typedEmail = cleanText(raw.email).toLowerCase();
  return {
    id: cleanText(raw.id) || existing?.id || crypto.randomUUID(),
    name: cleanText(raw.name) || existing?.name || "",
    email: typedEmail ? (isEmail(typedEmail) ? typedEmail : "") : existing?.email || "",
    active: typeof raw.active === "boolean" ? raw.active : existing?.active ?? true,
    createdAt: cleanText(raw.createdAt) || existing?.createdAt || new Date().toISOString(),
  };
}

export function sanitizeTask(raw: Record<string, unknown>): Task {
  const now = new Date().toISOString();
  const rawEstimatedHours =
    typeof raw.estimatedHours === "number"
      ? raw.estimatedHours
      : typeof raw.estimatedHours === "string" && raw.estimatedHours.trim()
        ? Number(raw.estimatedHours)
        : null;
  return {
    id: cleanText(raw.id) || crypto.randomUUID(),
    title: cleanText(raw.title),
    description: cleanText(raw.description),
    owner: cleanText(raw.owner),
    assigneeId: cleanText(raw.assigneeId) || null,
    startDate: cleanText(raw.startDate) || new Date().toISOString().slice(0, 10),
    endDate: cleanText(raw.endDate),
    estimatedHours:
      typeof rawEstimatedHours === "number" && Number.isFinite(rawEstimatedHours) && rawEstimatedHours > 0
        ? rawEstimatedHours
        : null,
    status: isStatus(raw.status) ? raw.status : "todo",
    priority: isPriority(raw.priority) ? raw.priority : "medium",
    comments: Array.isArray(raw.comments)
      ? raw.comments
          .filter((comment): comment is Record<string, unknown> => Boolean(comment && typeof comment === "object"))
          .map((comment) => ({
            id: cleanText(comment.id) || crypto.randomUUID(),
            text: cleanText(comment.text),
            author: cleanText(comment.author) || "Anonyme",
            createdAt: cleanText(comment.createdAt) || now,
          }))
          .filter((comment) => comment.text)
      : [],
    completionNotifications: Array.isArray(raw.completionNotifications)
      ? raw.completionNotifications
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map((item) => ({
            personId: cleanText(item.personId),
            sentAt: cleanText(item.sentAt) || now,
          }))
          .filter((item) => item.personId)
      : [],
    createdAt: cleanText(raw.createdAt) || now,
  };
}

export async function readTasks() {
  try {
    const store = taskStore();
    const tasks = await store.get(TASKS_KEY, { type: "json", consistency: "strong" });
    return Array.isArray(tasks)
      ? tasks
          .filter((task): task is Record<string, unknown> => Boolean(task && typeof task === "object"))
          .map(sanitizeTask)
      : [];
  } catch {
    return memory.__petitSuiviTasks ?? [];
  }
}

export async function writeTasks(tasks: Task[]) {
  try {
    const store = taskStore();
    await store.setJSON(TASKS_KEY, tasks);
  } catch {
    memory.__petitSuiviTasks = tasks;
  }
}

export async function readPeople() {
  try {
    const store = taskStore();
    const people = await store.get(PEOPLE_KEY, { type: "json", consistency: "strong" });
    return Array.isArray(people)
      ? people
          .filter((person): person is Record<string, unknown> => Boolean(person && typeof person === "object"))
          .map((person) => sanitizePerson(person))
          .filter((person) => person.name)
      : [];
  } catch {
    return memory.__petitSuiviPeople ?? [];
  }
}

export async function writePeople(people: Person[]) {
  try {
    const store = taskStore();
    await store.setJSON(PEOPLE_KEY, people);
  } catch {
    memory.__petitSuiviPeople = people;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDuration(hours: number | null) {
  if (!hours) return "non renseignee";
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${wholeHours} h ${minutes} min` : `${wholeHours} h`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ASSIGNMENT_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false, reason: "missing-config" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      ...(process.env.ASSIGNMENT_REPLY_TO_EMAIL ? { reply_to: process.env.ASSIGNMENT_REPLY_TO_EMAIL } : {}),
    }),
  });

  return { sent: response.ok, reason: response.ok ? "sent" : "send-failed" };
}

function taskUrl() {
  return process.env.URL || "";
}

export async function notifyAssignment(task: Task, person: Person, openTasks: Task[]) {
  if (!person.email) return { sent: false, reason: "missing-email" };
  const otherTasks = openTasks.filter(
    (item) => item.status !== "done" && item.id !== task.id && item.assigneeId === person.id,
  );
  const reminders = otherTasks.length
    ? `<h3>Vos autres taches non terminees</h3><ul>${otherTasks
        .map((item) => `<li>${escapeHtml(item.title)}</li>`)
        .join("")}</ul>`
    : "";
  const link = taskUrl() ? `<p><a href="${escapeHtml(taskUrl())}">Ouvrir le suivi des taches</a></p>` : "";

  return sendEmail(
    person.email,
    `Nouvelle tache assignee : ${task.title}`,
    `<h2>${escapeHtml(task.title)}</h2>
     <p>${escapeHtml(task.description || "Aucune description.")}</p>
     <p><strong>Responsable :</strong> ${escapeHtml(task.owner)}</p>
     <p><strong>Duree estimee :</strong> ${escapeHtml(formatDuration(task.estimatedHours))}</p>
     <p><strong>Priorite :</strong> ${escapeHtml(task.priority)}</p>
     ${reminders}
     ${link}`,
  );
}

export async function notifyCompletion(task: Task, people: Person[]) {
  const link = taskUrl() ? `<p><a href="${escapeHtml(taskUrl())}">Ouvrir le suivi des taches</a></p>` : "";
  const html = `<h1>La tache est terminee</h1>
    <p>Bonjour,</p>
    <p>La tache suivante vient d'etre marquee comme terminee :</p>
    <h2>${escapeHtml(task.title)}</h2>
    <p>${escapeHtml(task.description || "Aucune description.")}</p>
    <p><strong>Statut :</strong> terminee</p>
    <p><strong>Responsable :</strong> ${escapeHtml(task.owner)}</p>
    <p><strong>Duree estimee :</strong> ${escapeHtml(formatDuration(task.estimatedHours))}</p>
    <p><strong>Periode :</strong> ${escapeHtml(task.endDate || task.startDate)}</p>
    <p><strong>Priorite :</strong> ${escapeHtml(task.priority)}</p>
    ${link}`;

  const results = await Promise.all(
    people.map(async (person) => ({
      personId: person.id,
      ...(await sendEmail(person.email, `La tache est terminee : ${task.title}`, html)),
    })),
  );

  return results;
}
