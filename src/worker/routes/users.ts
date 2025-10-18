import { Hono } from "hono";
import { generateSalt, hashPassword } from "../utils/auth";
import { requireAdmin } from "../middleware/auth";
import type {
	User,
	JWTPayload,
	CreateUserRequest,
	UpdateUserRequest,
	ResetPasswordResponse,
	UserListResponse,
} from "../types";

type Env = {
	prod_tjdict: D1Database;
};

type Variables = {
	user: JWTPayload;
};

// Helper: Generate random password
function generateRandomPassword(length: number = 12): string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, byte => charset[byte % charset.length]).join("");
}

export const usersRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply admin middleware to all routes
usersRouter.use("*", requireAdmin);

// List all users (admin only)
usersRouter.get("/", async (c) => {
	const { results } = await c.env.prod_tjdict
		.prepare(
			`SELECT id, email, role, is_active, totp_enabled, requires_password_change, 
              last_login, created_at 
       FROM users 
       ORDER BY created_at DESC`
		)
		.all();

	const users = (results as unknown as User[]).map(user => ({
		id: user.id,
		email: user.email,
		role: user.role,
		isActive: user.is_active === 1,
		totpEnabled: user.totp_enabled === 1,
		requiresPasswordChange: user.requires_password_change === 1,
		lastLogin: user.last_login,
		createdAt: user.created_at,
	}));

	return c.json(users as UserListResponse[]);
});

// Create new user (admin only)
usersRouter.post("/", async (c) => {
	const { email, temporaryPassword, role } = await c.req.json<CreateUserRequest>();

	if (!email || !role) {
		return c.json({ error: "Email and role are required" }, 400);
	}

	if (!["user", "editor", "admin"].includes(role)) {
		return c.json({ error: "Invalid role" }, 400);
	}

	// Check if user already exists
	const { results: existingUsers } = await c.env.prod_tjdict
		.prepare("SELECT id FROM users WHERE email = ?")
		.bind(email)
		.all();

	if (existingUsers.length > 0) {
		return c.json({ error: "User with this email already exists" }, 400);
	}

	// Generate temporary password if not provided
	const tempPassword = temporaryPassword || generateRandomPassword();

	// Hash password
	const salt = generateSalt();
	const passwordHash = await hashPassword(tempPassword, salt);

	// Create user
	const result = await c.env.prod_tjdict
		.prepare(
			`INSERT INTO users (email, password_hash, password_salt, role, requires_password_change, is_active)
       VALUES (?, ?, ?, ?, 1, 1)`
		)
		.bind(email, passwordHash, salt, role)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to create user" }, 500);
	}

	return c.json({
		id: result.meta.last_row_id,
		temporaryPassword: tempPassword,
		success: true,
	}, 201);
});

// Update user (admin only)
usersRouter.put("/:id", async (c) => {
	const id = parseInt(c.req.param("id"));
	const payload = c.get("user");
	const { role, isActive } = await c.req.json<UpdateUserRequest>();

	// Validate input
	if (role && !["user", "editor", "admin"].includes(role)) {
		return c.json({ error: "Invalid role" }, 400);
	}

	// Check if user exists
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT id FROM users WHERE id = ?")
		.bind(id)
		.all();

	if (results.length === 0) {
		return c.json({ error: "User not found" }, 404);
	}

	// Prevent admin from deactivating themselves
	if (id === payload.userId && isActive === false) {
		return c.json({ error: "Cannot deactivate your own account" }, 400);
	}

	// Build update query
	const updateFields: string[] = ["updated_at = CURRENT_TIMESTAMP"];
	const updateParams: (string | number)[] = [];

	if (role !== undefined) {
		updateFields.push("role = ?");
		updateParams.push(role);
	}

	if (isActive !== undefined) {
		updateFields.push("is_active = ?");
		updateParams.push(isActive ? 1 : 0);
	}

	if (updateParams.length === 0) {
		return c.json({ error: "No fields to update" }, 400);
	}

	updateParams.push(id);

	const result = await c.env.prod_tjdict
		.prepare(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`)
		.bind(...updateParams)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to update user" }, 500);
	}

	return c.json({ success: true });
});

// Delete user (soft delete - deactivate) (admin only)
usersRouter.delete("/:id", async (c) => {
	const id = parseInt(c.req.param("id"));
	const payload = c.get("user");

	// Prevent admin from deleting themselves
	if (id === payload.userId) {
		return c.json({ error: "Cannot delete your own account" }, 400);
	}

	const result = await c.env.prod_tjdict
		.prepare("UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
		.bind(id)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to delete user" }, 500);
	}

	return c.json({ success: true });
});

// Reset user password (admin only)
usersRouter.post("/:id/reset-password", async (c) => {
	const id = parseInt(c.req.param("id"));

	// Check if user exists
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT id FROM users WHERE id = ?")
		.bind(id)
		.all();

	if (results.length === 0) {
		return c.json({ error: "User not found" }, 404);
	}

	// Generate new temporary password
	const tempPassword = generateRandomPassword();
	const salt = generateSalt();
	const passwordHash = await hashPassword(tempPassword, salt);

	// Reset password and require change, also clear 2FA
	const result = await c.env.prod_tjdict
		.prepare(
			`UPDATE users 
       SET password_hash = ?, 
           password_salt = ?, 
           requires_password_change = 1,
           totp_secret = NULL,
           totp_enabled = 0,
           totp_backup_codes = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
		)
		.bind(passwordHash, salt, id)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to reset password" }, 500);
	}

	const response: ResetPasswordResponse = {
		temporaryPassword: tempPassword,
	};

	return c.json(response);
});

