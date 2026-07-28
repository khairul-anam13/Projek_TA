import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "../route";
import { PUT, DELETE } from "../[id]/route";

function makeBuilder(result: { data: any; error: any }) {
  const builder: any = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.insert = vi.fn(chain);
  builder.update = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function mockSupabase({ user, queryResult }: { user: any; queryResult?: { data: any; error: any } }) {
  const builder = makeBuilder(queryResult ?? { data: null, error: null });
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: "no session" },
      }),
    },
    from: vi.fn(() => builder),
  };
  (createClient as any).mockResolvedValue(client);
  return { client, builder };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET/POST /api/projects — Black-Box: auth guard (Equivalence Partitioning: unauth vs auth)", () => {
  it("GET tanpa sesi login -> 401 Unauthorized", async () => {
    mockSupabase({ user: null });
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("POST tanpa sesi login -> 401 dan TIDAK menyentuh database (fail-closed)", async () => {
    const { builder } = mockSupabase({ user: null });
    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it("GET dengan sesi valid -> 200, data dipetakan snake_case ke camelCase", async () => {
    mockSupabase({
      user: { id: "user-1" },
      queryResult: {
        data: [
          {
            id: "p1",
            name: "Proyek A",
            product_type: "Sampul Rapor",
            category: "Umum",
            concept: "Minimalis",
            audience: "Siswa",
            background_color: "#FFFFFF",
            slogan: "",
            description: "",
            created_at: "2026-01-01T00:00:00Z",
            status: "Draft",
            elements: [],
          },
        ],
        error: null,
      },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0].productType).toBe("Sampul Rapor");
    expect(body.projects[0].createdAt).toBe("2026-01-01T00:00:00Z");
  });

  it("POST dengan sesi valid -> 201, memanggil insert()", async () => {
    const { builder } = mockSupabase({
      user: { id: "user-1" },
      queryResult: {
        data: {
          id: "p2",
          name: "Proyek Baru",
          product_type: "Sampul Rapor",
          category: "Umum",
          concept: "",
          audience: "",
          background_color: "#FFFFFF",
          slogan: "",
          description: "",
          created_at: "2026-01-01T00:00:00Z",
          status: "Draft",
          elements: [],
        },
        error: null,
      },
    });
    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Proyek Baru", elements: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(builder.insert).toHaveBeenCalled();
  });

  it("kegagalan database (error dari Supabase) -> 500, bukan crash tak tertangani", async () => {
    mockSupabase({
      user: { id: "user-1" },
      queryResult: { data: null, error: { message: "db down" } },
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("PUT/DELETE /api/projects/[id] — auth guard + defense-in-depth kepemilikan", () => {
  const params = Promise.resolve({ id: "p1" });

  it("PUT tanpa sesi login -> 401", async () => {
    mockSupabase({ user: null });
    const req = new NextRequest("http://localhost/api/projects/p1", {
      method: "PUT",
      body: JSON.stringify({ name: "X" }),
    });
    const res = await PUT(req, { params });
    expect(res.status).toBe(401);
  });

  it("DELETE tanpa sesi login -> 401", async () => {
    mockSupabase({ user: null });
    const req = new NextRequest("http://localhost/api/projects/p1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it("DELETE dengan sesi valid -> query WHERE id DAN user_id (mencegah hapus milik user lain)", async () => {
    const { builder } = mockSupabase({
      user: { id: "user-1" },
      queryResult: { data: null, error: null },
    });
    const req = new NextRequest("http://localhost/api/projects/p1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(200);
    expect(builder.eq).toHaveBeenCalledWith("id", "p1");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
