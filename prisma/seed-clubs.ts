/**
 * Malaysian rugby club seed data — real clubs with public listing enabled.
 *
 * Sources:
 *   - COBRA RFC: cobrarugby.com / Wikipedia
 *   - Eagles RFC: borneoeagles.com
 *   - KL Tigers RFC: kltigersrfc.com / Leicester Tigers partnership page
 *   - Royal Selangor Club RFC: rsc.org.my
 *   - KL Saracens RFC: cobrarugby.com (affiliate)
 *   - Penang All Blues RFC: Malaysia Rugby Union records
 *   - Johor Barbarian RFC: MRU state affiliate records
 *   - Iskandar Pirates RFC: @iskandarpirates Instagram
 *
 * Requires the main seed (pnpm db:seed) to have run first so the
 * organizer user (01970000-0000-7000-8000-000000000001) exists.
 *
 * Run: pnpm tsx prisma/seed-clubs.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORGANIZER_ID = "01970000-0000-7000-8000-000000000001";

// dayOfWeek: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun

const CLUBS = [
  {
    id: "01970000-0000-7000-8000-000000000801",
    name: "COBRA Rugby Club",
    slug: "cobra-rugby-club",
    origin: "Petaling Jaya, Selangor",
    address: "Lot 7, Lorong Utara B, Jalan Utara, 46200 Petaling Jaya, Selangor",
    trainingGround: "Padang Astaka, Petaling Jaya",
    contactEmail: "cobrarcwebsite@gmail.com",
    logoUrl: "https://ui-avatars.com/api/?name=CO&background=003b00&color=ffba20&bold=true&size=128&length=2",
    lat: 3.1075,
    lng: 101.6284,
    description:
      "Malaysia's oldest rugby club, founded in 1967 in Petaling Jaya. Home of the Blacks (1st XV), Stings (2nd XV), COBRATS (youth) and Venom (veterans). Open to all standards of player.",
    trainingSlots: [
      { id: "01970000-0000-7000-8000-000000000901", dayOfWeek: 1, startTime: "17:30", endTime: "19:00", venue: "Padang Astaka" },
      { id: "01970000-0000-7000-8000-000000000902", dayOfWeek: 4, startTime: "17:30", endTime: "19:00", venue: "Padang Astaka" },
      { id: "01970000-0000-7000-8000-000000000903", dayOfWeek: 6, startTime: "16:00", endTime: "18:00", venue: "Padang Astaka (COBRATS youth)" },
    ],
  },
  {
    id: "01970000-0000-7000-8000-000000000802",
    name: "KL Tigers RFC",
    slug: "kl-tigers-rfc",
    origin: "Kuala Lumpur",
    address: "Padang Merbok, Jalan Duta, 50480 Kuala Lumpur",
    trainingGround: "Padang Merbok, Kuala Lumpur",
    contactEmail: "info@kltigersrfc.com",
    logoUrl: "https://ui-avatars.com/api/?name=KT&background=c49000&color=000000&bold=true&size=128&length=2",
    lat: 3.1559,
    lng: 101.6851,
    description:
      "Founded in 2014, KL Tigers has grown to 600+ players across 15s, 7s, touch and social rugby. Official Global Partner Club of Leicester Tigers. All levels welcome.",
    trainingSlots: [
      { id: "01970000-0000-7000-8000-000000000904", dayOfWeek: 1, startTime: "19:00", endTime: "21:00", venue: "Padang Merbok" },
      { id: "01970000-0000-7000-8000-000000000905", dayOfWeek: 3, startTime: "19:00", endTime: "21:00", venue: "Padang Merbok" },
      { id: "01970000-0000-7000-8000-000000000906", dayOfWeek: 5, startTime: "08:00", endTime: "10:00", venue: "Padang Merbok" },
    ],
  },
  {
    id: "01970000-0000-7000-8000-000000000803",
    name: "Royal Selangor Club RFC",
    slug: "royal-selangor-club-rfc",
    origin: "Kuala Lumpur",
    address: "Jalan Raja, 50480 Kuala Lumpur",
    trainingGround: "Padang RSC, Kuala Lumpur",
    contactPhone: "+60 3-2692 7166",
    logoUrl: "https://ui-avatars.com/api/?name=RS&background=1a1a2e&color=c9a227&bold=true&size=128&length=2",
    lat: 3.1488,
    lng: 101.6941,
    description:
      "One of Malaysia's most storied sporting institutions, founded 1884. The Rugby Football Club section competes at state and national level and runs junior development programmes.",
    trainingSlots: [
      { id: "01970000-0000-7000-8000-000000000907", dayOfWeek: 2, startTime: "18:30", endTime: "20:30", venue: "Padang RSC" },
      { id: "01970000-0000-7000-8000-000000000908", dayOfWeek: 5, startTime: "08:00", endTime: "10:00", venue: "Padang RSC" },
    ],
  },
  {
    id: "01970000-0000-7000-8000-000000000804",
    name: "KL Saracens RFC",
    slug: "kl-saracens-rfc",
    origin: "Kuala Lumpur",
    address: "Bangsar, Kuala Lumpur",
    trainingGround: "Padang Bangsar, Kuala Lumpur",
    logoUrl: "https://ui-avatars.com/api/?name=SA&background=00241a&color=ffba20&bold=true&size=128&length=2",
    lat: 3.1283,
    lng: 101.6611,
    description:
      "Established in 2007 and affiliated with COBRA Rugby Club, KL Saracens is a social-competitive rugby club based in Bangsar. Players of all abilities are warmly welcomed.",
    trainingSlots: [
      { id: "01970000-0000-7000-8000-000000000909", dayOfWeek: 1, startTime: "19:00", endTime: "21:00", venue: "Padang Bangsar" },
      { id: "01970000-0000-7000-8000-000000000910", dayOfWeek: 4, startTime: "19:00", endTime: "21:00", venue: "Padang Bangsar" },
    ],
  },
  {
    id: "01970000-0000-7000-8000-000000000805",
    name: "Eagles Rugby Club",
    slug: "eagles-rugby-club",
    origin: "Sandakan, Sabah",
    address: "Bandar Utama, Mile 6, Jalan Utara, 90000 Sandakan, Sabah",
    trainingGround: "ERC Grounds, Mile 6, Sandakan",
    contactEmail: "erc.office7@gmail.com",
    contactPhone: "+60 89-210 748",
    logoUrl: "https://ui-avatars.com/api/?name=ER&background=8b0000&color=ffffff&bold=true&size=128&length=2",
    lat: 5.8412,
    lng: 118.1215,
    description:
      "Borneo's premier rugby club, home to two full-size rugby pitches and a clubhouse on 5 acres in Sandakan. Hosts the annual Borneo Sevens and runs elite-level development programmes.",
    trainingSlots: [
      { id: "01970000-0000-7000-8000-000000000911", dayOfWeek: 2, startTime: "18:00", endTime: "20:00", venue: "ERC Grounds, Mile 6" },
      { id: "01970000-0000-7000-8000-000000000912", dayOfWeek: 5, startTime: "08:00", endTime: "10:00", venue: "ERC Grounds, Mile 6" },
    ],
  },
  {
    id: "01970000-0000-7000-8000-000000000806",
    name: "Penang All Blues RFC",
    slug: "penang-all-blues-rfc",
    origin: "Penang",
    address: "Padang SMK Tinggi, Jalan Bukit Mertajam, 14000 Bukit Mertajam, Penang",
    trainingGround: "Padang SMK Tinggi, Bukit Mertajam",
    logoUrl: "https://ui-avatars.com/api/?name=AB&background=003087&color=ffffff&bold=true&size=128&length=2",
    lat: 5.3638,
    lng: 100.4627,
    description:
      "The main rugby development club for Penang state, active on both the island and mainland. Named in tribute to the All Blacks, the All Blues embrace open, attacking rugby.",
    trainingSlots: [
      { id: "01970000-0000-7000-8000-000000000913", dayOfWeek: 2, startTime: "19:00", endTime: "21:00", venue: "Padang SMK Tinggi, Bukit Mertajam" },
      { id: "01970000-0000-7000-8000-000000000914", dayOfWeek: 6, startTime: "08:00", endTime: "10:30", venue: "Padang SMK Tinggi, Bukit Mertajam" },
    ],
  },
  {
    id: "01970000-0000-7000-8000-000000000807",
    name: "Johor Barbarian RFC",
    slug: "johor-barbarian-rfc",
    origin: "Johor Bahru, Johor",
    address: "Johor Bahru, Johor",
    trainingGround: "Padang Awam, Johor Bahru",
    logoUrl: "https://ui-avatars.com/api/?name=JB&background=4a0072&color=ffffff&bold=true&size=128&length=2",
    lat: 1.4636,
    lng: 103.7412,
    description:
      "Johor's barbarian-style rugby club — no fixed squad, just a passion for the game. All standards from complete beginners to experienced players are welcome on and off the pitch.",
    trainingSlots: [
      { id: "01970000-0000-7000-8000-000000000915", dayOfWeek: 3, startTime: "19:30", endTime: "21:30", venue: "Padang Awam JB" },
      { id: "01970000-0000-7000-8000-000000000916", dayOfWeek: 5, startTime: "08:00", endTime: "10:00", venue: "Padang Awam JB" },
    ],
  },
  {
    id: "01970000-0000-7000-8000-000000000808",
    name: "Iskandar Pirates RFC",
    slug: "iskandar-pirates-rfc",
    origin: "Iskandar Puteri, Johor",
    address: "Iskandar Puteri (Nusajaya), 79250 Johor",
    trainingGround: "Padang Nusajaya, Iskandar Puteri",
    logoUrl: "https://ui-avatars.com/api/?name=IP&background=1a1a1a&color=f0f0f0&bold=true&size=128&length=2",
    lat: 1.4264,
    lng: 103.6376,
    description:
      "Based in Iskandar Puteri, the Pirates are a fast-rising club in southern Malaysia. Active in Johor state competitions and the sevens circuit — flying the skull and crossbones with pride.",
    trainingSlots: [
      { id: "01970000-0000-7000-8000-000000000917", dayOfWeek: 0, startTime: "19:00", endTime: "21:00", venue: "Padang Nusajaya" },
      { id: "01970000-0000-7000-8000-000000000918", dayOfWeek: 4, startTime: "19:00", endTime: "21:00", venue: "Padang Nusajaya" },
    ],
  },
];

async function main() {
  console.log("Seeding Malaysian rugby clubs...\n");

  for (const club of CLUBS) {
    const { trainingSlots, ...teamData } = club;

    await prisma.team.upsert({
      where: { slug: teamData.slug },
      update: {
        name: teamData.name,
        origin: teamData.origin,
        address: teamData.address,
        trainingGround: teamData.trainingGround,
        contactEmail: teamData.contactEmail ?? null,
        contactPhone: teamData.contactPhone ?? null,
        logoUrl: teamData.logoUrl ?? null,
        lat: teamData.lat,
        lng: teamData.lng,
        description: teamData.description,
        isPublic: true,
      },
      create: {
        ...teamData,
        contactEmail: teamData.contactEmail ?? null,
        contactPhone: teamData.contactPhone ?? null,
        isPublic: true,
        createdByUserId: ORGANIZER_ID,
      },
    });

    // Replace training slots atomically
    await prisma.$transaction([
      prisma.trainingSlot.deleteMany({ where: { teamId: teamData.id } }),
      prisma.trainingSlot.createMany({
        data: trainingSlots.map((s) => ({ ...s, teamId: teamData.id })),
      }),
    ]);

    console.log(`✓ ${teamData.name} (${teamData.origin})`);
  }

  console.log(`\n✓ Seeded ${CLUBS.length} clubs.`);
  console.log("  Browse: http://localhost:3002/clubs");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
