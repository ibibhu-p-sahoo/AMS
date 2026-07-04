from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="jobposting",
            name="employment_type",
            field=models.CharField(
                choices=[
                    ("fulltime", "Full Time"),
                    ("parttime", "Part Time"),
                    ("internship", "Internship"),
                ],
                default="fulltime",
                max_length=12,
            ),
        ),
    ]
