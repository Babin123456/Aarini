"""
Schema-based request validation middleware for Flask endpoints.
Provides a @validate_request(schema) decorator that checks request body
against a schema before the handler runs.
"""

import re
from functools import wraps
from flask import request, jsonify


DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _check_field(value, rules, field_name):
    """Validate a single field against its rules. Returns error string or None."""
    field_type = rules.get("type", "string")

    if value is None or value == "":
        if rules.get("required", False):
            return "Required"
        return None

    if field_type == "string":
        if not isinstance(value, str):
            return "Must be a string"
        min_len = rules.get("min_length")
        max_len = rules.get("max_length")
        if min_len and len(value) < min_len:
            return f"Must be at least {min_len} characters"
        if max_len and len(value) > max_len:
            return f"Must be at most {max_len} characters"

    elif field_type == "date":
        if not isinstance(value, str) or not DATE_RE.match(value):
            return "Must be a valid date (YYYY-MM-DD)"

    elif field_type == "email":
        if not isinstance(value, str) or not EMAIL_RE.match(value):
            return "Must be a valid email address"

    elif field_type == "number":
        if not isinstance(value, (int, float)):
            return "Must be a number"
        min_val = rules.get("min")
        max_val = rules.get("max")
        if min_val is not None and value < min_val:
            return f"Must be at least {min_val}"
        if max_val is not None and value > max_val:
            return f"Must be at most {max_val}"

    elif field_type == "array":
        if not isinstance(value, list):
            return "Must be an array"

    return None


def validate_request(schema):
    """
    Decorator that validates request JSON body against a schema.

    Schema format:
        {
            "fieldName": {"type": "string|date|email|number|array", "required": True/False, ...},
        }

    Returns 400 with field-level errors if validation fails.
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            body = request.get_json(silent=True)
            if body is None:
                body = {}

            errors = {}
            for field_name, rules in schema.items():
                value = body.get(field_name)
                error = _check_field(value, rules, field_name)
                if error:
                    errors[field_name] = error

            if errors:
                return jsonify({
                    "error": "Validation failed",
                    "fields": errors,
                }), 400

            return f(*args, **kwargs)
        return wrapped
    return decorator
