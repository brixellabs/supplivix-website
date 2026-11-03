"""
Django management command to seed Supplivix with realistic non-copyrighted catalog data.
Strictly zero emojis anywhere. Multivitamins as primary catalog focus (28+ multivitamins, 20 skincare).
Every supplement product carries the mandatory regulatory disclaimer.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from catalog.models import Category, Product, ProductFAQ, Review
from content.models import SiteSetting
from promotions.models import Coupon

DISCLAIMER = (
    "These statements have not been evaluated by a regulator. "
    "This product is not intended to diagnose, treat, cure or prevent any disease."
)

DEMO_PRODUCTS = [
    # 1 - 28: Multivitamins & Supplements (Primary Focus)
    {
        'name': 'Supplivix Complete Daily Multivitamin 60s',
        'slug': 'supplivix-complete-daily-multivitamin-60s',
        'sku': 'SPLV-MV-01',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2450,
        'compare_at_price': 2900,
        'stock': 120,
        'is_featured': True,
        'description': f'Comprehensive 24-micronutrient daily multivitamin featuring chelated zinc, methylfolate, and active B-complex vitamins for sustained energy and metabolic support. {DISCLAIMER}',
    },
    {
        'name': 'Men\'s Active Vitality Daily Formula 60s',
        'slug': 'mens-active-vitality-daily-formula-60s',
        'sku': 'SPLV-MV-02',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2600,
        'compare_at_price': 3100,
        'stock': 85,
        'is_featured': True,
        'description': f'Formulated specifically for active men with high-potency B-complex, magnesium glycinate, zinc, and saw palmetto extract to support stamina and muscle recovery. {DISCLAIMER}',
    },
    {
        'name': 'Women\'s Balanced Daily Multivitamin 60s',
        'slug': 'womens-balanced-daily-multivitamin-60s',
        'sku': 'SPLV-MV-03',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2600,
        'compare_at_price': 3100,
        'stock': 95,
        'is_featured': True,
        'description': f'Complete women\'s nutrition with gentle iron bisglycinate, L-methylfolate, calcium, and biotin to promote hormone harmony and radiant hair. {DISCLAIMER}',
    },
    {
        'name': 'Senior 50+ Vitality Multivitamin 60s',
        'slug': 'senior-50-plus-vitality-multivitamin-60s',
        'sku': 'SPLV-MV-04',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2750,
        'compare_at_price': 3300,
        'stock': 60,
        'is_featured': False,
        'description': f'Tailored for adults over 50 with concentrated Vitamin B12, lutein, CoQ10, and extra Vitamin D3 for cardiovascular and cellular longevity. {DISCLAIMER}',
    },
    {
        'name': 'Advanced Vitamin C 1000mg + Zinc Immunity Shield 30s',
        'slug': 'advanced-vitamin-c-1000mg-zinc-immunity-shield-30s',
        'sku': 'SPLV-IM-01',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 1850,
        'compare_at_price': 2200,
        'stock': 140,
        'is_featured': True,
        'description': f'Triple-action immunity defense combining pharmaceutical-grade ascorbic acid, bioavailable zinc citrate, and elderberry extract. {DISCLAIMER}',
    },
    {
        'name': 'High Potency Vitamin D3 5000 IU + K2 MK-7 60s',
        'slug': 'high-potency-vitamin-d3-5000-iu-k2-mk7-60s',
        'sku': 'SPLV-BJ-01',
        'category_slug': 'bones-joints',
        'product_type': 'multivitamin',
        'price': 1950,
        'compare_at_price': 2350,
        'stock': 110,
        'is_featured': True,
        'description': f'Bio-identical cholecalciferol blended with natural MenaQ7 Vitamin K2 to direct calcium into bones and teeth rather than arterial walls. {DISCLAIMER}',
    },
    {
        'name': 'Radiant Glow Biotin 5000mcg + Marine Collagen 60s',
        'slug': 'radiant-glow-biotin-5000mcg-marine-collagen-60s',
        'sku': 'SPLV-SG-01',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'price': 2850,
        'compare_at_price': 3400,
        'stock': 75,
        'is_featured': True,
        'description': f'Targeted beauty multivitamin providing pure d-biotin, wild-caught marine collagen peptides, and hyaluronic acid to support hair thickness and skin bounce. {DISCLAIMER}',
    },
    {
        'name': 'Pure Magnesium Glycinate 400mg Calming Rest 60s',
        'slug': 'pure-magnesium-glycinate-400mg-calming-rest-60s',
        'sku': 'SPLV-VT-01',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 2250,
        'compare_at_price': 2650,
        'stock': 90,
        'is_featured': False,
        'description': f'Chelated non-laxative magnesium for night-time nerve relaxation, reduced muscle tension, and restorative deep sleep cycles. {DISCLAIMER}',
    },
    {
        'name': 'Active CoQ10 200mg + PQQ Cellular Energy 30s',
        'slug': 'active-coq10-200mg-pqq-cellular-energy-30s',
        'sku': 'SPLV-VT-02',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 3450,
        'compare_at_price': 4100,
        'stock': 50,
        'is_featured': True,
        'description': f'Mitochondrial energizer delivering pure ubiquinone and Pyrroloquinoline Quinone for cardiac performance and daily mental alertness. {DISCLAIMER}',
    },
    {
        'name': 'Vitamin B-Complex High Potency Energy Matrix 60s',
        'slug': 'vitamin-b-complex-high-potency-energy-matrix-60s',
        'sku': 'SPLV-MV-05',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 1750,
        'compare_at_price': 2100,
        'stock': 130,
        'is_featured': False,
        'description': f'Complete spectrum of methylated B vitamins (B1, B2, B3, B5, B6, B7, B9, B12) to fuel nervous system stability and combat daytime fatigue. {DISCLAIMER}',
    },
    {
        'name': 'Organic Ashwagandha KSM-66 600mg Stress Balance 60s',
        'slug': 'organic-ashwagandha-ksm-66-600mg-stress-balance-60s',
        'sku': 'SPLV-VT-03',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 2400,
        'compare_at_price': 2850,
        'stock': 65,
        'is_featured': False,
        'description': f'Standardized full-spectrum root extract clinically studied to manage cortisol levels and foster calm daily focus. {DISCLAIMER}',
    },
    {
        'name': 'Glucosamine Chondroitin MSM Joint Shield 90s',
        'slug': 'glucosamine-chondroitin-msm-joint-shield-90s',
        'sku': 'SPLV-BJ-02',
        'category_slug': 'bones-joints',
        'product_type': 'multivitamin',
        'price': 3100,
        'compare_at_price': 3700,
        'stock': 55,
        'is_featured': False,
        'description': f'Synergistic triple-strength joint mobility formulation with boswellia serrata for cartilage comfort and ease of movement. {DISCLAIMER}',
    },
    {
        'name': 'Calcium Citrate + Magnesium & Boron 60s',
        'slug': 'calcium-citrate-magnesium-boron-60s',
        'sku': 'SPLV-BJ-03',
        'category_slug': 'bones-joints',
        'product_type': 'multivitamin',
        'price': 1650,
        'compare_at_price': 1950,
        'stock': 80,
        'is_featured': False,
        'description': f'High-solubility calcium citrate designed for easy stomach tolerance with supporting minerals for bone mineral density. {DISCLAIMER}',
    },
    {
        'name': 'Glutathione 500mg Liposomal Glow Complex 30s',
        'slug': 'glutathione-500mg-liposomal-glow-complex-30s',
        'sku': 'SPLV-SG-02',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'price': 3850,
        'compare_at_price': 4500,
        'stock': 40,
        'is_featured': True,
        'description': f'Master antioxidant reduced L-glutathione combined with alpha-lipoic acid and milk thistle for internal detox and illuminated skin tone. {DISCLAIMER}',
    },
    {
        'name': 'Zinc Picolinate 50mg Gentle Absorption 60s',
        'slug': 'zinc-picolinate-50mg-gentle-absorption-60s',
        'sku': 'SPLV-IM-02',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 1350,
        'compare_at_price': 1600,
        'stock': 150,
        'is_featured': False,
        'description': f'Optimal zinc chelate for white blood cell activation, hormonal equilibrium, and skin clarification. {DISCLAIMER}',
    },
    {
        'name': 'Omega-3 Triple Strength Wild Fish Oil 1000mg 60s',
        'slug': 'omega-3-triple-strength-wild-fish-oil-1000mg-60s',
        'sku': 'SPLV-VT-04',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 2950,
        'compare_at_price': 3500,
        'stock': 85,
        'is_featured': True,
        'description': f'Molecularly distilled burpless enteric softgels delivering 600mg EPA and 400mg DHA for cardiovascular wellness and skin barrier lipid health. {DISCLAIMER}',
    },
    {
        'name': 'Prenatal Gentle Essentials with Folate & Iron 60s',
        'slug': 'prenatal-gentle-essentials-folate-iron-60s',
        'sku': 'SPLV-MV-06',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2800,
        'compare_at_price': 3300,
        'stock': 45,
        'is_featured': False,
        'description': f'Clean prenatal multivitamin designed without nausea triggers, containing Quatrefolic methylfolate and non-constipating iron. {DISCLAIMER}',
    },
    {
        'name': 'Probiotics 50 Billion CFU + Prebiotic Fiber 30s',
        'slug': 'probiotics-50-billion-cfu-prebiotic-fiber-30s',
        'sku': 'SPLV-VT-05',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 3200,
        'compare_at_price': 3800,
        'stock': 60,
        'is_featured': False,
        'description': f'Delayed-release acid-resistant capsules harboring 12 diverse human-native probiotic strains for gut microbiome integrity and digestive regularity. {DISCLAIMER}',
    },
    {
        'name': 'Iron Bisglycinate 25mg Gentle Blood Builder 60s',
        'slug': 'iron-bisglycinate-25mg-gentle-blood-builder-60s',
        'sku': 'SPLV-MV-07',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 1450,
        'compare_at_price': 1750,
        'stock': 110,
        'is_featured': False,
        'description': f'Chelated non-constipating iron with Vitamin C and vitamin B12 for effective red blood cell production and revitalized stamina. {DISCLAIMER}',
    },
    {
        'name': 'Turmeric Curcumin 95% with BioPerine 60s',
        'slug': 'turmeric-curcumin-95-bioperine-60s',
        'sku': 'SPLV-BJ-04',
        'category_slug': 'bones-joints',
        'product_type': 'multivitamin',
        'price': 2100,
        'compare_at_price': 2500,
        'stock': 70,
        'is_featured': False,
        'description': f'Standardized 95% curcuminoids enhanced with black pepper extract to maximize systemic bioavailability and soothe joint inflammation. {DISCLAIMER}',
    },
    {
        'name': 'N-Acetyl Cysteine (NAC) 600mg Lung & Liver 60s',
        'slug': 'n-acetyl-cysteine-nac-600mg-lung-liver-60s',
        'sku': 'SPLV-IM-03',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 2650,
        'compare_at_price': 3150,
        'stock': 50,
        'is_featured': False,
        'description': f'Cellular precursor to glutathione supporting clear bronchial airways and healthy liver detox pathways. {DISCLAIMER}',
    },
    {
        'name': 'Kids Daily Chews Multi-Nutrient 60s',
        'slug': 'kids-daily-chews-multi-nutrient-60s',
        'sku': 'SPLV-MV-08',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 1950,
        'compare_at_price': 2300,
        'stock': 90,
        'is_featured': False,
        'description': f'Sugar-free pectin chewables with 16 essential vitamins and minerals crafted for growing bones, strong immunity, and healthy appetite. {DISCLAIMER}',
    },
    {
        'name': 'Selenium 200mcg Yeast-Free Thyroid Guard 60s',
        'slug': 'selenium-200mcg-yeast-free-thyroid-guard-60s',
        'sku': 'SPLV-IM-04',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 1400,
        'compare_at_price': 1650,
        'stock': 80,
        'is_featured': False,
        'description': f'L-selenomethionine mineral support for normal thyroid hormone metabolism and defense against free radical oxidation. {DISCLAIMER}',
    },
    {
        'name': 'Evening Primrose Oil 1000mg GLA Balance 60s',
        'slug': 'evening-primrose-oil-1000mg-gla-balance-60s',
        'sku': 'SPLV-SG-03',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'price': 2300,
        'compare_at_price': 2700,
        'stock': 65,
        'is_featured': False,
        'description': f'Cold-pressed source of gamma-linolenic acid (GLA) promoting hormonal calm, skin hydration, and soothing dry skin texture. {DISCLAIMER}',
    },
    {
        'name': 'Quercetin 500mg with Bromelain Seasonal Support 60s',
        'slug': 'quercetin-500mg-bromelain-seasonal-support-60s',
        'sku': 'SPLV-IM-05',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 2700,
        'compare_at_price': 3200,
        'stock': 40,
        'is_featured': False,
        'description': f'Bioflavonoid and enzyme combination aiding respiratory comfort and balanced histamine response during pollen and weather shifts. {DISCLAIMER}',
    },
    {
        'name': 'Hyaluronic Acid 200mg Internal Moisture 30s',
        'slug': 'hyaluronic-acid-200mg-internal-moisture-30s',
        'sku': 'SPLV-SG-04',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'price': 2550,
        'compare_at_price': 3000,
        'stock': 55,
        'is_featured': False,
        'description': f'Low molecular weight oral hyaluronic acid for deep joint lubrication and plump, hydrated skin elasticity from within. {DISCLAIMER}',
    },
    {
        'name': 'Active Folate 800mcg L-Methylfolate 60s',
        'slug': 'active-folate-800mcg-l-methylfolate-60s',
        'sku': 'SPLV-MV-09',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 1550,
        'compare_at_price': 1850,
        'stock': 70,
        'is_featured': False,
        'description': f'Fully methylated bioactive folate ready for direct cellular uptake without requiring MTHFR enzyme conversion. {DISCLAIMER}',
    },
    {
        'name': 'Vitamin K2 MK-7 100mcg Natural Chickpea 60s',
        'slug': 'vitamin-k2-mk-7-100mcg-natural-chickpea-60s',
        'sku': 'SPLV-BJ-05',
        'category_slug': 'bones-joints',
        'product_type': 'multivitamin',
        'price': 1800,
        'compare_at_price': 2150,
        'stock': 65,
        'is_featured': False,
        'description': f'Soy-free all-trans menaquinone-7 to guide calcium metabolism into bone matrix and maintain vascular flexibility. {DISCLAIMER}',
    },

    # 29 - 48: Skincare Formulations (20 Products)
    {
        'name': 'Niacinamide 10% + Zinc 1% Clarifying Serum 30ml',
        'slug': 'niacinamide-10-zinc-1-clarifying-serum-30ml',
        'sku': 'SPLV-SK-01',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1650,
        'compare_at_price': 1950,
        'stock': 110,
        'is_featured': True,
        'description': 'Targeted water-based serum engineered to regulate sebum excess, minimize enlarged pores, and improve rough surface texture.',
    },
    {
        'name': 'Ultra Hydrating Hyaluronic Multi-Barrier Cream 50ml',
        'slug': 'ultra-hydrating-hyaluronic-multi-barrier-cream-50ml',
        'sku': 'SPLV-SK-02',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1890,
        'compare_at_price': 2250,
        'stock': 95,
        'is_featured': True,
        'description': 'Rich non-comedogenic moisture cream fortified with 5 molecular weights of hyaluronic acid and ceramides to repair damaged moisture barriers.',
    },
    {
        'name': 'Vitamin C 20% + Ferulic Illuminating Serum 30ml',
        'slug': 'vitamin-c-20-ferulic-illuminating-serum-30ml',
        'sku': 'SPLV-SK-03',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2150,
        'compare_at_price': 2550,
        'stock': 85,
        'is_featured': True,
        'description': 'Potent antioxidant serum combining pure ethyl ascorbic acid, ferulic acid, and vitamin E to fade post-acne dark marks and enhance skin radiance.',
    },
    {
        'name': 'Gentle Salicylic Acid 2% Purifying Gel Cleanser 150ml',
        'slug': 'gentle-salicylic-acid-2-purifying-gel-cleanser-150ml',
        'sku': 'SPLV-SK-04',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1450,
        'compare_at_price': 1750,
        'stock': 125,
        'is_featured': False,
        'description': 'Sulfate-free foaming cleanser formulated with beta hydroxy acid and tea tree leaf water to dissolve stubborn pore debris without stripping.',
    },
    {
        'name': 'Ceramide Recovery Barrier Balm 50ml',
        'slug': 'ceramide-recovery-barrier-balm-50ml',
        'sku': 'SPLV-SK-05',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1750,
        'compare_at_price': 2100,
        'stock': 75,
        'is_featured': False,
        'description': 'Concentrated 3:1:1 physiological lipid balm (ceramides, cholesterol, free fatty acids) to soothe windburn, flakiness, and retinol sensitivity.',
    },
    {
        'name': 'Alpha Arbutin 2% + Kojic Acid Dark Spot Reducer 30ml',
        'slug': 'alpha-arbutin-2-kojic-acid-dark-spot-reducer-30ml',
        'sku': 'SPLV-SK-06',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1990,
        'compare_at_price': 2350,
        'stock': 65,
        'is_featured': False,
        'description': 'Precision brightening serum designed to target stubborn sun pigmentation, melasma patches, and uneven skin tone.',
    },
    {
        'name': 'Pure Squalane 100% Plant-Derived Hydrating Oil 30ml',
        'slug': 'pure-squalane-100-plant-derived-hydrating-oil-30ml',
        'sku': 'SPLV-SK-07',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1600,
        'compare_at_price': 1900,
        'stock': 70,
        'is_featured': False,
        'description': 'Weightless non-greasy olive-derived squalane oil providing instant moisture seal for all skin types, including sensitive and blemish-prone.',
    },
    {
        'name': 'Encapsulated Retinal 0.1% Age Renewal Emulsion 30ml',
        'slug': 'encapsulated-retinal-0-1-age-renewal-emulsion-30ml',
        'sku': 'SPLV-SK-08',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2450,
        'compare_at_price': 2950,
        'stock': 50,
        'is_featured': True,
        'description': 'Next-generation retinaldehyde cream that acts 11x faster than standard retinol with reduced irritation to accelerate collagen production.',
    },
    {
        'name': 'Mineral Sunshield Fluid SPF 50+ PA++++ 50ml',
        'slug': 'mineral-sunshield-fluid-spf-50-pa-plus-50ml',
        'sku': 'SPLV-SK-09',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2100,
        'compare_at_price': 2500,
        'stock': 130,
        'is_featured': True,
        'description': '100% zinc oxide physical sunscreen offering broad-spectrum UVA/UVB defense with zero white cast and a light matte dry finish.',
    },
    {
        'name': 'Centella Asiatica 80% Calming Relief Toner 150ml',
        'slug': 'centella-asiatica-80-calming-relief-toner-150ml',
        'sku': 'SPLV-SK-10',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1550,
        'compare_at_price': 1850,
        'stock': 85,
        'is_featured': False,
        'description': 'Alcohol-free soothing toner loaded with tiger grass, panthenol, and madecassoside to rapidly calm facial redness and stinging.',
    },
    {
        'name': 'Multi-Peptide + Copper Firming Elixir 30ml',
        'slug': 'multi-peptide-copper-firming-elixir-30ml',
        'sku': 'SPLV-SK-11',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2750,
        'compare_at_price': 3300,
        'stock': 45,
        'is_featured': False,
        'description': 'Advanced peptide complex (Matrixyl 3000, Argireline, and Copper Tripeptide-1) targeting expression lines and loss of facial elasticity.',
    },
    {
        'name': 'Gentle PHA 5% Daily Clarifying Exfoliator 100ml',
        'slug': 'gentle-pha-5-daily-clarifying-exfoliator-100ml',
        'sku': 'SPLV-SK-12',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1690,
        'compare_at_price': 2000,
        'stock': 60,
        'is_featured': False,
        'description': 'Large-molecule polyhydroxy acid liquid providing mild surface dead cell renewal while binding water to keep delicate skin plump.',
    },
    {
        'name': 'Hydrating Oat & Honey Cleansing Milk 150ml',
        'slug': 'hydrating-oat-honey-cleansing-milk-150ml',
        'sku': 'SPLV-SK-13',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1490,
        'compare_at_price': 1750,
        'stock': 70,
        'is_featured': False,
        'description': 'Silky lotion cleanser with colloidal oatmeal and raw wildflower honey to dissolve daytime dirt without disturbing lipid barriers.',
    },
    {
        'name': 'Azelaic Acid 10% Blemish Suspension 30ml',
        'slug': 'azelaic-acid-10-blemish-suspension-30ml',
        'sku': 'SPLV-SK-14',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1750,
        'compare_at_price': 2050,
        'stock': 80,
        'is_featured': False,
        'description': 'Multifunctional brightening suspension to combat redness, bumpiness, and post-inflammatory erythema.',
    },
    {
        'name': 'Caffeine 5% + EGCG De-Puffing Eye Contour 15ml',
        'slug': 'caffeine-5-egcg-de-puffing-eye-contour-15ml',
        'sku': 'SPLV-SK-15',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1590,
        'compare_at_price': 1890,
        'stock': 95,
        'is_featured': False,
        'description': 'Lightweight cooling eye serum formulated with concentrated caffeine and green tea epigallocatechin gallate to reduce under-eye puffiness and darkness.',
    },
    {
        'name': 'Pro-Collagen Overnight Sleeping Mask 75ml',
        'slug': 'pro-collagen-overnight-sleeping-mask-75ml',
        'sku': 'SPLV-SK-16',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1950,
        'compare_at_price': 2300,
        'stock': 55,
        'is_featured': False,
        'description': 'Leave-on jelly mask that cushions the skin during sleep with beta-glucan and snow mushroom extract for dewy, refreshed morning bounce.',
    },
    {
        'name': 'Rosehip Seed Oil 100% Cold-Pressed Organic 30ml',
        'slug': 'rosehip-seed-oil-100-cold-pressed-organic-30ml',
        'sku': 'SPLV-SK-17',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1650,
        'compare_at_price': 1950,
        'stock': 65,
        'is_featured': False,
        'description': 'Unrefined virgin rosehip oil naturally abundant in provitamin A and essential linolenic acids to soften scars and nourish dry patches.',
    },
    {
        'name': 'Clarifying Clay & Charcoal Detox Mask 100g',
        'slug': 'clarifying-clay-charcoal-detox-mask-100g',
        'sku': 'SPLV-SK-18',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1350,
        'compare_at_price': 1600,
        'stock': 85,
        'is_featured': False,
        'description': 'Non-drying kaolin and bentonite clay mask infused with activated charcoal and zinc oxide to absorb oiliness in the T-zone.',
    },
    {
        'name': 'Lipid Replenish Barrier Oil Cleanser 150ml',
        'slug': 'lipid-replenish-barrier-oil-cleanser-150ml',
        'sku': 'SPLV-SK-19',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1550,
        'compare_at_price': 1850,
        'stock': 90,
        'is_featured': False,
        'description': 'Emulsifying cleansing oil featuring jojoba and grapeseed oil that melts waterproof sunscreen and makeup while rinsing clean with water.',
    },
    {
        'name': 'Hydrating Lip Rescue Ceramide Butter 15ml',
        'slug': 'hydrating-lip-rescue-ceramide-butter-15ml',
        'sku': 'SPLV-SK-20',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 850,
        'compare_at_price': 1050,
        'stock': 160,
        'is_featured': False,
        'description': 'Intense nourishing lip balm with shea butter, plant squalane, and ceramides for instant relief of chapped, dry lips.',
    },
]


class Command(BaseCommand):
    help = 'Seed demo data for Supplivix e-commerce platform (48 products, zero emojis, COD focus).'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Starting Supplivix demo data seeding...')

        # 1. Site Settings
        setting, _ = SiteSetting.objects.get_or_create(id=1)
        setting.store_name = 'Supplivix'
        setting.store_phone = '0300-0000000'
        setting.store_email = 'info@supplivix.com'
        setting.free_shipping_threshold = 2000
        setting.flat_shipping_fee = 200
        setting.save()

        # 2. Staff & Customer Accounts
        admin_user, _ = User.objects.get_or_create(
            email='admin@supplivix.com',
            defaults={
                'full_name': 'Supplivix Admin Staff',
                'is_staff': True,
                'is_superuser': True,
                'phone': '+923000000000',
            }
        )
        admin_user.set_password('SupplivixAdmin2026!')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        buyer1, _ = User.objects.get_or_create(
            email='usman@example.com',
            defaults={
                'full_name': 'Muhammad Usman',
                'phone': '+923001234567',
            }
        )
        buyer1.set_password('CustomerPass123!')
        buyer1.save()

        # 3. Categories
        cat_map = {
            'multivitamins': ('Multivitamins', 1),
            'immunity': ('Immunity Shield', 2),
            'bones-joints': ('Bone & Joints', 3),
            'skin-glow': ('Skin & Glow', 4),
            'skincare': ('Skin Care', 5),
            'vitality': ('Daily Vitality', 6),
        }

        category_objs = {}
        for slug, (name, order) in cat_map.items():
            cat, _ = Category.objects.get_or_create(
                slug=slug,
                defaults={'name': name, 'sort_order': order, 'is_active': True}
            )
            category_objs[slug] = cat

        # 4. Products (Exactly 48)
        created_count = 0
        for item in DEMO_PRODUCTS:
            cat = category_objs[item['category_slug']]
            product, created = Product.objects.update_or_create(
                slug=item['slug'],
                defaults={
                    'name': item['name'],
                    'sku': item['sku'],
                    'category': cat,
                    'product_type': item['product_type'],
                    'price': item['price'],
                    'compare_at_price': item['compare_at_price'],
                    'stock': item['stock'],
                    'description': item['description'],
                    'is_featured': item.get('is_featured', False),
                    'is_active': True,
                }
            )
            if created:
                created_count += 1

            # Seed a review for featured products
            if item.get('is_featured') and not Review.objects.filter(product=product).exists():
                Review.objects.create(
                    product=product,
                    user=buyer1,
                    rating=5,
                    title='Noticeable difference in vitality',
                    body='High quality bioavailable formula that does not irritate the stomach. Quick COD delivery in Lahore.',
                    is_approved=True,
                )

            # Seed at least 4 ProductFAQ entries per product for AEO and rich snippets
            if not product.faqs.exists():
                if product.product_type == 'multivitamin':
                    faqs_data = [
                        (
                            'How many multivitamin tablets should I take daily?',
                            'Follow the label directions. Typical products list one tablet per day, preferably with breakfast and a glass of water.',
                        ),
                        (
                            'Who is this multivitamin formula designed for?',
                            'This daily formulation is designed for adults seeking to support their dietary micronutrient intake alongside a balanced diet.',
                        ),
                        (
                            'Does this multivitamin contain synthetic colorants or preservatives?',
                            'No. Supplivix formulations avoid unnecessary artificial fillers and colorants, prioritizing bioavailable forms of essential nutrients.',
                        ),
                        (
                            'What is the payment and delivery procedure in Pakistan?',
                            'We deliver nationwide across Pakistan via standard Cash on Delivery (COD). You inspect the package and pay the courier rider in cash upon arrival.',
                        ),
                    ]
                else:
                    faqs_data = [
                        (
                            'When should I apply this formulation in my routine?',
                            'Apply to clean skin in the morning or evening before heavier moisturizers, following the specific product directions.',
                        ),
                        (
                            'Is this product suitable for sensitive skin?',
                            'Formulated with gentle, skin-compatible ingredients. Perform a 24-hour patch test before full facial application.',
                        ),
                        (
                            'How long will one bottle last with regular usage?',
                            'With typical daily application, a standard bottle provides approximately 30 to 45 days of consistent use.',
                        ),
                        (
                            'How is payment collected upon delivery?',
                            'We operate exclusively with nationwide Cash on Delivery (COD). You pay the courier rider in whole PKR when the parcel arrives.',
                        ),
                    ]

                for order_idx, (q, a) in enumerate(faqs_data):
                    ProductFAQ.objects.create(
                        product=product,
                        question=q,
                        answer=a,
                        sort_order=order_idx,
                    )

        # 5. Coupons
        Coupon.objects.update_or_create(
            code='WELCOME10',
            defaults={
                'type': 'percent',
                'value': 10,
                'max_discount_amount': 500,
                'min_order_amount': 1500,
                'is_active': True,
            }
        )
        Coupon.objects.update_or_create(
            code='HEALTH20',
            defaults={
                'type': 'percent',
                'value': 20,
                'max_discount_amount': 1000,
                'min_order_amount': 2500,
                'is_active': True,
            }
        )

        total_products = Product.objects.count()
        total_multis = Product.objects.filter(product_type='multivitamin').count()
        total_skincare = Product.objects.filter(product_type='skincare').count()

        self.stdout.write(self.style.SUCCESS(
            f'Demo seeding complete: {total_products} total products seeded '
            f'({total_multis} multivitamins, {total_skincare} skincare). '
            f'Admin staff: admin@supplivix.com / SupplivixAdmin2026!'
        ))
