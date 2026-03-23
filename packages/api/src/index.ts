import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { FastifyRequest } from "fastify";

const app = Fastify();

await app.register(cors, { origin: true, credentials: true });
await app.register(jwt, { secret: process.env.JWT_SECRET || "dev_secret" });

app.decorate("authenticate", async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: "unauthorized" });
  }
});

function adminOnly(req: any, reply: any, done: any) {
  if (req.user?.role !== "admin") return reply.code(403).send({ error: "forbidden" });
  done();
}

async function logAudit(req: any, action: string, entityType: string, entityId: string | null, beforeData?: any, afterData?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: req.user?.org_id || "unknown",
        actorUserId: req.user?.sub || null,
        action,
        entityType,
        entityId,
        beforeData,
        afterData,
        ip: (req as FastifyRequest).ip
      }
    });
  } catch {}
}

app.post("/auth/login", async (req, reply) => {
  const body = (req as any).body || {};
  const { email, password } = body;
  if (!email || !password) return reply.code(400).send({ error: "missing_credentials" });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return reply.code(401).send({ error: "invalid_credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return reply.code(401).send({ error: "invalid_credentials" });
  const token = await app.jwt.sign({ sub: user.id, role: user.role, org_id: user.orgId }, { expiresIn: "15m" });
  const refresh = await app.jwt.sign({ sub: user.id, type: "refresh" }, { expiresIn: "7d" });
  return { access_token: token, refresh_token: refresh };
});

app.post("/auth/refresh", async (req: any, reply) => {
  const body = req.body || {};
  const rt = body.refresh_token;
  if (!rt) return reply.code(400).send({ error: "missing_refresh_token" });
  try {
    const decoded: any = await app.jwt.verify(rt);
    if (decoded?.type !== "refresh" || !decoded?.sub) return reply.code(401).send({ error: "invalid_refresh_token" });
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.active) return reply.code(401).send({ error: "invalid_user" });
    const token = await app.jwt.sign({ sub: user.id, role: user.role, org_id: user.orgId }, { expiresIn: "15m" });
    return { access_token: token };
  } catch {
    return reply.code(401).send({ error: "invalid_refresh_token" });
  }
});
app.get("/health", async (_req, _reply) => {
  return { ok: true, ts: new Date().toISOString() };
});

app.get("/auth/me", { preHandler: (app as any).authenticate }, async (req: any) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { id: true, name: true, email: true, role: true, orgId: true, active: true } });
  return u;
});

app.get("/customers", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const q = (req as any).query || {};
  const page = Number(q.page || 1);
  const pageSize = Math.min(Number(q.pageSize || 20), 200);
  const search = q.q as string | undefined;
  const where: any = { };
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } }
    ];
  }
  const and: any[] = [];
  if (q["filter[customer_name]"]) and.push({ customerName: { contains: q["filter[customer_name]"], mode: "insensitive" } });
  if (q["filter[company_name]"]) and.push({ companyName: { contains: q["filter[company_name]"], mode: "insensitive" } });
  if (q["filter[email]"]) and.push({ email: { contains: q["filter[email]"], mode: "insensitive" } });
  if (q["filter[phone]"]) and.push({ phone: { contains: q["filter[phone]"], mode: "insensitive" } });
  if (and.length) where.AND = and;
  if (!(q.include_deleted === "1" || q["filter[deleted]"] === "include")) {
    if (q["filter[deleted]"] === "only") {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }
  }
  const sortBy = (q.sort_by || q.sortBy || "createdAt") as string;
  const sortDir = (q.sort_dir || q.sortDir || "desc") === "asc" ? "asc" : "desc";
  const orderByAllowed: any = {
    createdAt: "createdAt",
    customerName: "customerName",
    companyName: "companyName",
    email: "email",
    phone: "phone"
  };
  const orderByField = orderByAllowed[sortBy] || "createdAt";
  const [total, items] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [orderByField]: sortDir } })
  ]);
  return { data: items, page, pageSize, total };
});

app.get("/customers/:id", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const id = (req as any).params.id;
  const item = await prisma.customer.findUnique({ where: { id } });
  return item || reply.code(404).send({ error: "not_found" });
});

app.get("/customers/:id/branches", { preHandler: (app as any).authenticate }, async (req: any) => {
  const id = req.params.id;
  const items = await (prisma as any).branch.findMany({ where: { orgId: req.user.org_id, customerId: id, deletedAt: null }, orderBy: { name: "asc" } });
  return { data: items };
});
app.post("/branches", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const b = req.body || {};
  const created = await (prisma as any).branch.create({
    data: {
      orgId: req.user.org_id,
      customerId: b.customer_id ?? b.customerId,
      name: b.name,
      address: b.address ?? null,
      lat: b.lat ?? null,
      lng: b.lng ?? null,
      active: b.active ?? true
    }
  });
  await logAudit(req, "create", "branch", created.id, null, created);
  return created;
});
app.put("/branches/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const id = req.params.id;
  const b = req.body || {};
  const before = await (prisma as any).branch.findUnique({ where: { id } });
  const updated = await (prisma as any).branch.update({
    where: { id },
    data: {
      name: b.name ?? before?.name,
      address: b.address ?? null,
      lat: b.lat ?? null,
      lng: b.lng ?? null,
      active: b.active ?? true
    }
  });
  await logAudit(req, "update", "branch", id, before, updated);
  return updated;
});
app.delete("/branches/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const id = req.params.id;
  const before = await (prisma as any).branch.findUnique({ where: { id } });
  const updated = await (prisma as any).branch.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(req, "delete", "branch", id, before, updated);
  return { ok: true };
});
app.patch("/branches/:id/restore", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const id = req.params.id;
  const before = await (prisma as any).branch.findUnique({ where: { id } });
  const updated = await (prisma as any).branch.update({ where: { id }, data: { deletedAt: null } });
  await logAudit(req, "restore", "branch", id, before, updated);
  return updated;
});
app.post("/customers", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const body = req.body || {};
  const created = await prisma.customer.create({
    data: {
      orgId: req.user.org_id,
      customerName: body.customer_name ?? body.customerName,
      companyName: body.company_name ?? body.companyName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      taxNumber: body.tax_number ?? body.taxNumber,
      notes: body.notes
    }
  });
  await logAudit(req, "create", "customer", created.id, null, created);
  return created;
});

app.put("/customers/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const body = req.body || {};
  const before = await prisma.customer.findUnique({ where: { id } });
  const updated = await prisma.customer.update({
    where: { id },
    data: {
      customerName: body.customer_name ?? body.customerName,
      companyName: body.company_name ?? body.companyName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      taxNumber: body.tax_number ?? body.taxNumber,
      notes: body.notes
    }
  });
  await logAudit(req, "update", "customer", id, before, updated);
  return updated;
});

app.delete("/customers/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const before = await prisma.customer.findUnique({ where: { id } });
  const updated = await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(req, "delete", "customer", id, before, updated);
  return { ok: true };
});

app.patch("/customers/:id/restore", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const before = await prisma.customer.findUnique({ where: { id } });
  const updated = await prisma.customer.update({ where: { id }, data: { deletedAt: null } });
  await logAudit(req, "restore", "customer", id, before, updated);
  return updated;
});

app.get("/lines", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const q = (req as any).query || {};
  const page = Number(q.page || 1);
  const pageSize = Math.min(Number(q.pageSize || 20), 200);
  const where: any = {};
  if (q["filter[status]"]) where.status = q["filter[status]"];
  if (q["filter[customer_id]"]) where.customerId = q["filter[customer_id]"];
  if (q["filter[branch_id]"]) (where as any).branchId = q["filter[branch_id]"];
  if (q["filter[operator_id]"]) where.operatorId = q["filter[operator_id]"];
  if (q["filter[sim_no]"]) where.imeiNumber = { contains: q["filter[sim_no]"], mode: "insensitive" };
  if (q["filter[date_from]"] || q["filter[date_to]"]) {
    where.endDate = {};
    if (q["filter[date_from]"]) where.endDate.gte = new Date(q["filter[date_from]"]);
    if (q["filter[date_to]"]) where.endDate.lte = new Date(q["filter[date_to]"]);
  }
  if (q["filter[has_license]"]) {
    const lic = await prisma.gmp3License.findMany({ where: { } as any, select: { lineId: true } as any });
    const ids = Array.from(new Set((lic as any[]).map((x) => x.lineId).filter(Boolean)));
    if (q["filter[has_license]"] === "1") where.id = { in: ids };
    if (q["filter[has_license]"] === "0") where.id = { notIn: ids };
  }
  if (q["filter[has_license]"]) {
    const lc = await prisma.gmp3License.findMany({ where: {}, select: { customerId: true } });
    const set = new Set(lc.map((x) => x.customerId));
    if (q["filter[has_license]"] === "1") where.customerId = { in: Array.from(set) };
    if (q["filter[has_license]"] === "0") where.customerId = { notIn: Array.from(set) };
  }
  if (!(q.include_deleted === "1" || q["filter[deleted]"] === "include")) {
    if (q["filter[deleted]"] === "only") {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }
  }
  const sortBy = (q.sort_by || q.sortBy || "endDate") as string;
  const sortDir = (q.sort_dir || q.sortDir || "asc") === "desc" ? "desc" : "asc";
  const orderBy =
    sortBy === "operatorName"
      ? { operator: { name: sortDir } as any }
      : { [(["endDate", "lineNumber", "status"].includes(sortBy) ? sortBy : "endDate")]: sortDir } as any;
  const [total, items, licByLine] = await Promise.all([
    prisma.line.count({ where }),
    prisma.line.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: { operator: true, customer: true }
    }),
    prisma.gmp3License.findMany({ where: {} as any, select: { lineId: true } as any })
  ]);
  const licSet = new Set((licByLine as any[]).map((x) => x.lineId).filter(Boolean));
  const data = items.map((it) => ({ ...it, hasLicense: licSet.has((it as any).id) }));
  return { data, page, pageSize, total };
});

app.get("/lines/:id", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const id = (req as any).params.id;
  const item = await prisma.line.findUnique({ where: { id }, include: { operator: true, customer: true } });
  return item || reply.code(404).send({ error: "not_found" });
});

app.post("/lines", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const body = req.body || {};
  const created = await prisma.line.create({
    data: {
      orgId: req.user.org_id,
      customerId: body.customer_id ?? body.customerId,
      lineNumber: body.line_number ?? body.lineNumber,
      imeiNumber: body.imei_number ?? body.imeiNumber,
      operatorId: body.operator_id ?? body.operatorId,
      activationDate: body.activation_date ? new Date(body.activation_date) : body.activationDate ? new Date(body.activationDate) : undefined,
      endDate: body.end_date ? new Date(body.end_date) : body.endDate ? new Date(body.endDate) : undefined,
      status: body.status ?? "aktif",
      description: body.description
    }
  });
  await logAudit(req, "create", "line", created.id, null, created);
  return created;
});

app.put("/lines/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const body = req.body || {};
  const before = await prisma.line.findUnique({ where: { id } });
  const updated = await prisma.line.update({
    where: { id },
    data: {
      customerId: body.customer_id ?? body.customerId,
      lineNumber: body.line_number ?? body.lineNumber,
      imeiNumber: body.imei_number ?? body.imeiNumber,
      operatorId: body.operator_id ?? body.operatorId,
      activationDate: body.activation_date ? new Date(body.activation_date) : body.activationDate ? new Date(body.activationDate) : undefined,
      endDate: body.end_date ? new Date(body.end_date) : body.endDate ? new Date(body.endDate) : undefined,
      status: body.status,
      description: body.description
    }
  });
  await logAudit(req, "update", "line", id, before, updated);
  return updated;
});

app.delete("/lines/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const before = await prisma.line.findUnique({ where: { id } });
  const updated = await prisma.line.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(req, "delete", "line", id, before, updated);
  return { ok: true };
});

app.patch("/lines/:id/restore", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const before = await prisma.line.findUnique({ where: { id } });
  const updated = await prisma.line.update({ where: { id }, data: { deletedAt: null } });
  await logAudit(req, "restore", "line", id, before, updated);
  return updated;
});

app.get("/lines/expiring", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const q = (req as any).query || {};
  const days = Number(q.days || 7);
  let start: Date | undefined;
  let end: Date | undefined;
  if (q.date_from || q.date_to) {
    if (q.date_from) start = new Date(q.date_from);
    if (q.date_to) end = new Date(q.date_to);
  } else {
    start = new Date();
    end = new Date();
    end.setDate(start.getDate() + days);
  }
  const items = await prisma.line.findMany({
    where: {
      status: "aktif",
      ...(start || end ? { endDate: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {})
    },
    orderBy: { endDate: "asc" }
  });
  return { data: items };
});

app.get("/lines/expired", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const q = (req as any).query || {};
  const now = new Date();
  let whereEnd: any = { lt: now };
  if (q.date_from || q.date_to) {
    whereEnd = {};
    if (q.date_from) whereEnd.gte = new Date(q.date_from);
    if (q.date_to) whereEnd.lte = new Date(q.date_to);
  }
  const items = await prisma.line.findMany({
    where: {
      endDate: whereEnd
    },
    orderBy: { endDate: "asc" }
  });
  return { data: items };
});

app.get("/licenses", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const q = (req as any).query || {};
  const page = Number(q.page || 1);
  const pageSize = Math.min(Number(q.pageSize || 20), 200);
  const where: any = {};
  if (q["filter[status]"]) where.status = q["filter[status]"];
  if (q["filter[customer_id]"]) where.customerId = q["filter[customer_id]"];
  if (q["filter[date_from]"] || q["filter[date_to]"]) {
    where.endDate = {};
    if (q["filter[date_from]"]) where.endDate.gte = new Date(q["filter[date_from]"]);
    if (q["filter[date_to]"]) where.endDate.lte = new Date(q["filter[date_to]"]);
  }
  if (q["filter[has_line]"]) {
    const lc = await prisma.line.findMany({ where: {}, select: { customerId: true } });
    const set = new Set(lc.map((x) => x.customerId));
    if (q["filter[has_line]"] === "1") where.customerId = { in: Array.from(set) };
    if (q["filter[has_line]"] === "0") where.customerId = { notIn: Array.from(set) };
  }
  if (!(q.include_deleted === "1" || q["filter[deleted]"] === "include")) {
    if (q["filter[deleted]"] === "only") {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }
  }
  const sortBy = (q.sort_by || q.sortBy || "endDate") as string;
  const sortDir = (q.sort_dir || q.sortDir || "asc") === "desc" ? "desc" : "asc";
  const orderByField = ["endDate", "licenseName", "status"].includes(sortBy) ? sortBy : "endDate";
  const [total, items] = await Promise.all([
    prisma.gmp3License.count({ where }),
    prisma.gmp3License.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [orderByField]: sortDir } as any }),
  ]);
  const data = items.map((it) => ({ ...it, hasLine: !!(it as any).lineId }));
  return { data, page, pageSize, total };
});

app.get("/licenses/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
  const id = req.params.id;
  const item = await prisma.gmp3License.findUnique({ where: { id } });
  return item || reply.code(404).send({ error: "not_found" });
});

app.post("/licenses", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const body = req.body || {};
  const createData: any = {
    orgId: req.user.org_id,
    customerId: body.customer_id ?? body.customerId,
    licenseName: body.license_name ?? body.licenseName,
    licenseKey: body.license_key ?? body.licenseKey,
    activationDate: body.activation_date ? new Date(body.activation_date) : body.activationDate ? new Date(body.activationDate) : undefined,
    endDate: body.end_date ? new Date(body.end_date) : body.endDate ? new Date(body.endDate) : undefined,
    device: body.device,
    status: body.status ?? "aktif",
    notes: body.notes
  };
  createData.lineId = body.line_id ?? body.lineId ?? null;
  const created = await prisma.gmp3License.create({ data: createData });
  await logAudit(req, "create", "license", created.id, null, created);
  return created;
});

app.put("/licenses/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const body = req.body || {};
  const before = await prisma.gmp3License.findUnique({ where: { id } });
  const updateData: any = {
    customerId: body.customer_id ?? body.customerId,
    licenseName: body.license_name ?? body.licenseName,
    licenseKey: body.license_key ?? body.licenseKey,
    activationDate: body.activation_date ? new Date(body.activation_date) : body.activationDate ? new Date(body.activationDate) : undefined,
    endDate: body.end_date ? new Date(body.end_date) : body.endDate ? new Date(body.endDate) : undefined,
    device: body.device,
    status: body.status,
    notes: body.notes
  };
  if (body.line_id ?? body.lineId) updateData.lineId = body.line_id ?? body.lineId;
  const updated = await prisma.gmp3License.update({ where: { id }, data: updateData });
  await logAudit(req, "update", "license", id, before, updated);
  return updated;
});

app.delete("/licenses/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const before = await prisma.gmp3License.findUnique({ where: { id } });
  const updated = await prisma.gmp3License.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(req, "delete", "license", id, before, updated);
  return { ok: true };
});

app.patch("/licenses/:id/restore", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const before = await prisma.gmp3License.findUnique({ where: { id } });
  const updated = await prisma.gmp3License.update({ where: { id }, data: { deletedAt: null } });
  await logAudit(req, "restore", "license", id, before, updated);
  return updated;
});

app.get("/licenses/expiring", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const q = (req as any).query || {};
  const days = Number(q.days || 30);
  let start: Date | undefined;
  let end: Date | undefined;
  if (q.date_from || q.date_to) {
    if (q.date_from) start = new Date(q.date_from);
    if (q.date_to) end = new Date(q.date_to);
  } else {
    start = new Date();
    end = new Date();
    end.setDate(start.getDate() + days);
  }
  const items = await prisma.gmp3License.findMany({
    where: {
      status: "aktif",
      ...(start || end ? { endDate: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {})
    },
    orderBy: { endDate: "asc" }
  });
  return { data: items };
});

app.get("/licenses/expired", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const q = (req as any).query || {};
  const now = new Date();
  let whereEnd: any = { lt: now };
  if (q.date_from || q.date_to) {
    whereEnd = {};
    if (q.date_from) whereEnd.gte = new Date(q.date_from);
    if (q.date_to) whereEnd.lte = new Date(q.date_to);
  }
  const items = await prisma.gmp3License.findMany({
    where: { endDate: whereEnd },
    orderBy: { endDate: "asc" }
  });
  return { data: items };
});

app.get("/admin/trends", { preHandler: (app as any).authenticate }, async (req: any) => {
  const months = Math.max(1, Math.min(Number(req.query.months || 6), 24));
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1), 1);
  start.setHours(0, 0, 0, 0);
  const [lines, licenses, workOrders] = await Promise.all([
    prisma.line.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.gmp3License.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.workOrder.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
  ]);
  function bucket(arr: { createdAt: Date }[]) {
    const counts = Array(months).fill(0);
    const baseMonth = start.getMonth();
    const baseYear = start.getFullYear();
    arr.forEach(a => {
      const d = new Date(a.createdAt);
      const idx = (d.getFullYear() - baseYear) * 12 + (d.getMonth() - baseMonth);
      if (idx >= 0 && idx < months) counts[idx]++;
    });
    return counts;
  }
  return { months, lines: bucket(lines), licenses: bucket(licenses), workOrders: bucket(workOrders) };
});

app.get("/work-orders", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const q = (req as any).query || {};
  const page = Number(q.page || 1);
  const pageSize = Math.min(Number(q.pageSize || 20), 200);
  const where: any = { orgId: (req as any).user?.org_id };
  if (q["filter[status]"]) where.status = q["filter[status]"];
  if (q["filter[customer_id]"]) where.customerId = q["filter[customer_id]"];
  if (q["filter[assigned_user_id]"]) where.assignedUserId = q["filter[assigned_user_id]"];
  if (q["filter[type_id]"]) where.typeId = q["filter[type_id]"];
  if (q["filter[due_from]"] || q["filter[due_to]"]) {
    where.dueDate = {};
    if (q["filter[due_from]"]) where.dueDate.gte = new Date(q["filter[due_from]"]);
    if (q["filter[due_to]"]) where.dueDate.lte = new Date(q["filter[due_to]"]);
  }
  if (q["filter[overdue]"] === "1") {
    where.AND = [...(where.AND || []), { dueDate: { lt: new Date() } }, { status: { not: "kapali" } }];
  }
  if (q.q) where.orderNumber = { contains: q.q, mode: "insensitive" };
  if (!(q.include_deleted === "1" || q["filter[deleted]"] === "include")) {
    if (q["filter[deleted]"] === "only") {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }
  }
  const sortBy = (q.sort_by || q.sortBy || "createdAt") as string;
  const sortDir = (q.sort_dir || q.sortDir || "desc") === "asc" ? "asc" : "desc";
  const orderByField = ["createdAt", "orderNumber", "priority", "status"].includes(sortBy) ? sortBy : "createdAt";
  const [total, items] = await Promise.all([
    prisma.workOrder.count({ where }),
    (prisma as any).workOrder.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [orderByField]: sortDir } as any, include: { type: true, branch: true } })
  ]);
  return { data: items, page, pageSize, total };
});

app.get("/work-orders/:id", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const id = (req as any).params.id;
  const item = await (prisma as any).workOrder.findUnique({ where: { id }, include: { attachments: true, workNotes: true, type: true, branch: true } });
  return item || reply.code(404).send({ error: "not_found" });
});

app.post("/work-orders", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const body = req.body || {};
  function pad(n: number) { return String(n).padStart(2, "0"); }
  async function nextNumber() {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
    const count = await prisma.workOrder.count({ where: { orgId: req.user.org_id, createdAt: { gte: dayStart, lte: dayEnd } } });
    const seq = count + 1;
    const ymd = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    return `WO-${ymd}-${String(seq).padStart(3, "0")}`;
  }
  let orderNumber = (body.order_number ?? body.orderNumber ?? "").trim();
  if (!orderNumber) orderNumber = await nextNumber();
  const exists = await prisma.workOrder.findFirst({ where: { orgId: req.user.org_id, orderNumber } });
  if (exists) {
    const nn = await nextNumber();
    return reply.code(409).send({ error: "order_number_in_use", next: nn });
  }
  try {
    const created = await (prisma as any).workOrder.create({
      data: {
        orgId: req.user.org_id,
        orderNumber,
        customerId: body.customer_id ?? body.customerId,
        branchId: body.branch_id ?? body.branchId ?? null,
        description: body.description,
        assignedUserId: body.assigned_user_id ?? body.assignedUserId,
        typeId: body.type_id ?? body.typeId ?? null,
        priority: body.priority ?? "orta",
        status: "acik",
        dueDate: body.due_date ? new Date(body.due_date) : (body.dueDate ? new Date(body.dueDate) : undefined),
        notes: body.notes ?? null,
        locationAddress: body.location_address ?? body.locationAddress ?? null,
        locationLat: body.location_lat ?? body.locationLat ?? null,
        locationLng: body.location_lng ?? body.locationLng ?? null
      }
    });
    await logAudit(req, "create", "workOrder", created.id, null, created);
    return created;
  } catch (e: any) {
    if (e?.code === "P2002") {
      const nn = await nextNumber();
      return reply.code(409).send({ error: "order_number_in_use", next: nn });
    }
    throw e;
  }
});

app.get("/work-orders/next-number", { preHandler: (app as any).authenticate }, async (req: any) => {
  function pad(n: number) { return String(n).padStart(2, "0"); }
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
  const count = await prisma.workOrder.count({ where: { orgId: req.user.org_id, createdAt: { gte: dayStart, lte: dayEnd } } });
  const seq = count + 1;
  const ymd = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const next = `WO-${ymd}-${String(seq).padStart(3, "0")}`;
  return { next };
});
app.put("/work-orders/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const body = req.body || {};
  const before = await prisma.workOrder.findUnique({ where: { id } });
  const updated = await (prisma as any).workOrder.update({
    where: { id },
    data: {
      orderNumber: body.order_number ?? body.orderNumber,
      customerId: body.customer_id ?? body.customerId,
      branchId: body.branch_id ?? body.branchId ?? null,
      description: body.description,
      assignedUserId: body.assigned_user_id ?? body.assignedUserId,
      typeId: body.type_id ?? body.typeId ?? null,
      priority: body.priority,
      dueDate: body.due_date ? new Date(body.due_date) : (body.dueDate ? new Date(body.dueDate) : undefined),
      notes: body.notes,
      locationAddress: body.location_address ?? body.locationAddress ?? null,
      locationLat: body.location_lat ?? body.locationLat ?? null,
      locationLng: body.location_lng ?? body.locationLng ?? null
    }
  });
  await logAudit(req, "update", "workOrder", id, before, updated);
  return updated;
});

app.patch("/work-orders/:id/status", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const id = (req as any).params.id;
  const body = (req as any).body || {};
  const status = body.status;
  const before = await prisma.workOrder.findUnique({ where: { id } });
  const updated = await (prisma as any).workOrder.update({
    where: { id },
    data: {
      status,
      completedAt: status === "kapali" ? new Date() : null,
      branchId: body.branch_id ?? body.branchId ?? null,
      locationAddress: body.location_address ?? body.locationAddress ?? null,
      locationLat: body.location_lat ?? body.locationLat ?? null,
      locationLng: body.location_lng ?? body.locationLng ?? null
    }
  });
  if (status === "kapali" && body.payment_amount) {
    const amount = Number(body.payment_amount);
    if (!isNaN(amount) && amount > 0 && before) {
      await (prisma as any).payment.create({
        data: {
          orgId: before.orgId,
          workOrderId: id,
          customerId: before.customerId,
          amount,
          note: body.payment_note ?? null,
          paidAt: body.paid_at ? new Date(body.paid_at) : new Date()
        }
      });
    }
  }
  await logAudit(req, "update_status", "workOrder", id, before, updated);
  return updated;
});

app.delete("/work-orders/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const before = await prisma.workOrder.findUnique({ where: { id } });
  const updated = await prisma.workOrder.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(req, "delete", "workOrder", id, before, updated);
  return { ok: true };
});

app.patch("/work-orders/:id/restore", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
  const id = req.params.id;
  const before = await prisma.workOrder.findUnique({ where: { id } });
  const updated = await prisma.workOrder.update({ where: { id }, data: { deletedAt: null } });
  await logAudit(req, "restore", "workOrder", id, before, updated);
  return updated;
});

app.get("/work-orders/assigned/me", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
  const userId = req.user?.sub;
  const items = await prisma.workOrder.findMany({ where: { assignedUserId: userId, status: { in: ["acik", "devam"] } }, orderBy: { createdAt: "desc" } });
  return { data: items };
});

app.get("/users", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const items = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return { data: items };
});

app.get("/software-vendors", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
  const items = await (prisma as any).softwareVendor.findMany({ where: { orgId: req.user.org_id }, orderBy: { createdAt: "desc" } });
  return { data: items };
});
app.post("/software-vendors", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const body = req.body || {};
  const created = await (prisma as any).softwareVendor.create({ data: { orgId: req.user.org_id, name: body.name, active: body.active ?? true } });
  return created;
});
app.put("/software-vendors/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = (req as any).params.id;
  const body = req.body || {};
  const updated = await (prisma as any).softwareVendor.update({ where: { id }, data: { name: body.name, active: body.active } });
  return updated;
});
app.delete("/software-vendors/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = (req as any).params.id;
  await (prisma as any).softwareVendor.delete({ where: { id } });
  return { ok: true };
});
app.post("/users", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const body = req.body || {};
  const name = body.name;
  const email = body.email;
  const phone = body.phone ?? null;
  const role = body.role === "admin" ? "admin" : "personel";
  const password = body.password;
  if (!name || !email || !password) return reply.code(400).send({ error: "missing_fields" });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return reply.code(409).send({ error: "email_in_use" });
  const hash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: {
      orgId: req.user.org_id,
      name,
      email,
      phone,
      role,
      passwordHash: hash,
      active: true
    }
  });
  await logAudit(req, "create", "user", created.id, null, { id: created.id, name: created.name, email: created.email, role: created.role });
  return created;
});

app.put("/users/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const id = req.params.id;
  const body = req.body || {};
  const data: any = {
    name: body.name,
    email: body.email,
    phone: body.phone ?? null,
    role: body.role === "admin" ? "admin" : "personel",
    active: body.active ?? true
  };
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);
  const before = await prisma.user.findUnique({ where: { id } });
  const updated = await prisma.user.update({ where: { id }, data });
  await logAudit(req, "update", "user", id, { id: before?.id, name: before?.name, email: before?.email, role: before?.role, active: before?.active }, { id: updated.id, name: updated.name, email: updated.email, role: updated.role, active: updated.active });
  return updated;
});

app.get("/reports/summary", { preHandler: (app as any).authenticate }, async (req: any) => {
  const orgId = req.user.org_id;
  const [users, woGroups, lineGroups, licGroups, customers] = await Promise.all([
    prisma.user.findMany({ where: { orgId }, select: { id: true, name: true, active: true } }),
    prisma.workOrder.groupBy({ by: ["assignedUserId", "status"], where: { orgId, deletedAt: null }, _count: { _all: true } }),
    prisma.line.groupBy({ by: ["customerId"], where: { orgId, deletedAt: null }, _count: { _all: true } }),
    prisma.gmp3License.groupBy({ by: ["customerId"], where: { orgId, deletedAt: null }, _count: { _all: true } }),
    prisma.customer.findMany({ where: { orgId, deletedAt: null }, select: { id: true, customerName: true } })
  ]);
  const woByUser: Record<string, any> = {};
  for (const g of woGroups) {
    if (!g.assignedUserId) continue;
    if (!woByUser[g.assignedUserId]) woByUser[g.assignedUserId] = { open: 0, inProgress: 0, closed: 0 };
    if (g.status === "acik") woByUser[g.assignedUserId].open += g._count._all;
    else if (g.status === "devam") woByUser[g.assignedUserId].inProgress += g._count._all;
    else if (g.status === "kapali") woByUser[g.assignedUserId].closed += g._count._all;
  }
  const workOrdersByUser = users.map(u => ({ userId: u.id, name: u.name, active: u.active, open: woByUser[u.id]?.open || 0, inProgress: woByUser[u.id]?.inProgress || 0, closed: woByUser[u.id]?.closed || 0 }));
  const lineByCustomer: Record<string, number> = {};
  for (const g of lineGroups) lineByCustomer[g.customerId] = g._count._all;
  const licByCustomer: Record<string, number> = {};
  for (const g of licGroups) licByCustomer[g.customerId] = g._count._all;
  const customerMap: Record<string, string> = {};
  for (const c of customers) customerMap[c.id] = c.customerName;
  const customersOverview = customers.map(c => ({ customerId: c.id, name: c.customerName, lineCount: lineByCustomer[c.id] || 0, licenseCount: licByCustomer[c.id] || 0 }));
  return { workOrdersByUser, customersOverview };
});
app.get("/operators", { preHandler: (app as any).authenticate }, async (req, reply) => {
  const items = await prisma.operator.findMany({ orderBy: { name: "asc" } });
  return { data: items };
});

app.post("/operators", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any, reply) => {
  const body = req.body || {};
  const created = await prisma.operator.create({ data: { orgId: req.user.org_id, name: body.name, code: body.code ?? null } });
  await logAudit(req, "create", "operator", created.id, null, created);
  return created;
});

app.get("/reports/lines/expiring", async (req, reply) => {
  return { rows: [] };
});

app.get("/admin/audit", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const q = (req as any).query || {};
  const page = Number(q.page || 1);
  const pageSize = Math.min(Number(q.pageSize || 20), 200);
  const where: any = { orgId: req.user.org_id };
  if (q.entityType) where.entityType = q.entityType;
  if (q.action) where.action = q.action;
  if (q.date_from || q.date_to) {
    where.createdAt = {};
    if (q.date_from) where.createdAt.gte = new Date(q.date_from);
    if (q.date_to) where.createdAt.lte = new Date(q.date_to);
  }
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } })
  ]);
  return { data: items, page, pageSize, total };
});

app.post("/lines/bulk-extend", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const body = req.body || {};
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const days = Number(body.days || 0);
  const setDate = body.set_date ? new Date(body.set_date) : null;
  if (ids.length === 0) return { updated: 0 };
  let updated = 0;
  for (const id of ids) {
    const l = await prisma.line.findUnique({ where: { id } });
    if (!l) continue;
    let next: Date;
    if (setDate) {
      next = setDate;
    } else {
      const base = l.endDate || new Date();
      next = new Date(base);
      if (days > 0) next.setDate(next.getDate() + days);
    }
    await prisma.line.update({ where: { id }, data: { endDate: next } });
    updated++;
  }
  return { updated };
});

app.get("/admin/stats", { preHandler: (app as any).authenticate }, async (req: any) => {
  const orgId = req.user.org_id;
  const now = new Date();
  const end30 = new Date();
  end30.setDate(now.getDate() + 30);
  const [customers, activeLines, linesExpiring, linesExpired, activeLicenses, openWorkOrders] = await Promise.all([
    prisma.customer.count({ where: { orgId, deletedAt: null } }),
    prisma.line.count({ where: { orgId, status: "aktif", deletedAt: null } }),
    prisma.line.count({ where: { orgId, status: "aktif", deletedAt: null, endDate: { gte: now, lte: end30 } } }),
    prisma.line.count({ where: { orgId, deletedAt: null, endDate: { lt: now } } }),
    prisma.gmp3License.count({ where: { orgId, status: "aktif", deletedAt: null } }),
    prisma.workOrder.count({ where: { orgId, deletedAt: null, status: { in: ["acik", "devam"] } } })
  ]);
  return { customers, activeLines, linesExpiring, linesExpired, activeLicenses, openWorkOrders };
});

app.get("/reports/payments", { preHandler: (app as any).authenticate }, async (req: any) => {
  const orgId = req.user.org_id;
  const q = req.query || {};
  let where: any = { orgId };
  if (q.date_from || q.date_to) {
    where.paidAt = {};
    if (q.date_from) where.paidAt.gte = new Date(q.date_from);
    if (q.date_to) where.paidAt.lte = new Date(q.date_to);
  }
  const items = await (prisma as any).payment.findMany({
    where,
    orderBy: { paidAt: "desc" },
    include: {
      customer: { select: { id: true, customerName: true } },
      workOrder: { select: { id: true, orderNumber: true } }
    }
  });
  return { data: items };
});

app.get("/reports/branches", { preHandler: (app as any).authenticate }, async (req: any) => {
  const orgId = req.user.org_id;
  const branches = await (prisma as any).branch.findMany({ where: { orgId, deletedAt: null }, orderBy: { name: "asc" } });
  const result: any[] = [];
  for (const b of branches) {
    const [open, progress, closed] = await Promise.all([
      prisma.workOrder.count({ where: { orgId, branchId: b.id, status: "acik", deletedAt: null } as any }),
      prisma.workOrder.count({ where: { orgId, branchId: b.id, status: "devam", deletedAt: null } as any }),
      prisma.workOrder.count({ where: { orgId, branchId: b.id, status: "kapali", deletedAt: null } as any }),
    ]);
    const payAgg = await (prisma as any).payment.aggregate({ _sum: { amount: true }, where: { orgId, workOrder: { branchId: b.id } } });
    result.push({ branchId: b.id, name: b.name, customerId: b.customerId, address: b.address, lat: b.lat, lng: b.lng, open, progress, closed, paymentSum: payAgg?._sum?.amount || 0 });
  }
  return { data: result };
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
app.get("/branches/nearest", { preHandler: (app as any).authenticate }, async (req: any) => {
  const q = req.query || {};
  const customerId = q.customer_id as string;
  const lat = Number(q.lat);
  const lng = Number(q.lng);
  if (!customerId || isNaN(lat) || isNaN(lng)) return { error: "missing_params" };
  const items = await (prisma as any).branch.findMany({ where: { orgId: req.user.org_id, customerId, deletedAt: null } });
  let best: any = null;
  let bestDist = Infinity;
  for (const b of items) {
    if (typeof b.lat !== "number" || typeof b.lng !== "number") continue;
    const d = haversineKm(lat, lng, b.lat, b.lng);
    if (d < bestDist) { bestDist = d; best = b; }
  }
  if (!best) return { data: null };
  return { data: { id: best.id, name: best.name, address: best.address, lat: best.lat, lng: best.lng, distance_km: Number(bestDist.toFixed(3)) } };
});

app.get("/favorites", { preHandler: (app as any).authenticate }, async (req: any) => {
  const q = (req as any).query || {};
  const pageKey = q.pageKey as string;
  const items = await prisma.favorite.findMany({
    where: { orgId: req.user.org_id, userId: req.user.sub, ...(pageKey ? { pageKey } : {}) },
    orderBy: { createdAt: "desc" }
  });
  return { data: items };
});

app.post("/favorites", { preHandler: (app as any).authenticate }, async (req: any) => {
  const body = req.body || {};
  const created = await prisma.favorite.upsert({
    where: { orgId_userId_pageKey_name: { orgId: req.user.org_id, userId: req.user.sub, pageKey: body.pageKey, name: body.name } },
    create: { orgId: req.user.org_id, userId: req.user.sub, pageKey: body.pageKey, name: body.name, params: body.params ?? {} },
    update: { params: body.params ?? {} }
  });
  return created;
});

app.delete("/favorites/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
  const id = req.params.id;
  const fav = await prisma.favorite.findUnique({ where: { id } });
  if (!fav || fav.orgId !== req.user.org_id || fav.userId !== req.user.sub) return reply.code(404).send({ error: "not_found" });
  await prisma.favorite.delete({ where: { id } });
  return { ok: true };
});

function parseCsv(input: string) {
  const rows: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < input.length) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') { field += '"'; i += 2; continue; } else { inQuotes = false; i++; continue; }
      } else { field += c; i++; continue; }
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { pushField(); i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { pushField(); pushRow(); i++; continue; }
      field += c; i++; continue;
    }
  }
  pushField(); pushRow();
  if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") rows.pop();
  return rows;
}

function rowsToObjects(input: string) {
  const r = parseCsv(input);
  if (!r.length) return [];
  const headers = r[0].map(h => h.trim());
  const out: any[] = [];
  for (let i = 1; i < r.length; i++) {
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = r[i][j] || "";
    out.push(obj);
  }
  return out;
}

function excelSerialToDate(n: number) {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + n * 86400000);
}
function tryParseDateString(s: string): Date | undefined {
  const t1 = /^\d{4}-\d{2}-\d{2}$/; // yyyy-mm-dd
  const t2 = /^(\d{2})\.(\d{2})\.(\d{4})$/; // dd.mm.yyyy
  const t3 = /^(\d{2})\/(\d{2})\/(\d{4})$/; // dd/mm/yyyy
  if (t1.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
  }
  const m2 = s.match(t2);
  if (m2) {
    const d = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
    return isNaN(d.getTime()) ? undefined : d;
  }
  const m3 = s.match(t3);
  if (m3) {
    const d = new Date(Number(m3[3]), Number(m3[2]) - 1, Number(m3[1]));
    return isNaN(d.getTime()) ? undefined : d;
  }
  const dflt = new Date(s);
  return isNaN(dflt.getTime()) ? undefined : dflt;
}
function parseDateFlexible(v: any): Date | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === "number") return excelSerialToDate(v);
  if (typeof v === "string") return tryParseDateString(v.trim());
  return undefined;
}
function validDateInput(s: any) {
  return parseDateFlexible(s) !== undefined || s === null || s === undefined || s === "";
}
function isEmail(s: any) {
  if (!s) return true;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s));
}

app.get("/imports/templates/customers", async (req, reply) => {
  const text = "customer_name,company_name,phone,email,address,tax_number,notes\n";
  reply.header("Content-Type", "text/csv; charset=utf-8").send(text);
});
app.get("/imports/templates/lines", async (req, reply) => {
  const text = "customer_name,line_number,imei_number,operator_name,activation_date,end_date,status,description\n";
  reply.header("Content-Type", "text/csv; charset=utf-8").send(text);
});
app.get("/imports/templates/licenses", async (req, reply) => {
  const text = "customer_name,license_name,license_key,activation_date,end_date,device,status,notes\n";
  reply.header("Content-Type", "text/csv; charset=utf-8").send(text);
});

app.post("/imports/customers", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const body = req.body || {};
  const rows: any[] = Array.isArray(body.rows) ? body.rows : rowsToObjects(body.csv || "");
  let created = 0, updated = 0, errors: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const issues: string[] = [];
      if (!r.customer_name || String(r.customer_name).trim() === "") issues.push("customer_name zorunlu");
      if (!isEmail(r.email)) issues.push("email formatı geçersiz");
      if (issues.length) {
        errors.push({ index: i + 2, row: r, errors: issues });
        continue;
      }
      const existing = await prisma.customer.findFirst({ where: { orgId: req.user.org_id, customerName: r.customer_name } });
      if (existing) {
        await prisma.customer.update({ where: { id: existing.id }, data: {
          companyName: r.company_name || null,
          phone: r.phone || null,
          email: r.email || null,
          address: r.address || null,
          taxNumber: r.tax_number || null,
          notes: r.notes || null
        } });
        updated++;
      } else {
        await prisma.customer.create({ data: {
          orgId: req.user.org_id,
          customerName: r.customer_name,
          companyName: r.company_name || null,
          phone: r.phone || null,
          email: r.email || null,
          address: r.address || null,
          taxNumber: r.tax_number || null,
          notes: r.notes || null
        } });
        created++;
      }
    } catch (e: any) {
      errors.push({ index: i + 2, row: r, errors: [String(e.message || e)] });
    }
  }
  return { created, updated, errors };
});

app.post("/imports/lines", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const body = req.body || {};
  const rows: any[] = Array.isArray(body.rows) ? body.rows : rowsToObjects(body.csv || "");
  let created = 0, updated = 0, errors: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const issues: string[] = [];
      if (!r.customer_name || String(r.customer_name).trim() === "") issues.push("customer_name zorunlu");
      if (!r.line_number || String(r.line_number).trim() === "") issues.push("line_number zorunlu");
      if (!validDateInput(r.activation_date)) issues.push("activation_date geçersiz");
      if (!validDateInput(r.end_date)) issues.push("end_date geçersiz");
      if (r.status && !["aktif","pasif"].includes(String(r.status))) issues.push("status değeri geçersiz");
      if (issues.length) {
        errors.push({ index: i + 2, row: r, errors: issues });
        continue;
      }
      let customer = await prisma.customer.findFirst({ where: { orgId: req.user.org_id, customerName: r.customer_name } });
      if (!customer) customer = await prisma.customer.create({ data: { orgId: req.user.org_id, customerName: r.customer_name } });
      let operatorId: string | null = null;
      if (r.operator_name) {
        let op = await prisma.operator.findFirst({ where: { orgId: req.user.org_id, name: r.operator_name } });
        if (!op) op = await prisma.operator.create({ data: { orgId: req.user.org_id, name: r.operator_name } });
        operatorId = op.id;
      }
      const existing = await prisma.line.findFirst({ where: { orgId: req.user.org_id, lineNumber: r.line_number } });
      const ad = parseDateFlexible(r.activation_date);
      const ed = parseDateFlexible(r.end_date);
      if (existing) {
        await prisma.line.update({ where: { id: existing.id }, data: {
          customerId: customer.id,
          imeiNumber: (r.sim_no ?? r.imei_number) || null,
          operatorId: operatorId,
          activationDate: ad,
          endDate: ed,
          status: r.status || "aktif",
          description: r.description || null
        } });
        updated++;
      } else {
        await prisma.line.create({ data: {
          orgId: req.user.org_id,
          customerId: customer.id,
          lineNumber: r.line_number,
          imeiNumber: (r.sim_no ?? r.imei_number) || null,
          operatorId: operatorId,
          activationDate: ad,
          endDate: ed,
          status: r.status || "aktif",
          description: r.description || null
        } });
        created++;
      }
    } catch (e: any) {
      errors.push({ index: i + 2, row: r, errors: [String(e.message || e)] });
    }
  }
  return { created, updated, errors };
});

app.post("/imports/licenses", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const body = req.body || {};
  const rows: any[] = Array.isArray(body.rows) ? body.rows : rowsToObjects(body.csv || "");
  let created = 0, updated = 0, errors: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const issues: string[] = [];
      if (!r.customer_name || String(r.customer_name).trim() === "") issues.push("customer_name zorunlu");
      if (!r.license_name || String(r.license_name).trim() === "") issues.push("license_name zorunlu");
      if (!r.license_key || String(r.license_key).trim() === "") issues.push("license_key zorunlu");
      if (!validDateInput(r.activation_date)) issues.push("activation_date geçersiz");
      if (!validDateInput(r.end_date)) issues.push("end_date geçersiz");
      if (r.status && !["aktif","pasif"].includes(String(r.status))) issues.push("status değeri geçersiz");
      if (issues.length) {
        errors.push({ index: i + 2, row: r, errors: issues });
        continue;
      }
      let customer = await prisma.customer.findFirst({ where: { orgId: req.user.org_id, customerName: r.customer_name } });
      if (!customer) customer = await prisma.customer.create({ data: { orgId: req.user.org_id, customerName: r.customer_name } });
      const existing = await prisma.gmp3License.findFirst({ where: { orgId: req.user.org_id, licenseKey: r.license_key } });
      const ad = parseDateFlexible(r.activation_date);
      const ed = parseDateFlexible(r.end_date);
      if (existing) {
        await prisma.gmp3License.update({ where: { id: existing.id }, data: {
          customerId: customer.id,
          licenseName: r.license_name,
          activationDate: ad,
          endDate: ed,
          device: r.device || null,
          status: r.status || "aktif",
          notes: r.notes || null
        } });
        updated++;
      } else {
        await prisma.gmp3License.create({ data: {
          orgId: req.user.org_id,
          customerId: customer.id,
          licenseName: r.license_name,
          licenseKey: r.license_key,
          activationDate: ad,
          endDate: ed,
          device: r.device || null,
          status: r.status || "aktif",
          notes: r.notes || null
        } });
        created++;
      }
    } catch (e: any) {
      errors.push({ index: i + 2, row: r, errors: [String(e.message || e)] });
    }
  }
  return { created, updated, errors };
});

app.get("/work-order-types", { preHandler: (app as any).authenticate }, async (req: any) => {
  const items = await prisma.workOrderType.findMany({ where: { orgId: req.user.org_id, active: true }, orderBy: { name: "asc" } });
  return { data: items };
});
app.post("/work-order-types", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const body = req.body || {};
  const created = await prisma.workOrderType.create({ data: { orgId: req.user.org_id, name: body.name, code: body.code || null, active: true } });
  return created;
});
app.put("/work-order-types/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const id = req.params.id;
  const body = req.body || {};
  const updated = await prisma.workOrderType.update({ where: { id }, data: { name: body.name, code: body.code || null, active: body.active ?? true } });
  return updated;
});
app.delete("/work-order-types/:id", { preHandler: [(app as any).authenticate, adminOnly] }, async (req: any) => {
  const id = req.params.id;
  await prisma.workOrderType.delete({ where: { id } });
  return { ok: true };
});

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3001);
  app.listen({ port, host: "0.0.0.0" }).then(() => {
    console.log(`api on ${port}`);
  });
}
