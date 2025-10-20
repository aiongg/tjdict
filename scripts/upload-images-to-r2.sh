#!/bin/bash

# Script to upload dictionary page images to Cloudflare R2
# Usage: ./scripts/upload-images-to-r2.sh

BUCKET_NAME="tjdict-images"
IMAGES_DIR="tj_images"
BATCH_SIZE=10  # Upload 10 images in parallel

echo "📚 Uploading dictionary images to R2 bucket: $BUCKET_NAME"
echo "================================================"
echo "⚠️  Using --remote flag to upload to PRODUCTION Cloudflare R2"
echo ""

# Use npx wrangler with --remote flag to target production
WRANGLER="npx wrangler"

# Check if images directory exists
if [ ! -d "$IMAGES_DIR" ]; then
    echo "❌ Error: Images directory '$IMAGES_DIR' not found"
    exit 1
fi

# Count total images
TOTAL_IMAGES=$(find "$IMAGES_DIR" -name "tj_page_*.webp" | wc -l)
echo "📊 Found $TOTAL_IMAGES images to upload"

# Upload images in batches for better performance
COUNT=0
FAILED=0
BATCH_COUNT=0

# Create array of all image files
IMAGES=()
for image in "$IMAGES_DIR"/tj_page_*.webp; do
    if [ -f "$image" ]; then
        IMAGES+=("$image")
    fi
done

# Upload in batches
for ((i=0; i<${#IMAGES[@]}; i+=BATCH_SIZE)); do
    BATCH_COUNT=$((BATCH_COUNT + 1))
    BATCH_END=$((i + BATCH_SIZE))
    if [ $BATCH_END -gt ${#IMAGES[@]} ]; then
        BATCH_END=${#IMAGES[@]}
    fi
    
    echo "📦 Batch $BATCH_COUNT: Uploading images $((i+1)) to $BATCH_END..."
    
    # Upload batch in parallel
    for ((j=i; j<BATCH_END; j++)); do
        image="${IMAGES[$j]}"
        FILENAME=$(basename "$image")
        COUNT=$((COUNT + 1))
        
        (
            $WRANGLER r2 object put "$BUCKET_NAME/$FILENAME" \
                --file="$image" \
                --content-type="image/webp" \
                --cache-control="public, max-age=31536000" \
                --remote \
                2>&1 | grep -q "Upload complete" && echo "  ✓ $FILENAME" || echo "  ✗ $FILENAME FAILED"
        ) &
    done
    
    # Wait for batch to complete
    wait
    echo ""
done

echo "✅ Upload complete! $COUNT images processed"
echo ""
echo "🔒 Note: Images are protected and require authentication via the /api/images endpoint"
echo ""
echo "Verify upload with: npx wrangler r2 object list $BUCKET_NAME --remote | head"

