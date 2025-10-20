# Cloudflare R2 Setup for Dictionary Images

This guide explains how to set up protected image storage using Cloudflare R2 for the dictionary page images.

## Overview

Dictionary page images (720×1120px webp files) are stored in a Cloudflare R2 bucket and served through an authenticated API endpoint. This ensures:
- ✅ Images are only accessible to logged-in users
- ✅ Direct bucket access is blocked
- ✅ Images are cached efficiently with CDN
- ✅ Development works with local images

## Prerequisites

1. Cloudflare account with R2 enabled
2. Node.js and npm installed (wrangler will run via `npx`, no global install needed)
3. Authenticated with Cloudflare: `npx wrangler login`

## Setup Steps

### 1. Create the R2 Bucket

```bash
npx wrangler r2 bucket create tjdict-images
```

This creates a private R2 bucket named `tjdict-images`.

### 2. Upload Images to R2

Run the provided upload script:

```bash
./scripts/upload-images-to-r2.sh
```

This will:
- Find all `tj_page_*.webp` files in the `tj_images/` directory
- Upload images to **production** Cloudflare R2 (using `--remote` flag)
- Upload in batches of 10 for better performance
- Set proper content-type and cache headers
- Show progress as it uploads

**Expected output:**
```
📚 Uploading dictionary images to R2 bucket: tjdict-images
================================================
⚠️  Using --remote flag to upload to PRODUCTION Cloudflare R2

📊 Found 588 images to upload
📦 Batch 1: Uploading images 1 to 10...
  ✓ tj_page_001.webp
  ✓ tj_page_002.webp
  ...
📦 Batch 2: Uploading images 11 to 20...
...
✅ Upload complete! 588 images processed
```

**Important**: The script uses `--remote` flag to upload to the actual Cloudflare R2 bucket, not the local development simulation.

### 3. Verify Upload

Check that images were uploaded successfully:

```bash
# List all objects in the bucket (use --remote for production)
npx wrangler r2 object list tjdict-images --remote

# Check a specific image
npx wrangler r2 object get tjdict-images/tj_page_001.webp --remote
```

### 4. Deploy Your Worker

The R2 bucket binding is already configured in `wrangler.json`. Deploy your worker:

```bash
npm run deploy
```

## How It Works

### Production (Cloudflare Workers)

1. User requests: `GET /api/images/tj_page_001.webp`
2. Auth middleware verifies JWT token
3. If authenticated, worker fetches image from R2 bucket
4. Image is returned with cache headers
5. Cloudflare CDN caches the image for future requests

### Development (Local)

1. User requests: `GET /api/images/tj_page_001.webp`
2. Auth middleware verifies JWT token (using local DB)
3. Worker falls back to fetching from `/tj_images/` directory
4. Image is served from local filesystem

## Security Features

### ✅ Authentication Required

All image requests go through `/api/images/*` which requires:
- Valid JWT token in Authorization header
- Active user session
- User must be logged in

### ✅ No Direct Bucket Access

The R2 bucket has no public access configured. Images can ONLY be accessed through the authenticated API endpoint.

### ✅ Filename Validation

The API validates that:
- Filename matches pattern: `tj_page_XXX.webp` where XXX is 001-588
- Page number is within valid range (1-588)
- No directory traversal or malicious filenames

## Cost Estimation

Cloudflare R2 Pricing (as of 2024):
- Storage: $0.015 per GB/month
- Class A operations (writes): $4.50 per million
- Class B operations (reads): $0.36 per million

**For 588 images (~720KB each = ~423MB total):**
- Storage: ~$0.01 per month
- One-time upload: ~$0.003 (588 writes)
- Reads: Free with CDN caching (Cloudflare doesn't charge for cached reads)

**Total estimated cost: < $1/year** (mostly storage)

## Updating Images

To add or update images:

1. Add/modify images in `tj_images/` directory
2. Run the upload script again:
   ```bash
   ./scripts/upload-images-to-r2.sh
   ```

The script will upload all images, replacing any existing ones.

## Troubleshooting

### Images not loading in production

Check:
1. R2 bucket exists: `npx wrangler r2 bucket list`
2. Images uploaded to production: `npx wrangler r2 object list tjdict-images --remote | head`
3. Worker logs: `npx wrangler tail` (while accessing an image)

**Note**: Always use `--remote` flag to check/interact with production R2 buckets. Without it, wrangler uses local development storage.

### Development images not loading

Check:
1. Images exist in `tj_images/` directory
2. Image filenames match pattern: `tj_page_001.webp` to `tj_page_588.webp`
3. Dev server is running: `npm run dev`

### Authentication errors

Ensure:
1. User is logged in
2. JWT token is valid and not expired
3. Token is included in Authorization header

## Manual Commands

All commands use `npx wrangler` so no global installation is required.

**Important**: Add `--remote` flag to interact with production R2. Without it, commands use local development storage.

### List all images in bucket
```bash
npx wrangler r2 object list tjdict-images --remote
```

### Upload a single image
```bash
npx wrangler r2 object put tjdict-images/tj_page_001.webp \
  --file=tj_images/tj_page_001.webp \
  --content-type=image/webp \
  --cache-control="public, max-age=31536000" \
  --remote
```

### Download an image from R2
```bash
npx wrangler r2 object get tjdict-images/tj_page_001.webp \
  --file=downloaded_page_001.webp \
  --remote
```

### Delete an image
```bash
npx wrangler r2 object delete tjdict-images/tj_page_001.webp --remote
```

### Delete all images (use with caution!)
```bash
npx wrangler r2 object delete tjdict-images --all --remote
```

### Local vs Remote

- **Without `--remote`**: Uses local development R2 simulation (for testing)
- **With `--remote`**: Uses production Cloudflare R2 bucket (actual data)

## Implementation Details

### Code Files

- **`wrangler.json`**: R2 bucket binding configuration
- **`src/worker/index.ts`**: Type definitions for R2 bucket
- **`src/worker/routes/images.ts`**: Image serving logic with R2/fallback
- **`scripts/upload-images-to-r2.sh`**: Upload script

### Environment Detection

The worker automatically detects the environment:
- If `c.env.DICTIONARY_IMAGES` exists → Use R2 (production)
- Otherwise → Fetch from local `/tj_images/` (development)

## Next Steps

After setup, the image viewer will automatically work in both development and production with no code changes needed!

