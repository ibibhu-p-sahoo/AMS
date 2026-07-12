"""Shared email validation used across serializers (alumni, students, users,
public forms) so every email field gets the same checks."""
import dns.resolver
from rest_framework import serializers


def email_domain_deliverable(domain):
    """Best-effort check that an email domain can actually receive mail.

    Returns False only when the domain definitively does not exist / cannot
    accept mail (typos like 'gmial.com', 'foo@nowhere.xyz'). On any DNS/network
    failure on our side we fail open (return True) so a resolver hiccup never
    blocks a legitimate address.
    """
    resolver = dns.resolver.Resolver()
    resolver.timeout = 2
    resolver.lifetime = 3
    try:
        return len(resolver.resolve(domain, "MX")) > 0
    except dns.resolver.NoAnswer:
        pass  # domain exists but has no MX — check for an implicit A-record MX
    except dns.resolver.NXDOMAIN:
        return False  # domain does not exist at all
    except Exception:
        return True  # timeout / no network / other — don't block the user
    try:
        return len(resolver.resolve(domain, "A")) > 0
    except dns.resolver.NXDOMAIN:
        return False
    except Exception:
        return True


class DeliverableEmailField(serializers.EmailField):
    """EmailField that also rejects domains which can't receive mail (typos
    like 'gmial.com' → NXDOMAIN). Format is validated by EmailField; the domain
    check fails open on DNS/network errors so legit addresses are never blocked."""

    def to_internal_value(self, data):
        value = super().to_internal_value(data)  # format validation
        domain = value.rsplit("@", 1)[-1].lower()
        if domain and not email_domain_deliverable(domain):
            raise serializers.ValidationError(
                f"'{domain}' doesn't look like a real mail domain — please check for typos."
            )
        return value
