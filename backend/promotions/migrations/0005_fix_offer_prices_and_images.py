from django.db import migrations


def fix_offers(apps, schema_editor):
    Offer = apps.get_model('promotions', 'Offer')
    # Offer 1
    Offer.objects.filter(id=1).update(
        image='products/clean-sunscreen-invisible.jpg',
        price=3499,
        original_price=4350,
        discount_percentage=15,
    )
    # Offer 2
    Offer.objects.filter(id=2).update(
        image='products/clean-skincare-serum.jpg',
        price=3564,
        original_price=4950,
        discount_percentage=28,
    )
    # If any offer still has price=0, derive from original_price and discount or product
    for o in Offer.objects.filter(price=0):
        if o.original_price and o.discount_percentage:
            o.price = int(round(o.original_price * (1 - (o.discount_percentage / 100.0))))
            o.save(update_fields=['price'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('promotions', '0004_offer_highlight'),
    ]

    operations = [
        migrations.RunPython(fix_offers, reverse_code=noop),
    ]

