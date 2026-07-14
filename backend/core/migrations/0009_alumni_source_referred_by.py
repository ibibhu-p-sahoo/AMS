# Generated for Alumni source / referred_by fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_alumnisubmission_photo'),
    ]

    operations = [
        migrations.AddField(
            model_name='alumni',
            name='source',
            field=models.CharField(
                blank=True,
                help_text='How this alumnus was added (e.g. LinkedIn, Referral, Event)',
                max_length=120,
            ),
        ),
        migrations.AddField(
            model_name='alumni',
            name='referred_by',
            field=models.CharField(
                blank=True,
                help_text='Name of the person who referred this alumnus',
                max_length=150,
            ),
        ),
    ]
