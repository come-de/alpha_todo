import { NextResponse } from "next/server";
import { publicPerson, readPeople, sanitizePerson, writePeople } from "@/app/lib/shared-data";

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
  const people = await readPeople();
  return json({ people: people.map(publicPerson) });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { people?: unknown };
    if (!Array.isArray(body.people)) return json({ error: "Invalid people list" }, 400);

    const existing = await readPeople();
    const existingById = new Map(existing.map((person) => [person.id, person]));
    const people = body.people
      .filter((person): person is Record<string, unknown> => Boolean(person && typeof person === "object"))
      .map((person) => sanitizePerson(person, existingById.get(typeof person.id === "string" ? person.id : "")))
      .filter((person) => person.name);

    await writePeople(people);
    return json({ people: people.map(publicPerson) });
  } catch {
    return json({ error: "Unable to save people" }, 500);
  }
}
