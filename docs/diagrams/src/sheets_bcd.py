from erd import render

C1, C2, C3 = 70, 850, 1630
W = 2220

# =============================================================================
# SHEET 2 — Plans and progression
# =============================================================================
R1, R2, R3 = 190, 800, 1420
b = {
    'title': 'Adaptive Training Plan — Data Schema v1',
    'sub': 'Sheet 2 of 4 · Plans and progression · the prescription is rows, not a document',
    'w': W, 'h': 2060,
    'tables': [
        {'name': 'members', 'c': 'y', 'x': C1, 'y': R1,
         'keys': ['id (pk)', 'account_id (fk)', 'org_id (fk)', 'home_gym_id (fk)',
                  'unique (account_id, org_id)'],
         'fields': ['display_name: text,', 'dob: date, // never a stored age',
                    'gender: text, // male/female/diverse', 'deleted_at: timestamptz']},

        {'name': 'questionnaire_responses', 'c': 'b', 'x': C2, 'y': R1,
         'keys': ['id (pk)', 'member_id (fk)'],
         'fields': ['version: text,', 'answers: jsonb, // exactly as submitted',
                    'created_at: timestamptz']},

        {'name': 'plans', 'c': 'b', 'x': C3, 'y': R1,
         'keys': ['id (pk)', 'member_id (fk)', 'gym_id (fk)', 'questionnaire_id (fk)',
                  'event_id (fk)', 'superseded_by_id (fk)'],
         'fields': ['goal: enum, // 8 product goals',
                    'event_division: enum, // pro, open',
                    'status: enum, // active, superseded...',
                    'rationale: text, // shown to the member',
                    'fitness_estimate: jsonb, // frozen',
                    'starts_on: date']},

        {'name': 'member_restrictions', 'c': 'y', 'x': C1, 'y': R2,
         'keys': ['id (pk)', 'member_id (fk)', 'recorded_by_staff_id (fk)'],
         'fields': ['reported_label: text, // what they said',
                    'recovery_stage: enum,',
                    'avoid_region: enum, // the gate',
                    'avoid_movement: enum,',
                    'max_impact: enum, // low < medium < high',
                    'expires_on: date, cleared_at: timestamptz']},

        {'name': 'plan_weeks', 'c': 'b', 'x': C2, 'y': R2,
         'keys': ['primary key (plan_id, week_number)', 'plan_id (fk)'],
         'fields': ['week_number: smallint,', 'theme: text // "base building"']},

        {'name': 'plan_sessions', 'c': 'g', 'x': C3, 'y': R2,
         'keys': ['id (pk)', 'foreign key (plan_id, week_number)',
                  'unique (plan_id, week_number,', '        index_in_week)'],
         'fields': ['stimulus: enum, // what it is for',
                    'adaptivity: enum, // how kit adapts',
                    'hr_zone: smallint, // the prescription',
                    'hr_bpm_min / hr_bpm_max: smallint,',
                    'duration_min: smallint, rounds: smallint,',
                    'difficulty: smallint, // 1-10',
                    'scheduled_on: date,',
                    'is_deload / is_benchmark: bool']},

        {'name': 'member_family_levels', 'c': 'o', 'x': C1, 'y': R3,
         'keys': ['primary key (member_id, family_id)'],
         'fields': ['level: enum, // foundation..mastery',
                    'load: jsonb, // kg, pace, game level',
                    'promoted_at: timestamptz']},

        {'name': 'plan_changes', 'c': 'o', 'x': C2, 'y': R3,
         'keys': ['id (pk)', 'plan_id (fk)', 'session_log_id (fk)', 'family_id (fk)'],
         'fields': ['triggered_by: text,',
                    'difficulty_delta: smallint,',
                    'level_from / level_to: enum,',
                    'evidence: jsonb,',
                    'rationale: text // the sentence shown']},

        {'name': 'plan_session_exercises', 'c': 'g', 'x': C3, 'y': R3,
         'keys': ['id (pk)', 'plan_session_id (fk)', 'exercise_id (fk)', 'station_id (fk)',
                  'unique (plan_session_id, order_index)'],
         'fields': ['role: enum, // warmup, work, cooldown',
                    'target_zone: smallint,',
                    'target_seconds / target_reps,',
                    'target_text: text // "1000m"']},
    ],
    'rels': [
        ('members', 'questionnaire_responses', 'one-to-many (each member has zero or multiple responses)', 'r'),
        ('questionnaire_responses', 'plans', 'one-to-many (each response can produce a plan)', 'r'),
        ('members', 'member_restrictions', 'one-to-many (the safety gate)', 'b'),
        ('plans', 'plan_weeks', 'one-to-many (each plan has 8 weeks)', 'b'),
        ('plan_weeks', 'plan_sessions', 'one-to-many (each week has 2-4 sessions)', 'r'),
        ('plan_sessions', 'plan_session_exercises', 'one-to-many (the legs of the circuit)', 'b'),
    ],
    'notes': [
        (70, 1880, 'There is no "weeks" JSON column. The prescription is rows, so a missed session is a plan_sessions row with no session_logs row against it.'),
        (70, 1916, 'That single left join is the whole adaptive loop. plan_changes then records which family moved and from which level to which.'),
        (70, 1952, 'member_restrictions is the other half of the safety gate: exercises.impact is meaningless without something on the member side to compare it to.'),
    ],
}
render(b, 'erd_b.html')

# =============================================================================
# SHEET 3 — Catalogue and goals
# =============================================================================
R1, R2, R3, R4 = 190, 720, 1250, 1560
c = {
    'title': 'Adaptive Training Plan — Data Schema v1',
    'sub': 'Sheet 3 of 4 · The exercise catalogue and the goal bridge · 105 exercises, 50 families',
    'w': W, 'h': 2060,
    'tables': [
        {'name': 'equipment', 'c': 'y', 'x': C1, 'y': R1,
         'keys': ['id (pk)', 'owning_gym_id (fk) // null = shared', 'unique (slug) where shared'],
         'fields': ['slug / name: text,', 'is_sphery: bool']},

        {'name': 'equipment_stimuli', 'c': 'y', 'x': C2, 'y': R1,
         'keys': ['primary key (equipment_id, stimulus)'],
         'fields': ['stimulus: enum, // what it can deliver', 'mode: text // "Fitness", "Game"']},

        {'name': 'exercise_families', 'c': 'b', 'x': C3, 'y': R1,
         'keys': ['id (pk)', 'unique (slug)'],
         'fields': ['slug / name: text',
                    '// the ladder is a VIEW, not a column']},

        {'name': 'stations', 'c': 'y', 'x': C1, 'y': R2,
         'keys': ['id (pk)', 'gym_id (fk)', 'equipment_id (fk)', 'unique (gym_id, name)'],
         'fields': ['name: text, // "ExerCube 2"',
                    'position: smallint,',
                    'retired_at: timestamptz']},

        {'name': 'exercises', 'c': 'b', 'x': C2, 'y': R2,
         'keys': ['id (pk)', 'family_id (fk)', 'primary_equipment_id (fk)',
                  'owning_gym_id (fk)', 'unique (code) where shared'],
         'fields': ['code: text, // EX001',
                    'level: enum, // foundation..mastery',
                    'intensity_min / max: smallint, // 1-5',
                    'complexity: smallint, // 1-5',
                    'impact: enum, // low, medium, high',
                    'movement: enum, // squat, hinge, push',
                    'training_modality: enum,',
                    'region_primary / secondary / tertiary']},

        {'name': 'exercise_body_qualities', 'c': 'g', 'x': C3, 'y': R2,
         'keys': ['primary key (exercise_id, quality)'],
         'fields': ['quality: enum, // 5 values',
                    '// all 105 exercises carry >= 1']},

        {'name': 'goal_exercise_goals', 'c': 'o', 'x': C1, 'y': R3,
         'keys': ['primary key (goal, exercise_goal)'],
         'fields': ['goal: enum, // 8 the member picks',
                    'exercise_goal: enum, // 7 catalogue tags',
                    'weight: numeric']},

        {'name': 'exercise_goals', 'c': 'g', 'x': C2, 'y': R3,
         'keys': ['primary key (exercise_id, goal)'],
         'fields': ['goal: enum // the catalogue tag']},

        {'name': 'exercise_brain_qualities', 'c': 'g', 'x': C3, 'y': R3,
         'keys': ['primary key (exercise_id, quality)'],
         'fields': ['quality: enum, // 5 values',
                    '// 42 of 105 carry one']},

        {'name': 'focus_areas', 'c': 'o', 'x': C1, 'y': R4,
         'keys': ['id (pk)', 'unique (goal, slug)'],
         'fields': ['goal: enum, slug / label: text,',
                    'stimulus: enum // biases the plan']},
    ],
    'rels': [
        ('equipment', 'equipment_stimuli', 'one-to-many (what a kind can deliver)', 'r'),
        ('equipment', 'stations', 'one-to-many (instances on a floor)', 'b'),
        ('exercise_families', 'exercises', 'one-to-many (the cards in a family)', 'b'),
        ('exercises', 'exercise_body_qualities', 'one-to-many (body tags)', 'r'),
        ('exercises', 'exercise_brain_qualities', 'one-to-many (brain tags)', 'r', 240),
        ('exercises', 'exercise_goals', 'one-to-many (goal tags)', 'b'),
        ('goal_exercise_goals', 'exercise_goals', 'the bridge between the two vocabularies', 'r'),
    ],
    'notes': [
        (70, 1880, 'The member picks one of 8 goals. Exercises are tagged with one of 7. They are authored by different people and keep drifting, so the translation is a table.'),
        (70, 1916, '"Prepare for an Event" is the proof: it maps onto two catalogue tags and owns neither. One enum for both made it literally unstorable.'),
        (70, 1952, 'A family\'s ladder is derived (SELECT DISTINCT level), never stored. A stored copy is a copy that drifts.'),
    ],
}
render(c, 'erd_c.html')

# =============================================================================
# SHEET 4 — Habit loop
# =============================================================================
R1, R2, R3, R4 = 190, 700, 1160, 1620
d = {
    'title': 'Adaptive Training Plan — Data Schema v1',
    'sub': 'Sheet 4 of 4 · Points, ranks and rewards · the rules are data, not constants',
    'w': W, 'h': 2120,
    'tables': [
        {'name': 'point_rules', 'c': 'b', 'x': C1, 'y': R1,
         'keys': ['id (pk)', 'gym_id (fk) // null = the default',
                  'unique (event) where still open'],
         'fields': ['event: enum, // training_minute, ...',
                    'basis: enum, // per_minute, per_event',
                    'points: numeric,',
                    'effective_from / effective_to']},

        {'name': 'points_ledger', 'c': 'g', 'x': C2, 'y': R1,
         'keys': ['id (pk)', 'member_id (fk)', 'rule_id (fk)', 'session_log_id (fk)',
                  'unique (idempotency_key)'],
         'fields': ['delta: int, // never zero',
                    'quantity: numeric, // minutes, or 1',
                    'reason: text',
                    '// append-only. balance = SUM(delta)']},

        {'name': 'member_state', 'c': 'o', 'x': C3, 'y': R1,
         'keys': ['primary key (member_id)'],
         'fields': ['streak_freezes: smallint, // not derivable',
                    'streak_weeks: smallint, // cached',
                    'longest_streak_weeks: smallint']},

        {'name': 'quests', 'c': 'b', 'x': C1, 'y': R2,
         'keys': ['id (pk)', 'gym_id (fk) // null = global'],
         'fields': ['tier: enum, // quick, medium, long',
                    'metric: enum, measured_over: enum,',
                    'comparison: enum, threshold: numeric,',
                    'reward_points: int']},

        {'name': 'member_quests', 'c': 'g', 'x': C2, 'y': R2,
         'keys': ['primary key (member_id, quest_id)'],
         'fields': ['progress / target: int,',
                    'completed_at: timestamptz']},

        {'name': 'member_rank_months', 'c': 'o', 'x': C3, 'y': R2,
         'keys': ['primary key (member_id, period_month)'],
         'fields': ['points_earned: int,',
                    'target_points: int, // 1000 for v1',
                    'tier: enum, // bronze..diamond',
                    'change: enum // advanced, held, dropped']},

        {'name': 'emblems', 'c': 'b', 'x': C1, 'y': R3,
         'keys': ['id (pk)', 'unique (slug)'],
         'fields': ['label / description: text,',
                    'metric / measured_over / comparison,',
                    'threshold: numeric']},

        {'name': 'member_emblems', 'c': 'g', 'x': C2, 'y': R3,
         'keys': ['primary key (member_id, emblem_id)', 'session_log_id (fk)'],
         'fields': ['earned_at: timestamptz',
                    '// earned, never granted']},

        {'name': 'league_cohorts', 'c': 'b', 'x': C3, 'y': R3,
         'keys': ['id (pk)', 'gym_id (fk) // null = chain-wide'],
         'fields': ['tier: enum,',
                    'starts_at / ends_at: timestamptz',
                    '// who you are ranked against']},

        {'name': 'rewards', 'c': 'b', 'x': C1, 'y': R4,
         'keys': ['id (pk)', 'gym_id (fk)'],
         'fields': ['kind: enum, label: text,',
                    'label_i18n: jsonb, // operator copy',
                    'points_cost: int // > 0']},

        {'name': 'reward_claims', 'c': 'g', 'x': C2, 'y': R4,
         'keys': ['id (pk)', 'member_id (fk)', 'reward_id (fk)',
                  'points_ledger_id (fk) NOT NULL UNIQUE'],
         'fields': ['points_cost: int, // paid at claim time',
                    'status: enum, // claimed, redeemed...',
                    'fulfilled_by_staff_id (fk)']},

        {'name': 'league_memberships', 'c': 'o', 'x': C3, 'y': R4,
         'keys': ['primary key (cohort_id, member_id)'],
         'fields': ['final_rank: smallint,',
                    'promoted / relegated: bool',
                    '// rank itself is a window function']},
    ],
    'rels': [
        ('point_rules', 'points_ledger', 'one-to-many (which rule awarded it)', 'r'),
        ('quests', 'member_quests', 'one-to-many (per member progress)', 'r'),
        ('emblems', 'member_emblems', 'one-to-many (earned instances)', 'r'),
        ('rewards', 'reward_claims', 'one-to-many (claims against a reward)', 'r'),
        ('league_cohorts', 'league_memberships', 'one-to-many (who is in this week)', 'b'),
    ],
    'notes': [
        (70, 1950, 'Two ranking mechanics on purpose: member_rank_months is the tier you HOLD month to month; league_cohorts is who you are ranked AGAINST this week.'),
        (70, 1986, 'reward_claims.points_ledger_id is NOT NULL and UNIQUE. Without it a claim spends nothing, because the balance is SUM(delta).'),
        (70, 2022, 'Earn rates were rewritten once already (Aug 7). A rate change closes the old row rather than editing it, so an August award stays explainable in December.'),
    ],
}
render(d, 'erd_d.html')
print('built erd_b, erd_c, erd_d')
