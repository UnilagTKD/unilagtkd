// Sourced from the club's Official Club Manual & Operational Handbook (2026 Issue).

export const TENETS = [
  {
    name: "Courtesy",
    ko: "Ye Ui",
    description:
      "Showing mutual respect to instructors, seniors, teammates, and opponents. It requires practicing modesty and politeness at all times.",
  },
  {
    name: "Integrity",
    ko: "Yeom Chi",
    description:
      "Discerning right from wrong and having the moral courage to stand by what is right, including strict academic honesty and clean sportsmanship.",
  },
  {
    name: "Perseverance",
    ko: "In Nae",
    description:
      "Staying dedicated through rigorous training, grueling academic schedules, and competitive setbacks. A true champion does not quit when tired.",
  },
  {
    name: "Self-Control",
    ko: "Guk Gi",
    description:
      "Maintaining complete mastery over one's emotions, impulses, and physical power, both inside and outside the ring.",
  },
  {
    name: "Indomitable Spirit",
    ko: "Baekjul Boolgool",
    description:
      "Facing overwhelming odds, superior opponents, or intense pressures with courage and an unbreakable will to succeed.",
  },
] as const;

export const TRAINING_PILLARS = [
  {
    name: "Kyorugi (Sparring)",
    description:
      "Olympic combat tactics, footwork, and point-scoring mechanics for electronic PSS environments.",
    accent: "red",
  },
  {
    name: "Poomsae (Forms)",
    description:
      "Structural synchronization: breathing control, balance, and exact geometry of WT-recognized patterns.",
    accent: "blue",
  },
  {
    name: "Ho Shin Sul (Self-Defense)",
    description:
      "Situational hazard avoidance, de-escalation, joint locks, and high-efficiency strikes.",
    accent: "blue",
  },
  {
    name: "Philosophy & Ethics",
    description:
      "Mental conditioning centered on self-mastery, humility, and academic-athletic balance.",
    accent: "red",
  },
] as const;

export const BELT_SYSTEM = [
  {
    belt: "White Belt",
    grade: "10th Geup",
    meaning: "Innocence, the beginner with no prior knowledge of Taekwondo.",
    swatch: "bg-white",
    ring: "ring-2 ring-zinc-300",
    text: "text-zinc-900",
  },
  {
    belt: "Yellow Belt",
    grade: "8th – 7th Geup",
    meaning: "Earth, the seed of Taekwondo is planted as the foundation.",
    swatch: "bg-yellow-400",
    ring: "ring-2 ring-yellow-500/40",
    text: "text-zinc-900",
  },
  {
    belt: "Blue Belt",
    grade: "6th – 5th Geup",
    meaning: "Heaven/Sky, the plant grows upward as training matures.",
    swatch: "bg-brand-blue",
    ring: "ring-2 ring-brand-blue/40",
    text: "text-white",
  },
  {
    belt: "Brown Belt",
    grade: "4th – 3rd Geup",
    meaning: "Mountain, solid, unshakeable stability and strength.",
    swatch: "bg-amber-800",
    ring: "ring-2 ring-amber-800/40",
    text: "text-white",
  },
  {
    belt: "Red Belt",
    grade: "2nd – 1st Geup",
    meaning: "Danger, significant physical power that demands caution and mental control.",
    swatch: "bg-brand-red",
    ring: "ring-2 ring-brand-red/40",
    text: "text-white",
  },
  {
    belt: "Black Belt",
    grade: "1st Dan+",
    meaning: "Maturity, mastery over fear and technique; the true beginning of the journey.",
    swatch: "bg-brand-black",
    ring: "ring-2 ring-black/40",
    text: "text-white",
  },
] as const;

export const AFFILIATIONS = [
  { short: "NTF", name: "Nigeria Taekwondo Federation", logo: "/brand/ntf-logo.png" },
  { short: "KKW", name: "Kukkiwon, World Taekwondo Headquarters" },
  { short: "WT", name: "World Taekwondo", logo: "/brand/world-taekwondo-logo.png" },
  { short: "UNILAG", name: "University of Lagos", logo: "/brand/unilag-logo.png" },
] as const;

export const CHAIN_OF_COMMAND = [
  "Grandmaster / Head Coach",
  "Assistant Coaches / Instructors",
  "Club Captains (Male & Female)",
  "Senior Belts (Black & Red)",
  "Junior Belts (Color Belts / Geup)",
] as const;

export const TRAINING_SCHEDULE = {
  days: "Mondays, Wednesdays & Fridays",
  time: "4:30 PM – 6:30 PM",
};

export const ATTENDANCE_THRESHOLDS = {
  activeMembership: 70,
  promotionalGrading: 80,
  varsityRosterPool: 90,
};

export const MEDAL_STYLES: Record<string, string> = {
  gold: "bg-yellow-100 text-yellow-800",
  silver: "bg-zinc-200 text-zinc-700",
  bronze: "bg-orange-100 text-orange-800",
};

// Placeholder bank details for the manual bank-transfer dues process.
// Replace with the club's real account details before going live.
export const BANK_DETAILS = {
  bankName: "Demo Bank Plc",
  accountName: "UNILAG Taekwondo Club",
  accountNumber: "0000000000",
  instructions:
    "Transfer your dues to the account above, using your full name and matric/staff number as the transfer narration. Then submit your payment reference below so the Treasurer can confirm it and issue your official receipt (UTC-R).",
};

export const DOJANG_ETIQUETTE = [
  "Bow (Kyong-Ye) toward the flags and mat when entering or leaving the training floor.",
  "Bow and verbally greet the Head Coach, Instructors, and Team Captains on arrival.",
  "Always bow to your training partner before and after a drill or sparring match.",
  "Never turn your back on an instructor or senior belt while they are speaking to you.",
  "To adjust your uniform or belt, turn 180 degrees away from the flags and instructors first.",
];

export const UNIFORM_RULES = [
  "The Dobok must be washed, bright white, and pressed before every session.",
  "The belt must be tied correctly, with both tails of equal length.",
  "Remove all rings, earrings, necklaces, bracelets, and fitness trackers before training.",
  "Finger and toe nails must be clipped short and filed flat.",
  "Long hair must be tied back with soft bands only (no metal or plastic clips).",
];

export const SAFETY_PROTOCOLS = [
  {
    name: "R.I.C.E.R.",
    subtitle: "Immediate first aid for sprains, strains, or contusions",
    when: "At the moment of injury, on the mat.",
    note: "This is the model most coaches were trained on. Current sports-medicine guidance (PEACE & LOVE, 2019) has replaced it, and specifically walks back the ice step - the doctor who coined RICE withdrew that recommendation in 2015. Treat R.I.C.E.R. as the vocabulary you will hear from older coaches, and PEACE & LOVE as what to actually follow.",
    steps: [
      { label: "Rest", detail: "Stop the athlete training immediately. Continuing on a fresh sprain is what turns a two-week injury into a two-month one." },
      { label: "Ice", detail: "Traditionally 15 to 20 minutes, wrapped in cloth, never straight on skin. See the PEACE card - current guidance limits this to short-term pain relief only." },
      { label: "Compression", detail: "Bandage firmly from below the injury upward. Snug, but loosen at once if there is numbness, tingling, or the skin below turns pale or blue." },
      { label: "Elevation", detail: "Raise the injured limb above heart level so gravity drains fluid away instead of letting it pool." },
      { label: "Referral", detail: "Hand the athlete to a qualified first-aider or clinician. A coach rules nothing out - only an assessment does." },
    ],
  },
  {
    name: "P.E.A.C.E.",
    subtitle: "First 24 to 72 hours after a soft-tissue injury",
    when: "From the end of the session through roughly the first three days.",
    steps: [
      { label: "Protect", detail: "Unload and restrict movement for one to three days. Let pain set the ceiling - avoid what hurts, but do not immobilise longer than needed." },
      { label: "Elevate", detail: "Keep the limb above the heart as often as practical, including while studying or sleeping." },
      { label: "Avoid anti-inflammatories", detail: "Skip ibuprofen, diclofenac and prolonged icing. Swelling is not the enemy - the inflammatory response is how the body clears damaged tissue and starts repair, and blunting it can slow healing." },
      { label: "Compress", detail: "Taping or an elastic bandage to limit swelling and internal bleeding in the first days." },
      { label: "Educate", detail: "Give the athlete a realistic timeline. Active recovery beats passive treatment, and early scans for routine sprains usually change nothing but cost money and raise anxiety." },
    ],
  },
  {
    name: "L.O.V.E.",
    subtitle: "Active rehabilitation once the acute stage passes",
    when: "From roughly day three or four until full return to training.",
    steps: [
      { label: "Load", detail: "Return to movement as soon as pain allows. Controlled mechanical stress is the signal that drives tissue to rebuild - rest beyond the acute stage weakens it." },
      { label: "Optimism", detail: "Expectation measurably changes outcome. Fear, catastrophising and low confidence predict worse recovery than the injury itself does." },
      { label: "Vascularization", detail: "Pain-free cardio a few days in - cycling, light jogging - to drive blood flow to the area and keep conditioning from collapsing." },
      { label: "Exercise", detail: "Rebuild mobility, strength and proprioception before sparring again. Balance work matters most: poor proprioception is the single biggest predictor of re-spraining an ankle." },
    ],
  },
];

// Stop-and-escalate signs. A resources page cannot triage these - they need
// a clinician the same day, not a protocol.
export const SAFETY_RED_FLAGS = [
  "Any blow to the head with confusion, memory loss, repeated vomiting, or loss of consciousness - remove from training that day, no exceptions.",
  "Visible deformity, or a joint that will not move through its normal range.",
  "Inability to bear weight or take more than a few steps on the injured leg.",
  "Numbness, pins and needles, or a limb that looks pale or blue below the injury.",
  "Pain that is severe out of proportion to the impact, or that worsens overnight instead of settling.",
];

export const CONDUCT_TIERS = [
  {
    tier: "Tier 1",
    label: "Minor Offenses",
    description:
      "Unexcused tardiness, neglected uniform hygiene, or poor Dojang/locker room conduct.",
  },
  {
    tier: "Tier 2",
    label: "Serious Offenses",
    description:
      "Disrespect toward coaches or officials, intentional over-contact in sparring, or damage to club/school assets.",
  },
  {
    tier: "Tier 3",
    label: "Gross Misconduct",
    description:
      "Violence outside sanctioned sparring, harassment or hazing, academic dishonesty, or substance abuse.",
  },
];

export const TKD_GLOSSARY = [
  {
    category: "Dojang Commands",
    terms: [
      { term: "Charyeot", meaning: "Attention" },
      { term: "Kyong-Ye", meaning: "Bow" },
      { term: "Joonbi", meaning: "Ready position" },
      { term: "Shijak", meaning: "Begin/Start" },
      { term: "Kalyeo", meaning: "Break/Stop" },
      { term: "Keuman", meaning: "Finish/End" },
    ],
  },
  {
    category: "Counting (1-10)",
    terms: [
      { term: "Hana", meaning: "One" },
      { term: "Dul", meaning: "Two" },
      { term: "Set", meaning: "Three" },
      { term: "Net", meaning: "Four" },
      { term: "Dasot", meaning: "Five" },
      { term: "Yasot", meaning: "Six" },
      { term: "Ilgop", meaning: "Seven" },
      { term: "Yodol", meaning: "Eight" },
      { term: "Ahop", meaning: "Nine" },
      { term: "Yol", meaning: "Ten" },
    ],
  },
  {
    category: "Kicks (Chagi)",
    terms: [
      { term: "Ap Chagi", meaning: "Front kick" },
      { term: "Dollyo Chagi", meaning: "Roundhouse kick" },
      { term: "Yeop Chagi", meaning: "Side kick" },
      { term: "Dwi Chagi", meaning: "Back kick" },
      { term: "Naeryeo Chagi", meaning: "Axe kick" },
      { term: "Huryeo Chagi", meaning: "Hook kick" },
      { term: "Bandal Chagi", meaning: "Crescent kick" },
      { term: "An Chagi", meaning: "Inward crescent kick" },
      { term: "Bakkat Chagi", meaning: "Outward crescent kick" },
      { term: "Deol-eo Chagi", meaning: "Push kick" },
      { term: "Twio Chagi", meaning: "Jumping kick (prefix)" },
      { term: "Isyang Dollyo Chagi", meaning: "Double roundhouse kick" },
      { term: "Dwi Huryeo Chagi", meaning: "Spinning hook kick" },
      { term: "Twimyo Yeop Chagi", meaning: "Jumping side kick" },
      { term: "Twimyo Dwi Chagi", meaning: "Jumping back kick" },
      { term: "Twimyo Dollyo Chagi", meaning: "Jumping roundhouse kick" },
      { term: "Bituro Chagi", meaning: "Twisting kick" },
      { term: "Meomchuo Chagi", meaning: "Checking/stop kick" },
      { term: "Sang Chagi", meaning: "Double kick (two kicks in one motion)" },
    ],
  },
  {
    category: "Blocks (Makgi)",
    terms: [
      { term: "Are Makgi", meaning: "Low block" },
      { term: "Eolgul Makgi", meaning: "High/face block" },
      { term: "Momtong Makgi", meaning: "Middle block" },
      { term: "Sonnal Makgi", meaning: "Knife-hand block" },
      { term: "Hecho Makgi", meaning: "Wedge block" },
      { term: "Gawi Makgi", meaning: "Scissor block" },
    ],
  },
  {
    category: "Strikes & Punches",
    terms: [
      { term: "Jireugi", meaning: "Punch" },
      { term: "Chigi", meaning: "Strike" },
      { term: "Sonnal Chigi", meaning: "Knife-hand strike" },
      { term: "Palkup Chigi", meaning: "Elbow strike" },
      { term: "Deung Jumeok", meaning: "Backfist strike" },
      { term: "Batangson", meaning: "Palm-heel strike" },
      { term: "Kihap", meaning: "Focused shout/spirit yell" },
    ],
  },
  {
    category: "Stances (Seogi)",
    terms: [
      { term: "Moa Seogi", meaning: "Closed/attention stance" },
      { term: "Ap Seogi", meaning: "Walking stance" },
      { term: "Ap Kubi", meaning: "Long/forward stance" },
      { term: "Dwit Kubi", meaning: "Back stance" },
      { term: "Juchum Seogi", meaning: "Horse-riding stance" },
      { term: "Beom Seogi", meaning: "Tiger stance" },
    ],
  },
  {
    category: "Sparring & Grading",
    terms: [
      { term: "Kyorugi", meaning: "Sparring" },
      { term: "Ho Shin Sul", meaning: "Self-defense" },
      { term: "Kyukpa", meaning: "Breaking (boards)" },
      { term: "Ilbo Daeryeon", meaning: "One-step sparring" },
      { term: "Eolgul", meaning: "Head/face (scoring zone)" },
      { term: "Momtong", meaning: "Trunk/body (scoring zone)" },
      { term: "Geup", meaning: "Colored-belt rank (Kup)" },
      { term: "Dan", meaning: "Black-belt rank" },
    ],
  },
  {
    category: "People & Places",
    terms: [
      { term: "Sabum", meaning: "Instructor" },
      { term: "Sabumnim", meaning: "Master instructor (respectful)" },
      { term: "Kyosanim", meaning: "Assistant instructor" },
      { term: "Dojang", meaning: "Training hall" },
      { term: "Dobok", meaning: "Uniform" },
      { term: "Ti (Tee)", meaning: "Belt" },
    ],
  },
  {
    category: "Poomsae Numbering (Sino-Korean)",
    terms: [
      { term: "Il", meaning: "One (used for Jang/Dan numbering)" },
      { term: "Ee", meaning: "Two" },
      { term: "Sam", meaning: "Three" },
      { term: "Sa", meaning: "Four" },
      { term: "Oh", meaning: "Five" },
      { term: "Yuk", meaning: "Six" },
      { term: "Chil", meaning: "Seven" },
      { term: "Pal", meaning: "Eight" },
      { term: "Gu", meaning: "Nine" },
      { term: "Ship", meaning: "Ten" },
    ],
  },
  {
    category: "Body Parts & Directions",
    terms: [
      { term: "Ap", meaning: "Front" },
      { term: "Dwi", meaning: "Rear/back" },
      { term: "Yop", meaning: "Side" },
      { term: "Wen", meaning: "Left" },
      { term: "Oreun", meaning: "Right" },
      { term: "Palmok", meaning: "Forearm" },
      { term: "Joomeok", meaning: "Fist" },
      { term: "Mureup", meaning: "Knee" },
    ],
  },
  {
    category: "Equipment (Jangbi)",
    terms: [
      { term: "Hogu", meaning: "Trunk/body protector" },
      { term: "Homyeon", meaning: "Head protector (headgear)" },
      { term: "Sonbo", meaning: "Hand protector (gloves)" },
      { term: "Balbo", meaning: "Foot/shin protector" },
    ],
  },
  {
    category: "Competition Calls",
    terms: [
      { term: "Kyeonggi", meaning: "Match/competition" },
      { term: "Hong", meaning: "Red (competitor/corner)" },
      { term: "Chung", meaning: "Blue (competitor/corner)" },
      { term: "Kyeshi", meaning: "Suspend (stops the clock for a 1-minute injury timeout)" },
      { term: "Gam-jeom", meaning: "Penalty (point deduction)" },
      { term: "Jeom", meaning: "Point" },
      { term: "Seungja", meaning: "Winner" },
      { term: "Pae", meaning: "Loser/defeat" },
    ],
  },
] as const;

export const HERITAGE = {
  pioneer:
    "The club's lineage traces back to the International Taekwondo Academy, Unilag (ITA Unilag), founded by Grandmaster George Ashiru, one of the pioneers of martial arts in Nigeria. As an elite master across both the International Taekwondo Federation (ITF) and World Taekwondo (WT) systems, he cross-trained his proteges in both styles, creating a versatile technical baseline.",
  jidokwan:
    "Among his foremost proteges is Grandmaster Adebola Otubushin, an 8th Dan Jidokwan and 4th Dan Kukkiwon Black Belt. Under his custody, the academy maintained its historical martial depth while integrating international rules updates, and with Taekwondo's debut as a full medal sport at the Sydney 2000 Olympic Games, the school became a dedicated, high-performance WT-style academy.",
  present:
    "To align with university structures, the legacy training entity (Unilag Taekwondo Academy) was registered as a martial arts and sports club (UNILAG Taekwondo Club) within the university's clubs and societies framework.",
};

export const PHILOSOPHY = {
  meaning: [
    { word: "Tae", meaning: "to strike or kick with the foot" },
    { word: "Kwon", meaning: "to strike with the hand or fist" },
    { word: "Do", meaning: "the way, path, or lifelong practice" },
  ],
  translation:
    "Taekwondo translates to “The Way of the Foot and the Fist,” but the word Do carries deeper meaning: a path of learning that continues long after techniques are mastered.",
  concepts: [
    {
      name: "Geukgi",
      subtitle: "Self-Overcoming",
      description:
        "The continuous battle against one's internal weaknesses, physical fatigue, academic stress, and mental fear.",
    },
    {
      name: "Hongik",
      subtitle: "Humanitarianism",
      description:
        "The requirement that martial strength must never be used for intimidation or selfish gain, but to benefit the community.",
    },
  ],
};

// Sourced from public web research (see chat for citations).
export const NIGERIA_TKD_HISTORY = {
  intro:
    "Taekwondo was introduced to Nigeria in 1975 by Aikpa Aime, a student of Grandmaster Kim Yong Tae, Korea's pioneer Taekwondo coach in Africa. Aikpa opened a Jidokwan school that year, later run by his black belts Dominic Bassey, Emmanuel Ikpeme, and Kofi Anani.",
  federation:
    "Following training brought to the Nigerian Army in 1983, instructors formed the Nigeria Taekwondo Black Belt College, which became the Nigerian Taekwondo Association, officially recognized in 1987 by the Nigerian Government and the World Taekwondo Federation. The Nigeria Taekwondo Federation (NTF), the sport's national governing body today, was founded that same year by George Ashiru, the same pioneer behind the club's own training lineage.",
};

export const KUKKIWON_CHANNEL_URL = "https://www.youtube.com/@kukkiwonpr";

// Official Kukkiwon (World Taekwondo Headquarters) Poomsae playlist.
// Linked (not embedded per-video) as the guaranteed-official source, since
// the individual cards below are NOT confirmed uploads of Kukkiwon's own
// channel (checked via YouTube oEmbed author_name on a sample: uploader is
// a third-party account, not @kukkiwonpr, regardless of what the video
// titles claim).
export const KUKKIWON_POOMSAE_PLAYLIST_ID = "PLg6Uuuz20q4VWt7J1wmtzGv-Ty_vJMok2";


// Per-form Poomsae reference videos, supplied and labelled by the club.
// NOT uploads of Kukkiwon official channel - sourced from public YouTube
// demonstrations. KUKKIWON_POOMSAE_PLAYLIST_ID above is linked separately
// as the guaranteed-official source.
// `start` = seconds to skip into the clip, where the club specified one.
// All 17 recognized Poomsae are covered: 8 Taegeuk (Geup) + 9 Yudanja (Dan).
// Taebaek was placed by elimination (sent unlabelled into the last open slot)
// rather than named by the club - worth confirming.
export const POOMSAE_VIDEOS = [
  { group: "Taegeuk (Geup)", rank: "1", name: "Taegeuk Il Jang", videoId: "WhkjRruCBTo", start: 45 },
  { group: "Taegeuk (Geup)", rank: "2", name: "Taegeuk Ee Jang", videoId: "tGlrUplKHh8" },
  { group: "Taegeuk (Geup)", rank: "3", name: "Taegeuk Sam Jang", videoId: "ksSqKt0UkWo" },
  { group: "Taegeuk (Geup)", rank: "4", name: "Taegeuk Sa Jang", videoId: "Lt917gacJho", start: 261 },
  { group: "Taegeuk (Geup)", rank: "5", name: "Taegeuk Oh Jang", videoId: "VdqNEAHWCBM" },
  { group: "Taegeuk (Geup)", rank: "6", name: "Taegeuk Yuk Jang", videoId: "jcBwWo4wN7c" },
  { group: "Taegeuk (Geup)", rank: "7", name: "Taegeuk Chil Jang", videoId: "6FUM1p6qqhQ" },
  { group: "Taegeuk (Geup)", rank: "8", name: "Taegeuk Pal Jang", videoId: "Gr_Je2ZkgkI" },
  { group: "Yudanja (Dan)", rank: "1st Dan", name: "Koryo", videoId: "mGa60JDtWmg", start: 11 },
  { group: "Yudanja (Dan)", rank: "2nd Dan", name: "Keumgang", videoId: "CRGVSOmaQaY", start: 13 },
  { group: "Yudanja (Dan)", rank: "3rd Dan", name: "Taebaek", videoId: "Q4dYdFRbE4U" },
  { group: "Yudanja (Dan)", rank: "4th Dan", name: "Pyongwon", videoId: "RB-7mBtvtZw", start: 18 },
  { group: "Yudanja (Dan)", rank: "5th Dan", name: "Sipjin", videoId: "hOZB0IESJ38", start: 11 },
  { group: "Yudanja (Dan)", rank: "6th Dan", name: "Jitae", videoId: "nur2WsN7dQw" },
  { group: "Yudanja (Dan)", rank: "7th Dan", name: "Chonkwon", videoId: "FBxCzK5c4bE" },
  { group: "Yudanja (Dan)", rank: "8th Dan", name: "Hansu", videoId: "lRp1JE7f-a8" },
  { group: "Yudanja (Dan)", rank: "9th Dan", name: "Ilyeo", videoId: "jWClKVOrqJ8" },
] as const;


export const VISION =
  "To be Africa's premier collegiate Taekwondo centre, where world-class martial arts mastery meets academic brilliance and disciplined athleticism.";

export const MISSION =
  "To deliver elite-level WT Taekwondo training and rigorous character development, empowering UNILAG student-athletes to excel in academic pursuits, master martial arts discipline, and achieve competitive excellence across the collegiate sports landscape.";
