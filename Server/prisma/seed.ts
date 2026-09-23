import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface ZoneSeed {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
}

const DHAKA_ZONES: ZoneSeed[] = [
  { id: 'BANANI', name: 'Banani', centerLat: 23.7904, centerLng: 90.4078 },
  { id: 'GULSHAN_1', name: 'Gulshan 1', centerLat: 23.7806, centerLng: 90.4163 },
  { id: 'MOHAKHALI', name: 'Mohakhali', centerLat: 23.7784, centerLng: 90.4034 },
  { id: 'DHANMONDI', name: 'Dhanmondi', centerLat: 23.7450, centerLng: 90.3767 },
  { id: 'MIRPUR', name: 'Mirpur', centerLat: 23.8046, centerLng: 90.3631 },
  { id: 'UTTARA', name: 'Uttara', centerLat: 23.8683, centerLng: 90.3850 },
  { id: 'FARMGATE', name: 'Farmgate', centerLat: 23.7581, centerLng: 90.3897 },
  { id: 'BASHUNDHARA', name: 'Bashundhara', centerLat: 23.8151, centerLng: 90.4260 },
];

async function main() {
  console.log('Seeding Dhaka Metropolitan zones...');
  for (const zone of DHAKA_ZONES) {
    await prisma.zone.upsert({
      where: { id: zone.id },
      update: {
        name: zone.name,
        centerLat: zone.centerLat,
        centerLng: zone.centerLng,
      },
      create: {
        id: zone.id,
        name: zone.name,
        centerLat: zone.centerLat,
        centerLng: zone.centerLng,
      },
    });
  }
  console.log(`Seeded ${DHAKA_ZONES.length} zones successfully.`);

  console.log('Hashing default demo password...');
  const saltRounds = 10;
  const defaultPasswordHash = await bcrypt.hash('password123', saltRounds);

  console.log('Seeding story cast: Driver Jashim and vehicle Bullet...');
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim@tesla.dhaka' },
    update: {
      fullName: 'Jashim Uddin',
      phone: '+8801710000001',
      role: UserRole.DRIVER,
      passwordHash: defaultPasswordHash,
    },
    create: {
      email: 'jashim@tesla.dhaka',
      fullName: 'Jashim Uddin',
      phone: '+8801710000001',
      role: UserRole.DRIVER,
      passwordHash: defaultPasswordHash,
    },
  });

  await prisma.tesla.upsert({
    where: { driverId: jashim.id },
    update: {
      name: 'Bullet',
      capacity: 3,
      seatsAvailable: 3,
      isOnline: false,
    },
    create: {
      driverId: jashim.id,
      name: 'Bullet',
      capacity: 3,
      seatsAvailable: 3,
      isOnline: false,
    },
  });

  console.log('Seeding story cast: Passengers (Nusrat, Rafiq, Shirin)...');
  const passengers = [
    {
      email: 'nusrat@tesla.dhaka',
      fullName: 'Nusrat Jahan',
      phone: '+8801710000002',
    },
    {
      email: 'rafiq@tesla.dhaka',
      fullName: 'Rafiq Ahmed',
      phone: '+8801710000003',
    },
    {
      email: 'shirin@tesla.dhaka',
      fullName: 'Shirin Akter',
      phone: '+8801710000004',
    },
  ];

  for (const passenger of passengers) {
    await prisma.user.upsert({
      where: { email: passenger.email },
      update: {
        fullName: passenger.fullName,
        phone: passenger.phone,
        role: UserRole.PASSENGER,
        passwordHash: defaultPasswordHash,
      },
      create: {
        email: passenger.email,
        fullName: passenger.fullName,
        phone: passenger.phone,
        role: UserRole.PASSENGER,
        passwordHash: defaultPasswordHash,
      },
    });
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
