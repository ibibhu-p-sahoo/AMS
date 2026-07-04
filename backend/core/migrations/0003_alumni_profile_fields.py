from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_jobposting_employment_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="alumni",
            name="github",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="alumni",
            name="twitter",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="alumni",
            name="website",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="alumni",
            name="bio",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="alumni",
            name="skills",
            field=models.CharField(
                blank=True, help_text="Comma-separated skills", max_length=400
            ),
        ),
        migrations.AddField(
            model_name="alumni",
            name="interests",
            field=models.CharField(
                blank=True, help_text="Comma-separated interests", max_length=400
            ),
        ),
    ]
