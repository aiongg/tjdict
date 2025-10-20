import { Hono } from "hono";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { entriesRouter } from "./routes/entries";
import imagesRouter from "./routes/images";
import { requireAuth } from "./middleware/auth";
import type { JWTPayload } from "./types";

type Env = {
	prod_tjdict: D1Database;
};

type Variables = {
	user: JWTPayload;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Mount routers
app.route("/api/auth", authRouter);
app.route("/api/admin/users", usersRouter);
app.route("/api/entries", entriesRouter);

// Protected image serving (requires authentication)
app.use("/api/images/*", requireAuth);
app.route("/api/images", imagesRouter);

export default app;
