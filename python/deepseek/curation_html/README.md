# Curation HTML Files

This directory contains HTML curation files for public figures.

## File Naming Convention

**IMPORTANT:** Name your HTML files EXACTLY the same as the figure's document ID in Firestore:

- `iu(leejieun).html` → for figure ID `iu(leejieun)`
- `bts.html` → for figure ID `bts`
- `blackpink.html` → for figure ID `blackpink`

The script will automatically extract the document ID from the filename (without the `.html` extension).

## How to Parse and Upload

### Parse all HTML files in this directory
```bash
cd python/deepseek
python parse_curation_html.py
```

### Parse a specific file
```bash
# Just provide the filename (script automatically extracts figure ID from filename)
# IMPORTANT: Use quotes around filenames with parentheses!
python parse_curation_html.py --file "iu(leejieun).html"

# Or manually specify the figure ID if filename doesn't match
python parse_curation_html.py --file some_file.html --figure-id "iu(leejieun)"
```

### Test without uploading (dry-run)
```bash
# See what data would be extracted without uploading to Firestore
python parse_curation_html.py --file "iu(leejieun).html" --dry-run
```

### Parse all files without uploading
```bash
python parse_curation_html.py --dry-run
```

## Data Structure

The parser extracts the following structure from each HTML file:

```json
{
  "title": "IU(Lee Ji-eun) Wiki",
  "subtitle": "아이유 (이지은)",
  "lastEdited": "December 15, 2025",
  "quickFacts": [
    {
      "text": "Fact text here",
      "badge": "verified" | "community" | "self-reported" | null
    }
  ],
  "articles": [
    {
      "title": "Article Section Title",
      "paragraphs": [
        {
          "text": "Paragraph text with inline footnote markers[FN:1] like this[FN:2]"
        }
      ]
    }
  ],
  "footnotes": [
    {
      "number": 1,
      "text": "Source description",
      "url": "https://example.com"
    }
  ]
}
```

**Note:** Footnote references are preserved inline using the `[FN:X]` marker format, where X is the footnote number. This allows the frontend to render footnotes at the exact position they appear in the original HTML.

This data is uploaded to Firestore under `selected-figures/{figureId}/curation_data`.
