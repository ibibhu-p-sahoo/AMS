"""CSV export/import mixin for ModelViewSets (bulk alumni/student data)."""
import csv
import io

from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from django.http import HttpResponse


class CsvMixin:
    """Adds `export-csv` (GET) and `import-csv` (POST, multipart) actions.

    Subclass must set `csv_columns` and `csv_filename`, and implement
    `import_row(row: dict) -> (instance, created: bool)`. Override
    `row_to_dict(obj)` if export values need mapping (e.g. FK names).
    """

    csv_columns: list = []
    csv_filename = "export"

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        qs = self.filter_queryset(self.get_queryset())
        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = f'attachment; filename="{self.csv_filename}.csv"'
        writer = csv.DictWriter(resp, fieldnames=self.csv_columns)
        writer.writeheader()
        for obj in qs:
            writer.writerow(self.row_to_dict(obj))
        return resp

    @action(
        detail=False,
        methods=["post"],
        url_path="import-csv",
        parser_classes=[MultiPartParser, FormParser],
    )
    def import_csv(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Upload a CSV file in the 'file' field."}, status=400)
        decoded = io.TextIOWrapper(upload.file, encoding="utf-8-sig")
        reader = csv.DictReader(decoded)
        created = updated = 0
        errors = []
        for line_no, row in enumerate(reader, start=2):
            try:
                _, was_created = self.import_row({(k or "").strip(): v for k, v in row.items()})
                created += int(was_created)
                updated += int(not was_created)
            except Exception as exc:  # noqa: BLE001 - report per-row, keep going
                errors.append(f"Row {line_no}: {exc}")
        return Response(
            {"created": created, "updated": updated, "errors": errors[:25]}
        )

    def row_to_dict(self, obj):
        return {col: getattr(obj, col, "") for col in self.csv_columns}

    def import_row(self, row):
        raise NotImplementedError


def parse_bool(value):
    return str(value or "").strip().lower() in ("1", "true", "yes", "y")


def parse_int(value, default=None):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default
