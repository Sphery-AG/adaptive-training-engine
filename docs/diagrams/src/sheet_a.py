from erd import render

C1, C2, C3 = 70, 850, 1630   # 520 box + 260 gap
R1, R2, R3 = 190, 780, 1420

sheet = {
    'title': 'Adaptive Training Plan — Data Schema v1',
    'sub': 'Sheet 1 of 4 · Sessions and the kiosk link · receives Circle Trainings V2.6',
    'w': 2220, 'h': 1880,
    'tables': [
        {'name': 'group_trainings', 'c': 'b', 'x': C1, 'y': R1,
         'keys': ['id (pk)', 'gym_id (fk)', 'event_id (fk)', 'unique (provider, external_id)'],
         'fields': ['kiosk_id: text, // resolves to a gym',
                    'event_ref: text, // V2 eventId, verbatim',
                    'name: text,',
                    'mode: enum, // single, double, relay',
                    'type: enum, // standard, mutual, rotate',
                    'style: enum, // duration, score',
                    'rounds: smallint,',
                    'is_hyrox: bool,',
                    'status: enum, // setup, started, completed',
                    'started_at / completed_at: timestamptz']},

        {'name': 'training_teams', 'c': 'o', 'x': C2, 'y': R1,
         'keys': ['id (pk)', 'group_training_id (fk)', 'unique (group_training_id, name)'],
         'fields': ['name: text, // or null for a team of one',
                    'start_exercise_index: smallint,',
                    'status: enum, // active, completed, incomplete',
                    'total_time_s: numeric, // cached at finalize',
                    'total_score: int,',
                    'finalized_at: timestamptz']},

        {'name': 'session_logs', 'c': 'o', 'x': C3, 'y': R1,
         'keys': ['id (pk)', 'member_id (fk)', 'team_id (fk) // null = logged in the app',
                  'plan_session_id (fk)', 'unique (member_id, team_id)'],
         'fields': ['source: enum, // app, kiosk, imported',
                    'started_at / completed_at: timestamptz',
                    'duration_seconds: int,',
                    'avg_hr / max_hr: smallint,',
                    'perceived_effort: smallint, // 1-5',
                    'points_earned: int']},

        {'name': 'training_stations', 'c': 'b', 'x': C1, 'y': R2,
         'keys': ['id (pk)', 'group_training_id (fk)', 'station_id (fk)',
                  'unique (group_training_id, order_index)'],
         'fields': ['order_index: smallint,',
                    'name: text, // "Run", "SkiErg"',
                    'style: enum, // duration, score',
                    'target: text // "1000m"']},

        {'name': 'session_exercise_logs', 'c': 'g', 'x': C2, 'y': R2,
         'keys': ['id (pk)', 'session_log_id (fk)', 'training_station_id (fk)', 'exercise_id (fk)',
                  'unique (session_log_id, order_index,', '        round_index, split_index)'],
         'fields': ['round_index: smallint, // round of the circuit',
                    'split_index: smallint, // a mutual-mode swap',
                    'role: enum, // warmup, work, cooldown',
                    'exercise_name / station_name: text,',
                    'prescribed_zone: smallint,',
                    'actual_seconds: int,',
                    'seconds_in_zone: int, // did they hold it',
                    'score / calories: int,',
                    'avg_hr / max_hr: smallint']},

        {'name': 'session_pause_logs', 'c': 'g', 'x': C3, 'y': R2,
         'keys': ['id (pk)', 'session_log_id (fk)', 'after_exercise_log_id (fk)'],
         'fields': ['started_at / stopped_at: timestamptz',
                    'hr_60s_recovery: smallint, // the metric',
                    'hr_avg_recovery: smallint,',
                    'hr_max / hr_min / hr_avg: smallint']},

        {'name': 'session_hr_samples', 'c': 'o', 'x': C1, 'y': R3,
         'keys': ['primary key (session_log_id, at)', 'session_log_id (fk)'],
         'fields': ['at: timestamptz, // absolute UTC',
                    'bpm: smallint']},

        {'name': 'external_session_refs', 'c': 'y', 'x': C2, 'y': R3,
         'keys': ['primary key (session_log_id, provider)', 'unique (provider, external_id)'],
         'fields': ['provider: enum, // sphery, nexus_kiosk',
                    'external_id: text // the kiosk group member']},
    ],
    'rels': [
        ('group_trainings', 'training_teams',
         'one-to-many (each training has zero or multiple teams)', 'r'),
        ('training_teams', 'session_logs',
         'one-to-many (each team has one or multiple members)', 'r'),
        ('group_trainings', 'training_stations',
         'one-to-many (the circuit legs)', 'b'),
        ('session_logs', 'session_exercise_logs',
         'one-to-many (leg x round x split)', 'b'),
        ('session_exercise_logs', 'session_pause_logs',
         'one-to-one (the pause after it)', 'r'),
    ],
    'notes': [
        (70, 1690, 'Every participant is a group member, even a group of one — so an app-logged session simply has team_id NULL.'),
        (70, 1726, 'The key on session_exercise_logs is (session, leg, round, split). Without round and split a three-round circuit cannot be stored at all.'),
        (70, 1762, 'seconds_in_zone is the one column the kiosk does not send today. It is the ask: timeInTier1-5 on CircleTrainingExerciseLogsV2.'),
    ],
}

render(sheet, 'erd_a.html')
print('erd_a.html', sheet['w'], sheet['h'])
