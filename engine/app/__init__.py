"""Adaptive Training Plan engine — Sphery AG.

Reads a member's history from the static Sphery export, estimates their
fitness (ML, later), and generates a training plan (rules). Every plan is
expressed as a kiosk `CreateTrainingRequest`, the exact JSON the Unity kiosk
runs. See `contract.py` for that contract and `generate.py` for the rules.

Build order (see the roadmap): step 1 = emit a valid CreateTrainingRequest for
a real member. That is what this package does today. Fitness estimate, the real
goal->stimulus rule, and adaptation come next.
"""
