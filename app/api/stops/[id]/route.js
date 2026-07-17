import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { updateStore } from "@/lib/store.mjs";

export async function PUT(request, { params }) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json();
  const resolvedParams = await params;

  const store = await updateStore((current) => ({
    ...current,
    stops: current.stops.map((stop) =>
      stop.id === resolvedParams.id
        ? {
            ...stop,
            faculty: payload.faculty,
            name: payload.name,
            lat: Number(payload.lat),
            lng: Number(payload.lng),
            queue: payload.queue || stop.queue
          }
        : stop
    )
  }));

  return NextResponse.json({ stops: store.stops });
}

export async function DELETE(_request, { params }) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const resolvedParams = await params;
  const store = await updateStore((current) => ({
    ...current,
    stops: current.stops.filter((stop) => stop.id !== resolvedParams.id)
  }));

  return NextResponse.json({ stops: store.stops });
}
