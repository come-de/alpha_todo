import { NextResponse } from "next/server";
import { notifyCompletion, readPeople, readTasks, writeTasks } from "@/app/lib/shared-data";

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

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  try {
    const body = (await request.json()) as { personIds?: unknown };
    if (!Array.isArray(body.personIds)) return json({ error: "Invalid recipient list" }, 400);

    const requestedIds = body.personIds.filter((id): id is string => typeof id === "string");
    const tasks = await readTasks();
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    const task = tasks[taskIndex];
    if (!task) return json({ error: "Task not found" }, 404);
    if (task.status !== "done") return json({ error: "Task is not done" }, 409);

    const people = await readPeople();
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const validPeople = requestedIds
      .map((id) => peopleById.get(id))
      .filter((person): person is NonNullable<typeof person> => Boolean(person?.active && person.email));
    const notifiedIds = validPeople.map((person) => person.id);
    const ignoredIds = requestedIds.filter((id) => !notifiedIds.includes(id));

    const results = await notifyCompletion(task, validPeople);
    const sentIds = results.filter((result) => result.sent).map((result) => result.personId);
    const now = new Date().toISOString();

    tasks[taskIndex] = {
      ...task,
      completionNotifications: [
        ...task.completionNotifications,
        ...sentIds.map((personId) => ({ personId, sentAt: now })),
      ],
    };
    await writeTasks(tasks);

    return json({
      sent: sentIds.length,
      notifiedIds: sentIds,
      ignoredIds: [...ignoredIds, ...notifiedIds.filter((id) => !sentIds.includes(id))],
      tasks,
    });
  } catch {
    return json({ error: "Unable to notify completion" }, 500);
  }
}
