from django.db import migrations


def fix_hero_slide_paths(apps, schema_editor):
    HeroSlide = apps.get_model('content', 'HeroSlide')

    for i in range(1, 8):
        slide = HeroSlide.objects.filter(sort_order=i).first()
        if slide:
            slide.image_url_path = f"/media/hero-slide-{i}.jpg"
            slide.image = f"banners/hero-slide-{i}.jpg"
            slide.save()


def rollback_hero_slide_paths(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0005_set_facebook_url'),
    ]

    operations = [
        migrations.RunPython(fix_hero_slide_paths, rollback_hero_slide_paths),
    ]
