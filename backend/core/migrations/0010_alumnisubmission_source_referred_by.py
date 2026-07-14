# Generated for AlumniSubmission source / referred_by fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_alumni_source_referred_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='alumnisubmission',
            name='source',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='alumnisubmission',
            name='referred_by',
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
