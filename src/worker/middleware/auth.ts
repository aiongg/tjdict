import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyJWT } from "../utils/auth";
import type { JWTPayload } from "../types";

type Env = {
	prod_tjdict: D1Database;
};

type Variables = {
	user: JWTPayload;
};

// Middleware to check authentication
export async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
	const token = getCookie(c, "auth_token");

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const payload = await verifyJWT(token);
	if (!payload || payload.role === "temp") {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("user", payload);
	await next();
}

// Middleware to check admin role
export async function requireAdmin(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
	const token = getCookie(c, "auth_token");

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const payload = await verifyJWT(token);
	if (!payload || payload.role !== "admin") {
		return c.json({ error: "Forbidden - Admin access required" }, 403);
	}

	c.set("user", payload);
	await next();
}

// Middleware to check editor or admin role
export async function requireEditor(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
	const token = getCookie(c, "auth_token");

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const payload = await verifyJWT(token);
	if (!payload || (payload.role !== "editor" && payload.role !== "admin")) {
		return c.json({ error: "Forbidden - Editor access required" }, 403);
	}

	c.set("user", payload);
	await next();
}

