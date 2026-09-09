import os
import json
from PIL import Image, ImageDraw

def generate():
    # Source high-resolution medallion
    med = Image.open('scratch_icons/medallion_ultra_res.png').convert('RGBA')

    # Background color: deep luxury obsidian/black
    BG_COLOR = (11, 11, 13, 255)

    def make_legacy_square(size):
        canvas = Image.new('RGBA', (size, size), BG_COLOR)
        med_sz = max(1, int(size * 0.78))
        m_res = med.resize((med_sz, med_sz), Image.Resampling.LANCZOS)
        canvas.paste(m_res, ((size - med_sz) // 2, (size - med_sz) // 2), m_res)
        return canvas

    def make_legacy_round(size):
        sq = make_legacy_square(size)
        mask = Image.new('L', (size, size), 0)
        d = ImageDraw.Draw(mask)
        d.ellipse((0, 0, size, size), fill=255)
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(sq, (0, 0), mask)
        return out

    def make_adaptive_fg(canvas_size):
        fg = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        # Viewport is 72dp inside 108dp. Medallion is 78% of viewport:
        med_sz = max(1, int(canvas_size * (72 * 0.78 / 108)))
        m_res = med.resize((med_sz, med_sz), Image.Resampling.LANCZOS)
        fg.paste(m_res, ((canvas_size - med_sz) // 2, (canvas_size - med_sz) // 2), m_res)
        return fg

    # 1. Android densities
    android_densities = {
        'mipmap-mdpi': {'legacy': 48, 'fg': 108},
        'mipmap-hdpi': {'legacy': 72, 'fg': 162},
        'mipmap-xhdpi': {'legacy': 96, 'fg': 216},
        'mipmap-xxhdpi': {'legacy': 144, 'fg': 324},
        'mipmap-xxxhdpi': {'legacy': 192, 'fg': 432},
    }

    res_base = 'android/app/src/main/res'
    for folder, sizes in android_densities.items():
        target_dir = os.path.join(res_base, folder)
        os.makedirs(target_dir, exist_ok=True)

        # Save legacy square
        sq = make_legacy_square(sizes['legacy'])
        sq.save(os.path.join(target_dir, 'ic_launcher.png'))

        # Save legacy round
        rd = make_legacy_round(sizes['legacy'])
        rd.save(os.path.join(target_dir, 'ic_launcher_round.png'))

        # Save adaptive foreground
        fg = make_adaptive_fg(sizes['fg'])
        fg.save(os.path.join(target_dir, 'ic_launcher_foreground.png'))
        print(f"Generated Android icons for {folder}: legacy {sizes['legacy']}px, fg {sizes['fg']}px")

    # Also create high-res 512x512 for Play Store
    os.makedirs(os.path.join(res_base, 'drawable'), exist_ok=True)
    play_sq = make_legacy_square(512)
    play_sq.save(os.path.join(res_base, 'drawable', 'ic_launcher.png'))

    # 2. iOS AppIcon assets
    ios_dir = 'ios/ReceiptionistAPP/Images.xcassets/AppIcon.appiconset'
    os.makedirs(ios_dir, exist_ok=True)

    ios_icons = [
        ('icon-20@2x.png', 40, '20x20', '2x'),
        ('icon-20@3x.png', 60, '20x20', '3x'),
        ('icon-29@2x.png', 58, '29x29', '2x'),
        ('icon-29@3x.png', 87, '29x29', '3x'),
        ('icon-40@2x.png', 80, '40x40', '2x'),
        ('icon-40@3x.png', 120, '40x40', '3x'),
        ('icon-60@2x.png', 120, '60x60', '2x'),
        ('icon-60@3x.png', 180, '60x60', '3x'),
        ('icon-1024.png', 1024, '1024x1024', '1x'),
    ]

    contents_images = []
    for filename, px_sz, size_str, scale_str in ios_icons:
        img = make_legacy_square(px_sz)
        img.convert('RGB').save(os.path.join(ios_dir, filename))
        idiom = 'ios-marketing' if size_str == '1024x1024' else 'iphone'
        contents_images.append({
            'size': size_str,
            'idiom': idiom,
            'filename': filename,
            'scale': scale_str
        })

    contents_json = {
        'images': contents_images,
        'info': {
            'version': 1,
            'author': 'xcode'
        }
    }

    with open(os.path.join(ios_dir, 'Contents.json'), 'w') as f:
        json.dump(contents_json, f, indent=2)

    print('Generated iOS AppIcon assets and Contents.json successfully!')

if __name__ == '__main__':
    generate()
