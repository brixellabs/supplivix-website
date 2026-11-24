from django.db import migrations


def seed_hero_slides(apps, schema_editor):
    HeroSlide = apps.get_model('content', 'HeroSlide')

    slides = [
        {
            'sort_order': 1,
            'title': 'Supplivix Summer Glow-on with Glutathione',
            'subtitle': 'Gluta-Glow Radiant Skin Formulation',
            'image': 'banners/hero-slide-1.jpg',
            'image_url_path': '/media/banners/hero-slide-1.jpg',
            'link': '/shop?category=skincare',
            'button_text': 'Shop Skincare',
            'is_active': True,
        },
        {
            'sort_order': 2,
            'title': 'Supplivix 6000mg Marine Collagen Powder',
            'subtitle': 'Pure Hydrolyzed Collagen Peptides',
            'image': 'banners/hero-slide-2.jpg',
            'image_url_path': '/media/banners/hero-slide-2.jpg',
            'link': '/shop?category=anti-aging',
            'button_text': 'Explore Collagen',
            'is_active': True,
        },
        {
            'sort_order': 3,
            'title': 'Supplivix 100% Bioavailable Daily Vitality Multivitamin',
            'subtitle': 'Essential Vitamins & Minerals For Peak Energy',
            'image': 'banners/hero-slide-3.jpg',
            'image_url_path': '/media/banners/hero-slide-3.jpg',
            'link': '/multivitamins',
            'button_text': 'View Multivitamins',
            'is_active': True,
        },
        {
            'sort_order': 4,
            'title': 'Supplivix Strong Bones Active Life Calcium D3',
            'subtitle': 'Advanced Bone & Joint Support',
            'image': 'banners/hero-slide-4.jpg',
            'image_url_path': '/media/banners/hero-slide-4.jpg',
            'link': '/shop?category=bones-joints',
            'button_text': 'Shop Joint Health',
            'is_active': True,
        },
        {
            'sort_order': 5,
            'title': 'Supplivix Immunity Power Daily Shield Vitamin C',
            'subtitle': 'High Potency Vitamin C + Zinc Defense',
            'image': 'banners/hero-slide-5.jpg',
            'image_url_path': '/media/banners/hero-slide-5.jpg',
            'link': '/shop?category=immunity',
            'button_text': 'Boost Immunity',
            'is_active': True,
        },
        {
            'sort_order': 6,
            'title': 'Supplivix Thicker Hair Radiant Glow Biotin',
            'subtitle': 'Extra Strength Biotin 5000mcg Complex',
            'image': 'banners/hero-slide-6.jpg',
            'image_url_path': '/media/banners/hero-slide-6.jpg',
            'link': '/shop?category=skincare',
            'button_text': 'Shop Biotin',
            'is_active': True,
        },
        {
            'sort_order': 7,
            'title': 'Supplivix Yummy Multi Gummies Made Healthy',
            'subtitle': 'Kids Delicious Multi Fruit Gummies',
            'image': 'banners/hero-slide-7.jpg',
            'image_url_path': '/media/banners/hero-slide-7.jpg',
            'link': '/shop?category=kids',
            'button_text': 'Shop Kids Multivitamins',
            'is_active': True,
        },
    ]

    for item in slides:
        HeroSlide.objects.update_or_create(
            sort_order=item['sort_order'],
            defaults=item,
        )


def rollback_hero_slides(apps, schema_editor):
    HeroSlide = apps.get_model('content', 'HeroSlide')
    HeroSlide.objects.filter(sort_order__lte=7).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0003_heroslide'),
    ]

    operations = [
        migrations.RunPython(seed_hero_slides, rollback_hero_slides),
    ]

