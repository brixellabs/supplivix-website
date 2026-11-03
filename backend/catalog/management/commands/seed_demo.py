"""
Django management command to seed Supplivix with realistic non-copyrighted catalog data.
Strictly zero emojis anywhere. Multivitamins as primary catalog focus (28+ multivitamins, 20 skincare).
Safe to run repeatedly (idempotent).
Refuses to run when DEBUG is False unless --force is passed.
Every supplement product carries the mandatory regulatory disclaimer.
"""

import os
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import Address, User
from catalog.image_generator import (
    export_raster_fallback,
    generate_category_banner_svg,
    generate_hero_banner_svg,
    generate_product_svg_front,
    generate_product_svg_label,
    generate_product_svg_lifestyle,
)
from catalog.models import Category, Product, ProductAttribute, ProductFAQ, ProductImage, Review
from content.models import SiteSetting
from orders.models import Order, OrderItem
from promotions.models import Coupon

DISCLAIMER = (
    "These statements have not been evaluated by a regulator. "
    "This product is not intended to diagnose, treat, cure or prevent any disease."
)

DEMO_PRODUCTS = [
    # 1 - 28: Multivitamins & Supplements (Primary Focus - 28 items)
    {
        'name': 'Daily Balance Multivitamin 60s (Demo)',
        'slug': 'daily-balance-multivitamin-60s',
        'sku': 'SPLV-MV-01',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2450,
        'compare_at_price': 2900,
        'stock': 120,
        'is_featured': True,
        'short_description': 'Comprehensive 24-micronutrient daily multivitamin featuring chelated zinc, methylfolate, and active B-complex.',
        'description': f'Comprehensive 24-micronutrient daily multivitamin featuring chelated zinc, methylfolate, and active B-complex vitamins for sustained energy and metabolic support. Manufactured under strict pharmaceutical cGMP controls in a certified facility. Each tablet provides bioavailable micronutrients designed for gentle digestion without stomach irritation. Recommended for daily adult wellness support. {DISCLAIMER}',
    },
    {
        'name': 'Daily Balance Gold High Potency 60s (Demo)',
        'slug': 'daily-balance-gold-high-potency-60s',
        'sku': 'SPLV-MV-02',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 3200,
        'compare_at_price': 3800,
        'stock': 85,
        'is_featured': True,
        'short_description': 'Gold-tier high-potency daily multivitamin with CoQ10, bioactive methylated B-vitamins, and lutein.',
        'description': f'Our gold-tier high-potency daily multivitamin formulated with active coenzyme Q10, bioactive methylated B-vitamins, lutein, and organic minerals. Formulated specifically to sustain cellular mitochondria and combat environmental oxidation in demanding daily lifestyles. Take one tablet daily with morning breakfast. {DISCLAIMER}',
    },
    {
        'name': 'Active Daily Multi Energy Blend 60s (Demo)',
        'slug': 'active-daily-multi-energy-blend-60s',
        'sku': 'SPLV-MV-03',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 2600,
        'compare_at_price': None,
        'stock': 95,
        'is_featured': True,
        'short_description': 'Dynamic daily multivitamin complex fortified with Siberian ginseng, green tea polyphenols, and magnesium.',
        'description': f'A dynamic daily multivitamin complex fortified with Siberian ginseng, green tea polyphenols, and bioavailable magnesium malate. Promotes natural ATP generation without jitteriness or caffeine crash. Perfect for fitness enthusiasts and working professionals across Pakistan. {DISCLAIMER}',
    },
    {
        'name': 'Senior 50+ Vitality Daily Multi 60s (Demo)',
        'slug': 'senior-50-plus-vitality-daily-multi-60s',
        'sku': 'SPLV-MV-04',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2850,
        'compare_at_price': 3400,
        'stock': 60,
        'is_featured': False,
        'short_description': 'Specialized age-adjusted multivitamin focusing on cardiovascular wellness, eye health, and bone density.',
        'description': f'Specialized age-adjusted multivitamin focusing on cardiovascular wellness, eye health, and bone mineral density for adults over 50. Features concentrated Vitamin B12 as methylcobalamin, lutein, zeaxanthin, and zero added iron. Gentle on digestion. {DISCLAIMER}',
    },
    {
        'name': 'Essential Everyday Multivitamin 90s (Demo)',
        'slug': 'essential-everyday-multivitamin-90s',
        'sku': 'SPLV-MV-05',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 1950,
        'compare_at_price': None,
        'stock': 140,
        'is_featured': False,
        'short_description': 'High-value 3-month supply delivering essential daily micronutrients, zinc, and Vitamin D3.',
        'description': f'High-value 3-month family supply delivering 100% recommended daily value of essential vitamins A, C, D3, E, and full B-complex. Clean vegan tablet coating with zero synthetic colorants or preservatives. Everyday wellness made accessible and trustworthy. {DISCLAIMER}',
    },
    {
        'name': 'Organic Whole Food Daily Multi 60s (Demo)',
        'slug': 'organic-whole-food-daily-multi-60s',
        'sku': 'SPLV-MV-06',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 3600,
        'compare_at_price': 4200,
        'stock': 45,
        'is_featured': False,
        'short_description': 'Fermented whole-food multivitamin derived from organic fruits, vegetables, and botanical herbs.',
        'description': f'Fermented whole-food multivitamin derived from certified organic fruits, vegetables, and botanical herbs. Easy to digest and gentle even on an empty stomach. Enhanced with live digestive enzyme blends and prebiotic organic botanical fiber. {DISCLAIMER}',
    },
    {
        'name': 'Daily Sustained Release Multi 60s (Demo)',
        'slug': 'daily-sustained-release-multi-60s',
        'sku': 'SPLV-MV-07',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2750,
        'compare_at_price': None,
        'stock': 70,
        'is_featured': False,
        'short_description': 'Multi-phase release technology delivering steady micronutrient absorption over 8 hours.',
        'description': f'Advanced multi-phase beadlet delivery technology ensures sustained 8-hour absorption of water-soluble vitamins throughout the day. Prevents nutrient flushing and provides reliable micronutrient bioavailability from morning till evening. {DISCLAIMER}',
    },
    {
        'name': 'Advanced Daily Micronutrient Formula 60s (Demo)',
        'slug': 'advanced-daily-micronutrient-formula-60s',
        'sku': 'SPLV-MV-08',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 3100,
        'compare_at_price': 3650,
        'stock': 80,
        'is_featured': False,
        'short_description': 'Clinically backed micronutrient spectrum delivering Albion chelated minerals and bioactive methylfolate.',
        'description': f'Clinically backed micronutrient spectrum delivering Albion chelated minerals, boron, selenium, and Quatrefolic bioactive methylfolate. Optimizes metabolic resilience and cellular recovery. Ideal for individuals leading high-stress urban lifestyles. {DISCLAIMER}',
    },
    {
        'name': 'Men Core Multi Active Formula 60s (Demo)',
        'slug': 'men-core-multi-active-formula-60s',
        'sku': 'SPLV-MV-09',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2650,
        'compare_at_price': 3150,
        'stock': 110,
        'is_featured': True,
        'short_description': 'Tailored men formulation with high-potency zinc, saw palmetto extract, and active B-complex.',
        'description': f'Tailored specifically for men with targeted zinc citrate, saw palmetto berry extract, lycopene, and active B-complex. Promotes testosterone metabolism, prostate health, and cardiovascular stamina. Iron-free formula for adult men. {DISCLAIMER}',
    },
    {
        'name': 'Men Active 50+ Vitality Complex 60s (Demo)',
        'slug': 'men-active-50-plus-vitality-complex-60s',
        'sku': 'SPLV-MV-10',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2950,
        'compare_at_price': None,
        'stock': 55,
        'is_featured': False,
        'short_description': 'Targeted mature male formula supporting joint flexibility, cardiac vitality, and cellular protection.',
        'description': f'Formulated for men over 50 seeking robust vitality, cognitive focus, and joint flexibility. Combines high-dose Vitamin D3, methyl B12, pine bark extract, and pumpkin seed sterols. Easy-to-swallow film-coated tablets. {DISCLAIMER}',
    },
    {
        'name': 'Men High Performance Sport Multi 60s (Demo)',
        'slug': 'men-high-performance-sport-multi-60s',
        'sku': 'SPLV-MV-11',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 3400,
        'compare_at_price': 3990,
        'stock': 40,
        'is_featured': False,
        'short_description': 'Athlete-grade multivitamin with branched-chain amino acids, electrolytes, and magnesium glycinate.',
        'description': f'Athlete-grade multivitamin fortified with branched-chain amino acids, essential electrolytes, and magnesium glycinate to replenish minerals depleted during rigorous physical exertion. Accelerates muscle recovery and mitigates exercise-induced fatigue. {DISCLAIMER}',
    },
    {
        'name': 'Men Daily Wellness & Prostate Multi 60s (Demo)',
        'slug': 'men-daily-wellness-prostate-multi-60s',
        'sku': 'SPLV-MV-12',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2750,
        'compare_at_price': None,
        'stock': 65,
        'is_featured': False,
        'short_description': 'Dual-action daily wellness multivitamin and targeted botanical prostate care for men.',
        'description': f'Dual-action daily wellness multivitamin delivering complete micronutrient support alongside standardized stinging nettle, pumpkin seed oil, and lycopene for urinary tract and prostate health. Designed for adult men of all ages. {DISCLAIMER}',
    },
    {
        'name': 'Women Core Multi Gentle Iron 60s (Demo)',
        'slug': 'women-core-multi-gentle-iron-60s',
        'sku': 'SPLV-MV-13',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2650,
        'compare_at_price': 3150,
        'stock': 105,
        'is_featured': True,
        'short_description': 'Women daily balance formula featuring non-constipating gentle iron bisglycinate and biotin.',
        'description': f'Comprehensive female wellness multivitamin featuring non-constipating gentle iron bisglycinate, L-methylfolate, calcium, and biotin. Supports red blood cell formation, hormonal balance, hair strength, and sustained metabolic energy. {DISCLAIMER}',
    },
    {
        'name': 'Women Prenatal Style Demo Multi 60s (Demo)',
        'slug': 'women-prenatal-style-demo-multi-60s',
        'sku': 'SPLV-MV-14',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 3350,
        'compare_at_price': 3950,
        'stock': 50,
        'is_featured': False,
        'short_description': 'Comprehensive preconception and pregnancy-style support with active folate and plant DHA.',
        'description': f'Carefully balanced formulation delivering active Quatrefolic methylfolate, gentle chelated iron, iodine, and algae-derived plant DHA. Formulated to provide complete micronutrient confidence during all stages of motherhood. {DISCLAIMER}',
    },
    {
        'name': 'Women Active 50+ Hormone Harmony Multi 60s (Demo)',
        'slug': 'women-active-50-plus-hormone-harmony-multi-60s',
        'sku': 'SPLV-MV-15',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 2950,
        'compare_at_price': None,
        'stock': 70,
        'is_featured': False,
        'short_description': 'Mature women formula enriched with red clover isoflavones, calcium citrate, and Vitamin K2.',
        'description': f'Enriched with red clover isoflavones, calcium citrate, Vitamin K2 MK-7, and bioavailable Vitamin D3. Aids natural hormone transition, bone mineral preservation, and tranquil sleep patterns for women over 50. {DISCLAIMER}',
    },
    {
        'name': 'Women Radiant Energy Daily Multi 60s (Demo)',
        'slug': 'women-radiant-energy-daily-multi-60s',
        'sku': 'SPLV-MV-16',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'price': 2850,
        'compare_at_price': 3350,
        'stock': 90,
        'is_featured': False,
        'short_description': 'Synergistic beauty and vitality multivitamin combining marine collagen, biotin, and Vitamin C.',
        'description': f'Synergistic beauty and energy multivitamin combining hydrolyzed marine collagen peptides, 5000mcg biotin, organic Vitamin C, and silica. Nourishes skin elasticity, fortifies fragile nails, and imparts a natural luminous complexion. {DISCLAIMER}',
    },
    {
        'name': 'Kids Gummy Multi Demo Fruit Bites 60s (Demo)',
        'slug': 'kids-gummy-multi-demo-fruit-bites-60s',
        'sku': 'SPLV-MV-17',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 1750,
        'compare_at_price': 2100,
        'stock': 130,
        'is_featured': True,
        'short_description': 'Pectin-based natural fruit gummies delivering essential growing micronutrients for children 4+.',
        'description': f'Delicious pectin-based natural fruit gummies delivering 12 essential growing micronutrients including Vitamin A, C, D3, E, and Zinc for children aged 4 and above. Made with zero gelatin, zero artificial colors, and zero high-fructose corn syrup. {DISCLAIMER}',
    },
    {
        'name': 'Kids Chewable Multi Immune Support 60s (Demo)',
        'slug': 'kids-chewable-multi-immune-support-60s',
        'sku': 'SPLV-MV-18',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 1650,
        'compare_at_price': None,
        'stock': 85,
        'is_featured': False,
        'short_description': 'Pleasant berry chewable tablets packed with elderberry, Vitamin C, and bioavailable zinc.',
        'description': f'Pleasant wild-berry flavored chewable tablets packed with black elderberry extract, buffered Vitamin C, and gentle zinc citrate. Supports pediatric immune defense during seasonal shifts and school terms. Tooth-friendly xylitol sweetened. {DISCLAIMER}',
    },
    {
        'name': 'Kids Junior Daily Liquid Drops 50ml (Demo)',
        'slug': 'kids-junior-daily-liquid-drops-50ml',
        'sku': 'SPLV-MV-19',
        'category_slug': 'multivitamins',
        'product_type': 'multivitamin',
        'price': 1850,
        'compare_at_price': None,
        'stock': 60,
        'is_featured': False,
        'short_description': 'Easy-dose calibrated dropper delivering gentle pediatric multivitamin vitamins A, C, D3.',
        'description': f'Calibrated liquid dropper formulation designed for infants and toddlers. Delivers exact pediatric doses of Vitamin D3, Vitamin C, and active folate. Blends effortlessly into milk, fresh juice, or purees without altering taste or texture. {DISCLAIMER}',
    },
    {
        'name': 'Immune Shield Blend Vitamin C + Zinc 60s (Demo)',
        'slug': 'immune-shield-blend-vitamin-c-plus-zinc-60s',
        'sku': 'SPLV-MV-20',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 1850,
        'compare_at_price': 2250,
        'stock': 150,
        'is_featured': True,
        'short_description': 'Triple-action immunity defense combining pharmaceutical Vitamin C, zinc, and bioflavonoids.',
        'description': f'Triple-action immunity defense combining 1000mg pharmaceutical-grade ascorbic acid, 15mg bioavailable zinc citrate, and citrus bioflavonoid complex. Enhances white blood cell defenses and safeguards against seasonal respiratory vulnerabilities. {DISCLAIMER}',
    },
    {
        'name': 'Vitamin C Plus Zinc Effervescent 20s (Demo)',
        'slug': 'vitamin-c-plus-zinc-effervescent-20s',
        'sku': 'SPLV-MV-21',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 950,
        'compare_at_price': None,
        'stock': 180,
        'is_featured': False,
        'short_description': 'Rapid-dissolving effervescent orange drink delivering fast-acting Vitamin C and zinc hydration.',
        'description': f'Refreshing effervescent drink tablets dissolving in a cool glass of water to deliver 1000mg Vitamin C and 10mg Zinc in a rapid-absorbing liquid format. Sugar-free zesty natural orange flavor. Perfect travel and gym immunity hydration. {DISCLAIMER}',
    },
    {
        'name': 'Elderberry Ultra Immune Defense 60s (Demo)',
        'slug': 'elderberry-ultra-immune-defense-60s',
        'sku': 'SPLV-MV-22',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 2400,
        'compare_at_price': 2850,
        'stock': 75,
        'is_featured': False,
        'short_description': 'Standardized Sambucus nigra black elderberry extract with Echinacea and organic zinc.',
        'description': f'Standardized European Sambucus nigra black elderberry fruit extract concentrated 10:1, blended with organic Echinacea purpurea and zinc. Potent antioxidant anthocyanins provide rapid respiratory and throat cellular comfort. {DISCLAIMER}',
    },
    {
        'name': 'Super Quercetin with Zinc & D3 60s (Demo)',
        'slug': 'super-quercetin-with-zinc-and-d3-60s',
        'sku': 'SPLV-MV-23',
        'category_slug': 'immunity',
        'product_type': 'multivitamin',
        'price': 2950,
        'compare_at_price': None,
        'stock': 65,
        'is_featured': False,
        'short_description': 'Synergistic zinc ionophore formulation featuring bioavailable quercetin dihydrate and Vitamin D3.',
        'description': f'Advanced cellular defense combining 500mg bioavailable quercetin dihydrate acting as a zinc ionophore to shuttle zinc molecules directly into cellular interiors. Fortified with 2000 IU Vitamin D3 and bromelain for optimal systemic bio-efficacy. {DISCLAIMER}',
    },
    {
        'name': 'Beauty Bloom Complex Biotin 5000mcg 60s (Demo)',
        'slug': 'beauty-bloom-complex-biotin-5000mcg-60s',
        'sku': 'SPLV-MV-24',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'price': 2350,
        'compare_at_price': 2750,
        'stock': 115,
        'is_featured': True,
        'short_description': 'High-potency pure D-biotin combined with keratin builders, zinc, and selenium for hair thickness.',
        'description': f'High-potency pure D-biotin combined with L-cysteine keratin builders, zinc, and selenium. Strengthens brittle nail beds, stimulates dormant hair follicles, and promotes thicker, more resilient hair texture over 60 days of consistent use. {DISCLAIMER}',
    },
    {
        'name': 'Biotin Plus Marine Collagen Peptides 60s (Demo)',
        'slug': 'biotin-plus-marine-collagen-peptides-60s',
        'sku': 'SPLV-MV-25',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'price': 3450,
        'compare_at_price': 4100,
        'stock': 85,
        'is_featured': False,
        'short_description': 'Hydrolyzed Type I & III wild marine collagen peptides combined with hyaluronic acid and biotin.',
        'description': f'Premium hydrolyzed Type I & III wild marine collagen peptides combined with multi-molecular hyaluronic acid and biotin. Enhances dermal moisture retention, visibly softens fine expression lines, and promotes skin firmness from within. {DISCLAIMER}',
    },
    {
        'name': 'Keratin & Silica Hair Strength Formula 60s (Demo)',
        'slug': 'keratin-and-silica-hair-strength-formula-60s',
        'sku': 'SPLV-MV-26',
        'category_slug': 'skin-glow',
        'product_type': 'multivitamin',
        'price': 2750,
        'compare_at_price': None,
        'stock': 70,
        'is_featured': False,
        'short_description': 'Solubilized bioactive keratin paired with natural bamboo silica extract and copper.',
        'description': f'Solubilized bioactive Cynatine HNS keratin paired with natural bamboo shoot silica extract and copper. Reduces excessive hair shedding, stimulates scalp microcirculation, and fortifies the foundational structural matrix of every strand. {DISCLAIMER}',
    },
    {
        'name': 'Energy B-Complex Active Methylated 60s (Demo)',
        'slug': 'energy-b-complex-active-methylated-60s',
        'sku': 'SPLV-MV-27',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 1950,
        'compare_at_price': 2300,
        'stock': 100,
        'is_featured': True,
        'short_description': 'Full-spectrum methylated B-vitamin complex including methylcobalamin and P-5-P active B6.',
        'description': f'Full-spectrum coenzymated B-vitamin complex delivering bioactive methylcobalamin B12, pyridoxal-5-phosphate B6, and riboflavin-5-phosphate. Provides immediate biological availability to support nervous system stamina and metabolic vitality without conversion loss. {DISCLAIMER}',
    },
    {
        'name': 'Focus Daily Nootropic Brain Support 60s (Demo)',
        'slug': 'focus-daily-nootropic-brain-support-60s',
        'sku': 'SPLV-MV-28',
        'category_slug': 'vitality',
        'product_type': 'multivitamin',
        'price': 3800,
        'compare_at_price': 4500,
        'stock': 45,
        'is_featured': False,
        'short_description': 'Cognitive performance formula featuring standardized Bacopa monnieri, Lion\'s Mane, and L-theanine.',
        'description': f'Cognitive performance formula combining standardized Bacopa monnieri, organic Lion\'s Mane mushroom extract, L-tyrosine, and sun-grown L-theanine. Promotes mental clarity, sustained working memory, and calm executive focus under rigorous daily pressure. {DISCLAIMER}',
    },

    # 29 - 48: Skincare & Body (20 items)
    {
        'name': 'Gentle Foam Cleanser Sensitive Care 150ml (Demo)',
        'slug': 'gentle-foam-cleanser-sensitive-care-150ml',
        'sku': 'SPLV-SK-01',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1450,
        'compare_at_price': 1750,
        'stock': 110,
        'is_featured': True,
        'short_description': 'pH-balanced creamy foam wash with oat extract and ceramides that cleanses without stripping moisture.',
        'description': 'A gentle pH-balanced foaming facial cleanser formulated with colloidal oat extract, soothing allantoin, and three essential ceramides. Effortlessly lifts away excess sebum, particulate pollution, and makeup while preserving the integrity of the natural skin acid mantle.',
    },
    {
        'name': 'Clear Gel Wash Salicylic Acid 150ml (Demo)',
        'slug': 'clear-gel-wash-salicylic-acid-150ml',
        'sku': 'SPLV-SK-02',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1650,
        'compare_at_price': None,
        'stock': 90,
        'is_featured': False,
        'short_description': '2% Salicylic acid clarifying cleanser targeting congested pores, blackheads, and surface blemishes.',
        'description': 'Targeted clarifying wash containing 2% beta-hydroxy salicylic acid, tea tree hydrolat, and zinc PCA. Penetrates deep inside congested pores to dissolve stubborn oxidized sebum and prevent future blemish breakouts without leaving skin feeling uncomfortably parched.',
    },
    {
        'name': 'Hydrating Cream-to-Foam Facial Wash 150ml (Demo)',
        'slug': 'hydrating-cream-to-foam-facial-wash-150ml',
        'sku': 'SPLV-SK-03',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1550,
        'compare_at_price': 1850,
        'stock': 95,
        'is_featured': False,
        'short_description': 'Luxurious cream cleanser transforming into light micro-bubbles with amino acids and hyaluronic acid.',
        'description': 'Luxurious non-comedogenic cream cleanser that transitions into velvety micro-foam upon water activation. Infused with 11 skin-identical amino acids and pure hyaluronic acid to lock in essential hydration while effortlessly purifying the skin surface.',
    },
    {
        'name': 'Soothing Amino Acid Gel Cleanser 120ml (Demo)',
        'slug': 'soothing-amino-acid-gel-cleanser-120ml',
        'sku': 'SPLV-SK-04',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1350,
        'compare_at_price': None,
        'stock': 80,
        'is_featured': False,
        'short_description': 'Sulfate-free ultra-mild jelly cleanser with green tea and cica for sensitized, redness-prone skin.',
        'description': 'Ultra-mild sulfate-free jelly cleanser harnessing natural apple and coconut-derived amino acid surfactants. Calms sensitized, reactive skin with Centella asiatica and organic green tea extract. Leaves complexion serene, soft, and balanced.',
    },
    {
        'name': 'Daily Hydra Cream Ceramide Barrier 50ml (Demo)',
        'slug': 'daily-hydra-cream-ceramide-barrier-50ml',
        'sku': 'SPLV-SK-05',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1950,
        'compare_at_price': 2300,
        'stock': 120,
        'is_featured': True,
        'short_description': 'Barrier-repairing moisturizer packed with 3 identical ceramides, phytosphingosine, and squalane.',
        'description': 'Rich yet lightweight barrier repair moisturizer engineered with skin-identical ceramides 1, 3, 6-II, plant-derived squalane, and cholesterol. Rebuilds compromised lipid membranes, locks in all-day moisture, and guards against dry urban atmospheric pollutants.',
    },
    {
        'name': 'Light Gel Moisturizer Oil-Free 50ml (Demo)',
        'slug': 'light-gel-moisturizer-oil-free-50ml',
        'sku': 'SPLV-SK-06',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1750,
        'compare_at_price': None,
        'stock': 110,
        'is_featured': False,
        'short_description': 'Refreshing water-gel moisturizer with aloe vera, cucumber extract, and niacinamide for oily skin.',
        'description': 'Cooling oil-free water gel moisturizer that quenches dehydrated combination and oily skin instantly. Formulated with organic aloe leaf juice, cooling cucumber extract, and 3% niacinamide to balance shine while keeping skin dewy and plump.',
    },
    {
        'name': 'Intensive Overnight Recovery Cream 50ml (Demo)',
        'slug': 'intensive-overnight-recovery-cream-50ml',
        'sku': 'SPLV-SK-07',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2450,
        'compare_at_price': 2950,
        'stock': 65,
        'is_featured': False,
        'short_description': 'Nourishing night treatment balm with bakuchiol, shea butter, and restorative peptides.',
        'description': 'Restorative nocturnal treatment balm containing plant-derived bakuchiol, cold-pressed shea butter, and signaling peptides. Works in synergy with natural circadian rhythms to reverse daily UV oxidative strain and restore bounce by daybreak.',
    },
    {
        'name': 'Peptide Firming Rich Cream 50ml (Demo)',
        'slug': 'peptide-firming-rich-cream-50ml',
        'sku': 'SPLV-SK-08',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2850,
        'compare_at_price': 3400,
        'stock': 50,
        'is_featured': False,
        'short_description': 'Velvety firming cream with Matrixyl 3000, copper peptides, and nourishing marula seed oil.',
        'description': 'Velvety peptide emulsion delivering clinical Matrixyl 3000, bio-copper peptides, and marula seed oil. Helps encourage collagen matrix density, enhances skin firmness, and provides deeply soothing moisture for mature complexions.',
    },
    {
        'name': 'Vitamin C Glow Serum 15% Ethyl Ascorbic 30ml (Demo)',
        'slug': 'vitamin-c-glow-serum-15-percent-ethyl-ascorbic-30ml',
        'sku': 'SPLV-SK-09',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2250,
        'compare_at_price': 2700,
        'stock': 95,
        'is_featured': True,
        'short_description': 'Highly stable 15% 3-O-ethyl ascorbic acid serum with ferulic acid to fade pigmentation.',
        'description': 'Highly stable, non-oxidizing 15% 3-O-ethyl ascorbic acid antioxidant serum synergized with natural ferulic acid and pure Vitamin E. Fades stubborn post-acne dark spots, evens out irregular skin tone, and restores radiant luminosity.',
    },
    {
        'name': 'Niacinamide Balance Serum 10% + Zinc 30ml (Demo)',
        'slug': 'niacinamide-balance-serum-10-percent-zinc-30ml',
        'sku': 'SPLV-SK-10',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1650,
        'compare_at_price': 1950,
        'stock': 130,
        'is_featured': True,
        'short_description': 'Refining treatment serum featuring 10% high-purity niacinamide and 1% zinc PCA for clear skin.',
        'description': 'Targeted pore-refining and oil-controlling formula containing 10% pharmaceutical-grade niacinamide and 1% bioavailable zinc PCA. Dramatically minimizes congested pore appearance, soothes blotchiness, and regulates excess sebum excretion.',
    },
    {
        'name': 'Hyaluronic Multi-Weight Hydrating Serum 30ml (Demo)',
        'slug': 'hyaluronic-multi-weight-hydrating-serum-30ml',
        'sku': 'SPLV-SK-11',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1850,
        'compare_at_price': None,
        'stock': 100,
        'is_featured': False,
        'short_description': 'Five molecular weights of hyaluronic acid paired with provitamin B5 for multi-depth skin quenching.',
        'description': 'Advanced multi-depth hydration booster formulated with five distinct molecular weights of sodium hyaluronate and soothing provitamin B5 panthenol. Quenches every stratum of the epidermis to instantly plump fine lines and restore youthful dewiness.',
    },
    {
        'name': 'Retinol 0.3% Renewal Youth Serum 30ml (Demo)',
        'slug': 'retinol-0-3-percent-renewal-youth-serum-30ml',
        'sku': 'SPLV-SK-12',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2600,
        'compare_at_price': 3100,
        'stock': 70,
        'is_featured': False,
        'short_description': 'Micro-encapsulated slow-release retinol serum with soothing bisabolol for gentle cellular turnover.',
        'description': 'Micro-encapsulated slow-release pure retinol formulation suspended in a nourishing squalane base with chamomile bisabolol. Stimulates healthy cellular turnover and refines rough texture with minimal peeling or irritation. Apply at bedtime.',
    },
    {
        'name': 'Daily Shield SPF 50 Mineral Defense 50ml (Demo)',
        'slug': 'daily-shield-spf-50-mineral-defense-50ml',
        'sku': 'SPLV-SK-13',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2150,
        'compare_at_price': 2550,
        'stock': 140,
        'is_featured': True,
        'short_description': '100% Non-nano zinc oxide physical sunscreen delivering broad-spectrum UVA/UVB and blue light defense.',
        'description': '100% Non-nano zinc oxide broad-spectrum mineral sunscreen offering PA++++ high defense. Formulated with lightweight plant squalane and green tea polyphenols to defend against solar radiation and urban blue light with zero greasy residue or white cast.',
    },
    {
        'name': 'Ultra-Light Invisible Sunscreen SPF 50 50ml (Demo)',
        'slug': 'ultra-light-invisible-sunscreen-spf-50-50ml',
        'sku': 'SPLV-SK-14',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2250,
        'compare_at_price': None,
        'stock': 90,
        'is_featured': False,
        'short_description': 'Completely transparent weightless sunscreen fluid that glides seamlessly under daily makeup.',
        'description': 'Weightless modern chemical filter fluid that absorbs instantly like a light primer with a velvety matte finish. Water and sweat resistant for up to 80 minutes. Suitable for sensitive and acne-prone skin types in hot Pakistani summers.',
    },
    {
        'name': 'Matte Fluid Sunscreen PA++++ 50ml (Demo)',
        'slug': 'matte-fluid-sunscreen-pa-plus-plus-plus-plus-50ml',
        'sku': 'SPLV-SK-15',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1950,
        'compare_at_price': None,
        'stock': 85,
        'is_featured': False,
        'short_description': 'Sebum-absorbing mineral sun lotion with silica spheres for all-day shine control under humid heat.',
        'description': 'Sebum-absorbing daily fluid sun protection enriched with porous silica micro-spheres and niacinamide. Keeps the T-zone perfectly shine-free and fresh throughout humid daytime hours while maintaining full broad-spectrum SPF 50 shield.',
    },
    {
        'name': 'Mineral Tinted Glow Sunscreen SPF 50 50ml (Demo)',
        'slug': 'mineral-tinted-glow-sunscreen-spf-50-50ml',
        'sku': 'SPLV-SK-16',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2450,
        'compare_at_price': 2900,
        'stock': 75,
        'is_featured': False,
        'short_description': 'Universal sheer tint mineral sunscreen that blurs minor imperfections with a healthy luminous glow.',
        'description': 'Universal sheer tint mineral sunscreen crafted with iron oxides to neutralize visible white cast while protecting against hyperpigmentation-triggering high-energy visible light. Imparts an effortlessly radiant, even finish for every skin tone.',
    },
    {
        'name': 'Soft Lip Balm Nourishing Ceramide 15g (Demo)',
        'slug': 'soft-lip-balm-nourishing-ceramide-15g',
        'sku': 'SPLV-SK-17',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 650,
        'compare_at_price': None,
        'stock': 200,
        'is_featured': False,
        'short_description': 'Restorative lip balm with natural plant waxes, shea butter, and ceramides for chapped lips.',
        'description': 'Intensively nourishing lip repair salve crafted with organic shea butter, jojoba seed oil, and plant ceramides. Creates a protective conditioning shield over dry or chapped lips, delivering enduring softness and comfortable hydration.',
    },
    {
        'name': 'Restorative Body Butter Shea & Cocoa 200g (Demo)',
        'slug': 'restorative-body-butter-shea-and-cocoa-200g',
        'sku': 'SPLV-SK-18',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 2100,
        'compare_at_price': 2500,
        'stock': 60,
        'is_featured': False,
        'short_description': 'Decadent whipped body cream blending raw African shea and cocoa butters for dry skin.',
        'description': 'Decadent whipped body cream blending raw cold-pressed African shea butter, cocoa seed butter, and sweet almond oil. Deeply rehydrates rough elbows, knees, and dry limbs with a velvety, non-greasy protective moisture barrier.',
    },
    {
        'name': 'Hydrating Body Lotion 5% Urea 250ml (Demo)',
        'slug': 'hydrating-body-lotion-5-percent-urea-250ml',
        'sku': 'SPLV-SK-19',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1850,
        'compare_at_price': None,
        'stock': 90,
        'is_featured': False,
        'short_description': 'Clinical dermatological daily lotion with 5% urea and lactic acid to smooth bumpy strawberry skin.',
        'description': 'Clinical dermatological daily body lotion combining 5% medical-grade urea with gentle lactic acid. Gently exfoliates microscopic dead surface keratin while delivering intense moisture to alleviate rough, bumpy, or keratosis pilaris skin.',
    },
    {
        'name': 'Exfoliating AHA Body Wash 250ml (Demo)',
        'slug': 'exfoliating-aha-body-wash-250ml',
        'sku': 'SPLV-SK-20',
        'category_slug': 'skincare',
        'product_type': 'skincare',
        'price': 1650,
        'compare_at_price': None,
        'stock': 85,
        'is_featured': False,
        'short_description': 'Gentle foaming body wash with glycolic and salicylic acids for smooth, glowing body skin.',
        'description': 'Cleansing and refining foaming body wash formulated with gentle glycolic and salicylic acids, chamomile water, and glycerin. Clears back and chest pores, refines dry patches, and leaves total body skin feeling renewed and smooth.',
    },
]

DEMO_USERS_DATA = [
    ('Hamza Khan', 'demo+1@example.com', '+923001110001'),
    ('Ayesha Malik', 'demo+2@example.com', '+923001110002'),
    ('Zainab Tariq', 'demo+3@example.com', '+923001110003'),
    ('Bilal Ahmed', 'demo+4@example.com', '+923001110004'),
    ('Sana Fatima', 'demo+5@example.com', '+923001110005'),
    ('Omer Farooq', 'demo+6@example.com', '+923001110006'),
    ('Maryam Nawaz', 'demo+7@example.com', '+923001110007'),
    ('Ali Raza', 'demo+8@example.com', '+923001110008'),
    ('Hira Shah', 'demo+9@example.com', '+923001110009'),
    ('Usman Javed', 'demo+10@example.com', '+923001110010'),
    ('Fatima Noor', 'demo+11@example.com', '+923001110011'),
    ('Mustafa Kamal', 'demo+12@example.com', '+923001110012'),
    ('Amna Sheikh', 'demo+13@example.com', '+923001110013'),
    ('Saad Haroon', 'demo+14@example.com', '+923001110014'),
    ('Khadija Bibi', 'demo+15@example.com', '+923001110015'),
    ('Zubair Hashmi', 'demo+16@example.com', '+923001110016'),
    ('Mahnoor Asif', 'demo+17@example.com', '+923001110017'),
    ('Danyal Baig', 'demo+18@example.com', '+923001110018'),
    ('Rabia Basri', 'demo+19@example.com', '+923001110019'),
    ('Taha Siddiqui', 'demo+20@example.com', '+923001110020'),
]

REVIEW_TEMPLATES = [
    ('Noticeable improvement in daily vitality', 'Started noticing a steady boost in my morning focus within two weeks. Gentle on digestion and prompt COD delivery in Lahore.', 5),
    ('Excellent bioavailable multivitamin', 'One of the best formulations I have found in Pakistan. Free from synthetic colorants and very cleanly packaged.', 5),
    ('Authentic formula and quick delivery', 'Arrived sealed and fresh within 48 hours in Karachi. Courier rider was professional with cash on delivery change.', 5),
    ('Very good results after one month', 'My daily stamina feels much more balanced throughout long work shifts. Highly recommend to anyone seeking pure micronutrients.', 4),
    ('Quality ingredients verified', 'Appreciate the transparent supplement facts and bioavailable zinc and folate forms. Will order the 90-day bottle next.', 5),
    ('Smooth checkout and authentic product', 'Packaging was top notch with sturdy bubble wrap. Clean formulation without causing any nausea or heaviness.', 5),
    ('Consistent quality and reliable service', 'Ordered twice now. Consistency is always maintained and customer care on WhatsApp was responsive.', 4),
    ('Impressed with the bioavailability', 'Switched from imported brands and found the absorption and results identical at a much fairer PKR price point.', 5),
]


class Command(BaseCommand):
    help = 'Seed demo data for Supplivix e-commerce platform (48 products, original SVGs, zero emojis, COD focus).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force execution even if DEBUG is False in production.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # Refuse to run when DEBUG is False unless --force is passed
        if not settings.DEBUG and not options.get('force'):
            raise CommandError(
                'Refusing to run seed_demo in production (DEBUG=False) without --force flag.'
            )

        self.stdout.write('Starting Supplivix comprehensive demo data seeding...')

        # 1. Site Settings
        setting, _ = SiteSetting.objects.get_or_create(id=1)
        setting.store_name = 'Supplivix'
        setting.store_phone = '0300-0000000'
        setting.store_email = 'info@supplivix.com'
        setting.free_shipping_threshold = 2000
        setting.flat_shipping_fee = 200
        setting.save()

        # 2. Staff Admin Account (from env or defaults)
        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@supplivix.com')
        admin_pass = os.environ.get('ADMIN_PASSWORD', 'SupplivixAdmin2026!')
        admin_user, _ = User.objects.get_or_create(
            email=admin_email,
            defaults={
                'full_name': 'Supplivix Admin Staff',
                'is_staff': True,
                'is_superuser': True,
                'phone': '+923000000000',
            }
        )
        admin_user.set_password(admin_pass)
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        # 3. 20 Demo Users
        demo_password = os.environ.get('DEMO_USER_PASSWORD', 'DemoUserPass2026!')
        demo_users = []
        for full_name, email, phone in DEMO_USERS_DATA:
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={'full_name': full_name, 'phone': phone}
            )
            u.set_password(demo_password)
            u.save()
            demo_users.append(u)

        # Legacy buyer for backward compatibility
        buyer1, _ = User.objects.get_or_create(
            email='usman@example.com',
            defaults={'full_name': 'Muhammad Usman', 'phone': '+923001234567'}
        )
        buyer1.set_password('CustomerPass123!')
        buyer1.save()
        demo_users.append(buyer1)

        # 4. Saved Addresses (for first demo user)
        primary_user = demo_users[0]
        Address.objects.get_or_create(
            user=primary_user,
            line1='House 14, Street 3, Sector Y, DHA Phase 3',
            defaults={
                'full_name': primary_user.full_name,
                'phone': primary_user.phone,
                'city': 'Lahore',
                'province': 'Punjab',
                'postal_code': '54000',
                'is_default': True,
            }
        )
        Address.objects.get_or_create(
            user=primary_user,
            line1='Apartment 4B, Block 7, Clifton',
            defaults={
                'full_name': primary_user.full_name,
                'phone': primary_user.phone,
                'city': 'Karachi',
                'province': 'Sindh',
                'postal_code': '75600',
                'is_default': False,
            }
        )
        Address.objects.get_or_create(
            user=primary_user,
            line1='House 210, Street 18, F-10/2',
            defaults={
                'full_name': primary_user.full_name,
                'phone': primary_user.phone,
                'city': 'Islamabad',
                'province': 'Islamabad',
                'postal_code': '44000',
                'is_default': False,
            }
        )

        # 5. Categories
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

        # 6. Setup Media & Demo Assets Directories
        media_products_dir = os.path.join(settings.MEDIA_ROOT, 'products')
        media_categories_dir = os.path.join(settings.MEDIA_ROOT, 'categories')
        frontend_demo_dir = os.path.abspath(
            os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'assets', 'demo')
        )
        os.makedirs(media_products_dir, exist_ok=True)
        os.makedirs(media_categories_dir, exist_ok=True)
        os.makedirs(frontend_demo_dir, exist_ok=True)

        # Generate & save Hero and Category banners
        hero_svg = generate_hero_banner_svg()
        hero_banner_name = 'demo-hero-banner'
        for dest_dir in [frontend_demo_dir, media_categories_dir]:
            with open(os.path.join(dest_dir, f"{hero_banner_name}.svg"), 'w', encoding='utf-8') as f:
                f.write(hero_svg)
        export_raster_fallback(hero_banner_name, frontend_demo_dir, 'Hero Banner', '#016a38')

        for cat_slug, cat_obj in category_objs.items():
            cat_svg = generate_category_banner_svg(cat_obj.name, '#016a38')
            cat_banner_name = f"demo-banner-{cat_slug}"
            for dest_dir in [frontend_demo_dir, media_categories_dir]:
                with open(os.path.join(dest_dir, f"{cat_banner_name}.svg"), 'w', encoding='utf-8') as f:
                    f.write(cat_svg)
            export_raster_fallback(cat_banner_name, frontend_demo_dir, cat_obj.name, '#016a38')

        # 7. Seed 48 Products with Complete Attributes, FAQs, Images, and Reviews
        created_count = 0
        all_created_products = []

        for p_idx, item in enumerate(DEMO_PRODUCTS):
            cat = category_objs[item['category_slug']]
            sku = item['sku']
            accent_hex = '#016a38' if item['product_type'] == 'multivitamin' else '#7a2fd0'

            # A couple low stock and a couple zero stock for test coverage
            stock_val = item['stock']
            if p_idx == 46:
                stock_val = 0  # Out of stock test
            elif p_idx == 47:
                stock_val = 2  # Low stock test

            product, created = Product.objects.update_or_create(
                sku=sku,
                defaults={
                    'name': item['name'],
                    'slug': item['slug'],
                    'category': cat,
                    'brand': 'Supplivix',
                    'product_type': item['product_type'],
                    'price': item['price'],
                    'compare_at_price': item.get('compare_at_price'),
                    'stock': stock_val,
                    'short_description': item.get('short_description', item['name']),
                    'description': item['description'],
                    'is_featured': item.get('is_featured', False),
                    'is_active': True,
                    'seo_title': f"{item['name'][:50]} | Supplivix Pakistan",
                    'seo_description': f"Buy {item['name'][:40]} in Pakistan. Pure science formulation with Cash on Delivery nationwide.",
                }
            )
            all_created_products.append(product)
            if created:
                created_count += 1

            # Seed 3 Original SVG Images & Fallbacks per Product
            front_svg = generate_product_svg_front(product.name, product.product_type, cat.slug, accent_hex)
            label_svg = generate_product_svg_label(product.name, product.product_type, sku, accent_hex)
            lifestyle_svg = generate_product_svg_lifestyle(product.name, product.product_type, accent_hex)

            variants = [
                (f"demo-{sku}-front", front_svg, f"Front packaging of {product.name}", 0),
                (f"demo-{sku}-label", label_svg, f"Label detail and ingredients of {product.name}", 1),
                (f"demo-{sku}-lifestyle", lifestyle_svg, f"Lifestyle presentation of {product.name}", 2),
            ]

            for file_base, svg_content, alt_text, sort_order in variants:
                # Write to media/products/
                media_path = os.path.join(media_products_dir, f"{file_base}.svg")
                with open(media_path, 'w', encoding='utf-8') as f:
                    f.write(svg_content)

                # Write to frontend/src/assets/demo/
                frontend_svg_path = os.path.join(frontend_demo_dir, f"{file_base}.svg")
                with open(frontend_svg_path, 'w', encoding='utf-8') as f:
                    f.write(svg_content)

                # Export WebP and AVIF fallbacks
                export_raster_fallback(file_base, frontend_demo_dir, product.name, accent_hex)

                # Link ProductImage model record
                ProductImage.objects.update_or_create(
                    product=product,
                    sort_order=sort_order,
                    defaults={
                        'image': f"products/{file_base}.svg",
                        'alt_text': alt_text,
                    }
                )

            # Seed Attributes (Nutrition facts / Ingredients)
            if not product.attributes.exists():
                if product.product_type == 'multivitamin':
                    attrs = [
                        ('Serving Size', '1 Tablet Daily'),
                        ('Servings Per Container', '60 Servings'),
                        ('Form', 'Vegetarian Coated Tablets'),
                        ('Dietary Suitability', 'Halal Certified, Gluten-Free, Non-GMO'),
                        ('Key Actives', 'Vitamin C 500mg, Zinc Chelate 15mg, Vitamin D3 1000 IU, Methyl B12 50mcg'),
                        ('Directions', 'Take 1 tablet daily with morning breakfast and a glass of water.'),
                    ]
                else:
                    attrs = [
                        ('Volume', '50ml / 1.7 fl oz'),
                        ('Skin Type', 'All Skin Types, Sensitive Skin Safe'),
                        ('Texture', 'Lightweight Fast-Absorbing Fluid'),
                        ('Formulation', 'Dermatologist Tested, Non-Comedogenic, Fragrance-Free'),
                        ('Key Actives', 'Niacinamide 10%, Pure Zinc PCA, Hyaluronic Multi-Weight Complex'),
                        ('Directions', 'Apply 3-4 drops morning and night to clean skin before heavier cream.'),
                    ]
                for k, v in attrs:
                    ProductAttribute.objects.create(product=product, key=k, value=v)

            # Seed 3 to 5 ProductFAQs per product
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

            # Seed 6 to 8 Approved Reviews per product
            if product.reviews.count() < 6:
                for r_idx in range(6):
                    reviewer = demo_users[(p_idx + r_idx) % len(demo_users)]
                    title, body, rating = REVIEW_TEMPLATES[(p_idx + r_idx) % len(REVIEW_TEMPLATES)]
                    Review.objects.get_or_create(
                        product=product,
                        user=reviewer,
                        defaults={
                            'rating': rating,
                            'title': title,
                            'body': body,
                            'is_approved': True,
                        }
                    )

        # 8. Seed 6 Distinct Coupons (percentage, fixed, expired, not-started, maxed-out, category-restricted)
        now = timezone.now()
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
            code='SAVE500',
            defaults={
                'type': 'fixed',
                'value': 500,
                'min_order_amount': 2500,
                'is_active': True,
            }
        )
        Coupon.objects.update_or_create(
            code='EXPIRED25',
            defaults={
                'type': 'percent',
                'value': 25,
                'min_order_amount': 1000,
                'starts_at': now - timedelta(days=60),
                'ends_at': now - timedelta(days=1),
                'is_active': True,
            }
        )
        Coupon.objects.update_or_create(
            code='FUTURE15',
            defaults={
                'type': 'percent',
                'value': 15,
                'min_order_amount': 1000,
                'starts_at': now + timedelta(days=10),
                'ends_at': now + timedelta(days=40),
                'is_active': True,
            }
        )
        maxed_coupon, _ = Coupon.objects.update_or_create(
            code='MAXEDOUT',
            defaults={
                'type': 'fixed',
                'value': 300,
                'min_order_amount': 1000,
                'usage_limit_total': 5,
                'is_active': True,
            }
        )
        Coupon.objects.update_or_create(
            code='SKINGLOW',
            defaults={
                'type': 'percent',
                'value': 15,
                'min_order_amount': 1500,
                'applies_to_category': category_objs.get('skin-glow', category_objs['multivitamins']),
                'is_active': True,
            }
        )

        # 9. Seed 30 Orders Across ALL 5 Statuses (COD Nationwide)
        statuses = [
            Order.STATUS_PENDING,
            Order.STATUS_CONFIRMED,
            Order.STATUS_SHIPPED,
            Order.STATUS_DELIVERED,
            Order.STATUS_CANCELLED,
        ]

        existing_orders_count = Order.objects.count()
        if existing_orders_count < 30:
            for o_idx in range(30):
                order_num = f"ORD-20261103-{o_idx+1:04d}"
                if Order.objects.filter(number=order_num).exists():
                    continue

                order_user = demo_users[o_idx % len(demo_users)]
                order_status = statuses[o_idx % len(statuses)]
                selected_prod = all_created_products[o_idx % len(all_created_products)]
                qty = 1 if o_idx % 2 == 0 else 2
                item_price = selected_prod.price
                subtotal = item_price * qty
                shipping = 0 if subtotal >= 2000 else 200
                total = subtotal + shipping

                order = Order.objects.create(
                    number=order_num,
                    user=order_user,
                    status=order_status,
                    payment_method='COD',
                    subtotal=subtotal,
                    discount_total=0,
                    shipping_total=shipping,
                    grand_total=total,
                    shipping_address_snapshot={
                        'full_name': order_user.full_name,
                        'phone': order_user.phone,
                        'line1': f"House {10+o_idx}, Street {2+o_idx % 5}, Block C",
                        'line2': '',
                        'city': 'Lahore' if o_idx % 3 == 0 else ('Karachi' if o_idx % 3 == 1 else 'Islamabad'),
                        'province': 'Punjab' if o_idx % 3 == 0 else ('Sindh' if o_idx % 3 == 1 else 'Islamabad'),
                        'postal_code': '54000',
                    },
                )

                OrderItem.objects.create(
                    order=order,
                    product=selected_prod,
                    product_name=selected_prod.name,
                    sku=selected_prod.sku,
                    unit_price=item_price,
                    quantity=qty,
                    line_total=subtotal,
                )

        total_products = Product.objects.count()
        total_multis = Product.objects.filter(product_type='multivitamin').count()
        total_skincare = Product.objects.filter(product_type='skincare').count()
        total_users = User.objects.count()
        total_orders = Order.objects.count()

        self.stdout.write(self.style.SUCCESS(
            f'Demo seeding complete: {total_products} total products seeded '
            f'({total_multis} multivitamins, {total_skincare} skincare), '
            f'{total_users} users, {total_orders} orders, 6 coupons. '
            f'Original SVG and WebP/AVIF fallbacks generated in frontend/src/assets/demo/ and media/products/. '
            f'Staff: {admin_email} / {admin_pass}'
        ))
