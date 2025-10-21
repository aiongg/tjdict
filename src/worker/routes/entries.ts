import { Hono } from "hono";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth";
import type {
	Entry,
	EntryData,
	EntryStatus,
	EntryWithReviews,
	EntryStatusWithUser,
	EntryCommentWithUser,
	EntryListResponse,
	UpdateEntryRequest,
	CreateStatusRequest,
	CreateCommentRequest,
	JWTPayload,
} from "../types";
import { parseSearchQuery } from "../utils/searchParser";

type Env = {
	prod_tjdict: D1Database;
};

type Variables = {
	user: JWTPayload;
};

// Generate sort key with syllable and tone awareness
// Format: FIRST_SYL_BASE#SINGLE_OR_MULTI#WHOLE_WORD_BASE#TONES
function generateSortKey(head: string): string {
	// Remove superscript numbers and parenthesized numbers first
	const cleanHead = head.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').replace(/\(\d+\)/g, '').trim();
	
	// Stop at first variant delimiter (/, |, or space)
	const firstVariant = cleanHead.split(/[/|\s]/)[0];
	
	// Convert to NFD (decomposed form) and lowercase
	const normalized = firstVariant.toLowerCase().normalize('NFD');
	
	// Tone diacritic to number mapping
	const toneMap: { [key: string]: string } = {
		'\u0301': '2', // acute
		'\u0300': '3', // grave
		'\u0302': '5', // circumflex
		'\u0304': '7', // macron
		'\u030D': '8', // vertical line above
		'\u0306': '9', // breve
	};
	
	// Process syllable by syllable (split by hyphens)
	const syllables = normalized.split('-');
	const baseSyllables: string[] = [];
	const toneNumbers: string[] = [];
	
	for (const syllable of syllables) {
		let baseChars = '';
		let modifiers = '';
		let explicitTone = '';
		
		for (let i = 0; i < syllable.length; i++) {
			const char = syllable[i];
			
			// Check if this is a special modifier that should be replaced with %
			if (char === '\u0358') { // combining dot above right
				modifiers += '%';
				continue;
			}
			if (char === '\u207F') { // superscript n
				modifiers += '%';
				continue;
			}
			
			// Check if this is a combining diacritic (tone marker)
			if (char >= '\u0300' && char <= '\u036F') {
				// If it's a tone diacritic we recognize, save the tone number
				if (toneMap[char]) {
					explicitTone = toneMap[char];
				}
				// Skip the diacritic itself (don't add to result)
				continue;
			}
			
			// Keep alphanumeric characters as base
			if ((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9')) {
				baseChars += char;
				continue;
			}
			
			// Skip any other special characters
		}
		
		// Determine tone number for this syllable
		let toneNumber = '1'; // default tone
		
		if (explicitTone) {
			// Explicit tone mark takes precedence
			toneNumber = explicitTone;
		} else {
			// Check if syllable ends in p, t, k, or h (including h followed by %)
			const fullBase = baseChars + modifiers;
			if (fullBase.endsWith('p') || fullBase.endsWith('t') || 
			    fullBase.endsWith('k') || fullBase.endsWith('h') || 
			    fullBase.endsWith('h%')) {
				toneNumber = '4';
			} else {
				toneNumber = '1';
			}
		}
		
		baseSyllables.push(baseChars + modifiers);
		toneNumbers.push(toneNumber);
	}
	
	if (baseSyllables.length === 0) {
		return '';
	}
	
	// Build the sort key: FIRST_SYL_BASE#SINGLE_OR_MULTI#WHOLE_WORD_BASE#TONES
	const firstSylBase = baseSyllables[0];
	const singleOrMulti = baseSyllables.length === 1 ? '1' : '2';
	const wholeWordBase = baseSyllables.join('-');
	const tones = toneNumbers.join('');
	
	return `${firstSylBase}#${singleOrMulti}#${wholeWordBase}#${tones}`;
}

export const entriesRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
entriesRouter.use("*", requireAuth);

// GET /api/entries - List/search entries with pagination
entriesRouter.get("/", async (c) => {
	const query = c.req.query();
	const page = parseInt(query.page || "1");
	const pageSize = parseInt(query.pageSize || "50");
	const offset = (page - 1) * pageSize;
	const sortBy = (query.sortBy || "sort_key") as "head" | "updated_at" | "sort_key";
	const sortOrder = (query.sortOrder || "asc") as "asc" | "desc";
	const payload = c.get("user");

	// Build WHERE clauses
	const conditions: string[] = [];
	const params: (string | number)[] = [];

	// Parse search query for key:value pairs
	if (query.q) {
		const parsedSearch = parseSearchQuery(query.q);
		
		// Headword search (default if no key specified, or explicit head:)
		// Match at word boundaries: start of string, after hyphen, after space, after slash, after pipe
		if (parsedSearch.head) {
			conditions.push("(head LIKE ? OR head LIKE ? OR head LIKE ? OR head LIKE ? OR head LIKE ?)");
			const term = parsedSearch.head;
			params.push(
				`${term}%`,      // Start of string
				`%-${term}%`,    // After hyphen (syllable boundary)
				`% ${term}%`,    // After space
				`%/${term}%`,    // After slash (variant separator)
				`%|${term}%`     // After pipe (variant separator)
			);
		}
		
		// English translation search
		if (parsedSearch.en) {
			conditions.push("entry_data LIKE ?");
			params.push(`%"en":"${parsedSearch.en}%`);
		}
		
		// Taiwanese text search (in examples, derivatives, idioms)
		if (parsedSearch.tw) {
			conditions.push("entry_data LIKE ?");
			params.push(`%${parsedSearch.tw}%`);
		}
		
		// Etymology search
		if (parsedSearch.etym) {
			conditions.push("entry_data LIKE ?");
			params.push(`%"etym":"${parsedSearch.etym}%`);
		}
	}

	// Status filter
	if (query.status) {
		const statuses = Array.isArray(query.status) ? query.status : [query.status];
		if (statuses.length > 0) {
			// Subquery to get most recent status for each entry, defaulting to 'draft' if no status exists
			const statusPlaceholders = statuses.map(() => "?").join(",");
			conditions.push(`COALESCE(
				(
					SELECT status 
					FROM entry_statuses 
					WHERE entry_statuses.entry_id = entries.id 
					ORDER BY reviewed_at DESC 
					LIMIT 1
				),
				'draft'
			) IN (${statusPlaceholders})`);
			params.push(...statuses);
		}
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	// Get total count
	const countQuery = `SELECT COUNT(*) as total FROM entries ${whereClause}`;
	const { results: countResults } = await c.env.prod_tjdict
		.prepare(countQuery)
		.bind(...params)
		.all();
	const total = (countResults[0] as { total: number }).total;

	// Get entries
	const entriesQuery = `
		SELECT * FROM entries 
		${whereClause}
		ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
		LIMIT ? OFFSET ?
	`;
	const { results: entries } = await c.env.prod_tjdict
		.prepare(entriesQuery)
		.bind(...params, pageSize, offset)
		.all();

	// Get statuses and comments for these entries
	const entryIds = (entries as unknown as Entry[]).map(e => e.id);
	const statusesData: { [key: number]: EntryStatusWithUser[] } = {};
	const allStatusesData: { [key: number]: EntryStatusWithUser[] } = {};
	const commentsData: { [key: number]: EntryCommentWithUser[] } = {};
	const myStatuses: { [key: number]: EntryStatus } = {};
	const currentStatuses: { [key: number]: 'draft' | 'submitted' | 'needs_work' | 'approved' } = {};

	if (entryIds.length > 0) {
		// SQLite has a limit of 999 variables per query, so we need to batch
		const BATCH_SIZE = 500; // Use 500 to be safe
		const batches = [];
		
		for (let i = 0; i < entryIds.length; i += BATCH_SIZE) {
			batches.push(entryIds.slice(i, i + BATCH_SIZE));
		}

		// Fetch statuses in batches
		for (const batch of batches) {
			const placeholders = batch.map(() => "?").join(",");
			const statusesQuery = `
				SELECT es.*, u.email as user_email, u.nickname as user_nickname
				FROM entry_statuses es
				JOIN users u ON es.user_id = u.id
				WHERE es.entry_id IN (${placeholders})
				ORDER BY es.reviewed_at DESC
			`;
			const { results: statuses } = await c.env.prod_tjdict
				.prepare(statusesQuery)
				.bind(...batch)
				.all();

			// Group statuses by entry and get latest per user
			for (const status of statuses as unknown as EntryStatusWithUser[]) {
				// Store all statuses for timeline
				if (!allStatusesData[status.entry_id]) {
					allStatusesData[status.entry_id] = [];
				}
				allStatusesData[status.entry_id].push(status);

				// Store only latest status per user for current status section
				if (!statusesData[status.entry_id]) {
					statusesData[status.entry_id] = [];
				}
				// Check if we already have a status from this user
				const existingIndex = statusesData[status.entry_id].findIndex(s => s.user_id === status.user_id);
				if (existingIndex === -1) {
					statusesData[status.entry_id].push(status);
				}

				// Track current user's latest status
				if (status.user_id === payload.userId && !myStatuses[status.entry_id]) {
					myStatuses[status.entry_id] = status;
				}

				// Track most recent status overall for this entry
				if (!currentStatuses[status.entry_id]) {
					currentStatuses[status.entry_id] = status.status;
				}
			}
		}

		// Fetch comments in batches
		for (const batch of batches) {
			const placeholders = batch.map(() => "?").join(",");
			const commentsQuery = `
				SELECT ec.*, u.email as user_email, u.nickname as user_nickname
				FROM entry_comments ec
				JOIN users u ON ec.user_id = u.id
				WHERE ec.entry_id IN (${placeholders})
				ORDER BY ec.created_at DESC
			`;
			const { results: comments } = await c.env.prod_tjdict
				.prepare(commentsQuery)
				.bind(...batch)
				.all();

			for (const comment of comments as unknown as EntryCommentWithUser[]) {
				if (!commentsData[comment.entry_id]) {
					commentsData[comment.entry_id] = [];
				}
				commentsData[comment.entry_id].push(comment);
			}
		}
	}

	// Combine entries with statuses and comments
	const entriesWithReviews: EntryWithReviews[] = (entries as unknown as Entry[]).map(entry => ({
		...entry,
		current_status: currentStatuses[entry.id] || 'draft',
		statuses: statusesData[entry.id] || [],
		all_statuses: allStatusesData[entry.id] || [],
		comments: commentsData[entry.id] || [],
		my_status: myStatuses[entry.id]
	}));

	const response: EntryListResponse = {
		entries: entriesWithReviews,
		total,
		page,
		pageSize
	};

	return c.json(response);
});

// GET /api/entries/:id - Get single entry with full details
entriesRouter.get("/:id", async (c) => {
	const id = parseInt(c.req.param("id"));
	const payload = c.get("user");

	// Get entry
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT * FROM entries WHERE id = ?")
		.bind(id)
		.all();

	const entry = results[0] as unknown as Entry | undefined;
	if (!entry) {
		return c.json({ error: "Entry not found" }, 404);
	}

	// Get all statuses for this entry (for timeline) and latest status per user
	// Using a window function to efficiently get latest status per user
	const { results: allStatuses } = await c.env.prod_tjdict
		.prepare(`
			SELECT es.*, u.email as user_email, u.nickname as user_nickname,
				ROW_NUMBER() OVER (PARTITION BY es.user_id ORDER BY es.reviewed_at DESC) as rn
			FROM entry_statuses es
			JOIN users u ON es.user_id = u.id
			WHERE es.entry_id = ?
			ORDER BY es.reviewed_at DESC
		`)
		.bind(id)
		.all();

	const allStatusesList = allStatuses as unknown as (EntryStatusWithUser & { rn: number })[];
	
	// Get latest status per user (rn = 1)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const statusesList = allStatusesList.filter(s => s.rn === 1).map(({ rn, ...status }) => status);
	const myStatus = statusesList.find(s => s.user_id === payload.userId);
	
	// Get most recent status overall (from any user)
	const currentStatus = allStatusesList.length > 0 ? allStatusesList[0].status : 'draft';

	// Get all comments for this entry
	const { results: comments } = await c.env.prod_tjdict
		.prepare(`
			SELECT ec.*, u.email as user_email, u.nickname as user_nickname
			FROM entry_comments ec
			JOIN users u ON ec.user_id = u.id
			WHERE ec.entry_id = ?
			ORDER BY ec.created_at ASC
		`)
		.bind(id)
		.all();

	const commentsList = comments as unknown as EntryCommentWithUser[];

	const entryWithReviews: EntryWithReviews = {
		...entry,
		current_status: currentStatus,
		statuses: statusesList,
		all_statuses: allStatusesList,
		comments: commentsList,
		my_status: myStatus
	};

	return c.json(entryWithReviews);
});

// POST /api/entries - Create new entry (editor/admin only)
entriesRouter.post("/", requireEditor, async (c) => {
	const payload = c.get("user");
	const body = await c.req.json<{ entry_data: EntryData }>();

	if (!body.entry_data || !body.entry_data.head || !body.entry_data.defs) {
		return c.json({ error: "Invalid entry data: head and defs are required" }, 400);
	}

	// Generate sort key
	const sortKey = generateSortKey(body.entry_data.head);

	const entryDataJson = JSON.stringify(body.entry_data);
	const headNumber = body.entry_data.head_number || null;
	const pageNumber = body.entry_data.page || null;

	const result = await c.env.prod_tjdict
		.prepare(`
			INSERT INTO entries (head, head_number, page, sort_key, entry_data, created_by, updated_by)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`)
		.bind(
			body.entry_data.head,
			headNumber,
			pageNumber,
			sortKey,
			entryDataJson,
			payload.userId,
			payload.userId
		)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to create entry" }, 500);
	}

	return c.json({ id: result.meta.last_row_id, success: true }, 201);
});

// PUT /api/entries/:id - Update entry (editor/admin only)
entriesRouter.put("/:id", requireEditor, async (c) => {
	const id = parseInt(c.req.param("id"));
	const payload = c.get("user");
	const body = await c.req.json<UpdateEntryRequest>();

	if (!body.entry_data || !body.entry_data.head || !body.entry_data.defs) {
		return c.json({ error: "Invalid entry data: head and defs are required" }, 400);
	}

	// Check if entry exists
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT id FROM entries WHERE id = ?")
		.bind(id)
		.all();

	if (results.length === 0) {
		return c.json({ error: "Entry not found" }, 404);
	}

	// Generate sort key
	const sortKey = generateSortKey(body.entry_data.head);

	const entryDataJson = JSON.stringify(body.entry_data);
	const headNumber = body.entry_data.head_number || null;
	const pageNumber = body.entry_data.page || null;

	const updateFields: string[] = [
		"head = ?",
		"head_number = ?",
		"page = ?",
		"sort_key = ?",
		"entry_data = ?",
		"updated_by = ?",
		"updated_at = CURRENT_TIMESTAMP"
	];
	const updateParams: (string | number | null)[] = [
		body.entry_data.head,
		headNumber,
		pageNumber,
		sortKey,
		entryDataJson,
		payload.userId,
		id
	];

	const result = await c.env.prod_tjdict
		.prepare(`UPDATE entries SET ${updateFields.join(", ")} WHERE id = ?`)
		.bind(...updateParams)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to update entry" }, 500);
	}

	return c.json({ success: true });
});

// DELETE /api/entries/:id - Delete entry (admin only)
entriesRouter.delete("/:id", requireAdmin, async (c) => {
	const id = parseInt(c.req.param("id"));

	const result = await c.env.prod_tjdict
		.prepare("DELETE FROM entries WHERE id = ?")
		.bind(id)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to delete entry" }, 500);
	}

	return c.json({ success: true });
});

// GET /api/entries/:id/reviews - Get all statuses for entry
entriesRouter.get("/:id/reviews", async (c) => {
	const id = parseInt(c.req.param("id"));

	const { results } = await c.env.prod_tjdict
		.prepare(`
			SELECT es.*, u.email as user_email, u.nickname as user_nickname
			FROM entry_statuses es
			JOIN users u ON es.user_id = u.id
			WHERE es.entry_id = ?
			ORDER BY es.reviewed_at DESC
		`)
		.bind(id)
		.all();

	return c.json(results as unknown as EntryStatusWithUser[]);
});

// POST /api/entries/:id/reviews - Create new status
entriesRouter.post("/:id/reviews", async (c) => {
	const id = parseInt(c.req.param("id"));
	const payload = c.get("user");
	const body = await c.req.json<CreateStatusRequest>();

	if (!body.status || !["draft", "submitted", "needs_work", "approved"].includes(body.status)) {
		return c.json({ error: "Invalid status. Must be 'draft', 'submitted', 'needs_work', or 'approved'" }, 400);
	}

	// Check if entry exists
	const { results: entryResults } = await c.env.prod_tjdict
		.prepare("SELECT id FROM entries WHERE id = ?")
		.bind(id)
		.all();

	if (entryResults.length === 0) {
		return c.json({ error: "Entry not found" }, 404);
	}

	// Insert new status (always creates a new record)
	const result = await c.env.prod_tjdict
		.prepare(`
			INSERT INTO entry_statuses (entry_id, user_id, status)
			VALUES (?, ?, ?)
		`)
		.bind(id, payload.userId, body.status)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to save status" }, 500);
	}

	return c.json({ success: true });
});

// POST /api/entries/:id/comments - Create new comment
entriesRouter.post("/:id/comments", async (c) => {
	const id = parseInt(c.req.param("id"));
	const payload = c.get("user");
	const body = await c.req.json<CreateCommentRequest>();

	if (!body.comment || body.comment.trim().length === 0) {
		return c.json({ error: "Comment cannot be empty" }, 400);
	}

	// Check if entry exists
	const { results: entryResults } = await c.env.prod_tjdict
		.prepare("SELECT id FROM entries WHERE id = ?")
		.bind(id)
		.all();

	if (entryResults.length === 0) {
		return c.json({ error: "Entry not found" }, 404);
	}

	// Insert new comment
	const result = await c.env.prod_tjdict
		.prepare(`
			INSERT INTO entry_comments (entry_id, user_id, comment)
			VALUES (?, ?, ?)
		`)
		.bind(id, payload.userId, body.comment.trim())
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to save comment" }, 500);
	}

	return c.json({ success: true, id: result.meta.last_row_id });
});

// DELETE /api/entries/:id/comments/:commentId - Delete own comment
entriesRouter.delete("/:id/comments/:commentId", async (c) => {
	const id = parseInt(c.req.param("id"));
	const commentId = parseInt(c.req.param("commentId"));
	const payload = c.get("user");

	// Check if comment exists and belongs to user
	const { results } = await c.env.prod_tjdict
		.prepare("SELECT user_id FROM entry_comments WHERE id = ? AND entry_id = ?")
		.bind(commentId, id)
		.all();

	if (results.length === 0) {
		return c.json({ error: "Comment not found" }, 404);
	}

	const comment = results[0] as { user_id: number };
	if (comment.user_id !== payload.userId) {
		return c.json({ error: "You can only delete your own comments" }, 403);
	}

	const result = await c.env.prod_tjdict
		.prepare("DELETE FROM entry_comments WHERE id = ?")
		.bind(commentId)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to delete comment" }, 500);
	}

	return c.json({ success: true });
});

// GET /api/entries/by-page/:pageNum - Get all entries from a specific dictionary page
entriesRouter.get("/by-page/:pageNum", async (c) => {
	const pageNum = parseInt(c.req.param("pageNum"));
	
	if (isNaN(pageNum) || pageNum < 1) {
		return c.json({ error: "Invalid page number" }, 400);
	}

	const query = c.req.query();
	const sortBy = (query.sortBy || "sort_key") as "head" | "updated_at" | "sort_key";
	const sortOrder = (query.sortOrder || "asc") as "asc" | "desc";

	// Get all entries for this dictionary page
	const sql = `
		SELECT id, head, head_number, page, sort_key, entry_data, updated_at
		FROM entries
		WHERE page = ?
		ORDER BY ${sortBy} ${sortOrder}
	`;

	const { results: entries } = await c.env.prod_tjdict.prepare(sql).bind(pageNum).all();

	// Get statuses and comments for these entries
	const entryIds = (entries as unknown as Entry[]).map((e: Entry) => e.id);
	const statusesData: { [key: number]: EntryStatusWithUser[] } = {};
	const allStatusesData: { [key: number]: EntryStatusWithUser[] } = {};
	const commentsData: { [key: number]: EntryCommentWithUser[] } = {};
	const myStatuses: { [key: number]: EntryStatus } = {};
	const currentStatuses: { [key: number]: 'draft' | 'submitted' | 'needs_work' | 'approved' } = {};
	const payload = c.get("user");

	if (entryIds.length > 0) {
		const placeholders = entryIds.map(() => "?").join(",");
		
		// Fetch statuses
		const statusesQuery = `
			SELECT es.*, u.email as user_email, u.nickname as user_nickname
			FROM entry_statuses es
			JOIN users u ON es.user_id = u.id
			WHERE es.entry_id IN (${placeholders})
			ORDER BY es.reviewed_at DESC
		`;
		const { results: statuses } = await c.env.prod_tjdict
			.prepare(statusesQuery)
			.bind(...entryIds)
			.all();

		// Group statuses by entry and get latest per user
		for (const status of statuses as unknown as EntryStatusWithUser[]) {
			// Store all statuses for timeline
			if (!allStatusesData[status.entry_id]) {
				allStatusesData[status.entry_id] = [];
			}
			allStatusesData[status.entry_id].push(status);

			// Store only latest status per user for current status section
			if (!statusesData[status.entry_id]) {
				statusesData[status.entry_id] = [];
			}
			const existingIndex = statusesData[status.entry_id].findIndex(s => s.user_id === status.user_id);
			if (existingIndex === -1) {
				statusesData[status.entry_id].push(status);
			}

			// Track current user's latest status
			if (status.user_id === payload.userId && !myStatuses[status.entry_id]) {
				myStatuses[status.entry_id] = status;
			}

			// Track most recent status overall for this entry
			if (!currentStatuses[status.entry_id]) {
				currentStatuses[status.entry_id] = status.status;
			}
		}

		// Fetch comments
		const commentsQuery = `
			SELECT ec.*, u.email as user_email, u.nickname as user_nickname
			FROM entry_comments ec
			JOIN users u ON ec.user_id = u.id
			WHERE ec.entry_id IN (${placeholders})
			ORDER BY ec.created_at DESC
		`;
		const { results: comments } = await c.env.prod_tjdict
			.prepare(commentsQuery)
			.bind(...entryIds)
			.all();

		for (const comment of comments as unknown as EntryCommentWithUser[]) {
			if (!commentsData[comment.entry_id]) {
				commentsData[comment.entry_id] = [];
			}
			commentsData[comment.entry_id].push(comment);
		}
	}

	// Combine entries with statuses and comments
	const entriesWithReviews: EntryWithReviews[] = (entries as unknown as Entry[]).map((entry: Entry) => ({
		...entry,
		current_status: currentStatuses[entry.id] || 'draft',
		statuses: statusesData[entry.id] || [],
		all_statuses: allStatusesData[entry.id] || [],
		comments: commentsData[entry.id] || [],
		my_status: myStatuses[entry.id]
	}));

	// Get min and max page numbers for navigation
	const minMaxQuery = `SELECT MIN(page) as minPage, MAX(page) as maxPage FROM entries WHERE page IS NOT NULL`;
	const { results: minMaxResults } = await c.env.prod_tjdict.prepare(minMaxQuery).all();
	const { minPage, maxPage } = minMaxResults[0] as { minPage: number; maxPage: number };

	return c.json({
		entries: entriesWithReviews,
		currentPage: pageNum,
		minPage: minPage || 1,
		maxPage: maxPage || 1,
		totalEntries: entries.length
	});
});


