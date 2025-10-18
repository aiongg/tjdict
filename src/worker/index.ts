import { Hono, Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
	generateSalt,
	hashPassword,
	verifyPassword,
	generateJWT,
	verifyJWT,
	generateTempToken,
} from "./utils/auth";
import {
	generateTOTPSecret,
	verifyTOTPToken,
	generateBackupCodes,
	generateQRCodeUrl,
	verifyBackupCode,
} from "./utils/totp";
import type {
	User,
	CreateAdminRequest,
	LoginRequest,
	VerifyTOTPRequest,
	Setup2FARequest,
	SetupStatusResponse,
	LoginResponse,
	UserResponse,
	Setup2FAResponse,
	JWTPayload,
} from "./types";

type Env = {
	prod_tjdict: D1Database;
};

type Variables = {
	user: JWTPayload;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to check authentication
async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
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

// Check if setup is needed (no users in database)
app.get("/api/setup/status", async (c) => {
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT COUNT(*) as count FROM users")
		.all();

	const count = (results[0] as { count: number }).count;
	const response: SetupStatusResponse = {
		needsSetup: count === 0,
	};

	return c.json(response);
});

// Create admin account (only works when database is empty)
app.post("/api/setup/create-admin", async (c) => {
	// Check if any users exist
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT COUNT(*) as count FROM users")
		.all();

	const count = (results[0] as { count: number }).count;
	if (count > 0) {
		return c.json({ error: "Setup already completed" }, 400);
	}

	const body: CreateAdminRequest = await c.req.json();
	const { email, password } = body;

	if (!email || !password) {
		return c.json({ error: "Email and password required" }, 400);
	}

	if (password.length < 8) {
		return c.json({ error: "Password must be at least 8 characters" }, 400);
	}

	// Create admin user
	const salt = generateSalt();
	const passwordHash = await hashPassword(password, salt);

	const result = await c.env.prod_tjdict
		.prepare(
			`INSERT INTO users (email, password_hash, password_salt, role) 
       VALUES (?, ?, ?, 'admin')`
		)
		.bind(email, passwordHash, salt)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to create admin user" }, 500);
	}

	// Generate temp token for 2FA setup
	const userId = result.meta.last_row_id;
	const tempToken = await generateTempToken(userId as number);

	// Set cookie
	setCookie(c, "temp_token", tempToken, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		maxAge: 600, // 10 minutes
		path: "/",
	});

	return c.json({ success: true, userId });
});

// Login endpoint
app.post("/api/auth/login", async (c) => {
	const body: LoginRequest = await c.req.json();
	const { email, password } = body;

	if (!email || !password) {
		return c.json({ error: "Email and password required" }, 400);
	}

	// Find user
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
		.bind(email)
		.all();

	const user = results[0] as unknown as User | undefined;

	if (!user) {
		return c.json({ error: "Invalid credentials" }, 401);
	}

	// Verify password
	const isValid = await verifyPassword(password, user.password_hash, user.password_salt);
	if (!isValid) {
		return c.json({ error: "Invalid credentials" }, 401);
	}

	// Check if TOTP is enabled
	if (user.totp_enabled) {
		const tempToken = await generateTempToken(user.id);
		setCookie(c, "temp_token", tempToken, {
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
			maxAge: 600, // 10 minutes
			path: "/",
		});

		const response: LoginResponse = {
			requiresTOTP: true,
		};
		return c.json(response);
	}

	// No TOTP, create session
	const token = await generateJWT({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	setCookie(c, "auth_token", token, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		maxAge: 60 * 60 * 24 * 7, // 7 days
		path: "/",
	});

	// Update last login
	await c.env.prod_tjdict
		.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?")
		.bind(user.id)
		.run();

	const response: LoginResponse = {
		requiresTOTP: false,
	};
	return c.json(response);
});

// Verify TOTP token
app.post("/api/auth/verify-totp", async (c) => {
	const tempToken = getCookie(c, "temp_token");
	if (!tempToken) {
		return c.json({ error: "No temporary session found" }, 401);
	}

	const payload = await verifyJWT(tempToken);
	if (!payload) {
		return c.json({ error: "Invalid temporary session" }, 401);
	}

	const body: VerifyTOTPRequest = await c.req.json();
	const { token } = body;

	if (!token) {
		return c.json({ error: "Token required" }, 400);
	}

	// Get user
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT * FROM users WHERE id = ?")
		.bind(payload.userId)
		.all();

	const user = results[0] as unknown as User | undefined;
	if (!user || !user.totp_secret) {
		return c.json({ error: "Invalid user" }, 401);
	}

	// Try TOTP verification
	let isValid = await verifyTOTPToken(user.totp_secret, token);

	// If TOTP fails, try backup codes
	if (!isValid && user.totp_backup_codes) {
		const backupCodes = JSON.parse(user.totp_backup_codes);
		const result = verifyBackupCode(backupCodes, token);
		if (result.valid) {
			isValid = true;
			// Update backup codes
			await c.env.prod_tjdict
				.prepare("UPDATE users SET totp_backup_codes = ? WHERE id = ?")
				.bind(JSON.stringify(result.remainingCodes), user.id)
				.run();
		}
	}

	if (!isValid) {
		return c.json({ error: "Invalid token" }, 401);
	}

	// Create session
	const authToken = await generateJWT({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	setCookie(c, "auth_token", authToken, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		maxAge: 60 * 60 * 24 * 7, // 7 days
		path: "/",
	});

	// Clear temp token
	deleteCookie(c, "temp_token");

	// Update last login
	await c.env.prod_tjdict
		.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?")
		.bind(user.id)
		.run();

	return c.json({ success: true });
});

// Get current user info
app.get("/api/auth/me", requireAuth, async (c) => {
	const payload = c.get("user");

	const { results } = await c.env.prod_tjdict
		.prepare("SELECT * FROM users WHERE id = ?")
		.bind(payload.userId)
		.all();

	const user = results[0] as unknown as User | undefined;
	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	const response: UserResponse = {
		id: user.id,
		email: user.email,
		role: user.role,
		totpEnabled: user.totp_enabled === 1,
	};

	return c.json(response);
});

// Logout
app.post("/api/auth/logout", (c) => {
	deleteCookie(c, "auth_token");
	deleteCookie(c, "temp_token");
	return c.json({ success: true });
});

// Initialize 2FA setup
app.get("/api/auth/setup-2fa", async (c) => {
	const tempToken = getCookie(c, "temp_token");
	if (!tempToken) {
		return c.json({ error: "No temporary session found" }, 401);
	}

	const payload = await verifyJWT(tempToken);
	if (!payload) {
		return c.json({ error: "Invalid temporary session" }, 401);
	}

	// Get user
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT * FROM users WHERE id = ?")
		.bind(payload.userId)
		.all();

	const user = results[0] as unknown as User | undefined;
	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	// Generate TOTP secret and backup codes
	const secret = generateTOTPSecret();
	const backupCodes = generateBackupCodes();
	const qrCodeUrl = generateQRCodeUrl(user.email, secret);

	// Store secret temporarily (not enabled yet)
	await c.env.prod_tjdict
		.prepare("UPDATE users SET totp_secret = ?, totp_backup_codes = ? WHERE id = ?")
		.bind(secret, JSON.stringify(backupCodes), user.id)
		.run();

	const response: Setup2FAResponse = {
		secret,
		qrCodeUrl,
		backupCodes,
	};

	return c.json(response);
});

// Complete 2FA setup
app.post("/api/auth/setup-2fa", async (c) => {
	const tempToken = getCookie(c, "temp_token");
	if (!tempToken) {
		return c.json({ error: "No temporary session found" }, 401);
	}

	const payload = await verifyJWT(tempToken);
	if (!payload) {
		return c.json({ error: "Invalid temporary session" }, 401);
	}

	const body: Setup2FARequest = await c.req.json();
	const { totpToken } = body;

	if (!totpToken) {
		return c.json({ error: "Token required" }, 400);
	}

	// Get user
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT * FROM users WHERE id = ?")
		.bind(payload.userId)
		.all();

	const user = results[0] as unknown as User | undefined;
	if (!user || !user.totp_secret) {
		return c.json({ error: "2FA not initialized" }, 400);
	}

	// Verify token
	const isValid = await verifyTOTPToken(user.totp_secret, totpToken);
	if (!isValid) {
		return c.json({ error: "Invalid token" }, 401);
	}

	// Enable TOTP
	await c.env.prod_tjdict
		.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?")
		.bind(user.id)
		.run();

	// Create full session
	const authToken = await generateJWT({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	setCookie(c, "auth_token", authToken, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		maxAge: 60 * 60 * 24 * 7, // 7 days
		path: "/",
	});

	// Clear temp token
	deleteCookie(c, "temp_token");

	return c.json({ success: true });
});

export default app;
