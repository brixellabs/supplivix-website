import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from catalog.models import Product, ProductImage

# Ordered rules: check women before men
RULES = [
    # Serums
    (r'vitamin c glow serum', 'products/supplivix-serum-vitamin-c.jpg'),
    (r'retinol 0\.3%', 'products/supplivix-serum-retinol.jpg'),
    (r'hyaluronic multi-weight', 'products/supplivix-serum-hyaluronic.jpg'),
    (r'niacinamide balance serum', 'products/supplivix-serum-niacinamide.jpg'),
    (r'niacinamide 10% \+ zinc clarifying', 'products/supplivix-skincare-serum.jpg'),
    
    # Sunscreens
    (r'daily shield spf 50 mineral', 'products/supplivix-sunscreen-mineral.jpg'),
    (r'ultra-light invisible sunscreen', 'products/supplivix-sunscreen-invisible.jpg'),
    (r'matte fluid sunscreen', 'products/supplivix-sunscreen-matte.jpg'),
    (r'mineral tinted glow sunscreen', 'products/supplivix-sunscreen-tinted.jpg'),
    
    # Creams
    (r'daily hydra cream', 'products/supplivix-cream-hydra.jpg'),
    (r'light gel moisturizer', 'products/supplivix-cream-gel.jpg'),
    (r'intensive overnight recovery', 'products/supplivix-cream-overnight.jpg'),
    (r'peptide firming rich cream', 'products/supplivix-cream-peptide.jpg'),
    (r'ultra hydrating hyaluronic barrier cream', 'products/supplivix-cream-jar.jpg'),
    
    # Cleansers
    (r'gentle foam cleanser', 'products/supplivix-cleanser-foam.jpg'),
    (r'clear gel wash salicylic', 'products/supplivix-cleanser-salicylic.jpg'),
    (r'hydrating cream-to-foam', 'products/supplivix-cleanser-cream.jpg'),
    (r'soothing amino acid gel', 'products/supplivix-cleanser-amino.jpg'),
    (r'exfoliating aha body wash', 'products/supplivix-cleanser.jpg'),
    
    # Lip & Body
    (r'soft lip balm', 'products/supplivix-lip-balm.jpg'),
    (r'restorative body butter', 'products/supplivix-body-butter.jpg'),
    (r'hydrating body lotion', 'products/supplivix-body-lotion.jpg'),
    
    # Women formulas (check before men!)
    (r'women core multi', 'products/supplivix-women-iron.jpg'),
    (r'women active 50\+', 'products/supplivix-multivitamin.jpg'),
    (r'women prenatal', 'products/supplivix-women-prenatal.jpg'),
    (r'women\'s complete balanced', 'products/supplivix-multivitamin.jpg'),
    (r'women radiant energy', 'products/supplivix-skin-glow.jpg'),
    
    # Men formulas (word boundary!)
    (r'\bmen core multi\b', 'products/supplivix-men-core.jpg'),
    (r'\bmen active 50\+\b', 'products/supplivix-men-50plus.jpg'),
    (r'\bmen high performance sport\b', 'products/supplivix-men-sport.jpg'),
    (r'\bmen daily wellness\b', 'products/supplivix-daily-vitality.jpg'),
    (r'\bmen\'s active daily energy\b', 'products/supplivix-daily-vitality.jpg'),
    
    # Multivitamins
    (r'daily balance gold', 'products/supplivix-mv-gold.jpg'),
    (r'organic whole food', 'products/supplivix-mv-organic.jpg'),
    (r'supplivix complete daily', 'products/supplivix-multivitamin.jpg'),
    (r'advanced vitamin c \+ zinc immunity', 'products/supplivix-immune-shield.jpg'),
    (r'radiant glow biotin', 'products/supplivix-skin-glow.jpg'),
    (r'high potency vitamin d3', 'products/supplivix-bone-joints.jpg'),
]

count = 0
for p in Product.objects.all():
    name_lower = p.name.lower()
    matched = None
    for pattern, img in RULES:
        if re.search(pattern, name_lower):
            matched = img
            break
            
    if matched:
        first_img = p.images.filter(sort_order=0).first()
        if first_img:
            first_img.image = matched
            first_img.save()
        else:
            ProductImage.objects.create(product=p, image=matched, alt_text=p.name, sort_order=0)
        count += 1
        print(f'{p.name[:42]:42s} -> {matched}')

print(f'\nSuccessfully updated {count} products with distinct individual images!')
