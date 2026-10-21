from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1]
card = Image.new('RGB', (1200, 630), '#f6f2e8')
d = ImageDraw.Draw(card)
font_dir = Path('/System/Library/Fonts/Supplemental')
def font(size, italic=False):
    return ImageFont.truetype(str(font_dir / ('Georgia Italic.ttf' if italic else 'Georgia.ttf')), size)
d.line((78, 79, 1122, 79), fill='#d9d3c4', width=2)
d.text((78, 116), 'lunarion', font=font(94), fill='#393a33')
d.text((83, 240), 'Jamie · Semifluent in computerspeak', font=font(34, True), fill='#747267')
d.text((83, 333), 'chimken samdwich', font=font(29), fill='#393a33')
d.line((78, 478, 1122, 478), fill='#d9d3c4', width=2)
d.text((82, 520), 'lunarion31.dev', font=font(25), fill='#656a45')
button = Image.open(root / 'assets/lumi.png').convert('RGBA').resize((176, 62), Image.Resampling.NEAREST)
card.paste(button, (946, 505), button)
card.save(root / 'assets/lunarion-share-cream.png', optimize=True)
