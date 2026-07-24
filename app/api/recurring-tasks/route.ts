import { NextResponse } from "next/server";
import { readRecurringTasks, sanitizeRecurringTask, writeRecurringTasks } from "@/app/lib/shared-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return json({ recurringTasks: await readRecurringTasks() });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { recurringTasks?: unknown };
    if (!Array.isArray(body.recurringTasks)) return json({ error: "Invalid recurring task list" }, 400);

    const recurringTasks = body.recurringTasks
      .filter((task): task is Record<string, unknown> => Boolean(task && typeof task === "object"))
      .map(sanitizeRecurringTask)
      .filter((task) => task.title && task.owner);

    await writeRecurringTasks(recurringTasks);
    return json({ recurringTasks });
  } catch {
    return json({ error: "Unable to save recurring tasks" }, 500);
  }
}
