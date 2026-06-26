"""Idempotent demo seed — safe to run on every boot."""
import os
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Role
from core.models import (
    Alumni,
    Company,
    Event,
    EventParticipant,
    JobIntelResponse,
    JobPosting,
    MessageTemplate,
    OutreachCampaign,
    OutreachContact,
    ReferralLead,
    Student,
    Task,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with demo data (idempotent)."

    def handle(self, *args, **options):
        self.stdout.write("Seeding users...")
        admin_email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@institute.edu")
        admin_pw = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin12345")

        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={"name": "Admin", "role": Role.ADMIN, "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password(admin_pw)
            admin.save()

        coordinator = self._user("coordinator@institute.edu", "Priya Coordinator", Role.COORDINATOR)
        volunteer = self._user("volunteer@institute.edu", "Rohan Volunteer", Role.VOLUNTEER)
        # Alumnus login — read-only access; ties to the seeded Aarav Sharma directory record.
        alumnus = self._user("aarav.sharma@example.com", "Aarav Sharma", Role.ALUMNUS)

        self.stdout.write("Seeding companies...")
        companies = {}
        for name, sector, placement in [
            ("Infosys", "IT Services", True),
            ("Google", "Technology", True),
            ("Tata Motors", "Automotive", False),
            ("Razorpay", "Fintech", True),
            ("Zoho", "SaaS", True),
            ("L&T", "Engineering", False),
        ]:
            companies[name], _ = Company.objects.get_or_create(
                name=name, defaults={"sector": sector, "is_in_placement_list": placement}
            )

        self.stdout.write("Seeding alumni...")
        alumni_seed = [
            ("Aarav Sharma", 2018, "CSE", "Google", "senior", "Backend", "Bengaluru", 5, True),
            ("Priya Menon", 2016, "ECE", "Infosys", "lead", "Embedded", "Pune", 4, True),
            ("Rohan Gupta", 2019, "Mech", "Tata Motors", "mid", "Design", "Chennai", 3, False),
            ("Sneha Iyer", 2017, "IT", "Razorpay", "senior", "Frontend", "Bengaluru", 5, True),
            ("Karan Patel", 2020, "CSE", "Zoho", "junior", "Fullstack", "Chennai", 4, False),
            ("Divya Rao", 2015, "IT", "Google", "lead", "ML", "Bengaluru", 5, True),
            ("Vikram Nair", 2019, "EEE", "L&T", "mid", "Power", "Hyderabad", 2, False),
            ("Ananya Singh", 2021, "CSE", "Razorpay", "junior", "Backend", "Bengaluru", 4, False),
        ]
        alumni_objs = {}
        for name, batch, branch, comp, level, domain, city, will, sup in alumni_seed:
            obj, _ = Alumni.objects.get_or_create(
                email=f"{name.split()[0].lower()}.{name.split()[1].lower()}@example.com",
                defaults={
                    "name": name, "batch": batch, "branch": branch,
                    "company": companies[comp], "role_level": level, "domain": domain,
                    "city": city, "willingness": will, "is_super_alumni": sup,
                    "status": "active", "consent_given": True,
                    "linkedin": f"linkedin.com/in/{name.lower().replace(' ', '-')}",
                    "updated_by": admin,
                },
            )
            alumni_objs[name] = obj

        self.stdout.write("Seeding students...")
        students = []
        student_seed = [
            ("Meera Joshi", 2025, "CSE", 8.7, ["Python", "Django", "React"], "Fullstack"),
            ("Arjun Reddy", 2025, "IT", 9.1, ["Java", "Spring", "SQL"], "Backend"),
            ("Kavya Nambiar", 2026, "ECE", 8.2, ["C++", "Embedded", "IoT"], "Embedded"),
            ("Sahil Verma", 2025, "CSE", 7.9, ["JavaScript", "Node", "AWS"], "Cloud"),
        ]
        for name, batch, branch, gpa, skills, domain in student_seed:
            obj, _ = Student.objects.get_or_create(
                name=name,
                defaults={
                    "batch": batch, "branch": branch, "gpa": gpa,
                    "skills": skills, "domain": domain,
                    "email": f"{name.split()[0].lower()}@students.institute.edu",
                    "project_highlights": "Capstone project + 2 hackathon wins.",
                },
            )
            students.append(obj)

        self.stdout.write("Seeding templates & campaigns...")
        template, _ = MessageTemplate.objects.get_or_create(
            name="Intro & Ask (3-part)",
            defaults={
                "type": "outreach",
                "channel": "email",
                "body": "Hi {name},\n\n[Context] We're connecting our 2025 batch with seniors in {domain}.\n[Ask] Could you refer 1 student or share open roles at {company}?\n[Close] Even a quick reply helps. Thank you!",
            },
        )
        campaign, _ = OutreachCampaign.objects.get_or_create(
            name="IT Alumni in Bengaluru — Q3",
            defaults={
                "channel": "email",
                "segment_filter": {"branch": "IT", "city": "Bengaluru"},
                "template": template,
                "owner": coordinator,
            },
        )
        for name in ["Sneha Iyer", "Divya Rao", "Aarav Sharma"]:
            OutreachContact.objects.get_or_create(
                campaign=campaign, alumni=alumni_objs[name],
                defaults={"status": "sent", "sent_at": timezone.now()},
            )

        self.stdout.write("Seeding events...")
        event, _ = Event.objects.get_or_create(
            title="Alumni Tech Talk 2026",
            defaults={
                "type": "webinar",
                "date": timezone.now() + timedelta(days=14),
                "venue": "Online (Zoom)",
                "capacity": 200,
                "target_audience": "Final-year students",
            },
        )
        EventParticipant.objects.get_or_create(
            event=event, person_name="Aarav Sharma",
            defaults={"person_type": "alumni", "person_id": alumni_objs["Aarav Sharma"].id, "role": "speaker", "rsvp": True},
        )

        self.stdout.write("Seeding referrals...")
        ReferralLead.objects.get_or_create(
            student=students[0], company=companies["Google"], alumni=alumni_objs["Aarav Sharma"],
            defaults={"stage": "referred", "notes": "Strong fullstack profile.", "last_followup_at": timezone.now() - timedelta(hours=60)},
        )
        ReferralLead.objects.get_or_create(
            student=students[1], company=companies["Razorpay"], alumni=alumni_objs["Sneha Iyer"],
            defaults={"stage": "contacted", "notes": "Awaiting JD."},
        )

        self.stdout.write("Seeding job-intel & tasks...")
        JobIntelResponse.objects.get_or_create(
            alumni=alumni_objs["Divya Rao"],
            defaults={"hiring": True, "roles": "2x ML Engineer", "timeline": "1-3m"},
        )
        Task.objects.get_or_create(
            title="Collect Q3 job-intel responses",
            defaults={"team": "outreach", "assignee": volunteer, "due_date": (timezone.now() + timedelta(days=5)).date(), "status": "doing"},
        )
        Task.objects.get_or_create(
            title="Confirm speakers for Tech Talk",
            defaults={"team": "events", "assignee": coordinator, "due_date": (timezone.now() + timedelta(days=3)).date(), "status": "todo"},
        )

        self.stdout.write("Seeding job postings...")
        JobPosting.objects.get_or_create(
            title="Backend Engineer (SDE-2)",
            company="Google",
            defaults={
                "location": "Bengaluru", "work_mode": "hybrid",
                "description": "We're hiring backend engineers for our Payments team. "
                "3+ yrs experience with Go/Java, distributed systems.",
                "apply_url": "https://careers.google.com",
                "posted_by": alumnus, "is_open": True,
            },
        )
        JobPosting.objects.get_or_create(
            title="Frontend Developer Intern",
            company="Razorpay",
            defaults={
                "location": "Remote", "work_mode": "remote",
                "description": "6-month internship for final-year students. React + TypeScript.",
                "apply_url": "careers@razorpay.com",
                "posted_by": coordinator, "is_open": True,
            },
        )

        self.stdout.write(self.style.SUCCESS("Seed complete."))

    def _user(self, email, name, role):
        user, created = User.objects.get_or_create(
            email=email, defaults={"name": name, "role": role}
        )
        if created:
            user.set_password("demo12345")
            user.save()
        return user
