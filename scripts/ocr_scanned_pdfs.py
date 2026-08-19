"""
OCR Script for I-Pass-A — Scanned PDF Text Extractor
=====================================================
Extracts text from scan-based PDFs (Biology, Mathematics) using:
  - pikepdf  : opens PDF and extracts raw image streams (incl. JPEG2000)
  - Pillow   : decodes images including JPEG2000 format
  - pytesseract : runs Tesseract OCR on each page image

Usage:
    python scripts/ocr_scanned_pdfs.py

Output:
    scripts/textbooks/grade12/G12-Biology.txt
    scripts/textbooks/grade12/G12-Mathematics.txt
"""

import os
import sys
import time
from pathlib import Path

# ── Verify dependencies ────────────────────────────────────────────────────────
try:
    import pikepdf
    from PIL import Image
    import pytesseract
    import io
except ImportError as e:
    print(f"Missing package: {e}")
    print("Run: pip install pikepdf Pillow pytesseract")
    sys.exit(1)

# ── Tesseract path (Windows) ───────────────────────────────────────────────────
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if not os.path.exists(TESSERACT_PATH):
    print(f"Tesseract not found at {TESSERACT_PATH}")
    print("Download from: https://github.com/UB-Mannheim/tesseract/wiki")
    sys.exit(1)

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# ── Config ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
TEXTBOOK_DIR = SCRIPT_DIR / "textbooks" / "grade12"

# Files to process — add more scan-based PDFs here if needed
TARGETS = [
    {
        "pdf":     TEXTBOOK_DIR / "G12-Biology.pdf",
        "output":  TEXTBOOK_DIR / "G12-Biology.txt",
        "subject": "Biology",
        "lang":    "eng",
    },
    {
        "pdf":     TEXTBOOK_DIR / "G12-Mathematics.pdf",
        "output":  TEXTBOOK_DIR / "G12-Mathematics.txt",
        "subject": "Mathematics",
        "lang":    "eng",
        # Mathematics gets better results with --psm 6 (assume uniform block of text)
        "config":  "--psm 6 --oem 1",
    },
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def extract_page_images(pdf_path: Path):
    """
    Extract one image per page from a scanned PDF using pikepdf.
    Returns a list of PIL Image objects, one per page.
    Handles JPEG2000 (JPXDecode), JPEG (DCTDecode), and raw (FlateDecode).
    """
    images = []
    pdf = pikepdf.open(pdf_path)

    for page_num, page in enumerate(pdf.pages, start=1):
        page_images = []

        # Walk all XObjects on this page looking for image resources
        if "/Resources" not in page:
            images.append(None)
            continue

        resources = page["/Resources"]
        if "/XObject" not in resources:
            images.append(None)
            continue

        for name, xobj in resources["/XObject"].items():
            xobj = xobj.get_object()
            if not hasattr(xobj, "get"):
                continue
            if xobj.get("/Subtype") != "/Image":
                continue

            width  = int(xobj["/Width"])
            height = int(xobj["/Height"])

            # Only keep large images — page scans are typically >500x500
            if width < 400 or height < 400:
                continue

            try:
                raw = bytes(xobj.read_raw_bytes())
                filters = xobj.get("/Filter")

                # Normalise filter to a list
                if filters is None:
                    filter_list = []
                elif isinstance(filters, pikepdf.Array):
                    filter_list = [str(f) for f in filters]
                else:
                    filter_list = [str(filters)]

                if "/JPXDecode" in filter_list:
                    # JPEG2000 — Pillow handles this natively
                    img = Image.open(io.BytesIO(raw)).convert("RGB")
                elif "/DCTDecode" in filter_list:
                    # JPEG
                    img = Image.open(io.BytesIO(raw)).convert("RGB")
                else:
                    # FlateDecode / raw — use pikepdf's decoded bytes
                    decoded = bytes(xobj.read_bytes())
                    color_space = str(xobj.get("/ColorSpace", "/DeviceRGB"))
                    if "Gray" in color_space or "grey" in color_space.lower():
                        img = Image.frombytes("L", (width, height), decoded).convert("RGB")
                    else:
                        channels = len(decoded) // (width * height)
                        mode = "RGB" if channels == 3 else "RGBA" if channels == 4 else "L"
                        img = Image.frombytes(mode, (width, height), decoded).convert("RGB")

                page_images.append(img)

            except Exception as e:
                # Silent — some XObjects are forms or patterns, not images
                pass

        if page_images:
            # Use the largest image on the page (the actual page scan)
            page_images.sort(key=lambda i: i.width * i.height, reverse=True)
            images.append(page_images[0])
        else:
            images.append(None)

    pdf.close()
    return images


def ocr_image(img: Image.Image, lang: str = "eng", config: str = "--psm 6") -> tuple[str, float]:
    """Run Tesseract OCR on a PIL image. Returns (text, confidence)."""
    # Scale up small images — Tesseract works best at ~300 DPI
    w, h = img.size
    if w < 1200:
        scale = 1200 / w
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Get text
    text = pytesseract.image_to_string(img, lang=lang, config=config)

    # Get confidence
    try:
        data = pytesseract.image_to_data(img, lang=lang, config=config,
                                          output_type=pytesseract.Output.DICT)
        confs = [c for c in data["conf"] if c != -1]
        confidence = sum(confs) / len(confs) if confs else 0.0
    except Exception:
        confidence = 0.0

    return text.strip(), confidence


def process_pdf(target: dict) -> None:
    pdf_path   = target["pdf"]
    output     = target["output"]
    subject    = target["subject"]
    lang       = target.get("lang", "eng")
    ocr_config = target.get("config", "--psm 6 --oem 1")

    if not pdf_path.exists():
        print(f"  ⚠  PDF not found: {pdf_path}")
        return

    print(f"\n{'='*55}")
    print(f"  {subject}: {pdf_path.name}")
    print(f"{'='*55}")

    print("  Extracting page images...")
    start = time.time()
    page_images = extract_page_images(pdf_path)
    print(f"  Pages found: {len(page_images)} "
          f"({sum(1 for i in page_images if i is not None)} with images, "
          f"{sum(1 for i in page_images if i is None)} blank/text-only)")

    all_text   = []
    total_conf = []
    skipped    = 0

    for page_num, img in enumerate(page_images, start=1):
        if img is None:
            skipped += 1
            continue

        pct = round((page_num / len(page_images)) * 100)
        print(f"\r  [{pct:3d}%] OCR page {page_num}/{len(page_images)}...", end="", flush=True)

        text, conf = ocr_image(img, lang=lang, config=ocr_config)

        if text and len(text.split()) > 3:
            all_text.append(f"\n\n--- Page {page_num} ---\n{text}")
            total_conf.append(conf)

    print()  # newline after progress

    if not all_text:
        print("  ❌  No text extracted. PDF may be too low resolution.")
        return

    # Write output TXT
    full_text = "\n".join(all_text)
    output.write_text(full_text, encoding="utf-8")

    words      = len(full_text.split())
    avg_conf   = sum(total_conf) / len(total_conf) if total_conf else 0
    elapsed    = round(time.time() - start)

    print(f"\n  ✅  Done!")
    print(f"      Words extracted : {words:,}")
    print(f"      Avg confidence  : {avg_conf:.1f}%")
    print(f"      Pages processed : {len(total_conf)}")
    print(f"      Pages skipped   : {skipped}")
    print(f"      Time taken      : {elapsed}s")
    print(f"      Output saved    : {output}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("\n🔬  I-Pass-A OCR Extractor")
    print(   "   Tesseract:", TESSERACT_PATH)
    print(   "   Textbook dir:", TEXTBOOK_DIR)

    for target in TARGETS:
        process_pdf(target)

    print(f"\n{'='*55}")
    print("  All done. Drop the .txt files into the textbooks folder")
    print("  and run the upload script.")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
