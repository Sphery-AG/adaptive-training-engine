/**
 * The exercise card catalogue — 105 cards, generated from the Darmstadt sheet
 * (Exercise_Catalogue_Darmstadt_v5_105_Exercises.xlsx) by
 * scratchpad/gen_cards.py. Do not hand-edit; regenerate.
 *
 * Rarity and points are a presentation of `level`, not separate data:
 * Foundation = Common (20 pts), Progress = Rare (30), Mastery = Legendary (50).
 * That is Stephan's card design, and it matches the catalogue's own ladder.
 */

export type CardLevel = 'foundation' | 'progress' | 'mastery';
export type CardRarity = 'common' | 'rare' | 'legendary';

export interface ExerciseCard {
  code: string;
  name: string;
  family: string;
  level: CardLevel;
  rarity: CardRarity;
  points: number;
  /** Position in the Movement Series, 1-based. */
  no: number;
  equipment: string;
  /** 1-5, the top of the sheet's range. Drawn as filled dots. */
  intensity: number;
  complexity: number;
  impact: string;
  /** Movement pattern and training modality, shown as the card's footer line. */
  movement: string;
  modality: string;
  /** Primary, then secondary. Shown as CATEGORY pills. */
  regions: string[];
  body: string[];
  brain: string[];
}

/** The rungs each family actually offers. 
 *  Thirteen families hold a single card, where the ladder is one rung long. */
export const FAMILY_LADDERS: Record<string, CardLevel[]> = {
  "Run / Locomotion": [
    "foundation",
    "progress",
    "mastery"
  ],
  "SkiErg": [
    "foundation",
    "progress"
  ],
  "RowErg": [
    "foundation",
    "progress"
  ],
  "Sled Push": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Sled Pull": [
    "foundation",
    "progress"
  ],
  "Lunge": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Farmer Carry": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Squat": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Burpee": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Deadlift / Hinge": [
    "foundation",
    "progress"
  ],
  "Kettlebell Swing": [
    "foundation"
  ],
  "Horizontal Pull": [
    "foundation",
    "progress"
  ],
  "Step-Up": [
    "foundation",
    "progress"
  ],
  "Jump": [
    "foundation"
  ],
  "Balance": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Assault Bike": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Leg Press": [
    "foundation"
  ],
  "Jump Rope": [
    "foundation",
    "progress"
  ],
  "Hamstring Curl": [
    "foundation"
  ],
  "Hip Stability": [
    "foundation"
  ],
  "Loaded Squat": [
    "foundation",
    "progress"
  ],
  "Barbell Squat": [
    "foundation"
  ],
  "Romanian Deadlift": [
    "foundation",
    "progress"
  ],
  "Horizontal Press": [
    "foundation",
    "progress"
  ],
  "Vertical Press": [
    "foundation",
    "progress"
  ],
  "Suspension Press": [
    "foundation"
  ],
  "Suspension Squat": [
    "foundation"
  ],
  "Suspension Lunge": [
    "foundation"
  ],
  "Push-Up": [
    "foundation",
    "progress"
  ],
  "Plank": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Core Control": [
    "foundation",
    "progress"
  ],
  "Hip Extension": [
    "foundation",
    "progress"
  ],
  "Unstable Plank": [
    "foundation",
    "progress"
  ],
  "Anti-Rotation": [
    "foundation",
    "progress"
  ],
  "Medicine Ball Throw": [
    "foundation",
    "progress"
  ],
  "Medicine Ball Slam": [
    "foundation"
  ],
  "Lateral Locomotion": [
    "foundation",
    "progress"
  ],
  "Plyometric Footwork": [
    "foundation",
    "progress"
  ],
  "Single-Leg Hinge": [
    "foundation",
    "progress"
  ],
  "Calf Raise": [
    "foundation"
  ],
  "Bike": [
    "foundation",
    "progress"
  ],
  "Spinning Bike": [
    "foundation",
    "progress"
  ],
  "ICAROS Guardian": [
    "foundation",
    "progress",
    "mastery"
  ],
  "XR Fighter": [
    "foundation",
    "progress",
    "mastery"
  ],
  "ExerCube SpeedCage": [
    "foundation",
    "progress",
    "mastery"
  ],
  "ExerCube Racer": [
    "foundation",
    "progress",
    "mastery"
  ],
  "Cable Squat": [
    "foundation"
  ],
  "Cable Rotation": [
    "foundation",
    "progress"
  ],
  "Mobility Flow": [
    "foundation"
  ],
  "Reactive Squat": [
    "foundation"
  ]
};

export const CARDS: ExerciseCard[] = [
  {
    "code": "EX001",
    "name": "Treadmill Walk",
    "family": "Run / Locomotion",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 1,
    "equipment": "Treadmill",
    "intensity": 2,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Legs"
    ],
    "body": [
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX002",
    "name": "Treadmill Run",
    "family": "Run / Locomotion",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 2,
    "equipment": "Treadmill",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Endurance",
      "Speed"
    ],
    "brain": []
  },
  {
    "code": "EX003",
    "name": "Treadmill Interval Run",
    "family": "Run / Locomotion",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 3,
    "equipment": "Treadmill",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Endurance",
      "Speed"
    ],
    "brain": []
  },
  {
    "code": "EX004",
    "name": "SkiErg Technique Pull",
    "family": "SkiErg",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 4,
    "equipment": "SkiErg",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Pull",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Back"
    ],
    "body": [
      "Endurance",
      "Coordination"
    ],
    "brain": [
      "Focus"
    ]
  },
  {
    "code": "EX006",
    "name": "SkiErg Intervals",
    "family": "SkiErg",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 5,
    "equipment": "SkiErg",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Pull",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Back"
    ],
    "body": [
      "Endurance",
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX005",
    "name": "RowErg Technique Row",
    "family": "RowErg",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 6,
    "equipment": "RowErg",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Pull",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Back"
    ],
    "body": [
      "Endurance",
      "Coordination"
    ],
    "brain": [
      "Focus"
    ]
  },
  {
    "code": "EX007",
    "name": "RowErg Intervals",
    "family": "RowErg",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 7,
    "equipment": "RowErg",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Pull",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Back"
    ],
    "body": [
      "Endurance",
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX008",
    "name": "Light Sled Push",
    "family": "Sled Push",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 8,
    "equipment": "Sled",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX009",
    "name": "Heavy Sled Push",
    "family": "Sled Push",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 9,
    "equipment": "Sled",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX010",
    "name": "Race-Load Sled Push after Run",
    "family": "Sled Push",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 10,
    "equipment": "Sled",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX011",
    "name": "Light Sled Pull",
    "family": "Sled Pull",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 11,
    "equipment": "Sled",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Back",
      "Legs"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX012",
    "name": "Heavy Sled Pull",
    "family": "Sled Pull",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 12,
    "equipment": "Sled",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Back",
      "Legs"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX013",
    "name": "Bodyweight Walking Lunge",
    "family": "Lunge",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 13,
    "equipment": "Bodyweight",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Lunge",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Coordination",
      "Mobility"
    ],
    "brain": []
  },
  {
    "code": "EX014",
    "name": "Sandbag Walking Lunge",
    "family": "Lunge",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 14,
    "equipment": "Sandbag",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Lunge",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX015",
    "name": "Race-Pace Sandbag Lunge",
    "family": "Lunge",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 15,
    "equipment": "Sandbag",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Lunge",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX016",
    "name": "Farmer Carry Light",
    "family": "Farmer Carry",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 16,
    "equipment": "Kettlebell / Dumbbell",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Full Body",
      "Core"
    ],
    "body": [
      "Strength",
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX017",
    "name": "Farmer Carry Heavy",
    "family": "Farmer Carry",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 17,
    "equipment": "Kettlebell / Dumbbell",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Full Body",
      "Core"
    ],
    "body": [
      "Strength",
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX018",
    "name": "Race-Pace Farmer Carry",
    "family": "Farmer Carry",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 18,
    "equipment": "Kettlebell / Dumbbell",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Full Body",
      "Core"
    ],
    "body": [
      "Strength",
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX019",
    "name": "Walking Farmer Carry with Direction Cues",
    "family": "Farmer Carry",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 19,
    "equipment": "Kettlebell / Dumbbell",
    "intensity": 5,
    "complexity": 5,
    "impact": "medium",
    "movement": "Carry",
    "modality": "Strength",
    "regions": [
      "Full Body",
      "Core"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Coordination"
    ],
    "brain": [
      "Reaction",
      "Cognitive Flexibility",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX020",
    "name": "Sumo Squat",
    "family": "Squat",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 20,
    "equipment": "Bodyweight",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Mobility"
    ],
    "brain": []
  },
  {
    "code": "EX021",
    "name": "Squat",
    "family": "Squat",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 21,
    "equipment": "Bodyweight",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Mobility"
    ],
    "brain": []
  },
  {
    "code": "EX022",
    "name": "Wall Ball",
    "family": "Squat",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 22,
    "equipment": "Wall Ball",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Squat",
    "modality": "Power",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Coordination"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX023",
    "name": "Burpee Step-Back",
    "family": "Burpee",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 23,
    "equipment": "Bodyweight",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Jump",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Chest"
    ],
    "body": [
      "Endurance",
      "Coordination",
      "Mobility"
    ],
    "brain": []
  },
  {
    "code": "EX024",
    "name": "Burpee",
    "family": "Burpee",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 24,
    "equipment": "Bodyweight",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Jump",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Chest"
    ],
    "body": [
      "Endurance",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX025",
    "name": "Burpee Broad Jump",
    "family": "Burpee",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 25,
    "equipment": "Bodyweight",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Jump",
    "modality": "Plyometric",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Speed",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX026",
    "name": "Kettlebell Deadlift",
    "family": "Deadlift / Hinge",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 26,
    "equipment": "Kettlebell",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX027",
    "name": "Barbell Deadlift",
    "family": "Deadlift / Hinge",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 27,
    "equipment": "Barbell",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Back"
    ],
    "body": [
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX028",
    "name": "Kettlebell Swing",
    "family": "Kettlebell Swing",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 28,
    "equipment": "Kettlebell",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Power",
    "regions": [
      "Glutes",
      "Back"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Speed",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX029",
    "name": "TRX Row",
    "family": "Horizontal Pull",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 29,
    "equipment": "TRX",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Pull",
    "modality": "Strength",
    "regions": [
      "Back",
      "Arms"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX054",
    "name": "Dumbbell Bent-Over Row",
    "family": "Horizontal Pull",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 30,
    "equipment": "Dumbbell",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Pull",
    "modality": "Strength",
    "regions": [
      "Back",
      "Arms"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX030",
    "name": "Beyond Power Cable Row",
    "family": "Horizontal Pull",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 31,
    "equipment": "Beyond Power Electric Cable",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Pull",
    "modality": "Strength",
    "regions": [
      "Back",
      "Arms"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX055",
    "name": "Single-Arm Dumbbell Row",
    "family": "Horizontal Pull",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 32,
    "equipment": "Dumbbell",
    "intensity": 4,
    "complexity": 3,
    "impact": "low",
    "movement": "Pull",
    "modality": "Strength",
    "regions": [
      "Back",
      "Arms"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX031",
    "name": "Step-Up",
    "family": "Step-Up",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 33,
    "equipment": "Plyo Box",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Lunge",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX032",
    "name": "Weighted Step-Up",
    "family": "Step-Up",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 34,
    "equipment": "Plyo Box",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Lunge",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX033",
    "name": "Box Jump",
    "family": "Jump",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 35,
    "equipment": "Plyo Box",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Jump",
    "modality": "Plyometric",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX034",
    "name": "Balance Board Stand",
    "family": "Balance",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 36,
    "equipment": "Balance Board",
    "intensity": 2,
    "complexity": 2,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Core",
      "Legs"
    ],
    "body": [
      "Coordination"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX035",
    "name": "Single-Leg Balance Pad",
    "family": "Balance",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 37,
    "equipment": "Balance Pad",
    "intensity": 2,
    "complexity": 2,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Coordination"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX036",
    "name": "Single-Leg Reach on Balance Board",
    "family": "Balance",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 38,
    "equipment": "Balance Board",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Coordination"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX037",
    "name": "Assault Bike Easy Ride",
    "family": "Assault Bike",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 39,
    "equipment": "Assault Bike",
    "intensity": 2,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX038",
    "name": "Assault Bike Threshold",
    "family": "Assault Bike",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 40,
    "equipment": "Assault Bike",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX039",
    "name": "Assault Bike Sprint Intervals",
    "family": "Assault Bike",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 41,
    "equipment": "Assault Bike",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Endurance",
      "Speed"
    ],
    "brain": []
  },
  {
    "code": "EX040",
    "name": "Leg Press",
    "family": "Leg Press",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 42,
    "equipment": "Technogym Medical Leg Press",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX041",
    "name": "Jump Rope Basic",
    "family": "Jump Rope",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 43,
    "equipment": "Jump Rope",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Jump",
    "modality": "Cardio",
    "regions": [
      "Legs"
    ],
    "body": [
      "Endurance",
      "Coordination",
      "Speed"
    ],
    "brain": [
      "Focus"
    ]
  },
  {
    "code": "EX043",
    "name": "Jump Rope Alternating Foot",
    "family": "Jump Rope",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 44,
    "equipment": "Jump Rope",
    "intensity": 5,
    "complexity": 4,
    "impact": "medium",
    "movement": "Jump",
    "modality": "Cardio",
    "regions": [
      "Legs"
    ],
    "body": [
      "Endurance",
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Focus"
    ]
  },
  {
    "code": "EX042",
    "name": "Swiss Ball Hamstring Curl",
    "family": "Hamstring Curl",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 45,
    "equipment": "Swiss Ball",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX044",
    "name": "Miniband Lateral Walk",
    "family": "Hip Stability",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 46,
    "equipment": "Miniband",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Stability",
    "regions": [
      "Glutes"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX070",
    "name": "Miniband Glute Bridge",
    "family": "Hip Stability",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 47,
    "equipment": "Miniband",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX045",
    "name": "Goblet Squat",
    "family": "Loaded Squat",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 48,
    "equipment": "Kettlebell",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Mobility"
    ],
    "brain": []
  },
  {
    "code": "EX046",
    "name": "Dumbbell Front Squat",
    "family": "Loaded Squat",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 49,
    "equipment": "Dumbbell",
    "intensity": 5,
    "complexity": 3,
    "impact": "medium",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX047",
    "name": "Barbell Back Squat",
    "family": "Barbell Squat",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 50,
    "equipment": "Barbell",
    "intensity": 5,
    "complexity": 4,
    "impact": "medium",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX048",
    "name": "Dumbbell Romanian Deadlift",
    "family": "Romanian Deadlift",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 51,
    "equipment": "Dumbbell",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength",
      "Mobility"
    ],
    "brain": []
  },
  {
    "code": "EX049",
    "name": "Barbell Romanian Deadlift",
    "family": "Romanian Deadlift",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 52,
    "equipment": "Barbell",
    "intensity": 5,
    "complexity": 3,
    "impact": "medium",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength",
      "Mobility"
    ],
    "brain": []
  },
  {
    "code": "EX050",
    "name": "Dumbbell Bench Press",
    "family": "Horizontal Press",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 53,
    "equipment": "Dumbbell",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Push",
    "modality": "Strength",
    "regions": [
      "Chest",
      "Shoulders"
    ],
    "body": [
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX051",
    "name": "Barbell Bench Press",
    "family": "Horizontal Press",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 54,
    "equipment": "Barbell",
    "intensity": 5,
    "complexity": 3,
    "impact": "medium",
    "movement": "Push",
    "modality": "Strength",
    "regions": [
      "Chest",
      "Shoulders"
    ],
    "body": [
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX052",
    "name": "Dumbbell Shoulder Press",
    "family": "Vertical Press",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 55,
    "equipment": "Dumbbell",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Push",
    "modality": "Strength",
    "regions": [
      "Shoulders",
      "Arms"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX053",
    "name": "Single-Arm Cable Press",
    "family": "Vertical Press",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 56,
    "equipment": "Beyond Power Electric Cable",
    "intensity": 4,
    "complexity": 3,
    "impact": "low",
    "movement": "Push",
    "modality": "Strength",
    "regions": [
      "Shoulders",
      "Core"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX056",
    "name": "TRX Chest Press",
    "family": "Suspension Press",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 57,
    "equipment": "TRX",
    "intensity": 4,
    "complexity": 3,
    "impact": "low",
    "movement": "Push",
    "modality": "Strength",
    "regions": [
      "Chest",
      "Shoulders"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX057",
    "name": "TRX Squat",
    "family": "Suspension Squat",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 58,
    "equipment": "TRX",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Mobility",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX058",
    "name": "TRX Reverse Lunge",
    "family": "Suspension Lunge",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 59,
    "equipment": "TRX",
    "intensity": 3,
    "complexity": 3,
    "impact": "low",
    "movement": "Lunge",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Mobility",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX059",
    "name": "Push-Up",
    "family": "Push-Up",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 60,
    "equipment": "Bodyweight",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Push",
    "modality": "Strength",
    "regions": [
      "Chest",
      "Shoulders"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX060",
    "name": "Push-Up to Shoulder Tap",
    "family": "Push-Up",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 61,
    "equipment": "Bodyweight",
    "intensity": 5,
    "complexity": 4,
    "impact": "medium",
    "movement": "Push",
    "modality": "Strength",
    "regions": [
      "Chest",
      "Core"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX061",
    "name": "Forearm Plank",
    "family": "Plank",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 62,
    "equipment": "Bodyweight",
    "intensity": 3,
    "complexity": 1,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Core"
    ],
    "body": [
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX062",
    "name": "Plank Shoulder Tap",
    "family": "Plank",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 63,
    "equipment": "Bodyweight",
    "intensity": 4,
    "complexity": 3,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Core",
      "Shoulders"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX063",
    "name": "Plank with Reaction Tap",
    "family": "Plank",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 64,
    "equipment": "Bodyweight",
    "intensity": 5,
    "complexity": 5,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Core",
      "Shoulders"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": [
      "Reaction",
      "Focus"
    ]
  },
  {
    "code": "EX064",
    "name": "Dead Bug",
    "family": "Core Control",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 65,
    "equipment": "Bodyweight",
    "intensity": 2,
    "complexity": 2,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Motor Control",
    "regions": [
      "Core"
    ],
    "body": [
      "Coordination",
      "Mobility"
    ],
    "brain": [
      "Focus"
    ]
  },
  {
    "code": "EX065",
    "name": "Dead Bug with Alternating Cue",
    "family": "Core Control",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 66,
    "equipment": "Bodyweight",
    "intensity": 3,
    "complexity": 4,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Motor Control",
    "regions": [
      "Core"
    ],
    "body": [
      "Coordination"
    ],
    "brain": [
      "Reaction",
      "Cognitive Flexibility",
      "Focus"
    ]
  },
  {
    "code": "EX066",
    "name": "Glute Bridge",
    "family": "Hip Extension",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 67,
    "equipment": "Bodyweight",
    "intensity": 3,
    "complexity": 1,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength",
      "Mobility"
    ],
    "brain": []
  },
  {
    "code": "EX067",
    "name": "Single-Leg Glute Bridge",
    "family": "Hip Extension",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 68,
    "equipment": "Bodyweight",
    "intensity": 4,
    "complexity": 3,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX068",
    "name": "Swiss Ball Plank",
    "family": "Unstable Plank",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 69,
    "equipment": "Swiss Ball",
    "intensity": 3,
    "complexity": 4,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Core",
      "Shoulders"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX069",
    "name": "Swiss Ball Stir-the-Pot",
    "family": "Unstable Plank",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 70,
    "equipment": "Swiss Ball",
    "intensity": 5,
    "complexity": 5,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Core",
      "Shoulders"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX071",
    "name": "Resistance Band Pallof Press",
    "family": "Anti-Rotation",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 71,
    "equipment": "Resistance Band",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Core"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX072",
    "name": "Cable Pallof Press with Step",
    "family": "Anti-Rotation",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 72,
    "equipment": "Beyond Power Electric Cable",
    "intensity": 4,
    "complexity": 4,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Stability",
    "regions": [
      "Core"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX073",
    "name": "Medicine Ball Chest Pass",
    "family": "Medicine Ball Throw",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 73,
    "equipment": "Medicine Ball",
    "intensity": 5,
    "complexity": 3,
    "impact": "medium",
    "movement": "Push",
    "modality": "Power",
    "regions": [
      "Chest",
      "Shoulders"
    ],
    "body": [
      "Strength",
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX075",
    "name": "Medicine Ball Rotational Throw",
    "family": "Medicine Ball Throw",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 74,
    "equipment": "Medicine Ball",
    "intensity": 5,
    "complexity": 4,
    "impact": "medium",
    "movement": "Rotation",
    "modality": "Power",
    "regions": [
      "Full Body",
      "Core"
    ],
    "body": [
      "Strength",
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX074",
    "name": "Medicine Ball Slam",
    "family": "Medicine Ball Slam",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 75,
    "equipment": "Medicine Ball",
    "intensity": 5,
    "complexity": 3,
    "impact": "medium",
    "movement": "Hinge",
    "modality": "Power",
    "regions": [
      "Full Body",
      "Core"
    ],
    "body": [
      "Strength",
      "Endurance",
      "Speed",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX076",
    "name": "Lateral Shuffle",
    "family": "Lateral Locomotion",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 76,
    "equipment": "Bodyweight",
    "intensity": 5,
    "complexity": 3,
    "impact": "medium",
    "movement": "Locomotion",
    "modality": "Agility",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX077",
    "name": "Reactive Lateral Shuffle",
    "family": "Lateral Locomotion",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 77,
    "equipment": "Bodyweight",
    "intensity": 5,
    "complexity": 5,
    "impact": "medium",
    "movement": "Locomotion",
    "modality": "Agility",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Reaction",
      "Cognitive Flexibility",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX078",
    "name": "Forward-Backward Line Hops",
    "family": "Plyometric Footwork",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 78,
    "equipment": "Bodyweight",
    "intensity": 5,
    "complexity": 3,
    "impact": "high",
    "movement": "Jump",
    "modality": "Plyometric",
    "regions": [
      "Legs"
    ],
    "body": [
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX079",
    "name": "Reactive Line Hops",
    "family": "Plyometric Footwork",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 79,
    "equipment": "Bodyweight",
    "intensity": 5,
    "complexity": 5,
    "impact": "high",
    "movement": "Jump",
    "modality": "Plyometric",
    "regions": [
      "Legs"
    ],
    "body": [
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Reaction",
      "Cognitive Flexibility",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX080",
    "name": "Single-Leg Romanian Deadlift",
    "family": "Single-Leg Hinge",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 80,
    "equipment": "Bodyweight",
    "intensity": 3,
    "complexity": 3,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength",
      "Coordination",
      "Mobility"
    ],
    "brain": [
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX081",
    "name": "Dumbbell Single-Leg Romanian Deadlift",
    "family": "Single-Leg Hinge",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 81,
    "equipment": "Dumbbell",
    "intensity": 4,
    "complexity": 4,
    "impact": "low",
    "movement": "Hinge",
    "modality": "Strength",
    "regions": [
      "Glutes",
      "Legs"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": [
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX082",
    "name": "Calf Raise",
    "family": "Calf Raise",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 82,
    "equipment": "Bodyweight",
    "intensity": 3,
    "complexity": 1,
    "impact": "low",
    "movement": "Jump",
    "modality": "Strength",
    "regions": [
      "Legs"
    ],
    "body": [
      "Strength"
    ],
    "brain": []
  },
  {
    "code": "EX083",
    "name": "Bike Easy Ride",
    "family": "Bike",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 83,
    "equipment": "Bike",
    "intensity": 2,
    "complexity": 1,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Legs"
    ],
    "body": [
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX084",
    "name": "Bike Threshold Intervals",
    "family": "Bike",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 84,
    "equipment": "Bike",
    "intensity": 5,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Endurance"
    ],
    "brain": []
  },
  {
    "code": "EX085",
    "name": "Spinning Bike Cadence Ride",
    "family": "Spinning Bike",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 85,
    "equipment": "Spinning Bike",
    "intensity": 4,
    "complexity": 2,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Endurance",
      "Speed"
    ],
    "brain": [
      "Focus"
    ]
  },
  {
    "code": "EX086",
    "name": "Spinning Bike Cadence Changes",
    "family": "Spinning Bike",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 86,
    "equipment": "Spinning Bike",
    "intensity": 5,
    "complexity": 4,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Cardio",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Endurance",
      "Speed",
      "Coordination"
    ],
    "brain": [
      "Reaction",
      "Cognitive Flexibility",
      "Focus"
    ]
  },
  {
    "code": "EX087",
    "name": "Colorunner",
    "family": "ICAROS Guardian",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 87,
    "equipment": "ICAROS Guardian",
    "intensity": 2,
    "complexity": 1,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Physio-Cognitive",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Coordination"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation",
      "Reaction"
    ]
  },
  {
    "code": "EX088",
    "name": "Biathlon",
    "family": "ICAROS Guardian",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 88,
    "equipment": "ICAROS Guardian",
    "intensity": 3,
    "complexity": 3,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Physio-Cognitive",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation",
      "Reaction"
    ]
  },
  {
    "code": "EX089",
    "name": "Arrow Flow Flip",
    "family": "ICAROS Guardian",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 89,
    "equipment": "ICAROS Guardian",
    "intensity": 3,
    "complexity": 2,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Physio-Cognitive",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Coordination",
      "Speed"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation",
      "Reaction"
    ]
  },
  {
    "code": "EX090",
    "name": "Brain Boxing",
    "family": "ICAROS Guardian",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 90,
    "equipment": "ICAROS Guardian",
    "intensity": 3,
    "complexity": 3,
    "impact": "low",
    "movement": "Core Stability",
    "modality": "Physio-Cognitive",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Coordination",
      "Speed"
    ],
    "brain": [
      "Focus",
      "Perception/Orientation",
      "Reaction",
      "Cognitive Flexibility"
    ]
  },
  {
    "code": "EX091",
    "name": "Predator & Prey",
    "family": "ICAROS Guardian",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 91,
    "equipment": "ICAROS Guardian",
    "intensity": 5,
    "complexity": 2,
    "impact": "medium",
    "movement": "Core Stability",
    "modality": "Physio-Cognitive",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Coordination",
      "Speed",
      "Endurance"
    ],
    "brain": [
      "Focus"
    ]
  },
  {
    "code": "EX092",
    "name": "100 Punches",
    "family": "XR Fighter",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 92,
    "equipment": "XR Fighter",
    "intensity": 4,
    "complexity": 2,
    "impact": "medium",
    "movement": "Rotation",
    "modality": "Physio-Cognitive",
    "regions": [
      "Upper Body",
      "Shoulders"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Strength"
    ],
    "brain": [
      "Reaction",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX093",
    "name": "100 Punches incl. Kicks",
    "family": "XR Fighter",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 93,
    "equipment": "XR Fighter",
    "intensity": 4,
    "complexity": 3,
    "impact": "medium",
    "movement": "Rotation",
    "modality": "Physio-Cognitive",
    "regions": [
      "Full Body",
      "Core"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Strength"
    ],
    "brain": [
      "Reaction",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX094",
    "name": "3 Min Punches incl. Kicks",
    "family": "XR Fighter",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 94,
    "equipment": "XR Fighter",
    "intensity": 5,
    "complexity": 3,
    "impact": "medium",
    "movement": "Rotation",
    "modality": "Physio-Cognitive",
    "regions": [
      "Full Body",
      "Core"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Strength"
    ],
    "brain": [
      "Reaction",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX095",
    "name": "45s Round",
    "family": "ExerCube SpeedCage",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 95,
    "equipment": "ExerCube",
    "intensity": 5,
    "complexity": 3,
    "impact": "medium",
    "movement": "Locomotion",
    "modality": "Physio-Cognitive",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Mobility"
    ],
    "brain": [
      "Memory",
      "Reaction",
      "Cognitive Flexibility",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX096",
    "name": "Pyramid",
    "family": "ExerCube SpeedCage",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 96,
    "equipment": "ExerCube",
    "intensity": 5,
    "complexity": 4,
    "impact": "medium",
    "movement": "Locomotion",
    "modality": "Physio-Cognitive",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Mobility"
    ],
    "brain": [
      "Memory",
      "Reaction",
      "Cognitive Flexibility",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX097",
    "name": "Competition Mode",
    "family": "ExerCube SpeedCage",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 97,
    "equipment": "ExerCube",
    "intensity": 5,
    "complexity": 5,
    "impact": "high",
    "movement": "Locomotion",
    "modality": "Physio-Cognitive",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Mobility"
    ],
    "brain": [
      "Memory",
      "Reaction",
      "Cognitive Flexibility",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX098",
    "name": "FIBO Racer",
    "family": "ExerCube Racer",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 98,
    "equipment": "ExerCube",
    "intensity": 4,
    "complexity": 3,
    "impact": "medium",
    "movement": "Locomotion",
    "modality": "Physio-Cognitive",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Mobility"
    ],
    "brain": [
      "Memory",
      "Reaction",
      "Cognitive Flexibility",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX099",
    "name": "Upper Body Racer",
    "family": "ExerCube Racer",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 99,
    "equipment": "ExerCube",
    "intensity": 5,
    "complexity": 4,
    "impact": "medium",
    "movement": "Locomotion",
    "modality": "Physio-Cognitive",
    "regions": [
      "Full Body",
      "Upper Body"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Mobility"
    ],
    "brain": [
      "Memory",
      "Reaction",
      "Cognitive Flexibility",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX100",
    "name": "Dual Flow Racer",
    "family": "ExerCube Racer",
    "level": "mastery",
    "rarity": "legendary",
    "points": 50,
    "no": 100,
    "equipment": "ExerCube",
    "intensity": 5,
    "complexity": 4,
    "impact": "medium",
    "movement": "Locomotion",
    "modality": "Physio-Cognitive",
    "regions": [
      "Full Body",
      "Legs"
    ],
    "body": [
      "Coordination",
      "Endurance",
      "Speed",
      "Mobility"
    ],
    "brain": [
      "Memory",
      "Reaction",
      "Cognitive Flexibility",
      "Focus",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX101",
    "name": "Beyond Power Cable Squat",
    "family": "Cable Squat",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 101,
    "equipment": "Beyond Power Electric Cable",
    "intensity": 4,
    "complexity": 3,
    "impact": "low",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX102",
    "name": "Beyond Power Cable Rotation",
    "family": "Cable Rotation",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 102,
    "equipment": "Beyond Power Electric Cable",
    "intensity": 4,
    "complexity": 3,
    "impact": "low",
    "movement": "Rotation",
    "modality": "Strength",
    "regions": [
      "Core"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": []
  },
  {
    "code": "EX103",
    "name": "Beyond Power Reactive Cable Rotation",
    "family": "Cable Rotation",
    "level": "progress",
    "rarity": "rare",
    "points": 30,
    "no": 103,
    "equipment": "Beyond Power Electric Cable",
    "intensity": 5,
    "complexity": 5,
    "impact": "low",
    "movement": "Rotation",
    "modality": "Power",
    "regions": [
      "Core"
    ],
    "body": [
      "Strength",
      "Coordination",
      "Speed"
    ],
    "brain": [
      "Reaction",
      "Cognitive Flexibility",
      "Perception/Orientation"
    ]
  },
  {
    "code": "EX104",
    "name": "Bodyweight Mobility Flow",
    "family": "Mobility Flow",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 104,
    "equipment": "Bodyweight",
    "intensity": 2,
    "complexity": 3,
    "impact": "low",
    "movement": "Locomotion",
    "modality": "Mobility",
    "regions": [
      "Full Body"
    ],
    "body": [
      "Mobility",
      "Coordination"
    ],
    "brain": [
      "Focus"
    ]
  },
  {
    "code": "EX105",
    "name": "Reaction-Based Squat Game",
    "family": "Reactive Squat",
    "level": "foundation",
    "rarity": "common",
    "points": 20,
    "no": 105,
    "equipment": "Bodyweight",
    "intensity": 4,
    "complexity": 4,
    "impact": "low",
    "movement": "Squat",
    "modality": "Strength",
    "regions": [
      "Legs",
      "Glutes"
    ],
    "body": [
      "Strength",
      "Coordination"
    ],
    "brain": [
      "Reaction",
      "Focus",
      "Cognitive Flexibility"
    ]
  }
];

export const TOTAL_CARDS = CARDS.length;
