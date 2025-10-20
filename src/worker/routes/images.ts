import { Hono } from 'hono';

const images = new Hono();

// Protected endpoint to serve dictionary page images
// In development, images should be served from tj_images/ directory
// In production (Cloudflare), images need to be uploaded as assets or served from R2/KV
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
		// In development with Vite, we can fetch from the public URL
		// The images should be in the public directory or accessible via URL
		const imageUrl = `/tj_images/${filename}`;
		
		// Fetch the image
		const response = await fetch(new URL(imageUrl, c.req.url));
		
		if (!response.ok) {
			return c.json({ error: 'Image not found' }, 404);
		}
		
		// Return image with proper headers
		return new Response(response.body, {
			headers: {
				'Content-Type': 'image/webp',
				'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
			},
		});
	} catch (error) {
		console.error(`Error fetching image ${filename}:`, error);
		return c.json({ error: 'Image not found' }, 404);
	}
});

export default images;
