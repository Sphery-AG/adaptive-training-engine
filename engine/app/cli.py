"""Print a member's generated circle as kiosk JSON.

    python -m app.cli 82

Run from the engine/ directory with the venv active and the local DB up.
"""

from __future__ import annotations

import sys

from .generate import generate_for_member


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python -m app.cli <userId>", file=sys.stderr)
        return 2
    try:
        user_id = int(sys.argv[1])
    except ValueError:
        print(f"userId must be an integer, got {sys.argv[1]!r}", file=sys.stderr)
        return 2

    request = generate_for_member(user_id)
    print(request.to_kiosk_json())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
