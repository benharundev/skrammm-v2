/**
 * Dev seed — Piala Agong 2026 tournament with 9 teams, 40 Kelantan players,
 * 20 matches (16 completed group stage + 4 QF scheduled), and match events
 * for Kelantan's 3 completed matches.
 *
 * Dev accounts:
 *   organizer@skrammm.dev  — organizer portal
 *   tm@skrammm.dev         — Kelantan team manager
 *   player@skrammm.dev     — Asyraf Zulkiflee (Kelantan hooker)
 *
 * Run: pnpm db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── UUID helpers ────────────────────────────────────────────────────────────

function pid(n: number) {
  return `01970000-0000-7000-8000-${String(100 + n).padStart(12, "0")}`;
}
function mid(n: number) {
  return `01970000-0000-7000-8000-${String(200 + n).padStart(12, "0")}`;
}
function eid(n: number) {
  return `01970000-0000-7000-8000-${String(300 + n).padStart(12, "0")}`;
}
function lid(n: number) {
  return `01970000-0000-7000-8000-${String(400 + n).padStart(12, "0")}`;
}

// ─── Fixed IDs ────────────────────────────────────────────────────────────────

const IDs = {
  users: {
    organizer: "01970000-0000-7000-8000-000000000001",
    tm:        "01970000-0000-7000-8000-000000000002",
    player:    "01970000-0000-7000-8000-000000000003",
  },
  tournament: "01970000-0000-7000-8000-000000000010",
  teams: {
    pdrm:           "01970000-0000-7000-8000-000000000020",
    terengganu:     "01970000-0000-7000-8000-000000000021",
    kualaLumpur:    "01970000-0000-7000-8000-000000000022",
    kelantan:       "01970000-0000-7000-8000-000000000023",
    johor:          "01970000-0000-7000-8000-000000000024",
    putrajaya:      "01970000-0000-7000-8000-000000000025",
    negeriSembilan: "01970000-0000-7000-8000-000000000026",
    kedah:          "01970000-0000-7000-8000-000000000027",
    atm:            "01970000-0000-7000-8000-000000000028",
  },
  teamStaff: "01970000-0000-7000-8000-000000000060",
};

// ─── Kelantan players (index → { name, jersey?, position? }) ─────────────────

type PlayerDef = { name: string; jersey?: number; position?: string };

const PLAYERS: PlayerDef[] = [
  { name: "Raja Hilman Hafiz",            jersey: 1 },
  { name: "Muhd Nafis",                   jersey: 2, position: "Fly Half" },
  { name: "Afif Akmal",                               position: "Loosehead Prop" },
  { name: "Muhd Syahmi" },
  { name: "Muhd Zulhisham" },
  { name: "Muhd Azwan Zuwairi",                       position: "Left Centre" },
  { name: "Mohd Syarif Saiful Aazwan",                position: "Left Flanker" },
  { name: "Mohd Shobrey",                             position: "Left Lock" },
  { name: "Asrin Azman",                              position: "Full Back" },
  { name: "Wan Anas Afnan" },
  { name: "Mohd Shah Izwan",                          position: "Right Flanker" },
  { name: "Muhd Aliff Haiqal",                        position: "Right Lock" },
  { name: "Mohd Sofianshah",                          position: "Loosehead Prop" },
  { name: "Muhd Fathir",                              position: "Tighthead Prop" },
  { name: "Muhd Faris Haikal",                        position: "Tighthead Prop" },
  { name: "Muhd Zul Hafeez",                          position: "Right Lock" },
  { name: "Asyraf Zulkiflee",                         position: "Hooker" },
  { name: "Ahmad Ridha",                              position: "Tighthead Prop" },
  { name: "Muhd Aidil Hakim",                         position: "Loosehead Prop" },
  { name: "Razali Ramlan",                            position: "Scrum Half" },
  { name: "Wan Azley" },
  { name: "Ammaar Zamri",                             position: "Right Wing" },
  { name: "Muhd Hafizie",                             position: "Left Flanker" },
  { name: "Muhd Safiy",                               position: "Full Back" },
  { name: "Mohd Aiman Johari" },
  { name: "Muhd Tajuddin",                            position: "Left Wing" },
  { name: "Mohd Khairul Abdillah" },
  { name: "Muhd Alif Aiman",                          position: "Left Wing" },
  { name: "Muhd Alif Haiqal" },
  { name: "Adam Ariff",                               position: "Right Wing" },
  { name: "Muhd Zakaria" },
  { name: "Mohd Nur Azri" },
  { name: "Pio Dakili",                               position: "Left Centre" },
  { name: "Ratu Etuate Veidreyaki",                   position: "Right Centre" },
  { name: "Eliki Sigakeudra Qasenikoro",              position: "Number Eight" },
  { name: "Jona Sadravesi" },
  { name: "Muhd Haziq Iman" },
  { name: "Mohd Ikwan Akmal" },
  { name: "Mohd Nazreen Fitri",                       position: "Fly Half" },
  { name: "Muhd Firzuan",                             position: "Loosehead Prop" },
];

// Name → player index lookup (includes common spelling variants from match sheets)
const PLAYER_IDX: Record<string, number> = {};
PLAYERS.forEach((p, i) => { PLAYER_IDX[p.name] = i; });
// Spelling variants found in match sheets
PLAYER_IDX["Muhd Fathur"] = 13; // typo for Muhd Fathir

// ─── Match lineup data ────────────────────────────────────────────────────────

// Each entry: [shirtNumber, playerName, isPlaying]
type LineupRow = [number, string, boolean];

const LINEUP_M01: LineupRow[] = [
  [1,  "Mohd Sofianshah",           true],
  [2,  "Asyraf Zulkiflee",          true],
  [3,  "Muhd Faris Haikal",         true],
  [4,  "Mohd Shobrey",              true],
  [5,  "Muhd Zul Hafeez",           true],
  [6,  "Mohd Syarif Saiful Aazwan", true],
  [7,  "Mohd Shah Izwan",           true],
  [8,  "Eliki Sigakeudra Qasenikoro", true],
  [9,  "Razali Ramlan",             true],
  [10, "Muhd Nafis",                true],
  [11, "Muhd Alif Aiman",           true],
  [12, "Muhd Azwan Zuwairi",        true],
  [13, "Ratu Etuate Veidreyaki",    true],
  [14, "Ammaar Zamri",              true],
  [15, "Asrin Azman",               true],
  [16, "Afif Akmal",                true],
  [17, "Muhd Fathir",               true],
  [18, "Mohd Aiman Johari",         true],
  [19, "Muhd Aliff Haiqal",         true],
  [20, "Muhd Syahmi",               true],
  // 21-23 not playing — omit from lineup (isStarter=false, wasPresent=false)
];

const LINEUP_M06: LineupRow[] = [
  [1,  "Muhd Firzuan",              true],
  [2,  "Afif Akmal",                true],
  [3,  "Muhd Aidil Hakim",          true],
  [4,  "Mohd Syarif Saiful Aazwan", true],
  [5,  "Muhd Aliff Haiqal",         true],
  [6,  "Muhd Hafizie",              true],
  [7,  "Mohd Shah Izwan",           true],
  [8,  "Eliki Sigakeudra Qasenikoro", true],
  [9,  "Razali Ramlan",             true],
  [10, "Muhd Nafis",                true],
  [11, "Ammaar Zamri",              true],
  [12, "Pio Dakili",                true],
  [13, "Ratu Etuate Veidreyaki",    true],
  [14, "Adam Ariff",                true],
  [15, "Muhd Safiy",                true],
  [16, "Mohd Sofianshah",           true],
  [17, "Muhd Fathir",               true],
  [18, "Raja Hilman Hafiz",         true],
  [19, "Muhd Zakaria",              true],
  [20, "Mohd Shobrey",              true],
];

const LINEUP_M20: LineupRow[] = [
  [1,  "Mohd Sofianshah",              true],
  [2,  "Asyraf Zulkiflee",             true],
  [3,  "Muhd Faris Haikal",            true],
  [4,  "Mohd Shobrey",                 true],
  [5,  "Muhd Zul Hafeez",              true],
  [6,  "Mohd Syarif Saiful Aazwan",    true],
  [7,  "Mohd Shah Izwan",              true],
  [8,  "Eliki Sigakeudra Qasenikoro",  true],
  [9,  "Razali Ramlan",                true],
  [10, "Muhd Nafis",                   true],
  [11, "Muhd Alif Aiman",              true],
  [12, "Muhd Azwan Zuwairi",           true],
  [13, "Ratu Etuate Veidreyaki",       true],
  [14, "Ammaar Zamri",                 true],
  [15, "Asrin Azman",                  true],
  [16, "Afif Akmal",                   true],
  [17, "Muhd Fathur",                  true],
  [18, "Mohd Aiman Johari",            true],
  [19, "Muhd Aliff Haiqal",            true],
  [20, "Muhd Syahmi",                  true],
];

const LINEUP_M09: LineupRow[] = [
  [1,  "Muhd Aidil Hakim",          true],
  [2,  "Asyraf Zulkiflee",          true],
  [3,  "Ahmad Ridha",               true],
  [4,  "Muhd Aliff Haiqal",         true],
  [5,  "Mohd Shobrey",              true],
  [6,  "Muhd Hafizie",              true],
  [7,  "Mohd Shah Izwan",           true],
  [8,  "Eliki Sigakeudra Qasenikoro", true],
  [9,  "Razali Ramlan",             true],
  [10, "Mohd Nazreen Fitri",        true],
  [11, "Muhd Tajuddin",             true],
  [12, "Muhd Azwan Zuwairi",        true],
  [13, "Pio Dakili",                true],
  [14, "Ratu Etuate Veidreyaki",    true],
  [15, "Asrin Azman",               true],
  [16, "Mohd Sofianshah",           true],
  [17, "Muhd Fathur",               true], // variant of Muhd Fathir
  [18, "Muhd Faris Haikal",         true],
  [19, "Mohd Syarif Saiful Aazwan", true],
  [20, "Muhd Alif Aiman",           true],
];

// ─── Match event data ─────────────────────────────────────────────────────────

// Each entry: [matchIndex, teamId, playerName, eventType, count]
// matchIndex: 0=M-01, 5=M-06, 8=M-09
type EventDef = [number, string, string, string, number];

const EVENTS: EventDef[] = [
  // M-01: Kelantan 26 vs PDRM 24
  [0, IDs.teams.kelantan, "Mohd Sofianshah",        "try",        1],
  [0, IDs.teams.kelantan, "Muhd Nafis",             "conversion", 1],
  [0, IDs.teams.kelantan, "Muhd Alif Aiman",        "try",        1],
  [0, IDs.teams.kelantan, "Muhd Azwan Zuwairi",     "penalty",    1],
  [0, IDs.teams.kelantan, "Ratu Etuate Veidreyaki", "try",        1],
  [0, IDs.teams.kelantan, "Asrin Azman",            "penalty",    2],
  [0, IDs.teams.kelantan, "Muhd Zul Hafeez",        "yellow_card",1],

  // M-06: Terengganu 45 vs Kelantan 43
  [5, IDs.teams.kelantan, "Mohd Shah Izwan",           "try",        1],
  [5, IDs.teams.kelantan, "Eliki Sigakeudra Qasenikoro","try",        1],
  [5, IDs.teams.kelantan, "Muhd Nafis",                "conversion", 5],
  [5, IDs.teams.kelantan, "Muhd Nafis",                "penalty",    1],
  [5, IDs.teams.kelantan, "Pio Dakili",                "try",        2],
  [5, IDs.teams.kelantan, "Ratu Etuate Veidreyaki",    "try",        1],
  [5, IDs.teams.kelantan, "Muhd Safiy",                "try",        1],

  // M-09: Kelantan 24 vs Kuala Lumpur 5
  [8, IDs.teams.kelantan, "Eliki Sigakeudra Qasenikoro", "try",        2],
  [8, IDs.teams.kelantan, "Mohd Nazreen Fitri",          "conversion", 3],
  [8, IDs.teams.kelantan, "Mohd Nazreen Fitri",          "penalty",    1],
  [8, IDs.teams.kelantan, "Ratu Etuate Veidreyaki",      "try",        1],
  [8, IDs.teams.kelantan, "Muhd Hafizie",                "yellow_card",1],
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding Piala Agong 2026...");

  // 1. Users
  await prisma.user.upsert({
    where:  { id: IDs.users.organizer },
    update: { email: "organizer@skrammm.dev" },
    create: { id: IDs.users.organizer, email: "organizer@skrammm.dev", name: "Dev Organizer", emailVerified: true },
  });
  await prisma.user.upsert({
    where:  { id: IDs.users.tm },
    update: {},
    create: { id: IDs.users.tm, email: "tm@skrammm.dev", name: "Kelantan Manager", emailVerified: true },
  });
  await prisma.user.upsert({
    where:  { id: IDs.users.player },
    update: {},
    create: { id: IDs.users.player, email: "player@skrammm.dev", name: "Asyraf Zulkiflee", emailVerified: true },
  });

  // 2. Teams (9) — all created by organizer
  const teamDefs = [
    { id: IDs.teams.pdrm,           name: "PDRM",            slug: "pdrm" },
    { id: IDs.teams.terengganu,     name: "Terengganu",      slug: "terengganu" },
    { id: IDs.teams.kualaLumpur,    name: "Kuala Lumpur",    slug: "kuala-lumpur" },
    { id: IDs.teams.kelantan,       name: "Kelantan",        slug: "kelantan" },
    { id: IDs.teams.johor,          name: "Johor",           slug: "johor" },
    { id: IDs.teams.putrajaya,      name: "Putrajaya",       slug: "putrajaya" },
    { id: IDs.teams.negeriSembilan, name: "Negeri Sembilan", slug: "negeri-sembilan" },
    { id: IDs.teams.kedah,          name: "Kedah",           slug: "kedah" },
    { id: IDs.teams.atm,            name: "ATM",             slug: "atm" },
  ];
  for (const t of teamDefs) {
    await prisma.team.upsert({
      where:  { id: t.id },
      update: {},
      create: { ...t, createdByUserId: IDs.users.organizer },
    });
  }

  // 3. Kelantan TeamStaff — tm@skrammm.dev is the primary manager
  await prisma.teamStaff.upsert({
    where:  { id: IDs.teamStaff },
    update: {},
    create: {
      id:               IDs.teamStaff,
      teamId:           IDs.teams.kelantan,
      userId:           IDs.users.tm,
      role:             "manager",
      isPrimaryManager: true,
    },
  });

  // 4. Tournament
  await prisma.tournament.upsert({
    where:  { id: IDs.tournament },
    update: {},
    create: {
      id:              IDs.tournament,
      code:            "pialagong26",
      slug:            "piala-agong-2026",
      name:            "Piala Agong 2026",
      organizerUserId: IDs.users.organizer,
      format:          "tiered",
      status:          "live",
      startsAt:        new Date("2026-05-09T07:30:00.000Z"),
      endsAt:          new Date("2026-06-28T10:00:00.000Z"),
    },
  });

  // 5. TournamentTeam entries (9 teams, all approved) — delete then recreate for idempotency
  await prisma.tournamentTeam.deleteMany({ where: { tournamentId: IDs.tournament } });
  await prisma.tournamentTeam.createMany({
    data: [
      { id: `01970000-0000-7000-8000-${String(50).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.kelantan,       groupLabel: "A", status: "approved" },
      { id: `01970000-0000-7000-8000-${String(51).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.pdrm,           groupLabel: "A", status: "approved" },
      { id: `01970000-0000-7000-8000-${String(52).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.terengganu,     groupLabel: "A", status: "approved" },
      { id: `01970000-0000-7000-8000-${String(53).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.kualaLumpur,    groupLabel: "A", status: "approved" },
      { id: `01970000-0000-7000-8000-${String(54).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.johor,          groupLabel: "B", status: "approved" },
      { id: `01970000-0000-7000-8000-${String(55).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.atm,            groupLabel: "B", status: "approved" },
      { id: `01970000-0000-7000-8000-${String(56).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.negeriSembilan, groupLabel: "B", status: "approved" },
      { id: `01970000-0000-7000-8000-${String(57).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.kedah,          groupLabel: "B", status: "approved" },
      { id: `01970000-0000-7000-8000-${String(58).padStart(12, "0")}`, tournamentId: IDs.tournament, teamId: IDs.teams.putrajaya,      groupLabel: "B", status: "approved" },
    ],
  });

  // 6. Kelantan players (40)
  // Asyraf Zulkiflee (index 16) is claimed by player@skrammm.dev
  for (let i = 0; i < PLAYERS.length; i++) {
    const p = PLAYERS[i]!;
    const isAshraf = i === 16;
    await prisma.player.upsert({
      where:  { id: pid(i) },
      update: {},
      create: {
        id:           pid(i),
        teamId:       IDs.teams.kelantan,
        fullName:     p.name,
        jerseyNumber: p.jersey ?? null,
        position:     p.position ?? null,
        playerIdCode: `KEL${String(i + 1).padStart(5, "0")}`,
        claimStatus:  isAshraf ? "claimed" : "unclaimed",
        userId:       isAshraf ? IDs.users.player : null,
        isMinor:      false,
      },
    });
  }

  // 7. Matches (M-01 to M-20)
  // time = 07:30 UTC = 15:30 MYT
  const matchDefs = [
    // Group A
    { i: 0,  round: "Group A",  groupLabel: "A", home: IDs.teams.kelantan,       hs: 26, as: 24, away: IDs.teams.pdrm,           date: "2026-05-09", ref: "Abdul Munim",           pitch: "Padang B, UPM Serdang",                                    status: "completed" },
    { i: 1,  round: "Group A",  groupLabel: "A", home: IDs.teams.kualaLumpur,    hs: 24, as: 25, away: IDs.teams.terengganu,      date: "2026-05-09", ref: "Muhammad Aiman Adeeb",   pitch: "Padang Astaka, Petaling Jaya",                              status: "completed" },
    { i: 4,  round: "Group A",  groupLabel: "A", home: IDs.teams.pdrm,           hs: 45, as: 19, away: IDs.teams.kualaLumpur,     date: "2026-05-16", ref: "Zulfarhan",              pitch: "PULAPOL, Kuala Lumpur",                                     status: "completed" },
    { i: 5,  round: "Group A",  groupLabel: "A", home: IDs.teams.terengganu,     hs: 45, as: 43, away: IDs.teams.kelantan,        date: "2026-05-16", ref: "Fareez Ashraf",          pitch: "Stadium Ragbi Tengku Muhammad Ismail, Kuala Terengganu",    status: "completed" },
    { i: 8,  round: "Group A",  groupLabel: "A", home: IDs.teams.kelantan,       hs: 24, as: 5,  away: IDs.teams.kualaLumpur,     date: "2026-05-23", ref: "Syed Amirul Haziq",      pitch: "Padang B, UPM Serdang",                                    status: "completed" },
    { i: 11, round: "Group A",  groupLabel: "A", home: IDs.teams.pdrm,           hs: 25, as: 26, away: IDs.teams.terengganu,      date: "2026-05-30", ref: "Mohd Noor Jefri",        pitch: "PULAPOL, Kuala Lumpur",                                    status: "completed" },
    // Group B
    { i: 2,  round: "Group B",  groupLabel: "B", home: IDs.teams.johor,          hs: 45, as: 5,  away: IDs.teams.putrajaya,       date: "2026-05-09", ref: "Muhammad Zainuddin",     pitch: "Stadium Ragbi Johor, Mount Austin",                         status: "completed" },
    { i: 3,  round: "Group B",  groupLabel: "B", home: IDs.teams.negeriSembilan, hs: 26, as: 15, away: IDs.teams.kedah,           date: "2026-05-09", ref: "Zulfarhan",              pitch: "Padang B, Universiti Malaya",                               status: "completed" },
    { i: 6,  round: "Group B",  groupLabel: "B", home: IDs.teams.atm,            hs: 28, as: 34, away: IDs.teams.johor,           date: "2026-05-16", ref: "Mat Nazri",              pitch: "Stadium TUDM, Subang",                                     status: "completed" },
    { i: 7,  round: "Group B",  groupLabel: "B", home: IDs.teams.negeriSembilan, hs: 24, as: 22, away: IDs.teams.putrajaya,       date: "2026-05-16", ref: "Abdul Munim",            pitch: "Georgian Green, Seremban",                                 status: "completed" },
    { i: 9,  round: "Group B",  groupLabel: "B", home: IDs.teams.kedah,          hs: 25, as: 40, away: IDs.teams.johor,           date: "2026-05-23", ref: "Mohd Redzuan",           pitch: "Padang C, UUM Sintok",                                     status: "completed" },
    { i: 10, round: "Group B",  groupLabel: "B", home: IDs.teams.putrajaya,      hs: 19, as: 23, away: IDs.teams.atm,             date: "2026-05-23", ref: "Muhammad Syahmi Danial", pitch: "Padang Alamanda, Putrajaya",                                status: "completed" },
    { i: 12, round: "Group B",  groupLabel: "B", home: IDs.teams.kedah,          hs: 24, as: 27, away: IDs.teams.atm,             date: "2026-05-30", ref: "Muhammad Zainuddin",     pitch: "Padang C, UUM Sintok",                                     status: "completed" },
    { i: 13, round: "Group B",  groupLabel: "B", home: IDs.teams.johor,          hs: 45, as: 21, away: IDs.teams.negeriSembilan,  date: "2026-05-31", ref: "Muhammad Aiman Adeeb",   pitch: "Stadium Pasir Gudang",                                     status: "completed" },
    // Positioning rounds
    { i: 14, round: "PL1",      groupLabel: null,     home: IDs.teams.atm,            hs: 39, as: 40, away: IDs.teams.negeriSembilan,  date: "2026-06-06", ref: "Mohd Noor Jefri",        pitch: "Stadium TUDM, Subang",                                     status: "completed" },
    { i: 15, round: "PL2",      groupLabel: null,     home: IDs.teams.putrajaya,      hs: 45, as: 32, away: IDs.teams.kedah,           date: "2026-06-06", ref: "Muhammad Aiman Adeeb",   pitch: "Padang A, UPM Serdang",                                    status: "completed" },
    // Quarter Finals (scheduled)
    { i: 16, round: "QF1",      groupLabel: null,     home: IDs.teams.terengganu,     hs: 0,  as: 0,  away: IDs.teams.putrajaya,       date: "2026-06-11", ref: "Muhammad Aiman Adeeb",   pitch: "Padang B, Universiti Malaya",                              status: "scheduled" },
    { i: 17, round: "QF2",      groupLabel: null,     home: IDs.teams.negeriSembilan, hs: 0,  as: 0,  away: IDs.teams.pdrm,            date: "2026-06-13", ref: "Muhammad Aiman Adeeb",   pitch: "Padang B, Universiti Malaya",                              status: "scheduled" },
    { i: 18, round: "QF3",      groupLabel: null,     home: IDs.teams.johor,          hs: 0,  as: 0,  away: IDs.teams.kualaLumpur,     date: "2026-06-13", ref: "Muhammad Aiman Adeeb",   pitch: "Padang B, Universiti Malaya",                              status: "scheduled" },
    { i: 19, round: "QF4",      groupLabel: null,     home: IDs.teams.kelantan,       hs: 0,  as: 0,  away: IDs.teams.atm,             date: "2026-06-13", ref: "Muhammad Aiman Adeeb",   pitch: "Padang B, Universiti Malaya",                              status: "scheduled" },
    // Semi Finals (scheduled — bracket TBD after QF results)
    { i: 20, round: "SF1",      groupLabel: null,     home: IDs.teams.johor,          hs: 0,  as: 0,  away: IDs.teams.negeriSembilan,  date: "2026-06-20", ref: "Muhammad Aiman Adeeb",   pitch: "Padang B, Universiti Malaya",                              status: "scheduled" },
    { i: 21, round: "SF2",      groupLabel: null,     home: IDs.teams.johor,          hs: 0,  as: 0,  away: IDs.teams.negeriSembilan,  date: "2026-06-20", ref: "Muhammad Aiman Adeeb",   pitch: "Padang B, Universiti Malaya",                              status: "scheduled" },
    // Third place + Final (scheduled)
    { i: 22, round: "3RD/4TH",  groupLabel: null,     home: IDs.teams.johor,          hs: 0,  as: 0,  away: IDs.teams.negeriSembilan,  date: "2026-06-28", ref: "Muhammad Aiman Adeeb",   pitch: "Padang B, Universiti Malaya",                              status: "scheduled" },
    { i: 23, round: "FINAL",    groupLabel: null,     home: IDs.teams.johor,          hs: 0,  as: 0,  away: IDs.teams.negeriSembilan,  date: "2026-06-28", ref: "Muhammad Aiman Adeeb",   pitch: "Padang B, Universiti Malaya",                              status: "scheduled" },
  ];

  for (const m of matchDefs) {
    const isCompleted = m.status === "completed";
    await prisma.match.upsert({
      where:  { id: mid(m.i) },
      update: {},
      create: {
        id:           mid(m.i),
        tournamentId: IDs.tournament,
        homeTeamId:   m.home,
        awayTeamId:   m.away,
        scheduledAt:  new Date(`${m.date}T07:30:00.000Z`),
        status:       m.status as "completed" | "scheduled",
        homeScore:    isCompleted ? m.hs : 0,
        awayScore:    isCompleted ? m.as : 0,
        round:        m.round,
        groupLabel:   m.groupLabel,
        pitch:        m.pitch,
        refereeName:  m.ref,
      },
    });
  }

  // 8. Match events (from Kelantan's match sheets, M-01 / M-06 / M-09)
  let eidIdx = 0;
  for (const [matchIdx, teamId, playerName, eventType, count] of EVENTS) {
    const playerIdx = PLAYER_IDX[playerName];
    if (playerIdx === undefined) {
      console.warn(`Unknown player: ${playerName}`);
      continue;
    }
    const playerId = pid(playerIdx);
    for (let k = 0; k < count; k++) {
      await prisma.matchEvent.upsert({
        where:  { id: eid(eidIdx) },
        update: {},
        create: {
          id:                eid(eidIdx),
          matchId:           mid(matchIdx),
          teamId,
          playerId,
          eventType:         eventType as "try" | "conversion" | "penalty" | "drop_goal" | "yellow_card" | "red_card",
          recordedByUserId:  IDs.users.organizer,
        },
      });
      eidIdx++;
    }
  }

  // 9. Match lineups (Kelantan players only, for M-01, M-06, M-09)
  const lineupSets: [number, LineupRow[]][] = [
    [0,  LINEUP_M01],
    [5,  LINEUP_M06],
    [8,  LINEUP_M09],
    [19, LINEUP_M20],
  ];

  let lidIdx = 0;
  for (const [matchIdx, rows] of lineupSets) {
    // Track which player IDs have already been added for this match
    // (prevents duplicate upsert on players who appear with different shirt numbers)
    const seenPlayers = new Set<string>();

    for (const [shirt, playerName] of rows) {
      const playerIdx = PLAYER_IDX[playerName];
      if (playerIdx === undefined) {
        console.warn(`Unknown lineup player: ${playerName}`);
        lidIdx++;
        continue;
      }
      const playerId = pid(playerIdx);
      if (seenPlayers.has(playerId)) {
        lidIdx++;
        continue; // skip duplicate (same player listed twice in sheet)
      }
      seenPlayers.add(playerId);

      await prisma.matchLineup.upsert({
        where: {
          matchId_teamId_playerId: {
            matchId:  mid(matchIdx),
            teamId:   IDs.teams.kelantan,
            playerId,
          },
        },
        update: {},
        create: {
          id:           lid(lidIdx),
          matchId:      mid(matchIdx),
          teamId:       IDs.teams.kelantan,
          playerId,
          jerseyNumber: shirt,
          isStarter:    shirt <= 15,
        },
      });
      lidIdx++;
    }
  }

  console.log("✓ Seed complete. Tournament code: pialagong26");
  console.log("  Organizer: organizer@skrammm.dev");
  console.log("  TM (Kelantan): tm@skrammm.dev");
  console.log("  Player (Asyraf Zulkiflee): player@skrammm.dev");
  console.log("  Open: http://localhost:3000/pialagong26");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
