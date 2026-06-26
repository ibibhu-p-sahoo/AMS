import django_filters

from .models import Alumni, ReferralLead


class AlumniFilter(django_filters.FilterSet):
    """Powers Search & Segmentation (PRD §3) — e.g. 'IT alumni in Bengaluru'."""

    city = django_filters.CharFilter(lookup_expr="icontains")
    domain = django_filters.CharFilter(lookup_expr="icontains")
    company = django_filters.NumberFilter(field_name="company_id")
    min_willingness = django_filters.NumberFilter(
        field_name="willingness", lookup_expr="gte"
    )

    class Meta:
        model = Alumni
        fields = {
            "branch": ["exact"],
            "batch": ["exact", "gte", "lte"],
            "status": ["exact"],
            "is_super_alumni": ["exact"],
            "role_level": ["exact"],
        }


class ReferralLeadFilter(django_filters.FilterSet):
    class Meta:
        model = ReferralLead
        fields = {
            "stage": ["exact"],
            "outcome": ["exact"],
            "company": ["exact"],
            "student": ["exact"],
        }
