import { Hono } from "hono";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth";
import type {
	Entry,
	EntryData,
	EntryReview,
	EntryWithReviews,
	EntryReviewWithUser,
	EntryCommentWithUser,
	EntryListResponse,
	UpdateEntryRequest,
	CreateReviewRequest,
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

	// Completeness filter
	if (query.complete !== undefined) {
		conditions.push("is_complete = ?");
		params.push(query.complete === "true" ? 1 : 0);
	}

	// Needs review filter (entries not reviewed by current user)
	if (query.needsReview === "true") {
		conditions.push(`NOT EXISTS (
			SELECT 1 FROM entry_reviews 
			WHERE entry_reviews.entry_id = entries.id 
			AND entry_reviews.user_id = ?
		)`);
		params.push(payload.userId);
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

	// Get reviews and comments for these entries
	const entryIds = (entries as unknown as Entry[]).map(e => e.id);
	const reviewsData: { [key: number]: EntryReviewWithUser[] } = {};
	const allReviewsData: { [key: number]: EntryReviewWithUser[] } = {};
	const commentsData: { [key: number]: EntryCommentWithUser[] } = {};
	const myReviews: { [key: number]: EntryReview } = {};

	if (entryIds.length > 0) {
		// SQLite has a limit of 999 variables per query, so we need to batch
		const BATCH_SIZE = 500; // Use 500 to be safe
		const batches = [];
		
		for (let i = 0; i < entryIds.length; i += BATCH_SIZE) {
			batches.push(entryIds.slice(i, i + BATCH_SIZE));
		}

		// Fetch reviews in batches
		for (const batch of batches) {
			const placeholders = batch.map(() => "?").join(",");
			const reviewsQuery = `
				SELECT er.*, u.email as user_email, u.nickname as user_nickname
				FROM entry_reviews er
				JOIN users u ON er.user_id = u.id
				WHERE er.entry_id IN (${placeholders})
				ORDER BY er.reviewed_at DESC
			`;
			const { results: reviews } = await c.env.prod_tjdict
				.prepare(reviewsQuery)
				.bind(...batch)
				.all();

			// Group reviews by entry and get latest per user
			for (const review of reviews as unknown as EntryReviewWithUser[]) {
				// Store all reviews for timeline
				if (!allReviewsData[review.entry_id]) {
					allReviewsData[review.entry_id] = [];
				}
				allReviewsData[review.entry_id].push(review);

				// Store only latest review per user for current status
				if (!reviewsData[review.entry_id]) {
					reviewsData[review.entry_id] = [];
				}
				// Check if we already have a review from this user
				const existingIndex = reviewsData[review.entry_id].findIndex(r => r.user_id === review.user_id);
				if (existingIndex === -1) {
					reviewsData[review.entry_id].push(review);
				}

				// Track current user's latest review
				if (review.user_id === payload.userId && !myReviews[review.entry_id]) {
					myReviews[review.entry_id] = review;
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

	// Combine entries with reviews and comments
	const entriesWithReviews: EntryWithReviews[] = (entries as unknown as Entry[]).map(entry => ({
		...entry,
		reviews: reviewsData[entry.id] || [],
		all_reviews: allReviewsData[entry.id] || [],
		comments: commentsData[entry.id] || [],
		my_review: myReviews[entry.id]
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

	// Get all reviews for this entry (for timeline) and latest review per user
	// Using a window function to efficiently get latest review per user
	const { results: allReviews } = await c.env.prod_tjdict
		.prepare(`
			SELECT er.*, u.email as user_email, u.nickname as user_nickname,
				ROW_NUMBER() OVER (PARTITION BY er.user_id ORDER BY er.reviewed_at DESC) as rn
			FROM entry_reviews er
			JOIN users u ON er.user_id = u.id
			WHERE er.entry_id = ?
			ORDER BY er.reviewed_at DESC
		`)
		.bind(id)
		.all();

	const allReviewsList = allReviews as unknown as (EntryReviewWithUser & { rn: number })[];
	
	// Get latest review per user (rn = 1)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const reviewsList = allReviewsList.filter(r => r.rn === 1).map(({ rn, ...review }) => review);
	const myReview = reviewsList.find(r => r.user_id === payload.userId);

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
		reviews: reviewsList,
		all_reviews: allReviewsList,
		comments: commentsList,
		my_review: myReview
	};

	return c.json(entryWithReviews);
});

// POST /api/entries - Create new entry (editor/admin only)
entriesRouter.post("/", requireEditor, async (c) => {
	const payload = c.get("user");
	const body = await c.req.json<{ entry_data: EntryData; is_complete?: boolean }>();

	if (!body.entry_data || !body.entry_data.head || !body.entry_data.defs) {
		return c.json({ error: "Invalid entry data: head and defs are required" }, 400);
	}

	// Generate sort key
	const sortKey = generateSortKey(body.entry_data.head);

	const isComplete = body.is_complete !== undefined ? (body.is_complete ? 1 : 0) : 0;
	const entryDataJson = JSON.stringify(body.entry_data);
	const headNumber = body.entry_data.head_number || null;
	const pageNumber = body.entry_data.page || null;

	const result = await c.env.prod_tjdict
		.prepare(`
			INSERT INTO entries (head, head_number, page, sort_key, entry_data, is_complete, created_by, updated_by)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`)
		.bind(
			body.entry_data.head,
			headNumber,
			pageNumber,
			sortKey,
			entryDataJson,
			isComplete,
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
	const isComplete = body.is_complete !== undefined ? (body.is_complete ? 1 : 0) : undefined;
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
		payload.userId
	];

	if (isComplete !== undefined) {
		updateFields.push("is_complete = ?");
		updateParams.push(isComplete);
	}

	updateParams.push(id);

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

// GET /api/entries/:id/reviews - Get all reviews for entry
entriesRouter.get("/:id/reviews", async (c) => {
	const id = parseInt(c.req.param("id"));

	const { results } = await c.env.prod_tjdict
		.prepare(`
			SELECT er.*, u.email as user_email, u.nickname as user_nickname
			FROM entry_reviews er
			JOIN users u ON er.user_id = u.id
			WHERE er.entry_id = ?
			ORDER BY er.reviewed_at DESC
		`)
		.bind(id)
		.all();

	return c.json(results as unknown as EntryReviewWithUser[]);
});

// POST /api/entries/:id/reviews - Create new review
entriesRouter.post("/:id/reviews", async (c) => {
	const id = parseInt(c.req.param("id"));
	const payload = c.get("user");
	const body = await c.req.json<CreateReviewRequest>();

	if (!body.status || !["approved", "needs_work"].includes(body.status)) {
		return c.json({ error: "Invalid status. Must be 'approved' or 'needs_work'" }, 400);
	}

	// Check if entry exists
	const { results: entryResults } = await c.env.prod_tjdict
		.prepare("SELECT id FROM entries WHERE id = ?")
		.bind(id)
		.all();

	if (entryResults.length === 0) {
		return c.json({ error: "Entry not found" }, 404);
	}

	// Insert new review (always creates a new record)
	const result = await c.env.prod_tjdict
		.prepare(`
			INSERT INTO entry_reviews (entry_id, user_id, status)
			VALUES (?, ?, ?)
		`)
		.bind(id, payload.userId, body.status)
		.run();

	if (!result.success) {
		return c.json({ error: "Failed to save review" }, 500);
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
		SELECT id, head, head_number, page, sort_key, entry_data, is_complete, updated_at
		FROM entries
		WHERE page = ?
		ORDER BY ${sortBy} ${sortOrder}
	`;

	const { results: entries } = await c.env.prod_tjdict.prepare(sql).bind(pageNum).all();

	// Get reviews and comments for these entries
	const entryIds = (entries as unknown as Entry[]).map((e: Entry) => e.id);
	const reviewsData: { [key: number]: EntryReviewWithUser[] } = {};
	const allReviewsData: { [key: number]: EntryReviewWithUser[] } = {};
	const commentsData: { [key: number]: EntryCommentWithUser[] } = {};
	const myReviews: { [key: number]: EntryReview } = {};
	const payload = c.get("user");

	if (entryIds.length > 0) {
		const placeholders = entryIds.map(() => "?").join(",");
		
		// Fetch reviews
		const reviewsQuery = `
			SELECT er.*, u.email as user_email, u.nickname as user_nickname
			FROM entry_reviews er
			JOIN users u ON er.user_id = u.id
			WHERE er.entry_id IN (${placeholders})
			ORDER BY er.reviewed_at DESC
		`;
		const { results: reviews } = await c.env.prod_tjdict
			.prepare(reviewsQuery)
			.bind(...entryIds)
			.all();

		// Group reviews by entry and get latest per user
		for (const review of reviews as unknown as EntryReviewWithUser[]) {
			// Store all reviews for timeline
			if (!allReviewsData[review.entry_id]) {
				allReviewsData[review.entry_id] = [];
			}
			allReviewsData[review.entry_id].push(review);

			// Store only latest review per user for current status
			if (!reviewsData[review.entry_id]) {
				reviewsData[review.entry_id] = [];
			}
			const existingIndex = reviewsData[review.entry_id].findIndex(r => r.user_id === review.user_id);
			if (existingIndex === -1) {
				reviewsData[review.entry_id].push(review);
			}

			// Track current user's latest review
			if (review.user_id === payload.userId && !myReviews[review.entry_id]) {
				myReviews[review.entry_id] = review;
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

	// Combine entries with reviews and comments
	const entriesWithReviews: EntryWithReviews[] = (entries as unknown as Entry[]).map((entry: Entry) => ({
		...entry,
		reviews: reviewsData[entry.id] || [],
		all_reviews: allReviewsData[entry.id] || [],
		comments: commentsData[entry.id] || [],
		my_review: myReviews[entry.id]
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


