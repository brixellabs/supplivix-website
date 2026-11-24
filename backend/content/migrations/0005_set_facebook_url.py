from django.db import migrations


def set_facebook_url(apps, schema_editor):
    SiteSetting = apps.get_model('content', 'SiteSetting')
    SiteSetting.objects.update_or_create(
        key='facebook_url',
        defaults={
            'value': 'https://www.facebook.com/share/16RoXXSXb4L/',
            'description': 'Official Facebook Page URL',
        }
    )


def rollback_facebook_url(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0004_seed_hero_slides'),
    ]

    operations = [
        migrations.RunPython(set_facebook_url, rollback_facebook_url),
    ]

