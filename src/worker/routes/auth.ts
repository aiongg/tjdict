import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
	generateSalt,
	hashPassword,
	verifyPassword,
	generateJWT,
	generateTempToken,
} from "../utils/auth";
import {
	generateTOTPSecret,
	verifyTOTPToken,
	generateBackupCodes,
	generateQRCodeUrl,
	verifyBackupCode,
} from "../utils/totp";
import { requireAuth } from "../middleware/auth";
import type {
	User,
	CreateAdminRequest,
	LoginRequest,
	VerifyTOTPRequest,
	Setup2FARequest,
	SetupStatusResponse,
	UserResponse,
	Setup2FAResponse,
	JWTPayload,
	ChangePasswordRequest,
} from "../types";

type Env = {
	prod_tjdict: D1Database;
};

type Variables = {
	user: JWTPayload;
};

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Check if setup is needed (no users in database)
authRouter.get("/setup/status", async (c) => {
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT COUNT(*) as count FROM users")
		.all();

	const count = (results[0] as { count: number }).count;
	const response: SetupStatusResponse = {
		needsSetup: count === 0,
	};

	return c.json(response);
});

// Create initial admin account
authRouter.post("/setup/admin", async (c) => {
	const { email, password } = await c.req.json<CreateAdminRequest>();

	// Check if any users exist
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT COUNT(*) as count FROM users")
		.all();

	const count = (results[0] as { count: number }).count;
	if (count > 0) {
		return c.json({ error: "Setup already completed" }, 400);
	}

	// Validate input
	if (!email || !password) {
		return c.json({ error: "Email and password are required" }, 400);
	}

	if (password.length < 8) {
		return c.json({ error: "Password must be at least 8 characters" }, 400);
	}

	// Create admin user
	const salt = generateSalt();
	const passwordHash = await hashPassword(password, salt);
	const nickname = email.split('@')[0]; // Generate nickname from email

	const result = await c.env.prod_tjdict
		.prepare(
			`INSERT INTO users (email, password_hash, password_salt, role, nickname, is_active) 
      VALUES (?, ?, ?, 'admin', ?, 1)`
		)
		.bind(email, passwordHash, salt, nickname)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to create admin user" }, 500);
	}

	// Get the newly created user ID
	const userId = result.meta.last_row_id;

	// Create a temp token so the user can set up 2FA
	const tempToken = await generateTempToken(userId);
	setCookie(c, "temp_token", tempToken, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		maxAge: 600, // 10 minutes
	});

	return c.json({ success: true });
});

// Login endpoint
authRouter.post("/login", async (c) => {
	const { email, password } = await c.req.json<LoginRequest>();

	if (!email || !password) {
		return c.json({ error: "Email and password are required" }, 400);
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

	// Check if password change is required
	if (user.requires_password_change) {
		const tempToken = await generateTempToken(user.id);
		setCookie(c, "temp_token", tempToken, {
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
			maxAge: 600, // 10 minutes
		});
		return c.json({ requiresTOTP: false, requiresPasswordChange: true });
	}

	// Check if TOTP is enabled
	if (user.totp_enabled) {
		const tempToken = await generateTempToken(user.id);
		setCookie(c, "temp_token", tempToken, {
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
			maxAge: 600, // 10 minutes
		});
		return c.json({ requiresTOTP: true });
	}

	// Check if user needs to set up TOTP (no secret exists)
	if (!user.totp_secret) {
		const tempToken = await generateTempToken(user.id);
		setCookie(c, "temp_token", tempToken, {
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
			maxAge: 600, // 10 minutes
		});
		return c.json({ requiresTOTP: false, requiresTOTPSetup: true });
	}

	// All checks passed, create full session
	const token = await generateJWT({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	setCookie(c, "auth_token", token, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		maxAge: 604800, // 7 days
	});

	await c.env.prod_tjdict
		.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?")
		.bind(user.id)
		.run();

	return c.json({ requiresTOTP: false });
});

// Verify TOTP and complete login
authRouter.post("/verify-totp", async (c) => {
	const { token: totpToken } = await c.req.json<VerifyTOTPRequest>();
	const tempToken = getCookie(c, "temp_token");

	if (!tempToken) {
		return c.json({ error: "No temporary token found" }, 401);
	}

	// Verify temp token
	const payload = await import("../utils/auth").then(m => m.verifyJWT(tempToken));
	if (!payload) {
		return c.json({ error: "Invalid temporary token" }, 401);
	}

	// Get user
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT * FROM users WHERE id = ?")
		.bind(payload.userId)
		.all();

	const user = results[0] as unknown as User | undefined;
	if (!user || !user.totp_secret) {
		return c.json({ error: "User not found or 2FA not set up" }, 404);
	}

	// Verify TOTP token
	const isValid = await verifyTOTPToken(user.totp_secret, totpToken);
	if (!isValid) {
		// Try backup codes
		if (user.totp_backup_codes) {
			const backupCodes = JSON.parse(user.totp_backup_codes) as string[];
			const backupValid = verifyBackupCode(backupCodes, totpToken);
			
			if (backupValid.valid && backupValid.remainingCodes) {
				// Update backup codes
				await c.env.prod_tjdict
					.prepare("UPDATE users SET totp_backup_codes = ? WHERE id = ?")
					.bind(JSON.stringify(backupValid.remainingCodes), user.id)
					.run();
			} else {
				return c.json({ error: "Invalid TOTP token or backup code" }, 401);
			}
		} else {
			return c.json({ error: "Invalid TOTP token" }, 401);
		}
	}

	// Create full session
	const token = await generateJWT({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	setCookie(c, "auth_token", token, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		maxAge: 604800, // 7 days
	});

	deleteCookie(c, "temp_token");

	await c.env.prod_tjdict
		.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?")
		.bind(user.id)
		.run();

	return c.json({ success: true });
});

// Get current user info
authRouter.get("/me", requireAuth, async (c) => {
	const payload = c.get("user");

	const { results } = await c.env.prod_tjdict
		.prepare("SELECT id, email, role, totp_enabled FROM users WHERE id = ?")
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
		nickname: user.nickname,
		totpEnabled: user.totp_enabled === 1,
	};

	return c.json(response);
});

// Logout endpoint
authRouter.post("/logout", requireAuth, async (c) => {
	deleteCookie(c, "auth_token");
	return c.json({ success: true });
});

// Setup 2FA - Generate secret and QR code
authRouter.post("/setup-2fa/init", async (c) => {
	const tempToken = getCookie(c, "temp_token");

	if (!tempToken) {
		return c.json({ error: "No temporary token found" }, 401);
	}

	const payload = await import("../utils/auth").then(m => m.verifyJWT(tempToken));
	if (!payload) {
		return c.json({ error: "Invalid temporary token" }, 401);
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

	// Generate TOTP secret
	const secret = generateTOTPSecret();
	const qrCodeUrl = await generateQRCodeUrl(user.email, secret);
	const backupCodes = generateBackupCodes();

	// Store secret and backup codes
	await c.env.prod_tjdict
		.prepare(
			`UPDATE users 
       SET totp_secret = ?, 
           totp_backup_codes = ?,
           totp_enabled = 0
       WHERE id = ?`
		)
		.bind(secret, JSON.stringify(backupCodes), user.id)
		.run();

	const response: Setup2FAResponse = {
		secret,
		qrCodeUrl,
		backupCodes,
	};

	return c.json(response);
});

// Setup 2FA - Verify and enable
authRouter.post("/setup-2fa/verify", async (c) => {
	const { totpToken } = await c.req.json<Setup2FARequest>();
	const tempToken = getCookie(c, "temp_token");

	if (!tempToken) {
		return c.json({ error: "No temporary token found" }, 401);
	}

	const payload = await import("../utils/auth").then(m => m.verifyJWT(tempToken));
	if (!payload) {
		return c.json({ error: "Invalid temporary token" }, 401);
	}

	// Get user
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT * FROM users WHERE id = ?")
		.bind(payload.userId)
		.all();

	const user = results[0] as unknown as User | undefined;
	if (!user || !user.totp_secret) {
		return c.json({ error: "User not found or 2FA not initialized" }, 404);
	}

	// Verify TOTP token
	const isValid = await verifyTOTPToken(user.totp_secret, totpToken);
	if (!isValid) {
		return c.json({ error: "Invalid TOTP token" }, 401);
	}

	// Enable TOTP
	await c.env.prod_tjdict
		.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?")
		.bind(user.id)
		.run();

	// Create full session
	const token = await generateJWT({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	setCookie(c, "auth_token", token, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		maxAge: 604800, // 7 days
	});

	deleteCookie(c, "temp_token");

	await c.env.prod_tjdict
		.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?")
		.bind(user.id)
		.run();

	return c.json({ success: true });
});

// Change password
authRouter.post("/change-password", async (c) => {
	const tempToken = getCookie(c, "temp_token");
	const authToken = getCookie(c, "auth_token");
	let payload: JWTPayload | null = null;

	if (tempToken) {
		payload = await import("../utils/auth").then(m => m.verifyJWT(tempToken));
	} else if (authToken) {
		payload = await import("../utils/auth").then(m => m.verifyJWT(authToken));
	}

	if (!payload) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { currentPassword, newPassword, totpToken } = await c.req.json<ChangePasswordRequest>();

	if (!currentPassword || !newPassword) {
		return c.json({ error: "Current and new passwords are required" }, 400);
	}

	if (newPassword.length < 8) {
		return c.json({ error: "New password must be at least 8 characters" }, 400);
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

	// Verify current password
	const isValid = await verifyPassword(currentPassword, user.password_hash, user.password_salt);
	if (!isValid) {
		return c.json({ error: "Current password is incorrect" }, 401);
	}

	// If 2FA is enabled, verify TOTP token
	if (user.totp_enabled && !totpToken) {
		return c.json({ error: "TOTP token required for password change" }, 400);
	}

	if (user.totp_enabled && totpToken && user.totp_secret) {
		const totpValid = await verifyTOTPToken(user.totp_secret, totpToken);
		if (!totpValid) {
			return c.json({ error: "Invalid TOTP token" }, 401);
		}
	}

	// Update password
	const salt = generateSalt();
	const passwordHash = await hashPassword(newPassword, salt);

	const result = await c.env.prod_tjdict
		.prepare(
			`UPDATE users 
       SET password_hash = ?, 
           password_salt = ?, 
           requires_password_change = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
		)
		.bind(passwordHash, salt, user.id)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to change password" }, 500);
	}

	// Clear temp token if it was used
	if (tempToken) {
		deleteCookie(c, "temp_token");
	}

	return c.json({ success: true, message: "Password changed successfully" });
});

// Check password status
authRouter.get("/password-status", requireAuth, async (c) => {
	const payload = c.get("user");

	const { results } = await c.env.prod_tjdict
		.prepare("SELECT requires_password_change FROM users WHERE id = ?")
		.bind(payload.userId)
		.all();

	const user = results[0] as { requires_password_change: number } | undefined;
	if (!user) {
		return c.json({ error: "User not found" }, 404);
	}

	return c.json({ 
		requiresPasswordChange: user.requires_password_change === 1 
	});
});

