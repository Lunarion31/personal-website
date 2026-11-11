from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
with Image.open(root / "static/img/buttons/lumi.gif") as gif:
    opening = gif.convert("RGB")
    gif.seek(54)  # Saucer fully visible, before it lifts the first letter.
    saucer = gif.convert("RGB").crop((54, 8, 67, 15))

sky = opening.getpixel((2, 2))
hill = opening.getpixel((2, 27))
scene = Image.new("RGB", (120, 63), sky)
draw = ImageDraw.Draw(scene)
# Extend the button's hills below the original lower edge.
scene.paste(opening.crop((1, 3, 59, 30)), (0, 31))
draw.rectangle((0, 58, 119, 62), fill=hill)
for x in range(58):
    draw.line((x, 58, x, 62), fill=scene.getpixel((x, 57)))
scene.paste(opening.crop((65, 1, 87, 13)), (97, 2))
scene.paste(saucer, (73, 28))
for x, y in [(5, 7), (20, 16), (35, 5), (43, 21), (57, 12), (65, 37),
             (79, 6), (86, 19), (95, 39), (113, 29), (10, 25), (51, 31)]:
    draw.point((x, y), fill="#c5a268")
for x, y in [(28, 11), (91, 23)]:
    draw.line((x-1, y, x+1, y), fill="#c5a268")
    draw.line((x, y-1, x, y+1), fill="#f4eddf")
for i, color in enumerate(["#65503d", "#a1845c", "#c5a268", "#f4eddf"]):
    draw.point((48+i, 7+i//2), fill=color)

card = scene.resize((1200, 630), Image.Resampling.NEAREST)
font = ImageFont.truetype(str(root / "assets/fonts/geist-serif-regular.woff2"), 136)
ImageDraw.Draw(card).text((1164, 594), "lunarion", font=font, anchor="rs", fill="#f4eddf")
card.save(root / "assets/lunarion-observatory.png", optimize=True)
