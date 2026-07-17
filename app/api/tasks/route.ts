import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Status = "todo" | "progress" | "done";
type Priority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  description: string;
  owner: string;
  startDate: string;
  endDate: string;
  status: Status;
  priority: Priority;
  comments: {
    id: string;
    text: string;
    author: string;
    createdAt: string;
  }[];
  createdAt: string;
};

const STORE_NAME = "task-tracker";
const TASKS_KEY = "tasks.json";
const memory = globalThis as typeof globalThis & { __petitSuiviTasks?: Task[] };

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isStatus(value: unknown): value is Status {
  return value === "todo" || value === "progress" || value === "done";
}

function isPriority(value: unknown): value is Priority {
  return value === "low" || value === "medium" || value === "high";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeTask(raw: Record<string, unknown>): Task {
  const now = new Date().toISOString();
  return {
    id: cleanText(raw.id) || crypto.randomUUID(),
    title: cleanText(raw.title),
    description: cleanText(raw.description),
    owner: cleanText(raw.owner),
    startDate: cleanText(raw.startDate) || new Date().toISOString().slice(0, 10),
    endDate: cleanText(raw.endDate),
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
    createdAt: cleanText(raw.createdAt) || now,
  };
}

function taskStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function GET() {
  try {
    const store = taskStore();
    const tasks = await store.get(TASKS_KEY, { type: "json", consistency: "strong" });
    return json({ tasks: Array.isArray(tasks) ? tasks : [] });
  } catch {
    return json({ tasks: memory.__petitSuiviTasks ?? [] });
  }
}

export async function PUT(request: Request) {
  let tasks: Task[];

  try {
    const body = (await request.json()) as { tasks?: unknown };
    if (!Array.isArray(body.tasks)) return json({ error: "Invalid task list" }, 400);
    tasks = body.tasks
      .filter((task): task is Record<string, unknown> => Boolean(task && typeof task === "object"))
      .map(sanitizeTask)
      .filter((task) => task.title && task.owner && task.startDate);
  } catch {
    return json({ error: "Invalid task list" }, 400);
  }

  try {
    const store = taskStore();
    await store.setJSON(TASKS_KEY, tasks);
    return json({ tasks });
  } catch {
    memory.__petitSuiviTasks = tasks;
    return json({ tasks });
  }
}
