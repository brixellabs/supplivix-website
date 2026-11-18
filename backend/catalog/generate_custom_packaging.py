"""
Script to generate distinct, photo-realistic luxury packaging images for Supplivix products.
Each product category gets customized variations with tailored colors, brand typography, and labels.
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_MEDIA = os.path.join(BASE_DIR, 'media', 'products')
FRONTEND_MEDIA = os.path.join(os.path.dirname(BASE_DIR), 'frontend', 'public', 'media', 'products')

os.makedirs(BACKEND_MEDIA, exist_ok=True)
os.makedirs(FRONTEND_MEDIA, exist_ok=True)

font_brand = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
font_title1 = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 17)
font_title2 = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 14)
font_sub = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 10)
font_vol = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 11)


def save_image(img, filename):
    for d in [BACKEND_MEDIA, FRONTEND_MEDIA]:
        dest = os.path.join(d, filename)
        img.save(dest, 'JPEG', quality=95)
    print(f"Saved: {filename}")


# -------------------------------------------------------------
# 1. SERUMS: Distinct bottles for Vitamin C, Retinol, Hyaluronic, Niacinamide
# -------------------------------------------------------------
def generate_serums():
    base_path = os.path.join(BACKEND_MEDIA, 'supplivix-skincare-serum.jpg')
    if not os.path.exists(base_path):
        return

    base_serum = Image.open(base_path).convert('RGBA')

    serum_configs = [
        {
            'file': 'supplivix-serum-vitamin-c.jpg',
            'tint_color': (245, 158, 11),  # Warm Golden Amber
            'tint_alpha': 0.32,
            'label_bg': (255, 253, 245),
            'accent_color': (217, 119, 6),
            'title_1': 'VITAMIN C GLOW',
            'title_2': '15% Ethyl Ascorbic',
            'sub': 'CELLULAR RADIANCE COMPLEX',
            'vol': '30 ML / 1.0 FL OZ',
            'dark_label': False,
        },
        {
            'file': 'supplivix-serum-retinol.jpg',
            'tint_color': (88, 28, 135),  # Deep Midnight Amethyst / Violet
            'tint_alpha': 0.40,
            'label_bg': (24, 18, 38),     # Ultra-luxury dark bottle label
            'accent_color': (168, 85, 247),
            'title_1': 'RETINOL 0.3%',
            'title_2': 'Youth Renewal Serum',
            'sub': 'OVERNIGHT REPAIR MATRIX',
            'vol': '30 ML / 1.0 FL OZ',
            'dark_label': True,
        },
        {
            'file': 'supplivix-serum-hyaluronic.jpg',
            'tint_color': (6, 182, 212),  # Fresh Aqua Crystal Blue
            'tint_alpha': 0.28,
            'label_bg': (246, 253, 255),
            'accent_color': (2, 132, 199),
            'title_1': 'HYALURONIC ACID',
            'title_2': 'Multi-Weight Complex',
            'sub': 'EPIDERMAL DEEP HYDRATION',
            'vol': '30 ML / 1.0 FL OZ',
            'dark_label': False,
        },
        {
            'file': 'supplivix-serum-niacinamide.jpg',
            'tint_color': (1, 106, 56),   # Supplivix Botanical Emerald
            'tint_alpha': 0.22,
            'label_bg': (252, 253, 250),
            'accent_color': (1, 106, 56),
            'title_1': 'NIACINAMIDE 10%',
            'title_2': '+ Pure Zinc PCA 1%',
            'sub': 'SEBUM CLARIFYING ELIXIR',
            'vol': '30 ML / 1.0 FL OZ',
            'dark_label': False,
        },
    ]

    for s in serum_configs:
        img = base_serum.copy()

        # Tint bottle
        bottle_mask = Image.new('L', img.size, 0)
        mask_draw = ImageDraw.Draw(bottle_mask)
        mask_draw.rounded_rectangle([400, 430, 624, 765], radius=24, fill=int(255 * s['tint_alpha']))

        tint_layer = Image.new('RGBA', img.size, s['tint_color'] + (255,))
        img.paste(tint_layer, (0, 0), bottle_mask)

        # Draw label
        lx0, ly0, lx1, ly1 = 422, 485, 602, 725
        label_img = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(label_img)

        # Drop shadow
        ld.rounded_rectangle([lx0 + 2, ly0 + 2, lx1 + 2, ly1 + 2], radius=10, fill=(0, 0, 0, 45))
        # Surface
        ld.rounded_rectangle([lx0, ly0, lx1, ly1], radius=10, fill=s['label_bg'] + (250,), outline=(180, 180, 180, 150), width=1)
        # Accent top bar
        ld.rounded_rectangle([lx0, ly0, lx1, ly0 + 16], radius=4, fill=s['accent_color'] + (255,))

        ink_primary = (255, 255, 255) if s['dark_label'] else (28, 28, 28)
        ink_muted = (180, 180, 200) if s['dark_label'] else (100, 100, 100)
        cx = (lx0 + lx1) // 2

        ld.text((cx, ly0 + 36), 'SUPPLIVIX', font=font_brand, fill=s['accent_color'], anchor='mm')
        ld.line([cx - 40, ly0 + 54, cx + 40, ly0 + 54], fill=s['accent_color'] + (180,), width=1)

        ld.text((cx, ly0 + 82), s['title_1'], font=font_title1, fill=ink_primary, anchor='mm')
        ld.text((cx, ly0 + 110), s['title_2'], font=font_title2, fill=ink_muted, anchor='mm')

        bg_alpha = 90 if s['dark_label'] else 35
        ld.rounded_rectangle([cx - 72, ly0 + 144, cx + 72, ly0 + 164], radius=3, fill=s['accent_color'] + (bg_alpha,))
        ld.text((cx, ly0 + 154), s['sub'], font=font_sub, fill=s['accent_color'], anchor='mm')
        ld.text((cx, ly1 - 24), s['vol'], font=font_vol, fill=ink_muted, anchor='mm')

        final_img = Image.alpha_composite(img, label_img).convert('RGB')
        save_image(final_img, s['file'])


# -------------------------------------------------------------
# 2. SUNSCREENS: Mineral Defense, Matte Fluid, Ultra-Light, Tinted Glow
# -------------------------------------------------------------
def generate_sunscreens():
    base_path = os.path.join(BACKEND_MEDIA, 'supplivix-sunscreen.jpg')
    if not os.path.exists(base_path):
        return

    base_sunscreen = Image.open(base_path).convert('RGBA')

    sunscreen_configs = [
        {
            'file': 'supplivix-sunscreen-mineral.jpg',
            'accent_color': (217, 119, 6),   # Golden Sun
            'title_1': 'MINERAL DEFENSE',
            'title_2': 'SPF 50 Physical Filter',
            'sub': '100% ZINC OXIDE SHIELD',
            'vol': '50 ML / 1.7 FL OZ',
        },
        {
            'file': 'supplivix-sunscreen-matte.jpg',
            'accent_color': (13, 148, 136),  # Matte Teal / Mint
            'title_1': 'MATTE FLUID SPF 50',
            'title_2': 'PA++++ Zero Shine',
            'sub': 'SEBUM CONTROL COMPLEX',
            'vol': '50 ML / 1.7 FL OZ',
        },
        {
            'file': 'supplivix-sunscreen-invisible.jpg',
            'accent_color': (2, 132, 199),   # Clean Sky Blue
            'title_1': 'ULTRA-LIGHT SPF 50',
            'title_2': 'Invisible Shield Daily',
            'sub': 'WEIGHTLESS HYDRA-GEL',
            'vol': '50 ML / 1.7 FL OZ',
        },
        {
            'file': 'supplivix-sunscreen-tinted.jpg',
            'accent_color': (180, 83, 9),    # Bronze Sun-Glow
            'title_1': 'TINTED GLOW SPF 50',
            'title_2': 'Mineral Radiant Tint',
            'sub': 'SKIN TONE UNIFYING',
            'vol': '50 ML / 1.7 FL OZ',
        },
    ]

    for sc in sunscreen_configs:
        img = base_sunscreen.copy()
        lx0, ly0, lx1, ly1 = 430, 480, 595, 715

        label_img = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(label_img)

        # Label Surface
        ld.rounded_rectangle([lx0, ly0, lx1, ly1], radius=8, fill=(255, 255, 255, 248), outline=(210, 210, 210, 180), width=1)
        ld.rounded_rectangle([lx0, ly0, lx1, ly0 + 14], radius=4, fill=sc['accent_color'] + (255,))

        cx = (lx0 + lx1) // 2
        ld.text((cx, ly0 + 34), 'SUPPLIVIX', font=font_brand, fill=sc['accent_color'], anchor='mm')
        ld.line([cx - 36, ly0 + 50, cx + 36, ly0 + 50], fill=sc['accent_color'] + (160,), width=1)

        ld.text((cx, ly0 + 78), sc['title_1'], font=font_title1, fill=(24, 24, 24), anchor='mm')
        ld.text((cx, ly0 + 104), sc['title_2'], font=font_title2, fill=(100, 100, 100), anchor='mm')

        ld.rounded_rectangle([cx - 70, ly0 + 138, cx + 70, ly0 + 158], radius=3, fill=sc['accent_color'] + (40,))
        ld.text((cx, ly0 + 148), sc['sub'], font=font_sub, fill=sc['accent_color'], anchor='mm')
        ld.text((cx, ly1 - 20), sc['vol'], font=font_vol, fill=(120, 120, 120), anchor='mm')

        final_img = Image.alpha_composite(img, label_img).convert('RGB')
        save_image(final_img, sc['file'])


# -------------------------------------------------------------
# 3. CREAMS: Daily Hydra, Gel Moisturizer, Overnight Recovery, Peptide Firming
# -------------------------------------------------------------
def generate_creams():
    base_path = os.path.join(BACKEND_MEDIA, 'supplivix-cream-jar.jpg')
    if not os.path.exists(base_path):
        return

    base_cream = Image.open(base_path).convert('RGBA')

    cream_configs = [
        {
            'file': 'supplivix-cream-hydra.jpg',
            'accent_color': (1, 106, 56),    # Emerald
            'title_1': 'DAILY HYDRA CREAM',
            'title_2': 'Ceramide Barrier 50ml',
            'sub': '5X CERAMIDE RESTORATION',
        },
        {
            'file': 'supplivix-cream-gel.jpg',
            'accent_color': (6, 182, 212),   # Aqua Gel
            'title_1': 'LIGHT GEL MOISTURIZER',
            'title_2': 'Oil-Free Hydration 50ml',
            'sub': 'HYALURONIC WATER-BURST',
        },
        {
            'file': 'supplivix-cream-overnight.jpg',
            'accent_color': (88, 28, 135),   # Deep Night Violet
            'title_1': 'OVERNIGHT RECOVERY',
            'title_2': 'Intensive Repair 50ml',
            'sub': 'NOCTURNAL BARRIER SHIELD',
        },
        {
            'file': 'supplivix-cream-peptide.jpg',
            'accent_color': (190, 24, 93),   # Rose Gold / Peptide
            'title_1': 'PEPTIDE FIRMING',
            'title_2': 'Rich Collagen Cream 50ml',
            'sub': 'TRIPLE PEPTIDE COMPLEX',
        },
    ]

    for cc in cream_configs:
        img = base_cream.copy()
        lx0, ly0, lx1, ly1 = 405, 520, 615, 680

        label_img = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(label_img)

        ld.rounded_rectangle([lx0, ly0, lx1, ly1], radius=8, fill=(255, 255, 255, 248), outline=(210, 210, 210, 180), width=1)
        ld.rounded_rectangle([lx0, ly0, lx1, ly0 + 10], radius=4, fill=cc['accent_color'] + (255,))

        cx = (lx0 + lx1) // 2
        ld.text((cx, ly0 + 26), 'SUPPLIVIX LABS', font=font_sub, fill=cc['accent_color'], anchor='mm')
        ld.text((cx, ly0 + 54), cc['title_1'], font=font_title1, fill=(24, 24, 24), anchor='mm')
        ld.text((cx, ly0 + 80), cc['title_2'], font=font_title2, fill=(100, 100, 100), anchor='mm')
        ld.text((cx, ly0 + 115), cc['sub'], font=font_sub, fill=cc['accent_color'], anchor='mm')

        final_img = Image.alpha_composite(img, label_img).convert('RGB')
        save_image(final_img, cc['file'])


# -------------------------------------------------------------
# 4. CLEANSERS: Gentle Foam, Salicylic Clear Gel, Cream-to-Foam, Amino Acid
# -------------------------------------------------------------
def generate_cleansers():
    base_path = os.path.join(BACKEND_MEDIA, 'supplivix-cleanser.jpg')
    if not os.path.exists(base_path):
        return

    base_cleanser = Image.open(base_path).convert('RGBA')

    cleanser_configs = [
        {
            'file': 'supplivix-cleanser-foam.jpg',
            'accent_color': (1, 106, 56),    # Emerald
            'title_1': 'GENTLE FOAM CLEANSER',
            'title_2': 'Sensitive Care 150ml',
            'sub': 'pH 5.5 GENTLE CLEANSING',
        },
        {
            'file': 'supplivix-cleanser-salicylic.jpg',
            'accent_color': (13, 148, 136),  # Salicylic Teal
            'title_1': 'CLEAR GEL WASH',
            'title_2': 'Salicylic Acid 2% 150ml',
            'sub': 'PORE PURIFYING COMPLEX',
        },
        {
            'file': 'supplivix-cleanser-cream.jpg',
            'accent_color': (2, 132, 199),   # Hydrating Blue
            'title_1': 'CREAM-TO-FOAM WASH',
            'title_2': 'Ceramide Hydrating 150ml',
            'sub': 'NON-STRIPPING MOISTURE',
        },
        {
            'file': 'supplivix-cleanser-amino.jpg',
            'accent_color': (124, 58, 237),  # Soothing Purple
            'title_1': 'AMINO ACID CLEANSER',
            'title_2': 'Soothing Gel 120ml',
            'sub': 'CALMING DERMAL PURIFIER',
        },
    ]

    for cl in cleanser_configs:
        img = base_cleanser.copy()
        lx0, ly0, lx1, ly1 = 430, 480, 595, 710

        label_img = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(label_img)

        ld.rounded_rectangle([lx0, ly0, lx1, ly1], radius=8, fill=(255, 255, 255, 248), outline=(210, 210, 210, 180), width=1)
        ld.rounded_rectangle([lx0, ly0, lx1, ly0 + 12], radius=4, fill=cl['accent_color'] + (255,))

        cx = (lx0 + lx1) // 2
        ld.text((cx, ly0 + 32), 'SUPPLIVIX', font=font_brand, fill=cl['accent_color'], anchor='mm')
        ld.line([cx - 36, ly0 + 48, cx + 36, ly0 + 48], fill=cl['accent_color'] + (160,), width=1)

        ld.text((cx, ly0 + 74), cl['title_1'], font=font_title1, fill=(24, 24, 24), anchor='mm')
        ld.text((cx, ly0 + 100), cl['title_2'], font=font_title2, fill=(100, 100, 100), anchor='mm')

        ld.rounded_rectangle([cx - 70, ly0 + 134, cx + 70, ly0 + 154], radius=3, fill=cl['accent_color'] + (40,))
        ld.text((cx, ly0 + 144), cl['sub'], font=font_sub, fill=cl['accent_color'], anchor='mm')

        final_img = Image.alpha_composite(img, label_img).convert('RGB')
        save_image(final_img, cl['file'])


# -------------------------------------------------------------
# 5. MULTIVITAMINS & SUPPLEMENTS: Tailored labels for key formulas
# -------------------------------------------------------------
def generate_multivitamins():
    base_mv_path = os.path.join(BACKEND_MEDIA, 'supplivix-multivitamin.jpg')
    base_vit_path = os.path.join(BACKEND_MEDIA, 'supplivix-daily-vitality.jpg')
    if not os.path.exists(base_mv_path) or not os.path.exists(base_vit_path):
        return

    base_mv = Image.open(base_mv_path).convert('RGBA')
    base_vit = Image.open(base_vit_path).convert('RGBA')

    mv_configs = [
        {
            'base': base_mv,
            'file': 'supplivix-mv-gold.jpg',
            'accent_color': (217, 119, 6),
            'title_1': 'DAILY BALANCE GOLD',
            'title_2': 'High Potency 60s',
            'sub': 'CELLULAR COQ10 & LUTEIN',
        },
        {
            'base': base_mv,
            'file': 'supplivix-mv-organic.jpg',
            'accent_color': (21, 128, 61),
            'title_1': 'WHOLE FOOD MULTI',
            'title_2': 'Organic Nutrients 60s',
            'sub': '100% PLANT BIOAVAILABILITY',
        },
        {
            'base': base_mv,
            'file': 'supplivix-women-iron.jpg',
            'accent_color': (190, 24, 93),
            'title_1': 'WOMEN CORE MULTI',
            'title_2': 'Gentle Iron 60s',
            'sub': 'NON-CONSTIPATING CHELATE',
        },
        {
            'base': base_mv,
            'file': 'supplivix-women-prenatal.jpg',
            'accent_color': (219, 39, 119),
            'title_1': 'PRENATAL COMPLETE',
            'title_2': 'Active Folate 60s',
            'sub': 'METHYLFOLATE & CHOLINE',
        },
        {
            'base': base_vit,
            'file': 'supplivix-men-core.jpg',
            'accent_color': (30, 64, 175),
            'title_1': 'MEN CORE MULTI',
            'title_2': 'Active Formula 60s',
            'sub': 'SAW PALMETTO & ZINC',
        },
        {
            'base': base_vit,
            'file': 'supplivix-men-sport.jpg',
            'accent_color': (220, 38, 38),
            'title_1': 'MEN SPORT MULTI',
            'title_2': 'Performance Blend 60s',
            'sub': 'ELECTROLYTES & AMINO ACIDS',
        },
        {
            'base': base_vit,
            'file': 'supplivix-men-50plus.jpg',
            'accent_color': (15, 118, 110),
            'title_1': 'MEN ACTIVE 50+',
            'title_2': 'Vitality Complex 60s',
            'sub': 'MITOCHONDRIAL SUPPORT',
        },
    ]

    for mc in mv_configs:
        img = mc['base'].copy()
        lx0, ly0, lx1, ly1 = 415, 490, 610, 715

        label_img = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(label_img)

        ld.rounded_rectangle([lx0, ly0, lx1, ly1], radius=8, fill=(255, 255, 255, 248), outline=(210, 210, 210, 180), width=1)
        ld.rounded_rectangle([lx0, ly0, lx1, ly0 + 12], radius=4, fill=mc['accent_color'] + (255,))

        cx = (lx0 + lx1) // 2
        ld.text((cx, ly0 + 32), 'SUPPLIVIX', font=font_brand, fill=mc['accent_color'], anchor='mm')
        ld.line([cx - 36, ly0 + 48, cx + 36, ly0 + 48], fill=mc['accent_color'] + (160,), width=1)

        ld.text((cx, ly0 + 74), mc['title_1'], font=font_title1, fill=(24, 24, 24), anchor='mm')
        ld.text((cx, ly0 + 100), mc['title_2'], font=font_title2, fill=(100, 100, 100), anchor='mm')

        ld.rounded_rectangle([cx - 70, ly0 + 134, cx + 70, ly0 + 154], radius=3, fill=mc['accent_color'] + (40,))
        ld.text((cx, ly0 + 144), mc['sub'], font=font_sub, fill=mc['accent_color'], anchor='mm')

        final_img = Image.alpha_composite(img, label_img).convert('RGB')
        save_image(final_img, mc['file'])


if __name__ == '__main__':
    print("Generating distinct product packaging images...")
    generate_serums()
    generate_sunscreens()
    generate_creams()
    generate_cleansers()
    generate_multivitamins()
    print("All distinct product images successfully generated!")
