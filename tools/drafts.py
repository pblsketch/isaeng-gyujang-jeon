# 그림 시안 다듬기와 비교 한 장.
# 원본 PNG(assets/raw/drafts/, git 제외)를 design/art-drafts/에 jpg로 줄여 옮기고,
# 네 화풍의 장면 그림을 2x2로 모은 compare.jpg를 만든다(휴대폰에서 보기 좋게 폭 1600px 이하).
# 사용: python tools/drafts.py
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'assets' / 'raw' / 'drafts'
OUT = ROOT / 'design' / 'art-drafts'
STYLES = [('picturebook', '1. 그림책풍'), ('sumuk', '2. 수묵 담채'),
          ('minhwa', '3. 민화·목판풍'), ('webtoon', '4. 웹툰풍')]
SCENE_W, MAP_W, MAX_BYTES = 1280, 900, 800 * 1024
SHEET_W, GAP, LAB = 1600, 12, 46


def font(size):
    for f in ['C:/Windows/Fonts/malgun.ttf', 'C:/Windows/Fonts/arial.ttf']:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def save_small(src, dst, width):
    im = Image.open(src).convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    for q in (86, 80, 72, 64):
        im.save(dst, quality=q, optimize=True)
        if dst.stat().st_size <= MAX_BYTES:
            break
    return im


OUT.mkdir(parents=True, exist_ok=True)
scenes = []
for key, label in STYLES:
    scenes.append((save_small(RAW / f'draft_{key}_scene.png', OUT / f'draft_{key}_scene.jpg', SCENE_W), label))
    save_small(RAW / f'draft_{key}_map.png', OUT / f'draft_{key}_map.jpg', MAP_W)

cell_w = (SHEET_W - GAP * 3) // 2
cell_h = round(cell_w * 9 / 16)


def fit(im):
    # 3:2로 온 그림은 위아래를 조금 잘라 16:9 칸에 맞춘다(비교 그림에서만)
    h = round(im.width * 9 / 16)
    if im.height > h:
        top = (im.height - h) // 2
        im = im.crop((0, top, im.width, top + h))
    return im.resize((cell_w, cell_h), Image.LANCZOS)


cells = [(fit(im), label) for im, label in scenes]
row_h = [max(cells[0][0].height, cells[1][0].height), max(cells[2][0].height, cells[3][0].height)]
H = GAP + sum(LAB + h + GAP for h in row_h)
sheet = Image.new('RGB', (SHEET_W, H), (243, 234, 214))
d = ImageDraw.Draw(sheet)
f = font(28)
y = GAP
for r in range(2):
    for c in range(2):
        im, label = cells[r * 2 + c]
        x = GAP + c * (cell_w + GAP)
        d.text((x + 4, y + 8), label, fill=(43, 43, 43), font=f)
        sheet.paste(im, (x, y + LAB))
    y += LAB + row_h[r] + GAP
out = OUT / 'compare.jpg'
sheet.save(out, quality=84, optimize=True)
print('비교 그림:', out, sheet.size)
