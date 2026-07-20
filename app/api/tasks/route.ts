import { NextResponse } from "next/server";
import { notifyAssignment, readPeople, readTasks, sanitizeTask, writeTasks } from "@/app/lib/shared-data";

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
  return json({ tasks: await readTasks() });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { tasks?: unknown; notifyAssignments?: boolean };
    if (!Array.isArray(body.tasks)) return json({ error: "Invalid task list" }, 400);

    const previousTasks = await readTasks();
    const previousById = new Map(previousTasks.map((task) => [task.id, task]));
    const tasks = body.tasks
      .filter((task): task is Record<string, unknown> => Boolean(task && typeof task === "object"))
      .map(sanitizeTask)
      .filter((task) => task.title && task.owner && task.startDate);

    await writeTasks(tasks);

    if (body.notifyAssignments !== false) {
      const people = await readPeople();
      const peopleById = new Map(people.map((person) => [person.id, person]));
      const assignedTasks = tasks.filter((task) => {
        const previous = previousById.get(task.id);
        return task.assigneeId && task.assigneeId !== previous?.assigneeId;
      });

      await Promise.all(
        assignedTasks.map((task) => {
          const person = task.assigneeId ? peopleById.get(task.assigneeId) : null;
          return person?.active && person.email ? notifyAssignment(task, person, tasks) : null;
        }),
      );
    }

    return json({ tasks });
  } catch {
    return json({ error: "Unable to save tasks" }, 500);
  }
}
