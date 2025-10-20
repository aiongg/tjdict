import { Hono } from 'hono';

type Env = {
	DICTIONARY_IMAGES: R2Bucket;
};

const images = new Hono<{ Bindings: Env }>();

// Protected endpoint to serve dictionary page images
// In production: Serves from Cloudflare R2 bucket (authenticated users only)
// In development: Fetches from local tj_images/ directory via public URL
images.get('/:filename', async (c) => {
	const filename = c.req.param('filename');
	
	// Validate filename format - only allow tj_page_XXX.webp where XXX is 001-588
	if (!/^tj_page_\d{3}\.webp$/.test(filename)) {
		return c.json({ error: 'Invalid filename format' }, 400);
	}
	
	// Extract page number and validate range
	const pageNum = parseInt(filename.match(/\d{3}/)?.[0] || '0');
	if (pageNum < 1 || pageNum > 588) {
		return c.json({ error: 'Page number out of range' }, 400);
	}
	
	try {
		// Check if R2 bucket is available (production)
		const bucket = c.env.DICTIONARY_IMAGES;
		
		if (bucket) {
			// Production: Fetch from R2 bucket
			const object = await bucket.get(filename);
			
			if (!object) {
				return c.json({ error: 'Image not found' }, 404);
			}
			
			// Return image with proper headers
			return new Response(object.body, {
				headers: {
					'Content-Type': 'image/webp',
					'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
					'ETag': object.etag,
				},
			});
		} else {
			// Development: Fetch from local tj_images directory
			const imageUrl = `/tj_images/${filename}`;
			const response = await fetch(new URL(imageUrl, c.req.url));
			
			if (!response.ok) {
				return c.json({ error: 'Image not found' }, 404);
			}
			
			// Return image with proper headers
			return new Response(response.body, {
				headers: {
					'Content-Type': 'image/webp',
					'Cache-Control': 'public, max-age=31536000',
				},
			});
		}
	} catch (error) {
		console.error(`Error fetching image ${filename}:`, error);
		return c.json({ error: 'Image not found' }, 404);
	}
});

export default images;
