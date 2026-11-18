"""
Django management command to seed or update the flagship Supplivix products.
Includes the 4 key formulas from the Multivitamins comparison table:
  1. Complete Daily Multi (supplivix-complete-daily-multivitamin-60s)
  2. Men's Active Energy (mens-active-daily-energy-multivitamin)
  3. Women's Balanced Multi (womens-complete-balanced-multivitamin)
  4. Immunity Shield C+Zinc (advanced-vitamin-c-zinc-immunity-shield-30s)
Along with the other flagship catalog formulas.
"""

from django.core.management.base import BaseCommand
from catalog.models import Category, Product, ProductImage, ProductAttribute, ProductFAQ, Review
from accounts.models import User

DISCLAIMER = (
    "These statements have not been evaluated by a regulator. "
    "This product is not intended to diagnose, treat, cure or prevent any disease."
)

FLAGSHIP_PRODUCTS = [
    {
        'slug': 'supplivix-complete-daily-multivitamin-60s',
        'name': 'Supplivix Complete Daily Multivitamin 60s',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'sku': 'SPLV-MV-COMPLETE-60',
        'price': 2450,
        'compare_at_price': 2900,
        'stock': 100,
        'is_featured': True,
        'short_description': 'Comprehensive 24-micronutrient daily multivitamin featuring chelated zinc, methylfolate, and bioavailable iron.',
        'description': (
            'A high-potency daily micronutrient formulation engineered for modern adult nutritional demands. '
            'Delivers 24 bioavailable vitamins and chelated minerals to support metabolic energy, natural immunity, '
            f'and daily cellular vitality. Halal certified, 100% vegetarian, free from artificial binders. {DISCLAIMER}'
        ),
        'images': [
            {'image': 'products/supplivix-multivitamin.jpg', 'alt_text': 'Supplivix Complete Daily Multivitamin 60s Front'},
            {'image': 'products/supplivix-daily-vitality.jpg', 'alt_text': 'Supplivix Complete Daily Multivitamin Lifestyle'},
        ],
        'attributes': [
            ('Serving Size', '1 Tablet Daily with Breakfast'),
            ('Pack Size', '60 Tablets (2 Mo. Supply)'),
            ('Target User', 'All Adults (Unisex)'),
            ('Key Actives', '24 Bioavailable Vitamins + Zinc Glycinate + Gentle Iron'),
            ('Formulation', 'Halal Certified, 100% Vegetarian, Gluten-Free, Non-GMO'),
            ('Directions', 'Take one (1) tablet daily with food, preferably in the morning with breakfast. Swallow with a full glass of water. Do not exceed the recommended daily dose.'),
            ('Storage', 'Store in a cool, dry place away from direct sunlight and moisture. Keep bottle tightly closed. Keep out of reach of children.'),
            ('Ingredients', 'Vitamin A (Retinyl Palmitate), Vitamin C (Ascorbic Acid), Vitamin D3 (Cholecalciferol), Vitamin E (d-Alpha Tocopherol), Thiamin, Riboflavin, Niacin, Vitamin B6, Folate (L-Methylfolate), Vitamin B12 (Methylcobalamin), Biotin, Pantothenic Acid, Calcium, Iron (Ferrous Bisglycinate), Iodine, Magnesium (Magnesium Glycinate), Zinc (Zinc Picolinate), Selenium, Copper, Manganese, Chromium.'),
        ],
        'faqs': [
            ('When is the best time of day to take this multivitamin?', 'We recommend taking it in the morning with breakfast or lunch. Fat-soluble vitamins absorb most efficiently when consumed with a meal containing healthy dietary fats.'),
            ('Is this formula Halal and vegetarian?', 'Yes. All Supplivix tablets use certified vegetable-derived cellulose shells with zero animal by-products or gelatin.'),
            ('Does it cause stomach nausea or constipation?', 'No. We use gentle chelated minerals including Iron Bisglycinate which is clinically documented to be easy on the digestive tract.'),
            ('How is delivery handled across Pakistan?', 'We ship nationwide via Cash on Delivery (COD). You inspect the package and pay the courier rider upon delivery.'),
        ],
        'reviews': [
            ('Verified Buyer - Lahore', 5, 'Exceptional daily vitality', 'I have been using this for 3 weeks and feel significantly more alert and active throughout my workday. No stomach upset at all.'),
            ('Verified Buyer - Karachi', 5, 'Top quality packaging and purity', 'Delivered fast via COD. Clean bottle, clear labeling, and genuine bioavailable ingredients.'),
        ]
    },
    {
        'slug': 'mens-active-daily-energy-multivitamin',
        'name': "Men's Active Daily Energy Multivitamin",
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'sku': 'SPLV-MV-MENS-ACTIVE',
        'price': 2600,
        'compare_at_price': 3100,
        'stock': 100,
        'is_featured': True,
        'short_description': 'High-potency energy multivitamin for active men with methylated B-complex, magnesium glycinate, and CoQ10.',
        'description': (
            'Formulated specifically for active men seeking sustained physical endurance, cardiovascular efficiency, '
            'and mitochondrial energy. Combines high-dose bioavailable B-complex vitamins, chelated magnesium, '
            f'cellular CoQ10, and saw palmetto extract to support male metabolic vitality and recovery. {DISCLAIMER}'
        ),
        'images': [
            {'image': 'products/supplivix-daily-vitality.jpg', 'alt_text': "Men's Active Daily Energy Multivitamin Front"},
            {'image': 'products/supplivix-multivitamin.jpg', 'alt_text': "Men's Active Multivitamin Bottle"},
        ],
        'attributes': [
            ('Serving Size', '1 Tablet Daily with Morning Meal'),
            ('Pack Size', '60 Tablets (2 Mo. Supply)'),
            ('Target User', 'Active Men'),
            ('Key Actives', 'High B-Complex, Magnesium, CoQ10 Support, Zinc Citrate'),
            ('Formulation', 'Iron-Free Formula for Men, Halal Certified, 100% Vegetarian'),
            ('Directions', 'Take one (1) tablet daily in the morning with breakfast and water. Formulated specifically for active men to fuel physical performance and stamina.'),
            ('Storage', 'Store in a cool, dry place away from direct sunlight and moisture. Keep bottle tightly closed.'),
            ('Ingredients', 'Bioactive Methylated B-Complex (B1, B2, B3, B5, B6, B12 Methylcobalamin), Magnesium Glycinate, Coenzyme Q10 (Ubiquinone), Zinc Citrate, Vitamin D3 2000 IU, Saw Palmetto Extract, Lycopene, Panax Ginseng, Boron.'),
        ],
        'faqs': [
            ('Why is this formulation iron-free?', 'Adult men generally do not lose iron regularly, and excess unneeded iron can cause oxidative stress. We instead focus on zinc, CoQ10, and magnesium.'),
            ('Can I take this before workouts?', 'Yes, taking it in the morning provides steady metabolic cofactors and B-vitamins for your daily workouts and busy schedule.'),
            ('Is this suitable for men of all ages?', 'Yes, it is designed for men aged 18 and above looking to enhance physical endurance and daily mental sharpness.'),
        ],
        'reviews': [
            ('Verified Buyer - Islamabad', 5, 'Great for gym stamina', 'Noticeable increase in energy and less fatigue in the evenings. The CoQ10 and B-complex make a real difference.'),
            ('Verified Buyer - Rawalpindi', 5, 'High grade formula', 'Very clean multivitamin. No artificial colors or strong odor. Highly recommended for working men.'),
        ]
    },
    {
        'slug': 'womens-complete-balanced-multivitamin',
        'name': "Women's Complete Balanced Multivitamin",
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'sku': 'SPLV-MV-WOMENS-BALANCED',
        'price': 2600,
        'compare_at_price': 3100,
        'stock': 100,
        'is_featured': True,
        'short_description': 'Tailored female wellness multivitamin with gentle iron, active methylfolate, biotin, and evening primrose.',
        'description': (
            "A carefully balanced micronutrient matrix formulated for women's physiological requirements. "
            "Features non-constipating chelated iron to prevent fatigue, active L-methylfolate, evening primrose "
            f"for hormone balance, and high-potency biotin for keratin and skin structure. {DISCLAIMER}"
        ),
        'images': [
            {'image': 'products/supplivix-multivitamin.jpg', 'alt_text': "Women's Complete Balanced Multivitamin Front"},
            {'image': 'products/supplivix-skin-glow.jpg', 'alt_text': "Women's Balanced Multi Lifestyle"},
        ],
        'attributes': [
            ('Serving Size', '1 Tablet Daily with Food'),
            ('Pack Size', '60 Tablets (2 Mo. Supply)'),
            ('Target User', 'Adult Women'),
            ('Key Actives', 'L-Methylfolate, Gentle Iron, Evening Primrose, Biotin 5000mcg'),
            ('Formulation', 'Gentle Non-Constipating Iron, Halal Certified, Vegetarian'),
            ('Directions', 'Take one (1) tablet daily with a morning meal and water. Gentle on empty stomachs and formulated for daily female wellness.'),
            ('Storage', 'Store in a cool, dry place away from moisture and heat. Keep bottle tightly closed.'),
            ('Ingredients', 'L-Methylfolate (Quatrefolic 400mcg), Gentle Iron (Ferrous Bisglycinate Chelate 18mg), Evening Primrose Oil Powder, Biotin 5000mcg, Vitamin C, Vitamin D3, Calcium Citrate, Magnesium, Horsetail Extract (Silica), Zinc Glycinate.'),
        ],
        'faqs': [
            ('Does the iron cause digestive discomfort?', 'No. We formulate with Ferrous Bisglycinate chelate which is non-constipating and absorbed without gastrointestinal distress.'),
            ('Does this help with hair shedding and brittle nails?', 'Yes. The combination of 5000mcg Biotin, organic silica from horsetail, and zinc supports keratin rebuilding within 4 to 6 weeks.'),
            ('Is this suitable during planning or general wellness?', 'Yes, it provides 400mcg of methylated folate (Quatrefolic) which is the biologically active form of folic acid.'),
        ],
        'reviews': [
            ('Verified Buyer - Faisalabad', 5, 'Hair feels stronger and skin is clearer', 'After 4 weeks of daily use, my hair fall reduced noticeably. So gentle on the stomach!'),
            ('Verified Buyer - Multan', 5, 'Best multivitamin for women', 'No nasty aftertaste, very gentle, and fast Cash on Delivery shipping.'),
        ]
    },
    {
        'slug': 'advanced-vitamin-c-zinc-immunity-shield-30s',
        'name': 'Advanced Vitamin C + Zinc Immunity Shield 30s',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'sku': 'SPLV-MV-IMMUNITY-30',
        'price': 1850,
        'compare_at_price': 2200,
        'stock': 100,
        'is_featured': True,
        'short_description': 'High-potency cellular immunity defense with buffered Vitamin C, chelated zinc, and black elderberry.',
        'description': (
            'Triple-action immune defense formula engineered to fortify respiratory barriers and neutralize oxidative stress. '
            'Combines gentle non-acidic buffered Vitamin C, highly absorbable zinc glycinate, concentrated European black '
            f'elderberry, and bioavailable Vitamin D3 for rapid immune resilience. {DISCLAIMER}'
        ),
        'images': [
            {'image': 'products/supplivix-immune-shield.jpg', 'alt_text': 'Advanced Vitamin C + Zinc Immunity Shield 30s Front'},
            {'image': 'products/supplivix-hero-trio.jpg', 'alt_text': 'Immunity Shield Formula Trio'},
        ],
        'attributes': [
            ('Serving Size', '1 Tablet Daily with Water'),
            ('Pack Size', '30 Tablets (1 Mo. Supply)'),
            ('Target User', 'Seasonal Defense & Immunity Support'),
            ('Key Actives', 'Buffered Vitamin C 1000mg, Zinc Glycinate 20mg, Black Elderberry'),
            ('Formulation', 'Buffered Non-Acidic Vitamin C, Gentle on Digestion'),
            ('Directions', 'Take one (1) tablet daily with water, preferably with food during seasonal transitions or environmental exposure.'),
            ('Storage', 'Store in a cool, dry place away from heat and moisture. Keep bottle tightly closed.'),
            ('Ingredients', 'Pure Buffered Vitamin C (Ascorbic Acid + Calcium Ascorbate 1000mg), Zinc Glycinate 20mg, Black Elderberry Extract (Sambucus Nigra 250mg), Vitamin D3 (Cholecalciferol 2000 IU), Citrus Bioflavonoids 100mg.'),
        ],
        'faqs': [
            ('Is this Vitamin C safe for people with acidity or sensitive stomachs?', 'Yes. We use a buffered mineral ascorbate compound that is non-acidic and does not provoke acid reflux or stomach irritation.'),
            ('Can this be taken together with the Complete Daily Multi?', 'Yes, during cold or flu seasons you can pair them safely, or use Immunity Shield as targeted defense.'),
            ('How quickly does it deliver immune defense?', 'Buffered Vitamin C and zinc enter the bloodstream quickly to reinforce cellular mucosal defenses.'),
        ],
        'reviews': [
            ('Verified Buyer - Peshawar', 5, 'Kept seasonal colds away', 'Whenever the weather changes I usually get a cold, but taking this has kept me completely healthy.'),
            ('Verified Buyer - Lahore', 5, 'Non-acidic and very gentle', 'Regular Vitamin C upsets my stomach, but this buffered formula feels completely smooth.'),
        ]
    },
    {
        'slug': 'radiant-glow-biotin-collagen-complex',
        'name': 'Radiant Glow Biotin & Collagen Complex',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'sku': 'SPLV-MV-GLOW-60',
        'price': 2750,
        'compare_at_price': 3300,
        'stock': 80,
        'is_featured': True,
        'short_description': 'Advanced beauty formulation with hydrolyzed marine collagen, 5000mcg biotin, and hyaluronic acid.',
        'description': (
            'Nutritional beauty from within. Formulated with hydrolyzed marine collagen peptides, 5000mcg active biotin, '
            f'low-molecular-weight hyaluronic acid, and Vitamin E to reinforce skin hydration and collagen synthesis. {DISCLAIMER}'
        ),
        'images': [
            {'image': 'products/supplivix-skin-glow.jpg', 'alt_text': 'Radiant Glow Biotin & Collagen Complex Front'},
            {'image': 'products/supplivix-multivitamin.jpg', 'alt_text': 'Supplivix Beauty Complex Bottle'},
        ],
        'attributes': [
            ('Serving Size', '2 Vegetable Capsules Daily'),
            ('Pack Size', '60 Capsules (1 Mo. Supply)'),
            ('Target User', 'Skin Radiance, Hair Density & Nail Health'),
            ('Key Actives', 'Hydrolyzed Marine Collagen, Biotin 5000mcg, Hyaluronic Acid, Vitamin C'),
            ('Formulation', 'Halal Marine Collagen, Zero Artificial Dyes'),
            ('Directions', 'Take two (2) capsules daily with water, preferably at night or with a light snack.'),
            ('Storage', 'Store in a cool dry location away from moisture.'),
            ('Ingredients', 'Hydrolyzed Marine Collagen Peptides (Type I & III 1000mg), Biotin 5000mcg, Sodium Hyaluronate 100mg, Vitamin C 90mg, Vitamin E 15mg.'),
        ],
        'faqs': [
            ('When can I see visible results in skin hydration?', 'Clinical studies on marine collagen peptides show measurable skin hydration improvements within 4 to 8 weeks.'),
        ],
        'reviews': [
            ('Verified Buyer - Karachi', 5, 'My skin is visibly glowing', 'Noticed much softer skin and stronger nails within 3 weeks. Excellent product!'),
        ]
    },
    {
        'slug': 'niacinamide-10-zinc-clarifying-serum-30ml',
        'name': 'Niacinamide 10% + Zinc Clarifying Serum 30ml',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'sku': 'SPLV-SK-NIACINAMIDE-30',
        'price': 1650,
        'compare_at_price': 1950,
        'stock': 90,
        'is_featured': True,
        'short_description': 'Pore-refining clarifying facial serum with 10% pure Niacinamide and 1% Zinc PCA.',
        'description': (
            'Science-backed topical clarifying serum engineered for oily and blemish-prone complexions. '
            'Calms inflammation, regulates excess sebum production, and minimizes enlarged pores.'
        ),
        'images': [
            {'image': 'products/supplivix-skincare-serum.jpg', 'alt_text': 'Niacinamide Clarifying Serum 30ml Front'},
        ],
        'attributes': [
            ('Volume', '30ml / 1.0 fl oz'),
            ('Skin Type', 'All Skin Types, Oily, Combination, Blemish-Prone'),
            ('Key Actives', 'Niacinamide (Vitamin B3 10%), Zinc PCA (1%), Hyaluronic Acid'),
            ('Formulation', 'Fragrance-Free, Non-Comedogenic, Dermatologist Tested'),
            ('Directions', 'Apply 3-4 drops morning and evening to cleansed face before heavier moisturizers.'),
            ('Storage', 'Store in a cool place away from direct light.'),
        ],
        'faqs': [
            ('Can this be used morning and night?', 'Yes, apply before moisturizer and follow with sunscreen in the morning.'),
        ],
        'reviews': [
            ('Verified Buyer - Islamabad', 5, 'Clears oiliness without drying', 'Very smooth texture, absorbs quickly and reduces acne redness.'),
        ]
    },
    {
        'slug': 'high-potency-vitamin-d3-5000-iu-k2',
        'name': 'High Potency Vitamin D3 5000 IU + K2',
        'category_slug': 'bones-joints',
        'product_type': 'multivitamin',
        'sku': 'SPLV-MV-D3K2-60',
        'price': 1950,
        'compare_at_price': 2300,
        'stock': 100,
        'is_featured': True,
        'short_description': 'Synergistic bone and cardiovascular support pairing 5000 IU Cholecalciferol with Vitamin K2 MK-7.',
        'description': (
            'Dual-action bone and arterial defense. Vitamin D3 facilitates calcium absorption, while Vitamin K2 MK-7 '
            f'directs calcium specifically to bones and teeth, preventing arterial calcification. {DISCLAIMER}'
        ),
        'images': [
            {'image': 'products/supplivix-bone-joints.jpg', 'alt_text': 'Vitamin D3 + K2 Complex Front'},
        ],
        'attributes': [
            ('Serving Size', '1 Vegetable Softgel Daily with Meal'),
            ('Pack Size', '60 Softgels (2 Mo. Supply)'),
            ('Target User', 'Bone Density, Joint Mobility & Heart Wellness'),
            ('Key Actives', 'Vitamin D3 (Cholecalciferol 5000 IU), Vitamin K2 (MenaQ7 MK-7 100mcg)'),
            ('Formulation', 'Vegetable Derived, Coconut MCT Oil Base'),
            ('Directions', 'Take one (1) softgel daily with a meal containing healthy fats.'),
            ('Storage', 'Store in a cool, dark place away from heat.'),
        ],
        'faqs': [
            ('Why take D3 and K2 together?', 'D3 absorbs calcium from digestion, and K2 ensures it enters bone tissue rather than soft tissues or arteries.'),
        ],
        'reviews': [
            ('Verified Buyer - Lahore', 5, 'Excellent lab tested D3', 'My Vitamin D levels recovered back to normal in 6 weeks of daily compliance.'),
        ]
    },
    {
        'slug': 'ultra-hydrating-hyaluronic-barrier-cream-50ml',
        'name': 'Ultra Hydrating Hyaluronic Barrier Cream 50ml',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'sku': 'SPLV-SK-BARRIER-50',
        'price': 1890,
        'compare_at_price': 2250,
        'stock': 85,
        'is_featured': True,
        'short_description': 'Intensive epidermal repair moisturizer with 5 essential ceramides, squalane, and multi-weight hyaluronic acid.',
        'description': (
            'Deeply nourishing moisture barrier cream formulated to lock in hydration and soothe damaged skin barriers. '
            'Leaves a velvety, non-greasy protective finish suitable for sensitive skin.'
        ),
        'images': [
            {'image': 'products/supplivix-skincare-serum.jpg', 'alt_text': 'Ultra Hydrating Barrier Cream 50ml'},
        ],
        'attributes': [
            ('Volume', '50ml / 1.7 fl oz'),
            ('Skin Type', 'Dry, Normal, Sensitive, Barrier-Compromised Skin'),
            ('Key Actives', 'Multi-Weight Hyaluronic Acid, Ceramide NP/AP/EOP, Plant Squalane'),
            ('Formulation', 'Fragrance-Free, Alcohol-Free, Hypoallergenic'),
            ('Directions', 'Apply generously morning and evening to face and neck as the final moisturizing step.'),
            ('Storage', 'Store below 30C away from direct sunlight.'),
        ],
        'faqs': [
            ('Is this suitable under sunscreen and makeup?', 'Yes, it absorbs quickly with zero pilling or greasy residue.'),
        ],
        'reviews': [
            ('Verified Buyer - Karachi', 5, 'Saved my dry skin barrier', 'Very rich yet lightweight, completely healed my dry patches in a week.'),
        ]
    },
]


class Command(BaseCommand):
    help = 'Seeds or updates the flagship Supplivix products for MultivitaminsHub and Shop pages.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Seeding flagship products...'))
        user = User.objects.filter(is_staff=True).first() or User.objects.first()

        for item in FLAGSHIP_PRODUCTS:
            category, _ = Category.objects.get_or_create(
                slug=item['category_slug'],
                defaults={'name': item['category_slug'].replace('-', ' ').title(), 'is_active': True}
            )

            product, created = Product.objects.update_or_create(
                slug=item['slug'],
                defaults={
                    'name': item['name'],
                    'category': category,
                    'sku': item['sku'],
                    'price': item['price'],
                    'compare_at_price': item['compare_at_price'],
                    'stock': item['stock'],
                    'is_featured': item['is_featured'],
                    'is_active': True,
                    'product_type': item['product_type'],
                    'short_description': item['short_description'],
                    'description': item['description'],
                    'seo_title': f"{item['name']} | Supplivix Pakistan",
                    'seo_description': item['short_description'][:160],
                }
            )

            # Re-seed images
            ProductImage.objects.filter(product=product).delete()
            for idx, img_info in enumerate(item['images']):
                ProductImage.objects.create(
                    product=product,
                    image=img_info['image'],
                    alt_text=img_info['alt_text'],
                    sort_order=idx
                )

            # Re-seed attributes
            ProductAttribute.objects.filter(product=product).delete()
            for key, val in item['attributes']:
                ProductAttribute.objects.create(
                    product=product,
                    key=key,
                    value=val
                )

            # Re-seed FAQs
            ProductFAQ.objects.filter(product=product).delete()
            for idx, (q, a) in enumerate(item['faqs']):
                ProductFAQ.objects.create(
                    product=product,
                    question=q,
                    answer=a,
                    sort_order=idx
                )

            # Seed sample verified reviews if none exist
            if not Review.objects.filter(product=product).exists():
                for title_prefix, rating, rev_title, rev_body in item['reviews']:
                    Review.objects.create(
                        product=product,
                        user=user,
                        rating=rating,
                        title=rev_title,
                        body=rev_body,
                        is_approved=True
                    )

            status = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f"{status}: {product.name} ({product.slug})"))

        self.stdout.write(self.style.SUCCESS('Successfully seeded all flagship products!'))

