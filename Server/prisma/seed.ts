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
  // Core Transit Zones
  { id: 'BANANI', name: 'Banani', centerLat: 23.7904, centerLng: 90.4078 },
  { id: 'GULSHAN_1', name: 'Gulshan 1', centerLat: 23.7806, centerLng: 90.4163 },
  { id: 'MOHAKHALI', name: 'Mohakhali', centerLat: 23.7784, centerLng: 90.4034 },
  { id: 'DHANMONDI', name: 'Dhanmondi', centerLat: 23.745, centerLng: 90.3767 },
  { id: 'MIRPUR', name: 'Mirpur', centerLat: 23.8046, centerLng: 90.3631 },
  { id: 'UTTARA', name: 'Uttara', centerLat: 23.8683, centerLng: 90.385 },
  { id: 'FARMGATE', name: 'Farmgate', centerLat: 23.7581, centerLng: 90.3897 },
  { id: 'BASHUNDHARA', name: 'Bashundhara', centerLat: 23.8151, centerLng: 90.426 },

  // Expanded Metropolitan Dhaka Areas
  { id: 'GULSHAN_2', name: 'Gulshan 2', centerLat: 23.7925, centerLng: 90.4178 },
  { id: 'BARIDHARA', name: 'Baridhara', centerLat: 23.8000, centerLng: 90.4220 },
  { id: 'NIKUNJA', name: 'Nikunja', centerLat: 23.8320, centerLng: 90.4180 },
  { id: 'AIRPORT', name: 'Airport', centerLat: 23.8433, centerLng: 90.4037 },
  { id: 'MOTIJHEEL', name: 'Motijheel', centerLat: 23.7330, centerLng: 90.4175 },
  { id: 'KAWRAN_BAZAR', name: 'Kawran Bazar', centerLat: 23.7510, centerLng: 90.3934 },
  { id: 'PANTHAPATH', name: 'Panthapath', centerLat: 23.7516, centerLng: 90.3840 },
  { id: 'SHAHBAGH', name: 'Shahbagh', centerLat: 23.7380, centerLng: 90.3958 },
  { id: 'MOGHBAZAR', name: 'Moghbazar', centerLat: 23.7490, centerLng: 90.4045 },
  { id: 'RAMNA', name: 'Ramna', centerLat: 23.7360, centerLng: 90.4020 },
  { id: 'TEJGAON', name: 'Tejgaon', centerLat: 23.7640, centerLng: 90.3980 },
  { id: 'AGARGAON', name: 'Agargaon', centerLat: 23.7780, centerLng: 90.3790 },
  { id: 'MOHAMMADPUR', name: 'Mohammadpur', centerLat: 23.7658, centerLng: 90.3584 },
  { id: 'LALMATIA', name: 'Lalmatia', centerLat: 23.7560, centerLng: 90.3700 },
];

interface DriverSeed {
  email: string;
  fullName: string;
  phone: string;
  vehicleName: string;
  capacity: number;
  currentZoneId: string;
  isOnline: boolean;
}

const DRIVERS: DriverSeed[] = [
  // Core Persona
  { email: 'jashim@tesla.dhaka', fullName: 'Captain Jashim Uddin', phone: '+8801710000001', vehicleName: 'Bullet', capacity: 3, currentZoneId: 'BANANI', isOnline: false },
  // 29 Professional Fleet Drivers with Meaningful Bangladeshi Credentials
  { email: 'tariqul.islam@tesla.dhaka', fullName: 'Tariqul Islam', phone: '+8801711000011', vehicleName: 'Falcon', capacity: 3, currentZoneId: 'GULSHAN_1', isOnline: false },
  { email: 'kamal.hossain@tesla.dhaka', fullName: 'Kamal Hossain', phone: '+8801711000012', vehicleName: 'Lightning', capacity: 3, currentZoneId: 'MOHAKHALI', isOnline: false },
  { email: 'abdur.rahim@tesla.dhaka', fullName: 'Abdur Rahim', phone: '+8801711000013', vehicleName: 'Thunder', capacity: 3, currentZoneId: 'UTTARA', isOnline: false },
  { email: 'shamim.reza@tesla.dhaka', fullName: 'Shamim Reza', phone: '+8801711000014', vehicleName: 'Meteor', capacity: 3, currentZoneId: 'DHANMONDI', isOnline: false },
  { email: 'mostafa.kamal@tesla.dhaka', fullName: 'Mostafa Kamal', phone: '+8801711000015', vehicleName: 'Viper', capacity: 3, currentZoneId: 'MIRPUR', isOnline: false },
  { email: 'belal.hossain@tesla.dhaka', fullName: 'Belal Hossain', phone: '+8801711000016', vehicleName: 'Phantom', capacity: 3, currentZoneId: 'BASHUNDHARA', isOnline: false },
  { email: 'jahangir.alam@tesla.dhaka', fullName: 'Jahangir Alam', phone: '+8801711000017', vehicleName: 'Arrow', capacity: 3, currentZoneId: 'FARMGATE', isOnline: false },
  { email: 'enamul.haque@tesla.dhaka', fullName: 'Enamul Haque', phone: '+8801711000018', vehicleName: 'Cyclone', capacity: 3, currentZoneId: 'GULSHAN_2', isOnline: false },
  { email: 'aminul.islam@tesla.dhaka', fullName: 'Aminul Islam', phone: '+8801711000019', vehicleName: 'Storm', capacity: 3, currentZoneId: 'BARIDHARA', isOnline: false },
  { email: 'rashedul.karim@tesla.dhaka', fullName: 'Rashedul Karim', phone: '+8801711000020', vehicleName: 'Phoenix', capacity: 3, currentZoneId: 'NIKUNJA', isOnline: false },
  { email: 'faruk.ahmed@tesla.dhaka', fullName: 'Faruk Ahmed', phone: '+8801711000021', vehicleName: 'Blaze', capacity: 3, currentZoneId: 'AIRPORT', isOnline: false },
  { email: 'nazmul.huda@tesla.dhaka', fullName: 'Nazmul Huda', phone: '+8801711000022', vehicleName: 'Titan', capacity: 3, currentZoneId: 'MOTIJHEEL', isOnline: false },
  { email: 'sohel.rana@tesla.dhaka', fullName: 'Sohel Rana', phone: '+8801711000023', vehicleName: 'Vortex', capacity: 3, currentZoneId: 'KAWRAN_BAZAR', isOnline: false },
  { email: 'anwar.hossain@tesla.dhaka', fullName: 'Anwar Hossain', phone: '+8801711000024', vehicleName: 'Shadow', capacity: 3, currentZoneId: 'PANTHAPATH', isOnline: false },
  { email: 'mizanur.rahman@tesla.dhaka', fullName: 'Mizanur Rahman', phone: '+8801711000025', vehicleName: 'Apex', capacity: 3, currentZoneId: 'SHAHBAGH', isOnline: false },
  { email: 'babul.akter@tesla.dhaka', fullName: 'Babul Akter', phone: '+8801711000026', vehicleName: 'Electra', capacity: 3, currentZoneId: 'MOGHBAZAR', isOnline: false },
  { email: 'shahinur.rahman@tesla.dhaka', fullName: 'Shahinur Rahman', phone: '+8801711000027', vehicleName: 'Zenith', capacity: 3, currentZoneId: 'RAMNA', isOnline: false },
  { email: 'habibur.rahman@tesla.dhaka', fullName: 'Habibur Rahman', phone: '+8801711000028', vehicleName: 'Volt', capacity: 3, currentZoneId: 'TEJGAON', isOnline: false },
  { email: 'nasir.uddin@tesla.dhaka', fullName: 'Nasir Uddin', phone: '+8801711000029', vehicleName: 'Pulse', capacity: 3, currentZoneId: 'AGARGAON', isOnline: false },
  { email: 'golam.kibria@tesla.dhaka', fullName: 'Golam Kibria', phone: '+8801711000030', vehicleName: 'Quantum', capacity: 3, currentZoneId: 'MOHAMMADPUR', isOnline: false },
  { email: 'monirul.islam@tesla.dhaka', fullName: 'Monirul Islam', phone: '+8801711000031', vehicleName: 'Hyperion', capacity: 3, currentZoneId: 'LALMATIA', isOnline: false },
  { email: 'liton.das@tesla.dhaka', fullName: 'Liton Das', phone: '+8801711000032', vehicleName: 'Nexus', capacity: 3, currentZoneId: 'BANANI', isOnline: false },
  { email: 'asaduzzaman.nur@tesla.dhaka', fullName: 'Asaduzzaman Nur', phone: '+8801711000033', vehicleName: 'Drift', capacity: 3, currentZoneId: 'GULSHAN_1', isOnline: false },
  { email: 'mahfuzur.rahman@tesla.dhaka', fullName: 'Mahfuzur Rahman', phone: '+8801711000034', vehicleName: 'Specter', capacity: 3, currentZoneId: 'MOHAKHALI', isOnline: false },
  { email: 'sirajul.islam@tesla.dhaka', fullName: 'Sirajul Islam', phone: '+8801711000035', vehicleName: 'Comet', capacity: 3, currentZoneId: 'UTTARA', isOnline: false },
  { email: 'khorshed.alam@tesla.dhaka', fullName: 'Khorshed Alam', phone: '+8801711000036', vehicleName: 'Fusion', capacity: 3, currentZoneId: 'MIRPUR', isOnline: false },
  { email: 'azizul.haque@tesla.dhaka', fullName: 'Azizul Haque', phone: '+8801711000037', vehicleName: 'Raptor', capacity: 3, currentZoneId: 'DHANMONDI', isOnline: false },
  { email: 'jalal.ahmed@tesla.dhaka', fullName: 'Jalal Ahmed', phone: '+8801711000038', vehicleName: 'Starlight', capacity: 3, currentZoneId: 'BASHUNDHARA', isOnline: false },
  { email: 'harun.rashid@tesla.dhaka', fullName: 'Harun-or-Rashid', phone: '+8801711000039', vehicleName: 'Horizon', capacity: 3, currentZoneId: 'GULSHAN_2', isOnline: false },
];

interface PassengerSeed {
  email: string;
  fullName: string;
  phone: string;
}

const PASSENGERS: PassengerSeed[] = [
  // Core Personas
  { email: 'nusrat@tesla.dhaka', fullName: 'Nusrat Jahan', phone: '+8801710000002' },
  { email: 'rafiq@tesla.dhaka', fullName: 'Rafiq Ahmed', phone: '+8801710000003' },
  { email: 'shirin@tesla.dhaka', fullName: 'Shirin Akter', phone: '+8801710000004' },

  // 67 Diverse Bangladeshi Commuters with Authentic Names & Real-Format Emails
  { email: 'tanvir.hasan@gmail.com', fullName: 'Tanvir Hasan', phone: '+8801721000005' },
  { email: 'sadia.islam@gmail.com', fullName: 'Sadia Islam', phone: '+8801721000006' },
  { email: 'farhana.rahman@outlook.com', fullName: 'Farhana Rahman', phone: '+8801721000007' },
  { email: 'anisur.rahman@yahoo.com', fullName: 'Anisur Rahman', phone: '+8801721000008' },
  { email: 'nabila.chowdhury@gmail.com', fullName: 'Nabila Chowdhury', phone: '+8801721000009' },
  { email: 'kazi.shafi@gmail.com', fullName: 'Kazi Shafi', phone: '+8801721000010' },
  { email: 'sumaiya.akhter@hotmail.com', fullName: 'Sumaiya Akhter', phone: '+8801721000011' },
  { email: 'abrar.fahim@gmail.com', fullName: 'Abrar Fahim', phone: '+8801721000012' },
  { email: 'mehedi.hasan@yahoo.com', fullName: 'Mehedi Hasan', phone: '+8801721000013' },
  { email: 'rumana.afroz@gmail.com', fullName: 'Rumana Afroz', phone: '+8801721000014' },
  { email: 'arif.hossain@outlook.com', fullName: 'Arif Hossain', phone: '+8801721000015' },
  { email: 'tasnim.fatima@gmail.com', fullName: 'Tasnim Fatima', phone: '+8801721000016' },
  { email: 'faisal.mahmud@gmail.com', fullName: 'Faisal Mahmud', phone: '+8801721000017' },
  { email: 'sabrina.sultana@yahoo.com', fullName: 'Sabrina Sultana', phone: '+8801721000018' },
  { email: 'imtiaz.ahmed@gmail.com', fullName: 'Imtiaz Ahmed', phone: '+8801721000019' },
  { email: 'tahmina.begum@gmail.com', fullName: 'Tahmina Begum', phone: '+8801721000020' },
  { email: 'shakil.khan@outlook.com', fullName: 'Shakil Khan', phone: '+8801721000021' },
  { email: 'sharmin.jahan@gmail.com', fullName: 'Sharmin Jahan', phone: '+8801721000022' },
  { email: 'saiful.islam@yahoo.com', fullName: 'Saiful Islam', phone: '+8801721000023' },
  { email: 'jannatul.ferdous@gmail.com', fullName: 'Jannatul Ferdous', phone: '+8801721000024' },
  { email: 'ashraful.alam@gmail.com', fullName: 'Ashraful Alam', phone: '+8801721000025' },
  { email: 'rokeya.begum@hotmail.com', fullName: 'Rokeya Begum', phone: '+8801721000026' },
  { email: 'mahmudul.hasan@gmail.com', fullName: 'Mahmudul Hasan', phone: '+8801721000027' },
  { email: 'israt.jahan@yahoo.com', fullName: 'Israt Jahan', phone: '+8801721000028' },
  { email: 'sajjad.hossain@gmail.com', fullName: 'Sajjad Hossain', phone: '+8801721000029' },
  { email: 'afroza.khatun@gmail.com', fullName: 'Afroza Khatun', phone: '+8801721000030' },
  { email: 'riaz.uddin@outlook.com', fullName: 'Riaz Uddin', phone: '+8801721000031' },
  { email: 'morsheda.akter@gmail.com', fullName: 'Morsheda Akter', phone: '+8801721000032' },
  { email: 'nahid.hasan@yahoo.com', fullName: 'Nahid Hasan', phone: '+8801721000033' },
  { email: 'nusrat.parveen@gmail.com', fullName: 'Nusrat Parveen', phone: '+8801721000034' },
  { email: 'kamrul.hasan@gmail.com', fullName: 'Kamrul Hasan', phone: '+8801721000035' },
  { email: 'fatema.zohra@hotmail.com', fullName: 'Fatema Tuz Zohra', phone: '+8801721000036' },
  { email: 'zahid.hasan@gmail.com', fullName: 'Zahid Hasan', phone: '+8801721000037' },
  { email: 'lubna.yasmin@yahoo.com', fullName: 'Lubna Yasmin', phone: '+8801721000038' },
  { email: 'towhidul.islam@gmail.com', fullName: 'Towhidul Islam', phone: '+8801721000039' },
  { email: 'sanjida.akter@outlook.com', fullName: 'Sanjida Akter', phone: '+8801721000040' },
  { email: 'mazharul.islam@gmail.com', fullName: 'Mazharul Islam', phone: '+8801721000041' },
  { email: 'farzana.haque@gmail.com', fullName: 'Farzana Haque', phone: '+8801721000042' },
  { email: 'masud.rana@yahoo.com', fullName: 'Masud Rana', phone: '+8801721000043' },
  { email: 'sharmin.sultana@gmail.com', fullName: 'Sharmin Sultana', phone: '+8801721000044' },
  { email: 'alamin.sheikh@gmail.com', fullName: 'Al-Amin Sheikh', phone: '+8801721000045' },
  { email: 'rehana.parveen@hotmail.com', fullName: 'Rehana Parveen', phone: '+8801721000046' },
  { email: 'ziaur.rahman@outlook.com', fullName: 'Ziaur Rahman', phone: '+8801721000047' },
  { email: 'tanjina.akter@gmail.com', fullName: 'Tanjina Akter', phone: '+8801721000048' },
  { email: 'shahadat.hossain@yahoo.com', fullName: 'Shahadat Hossain', phone: '+8801721000049' },
  { email: 'nasreen.sultana@gmail.com', fullName: 'Nasreen Sultana', phone: '+8801721000050' },
  { email: 'toufiq.elahi@gmail.com', fullName: 'Toufiq Elahi', phone: '+8801721000051' },
  { email: 'moushumi.akter@hotmail.com', fullName: 'Moushumi Akter', phone: '+8801721000052' },
  { email: 'khairul.bashar@gmail.com', fullName: 'Khairul Bashar', phone: '+8801721000053' },
  { email: 'shamima.nasrin@yahoo.com', fullName: 'Shamima Nasrin', phone: '+8801721000054' },
  { email: 'maruf.ahmed@outlook.com', fullName: 'Maruf Ahmed', phone: '+8801721000055' },
  { email: 'sonia.rahman@gmail.com', fullName: 'Sonia Rahman', phone: '+8801721000056' },
  { email: 'jahidul.islam@gmail.com', fullName: 'Jahidul Islam', phone: '+8801721000057' },
  { email: 'laila.arjumand@yahoo.com', fullName: 'Laila Arjumand', phone: '+8801721000058' },
  { email: 'rakibul.islam@gmail.com', fullName: 'Rakibul Islam', phone: '+8801721000059' },
  { email: 'ferdousi.begum@hotmail.com', fullName: 'Ferdousi Begum', phone: '+8801721000060' },
  { email: 'rubel.mia@gmail.com', fullName: 'Rubel Mia', phone: '+8801721000061' },
  { email: 'kaniz.fatima@outlook.com', fullName: 'Kaniz Fatima', phone: '+8801721000062' },
  { email: 'sayed.ali@gmail.com', fullName: 'Sayed Ali', phone: '+8801721000063' },
  { email: 'shahnaz.begum@yahoo.com', fullName: 'Shahnaz Begum', phone: '+8801721000064' },
  { email: 'mominul.haque@gmail.com', fullName: 'Mominul Haque', phone: '+8801721000065' },
  { email: 'farida.yasmin@gmail.com', fullName: 'Farida Yasmin', phone: '+8801721000066' },
  { email: 'zahirul.islam@hotmail.com', fullName: 'Zahirul Islam', phone: '+8801721000067' },
  { email: 'salma.khatun@gmail.com', fullName: 'Salma Khatun', phone: '+8801721000068' },
  { email: 'golam.mostafa@yahoo.com', fullName: 'Golam Mostafa', phone: '+8801721000069' },
  { email: 'tahmidur.rahman@outlook.com', fullName: 'Tahmidur Rahman', phone: '+8801721000070' },
  { email: 'dilruba.shireen@gmail.com', fullName: 'Dilruba Shireen', phone: '+8801721000071' },
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

  console.log(`Seeding ${DRIVERS.length} drivers with vehicles...`);
  for (const d of DRIVERS) {
    const driverUser = await prisma.user.upsert({
      where: { email: d.email },
      update: {
        fullName: d.fullName,
        phone: d.phone,
        role: UserRole.DRIVER,
        passwordHash: defaultPasswordHash,
      },
      create: {
        email: d.email,
        fullName: d.fullName,
        phone: d.phone,
        role: UserRole.DRIVER,
        passwordHash: defaultPasswordHash,
      },
    });

    await prisma.tesla.upsert({
      where: { driverId: driverUser.id },
      update: {
        name: d.vehicleName,
        capacity: d.capacity,
        seatsAvailable: d.capacity,
        isOnline: d.isOnline,
        currentZoneId: d.currentZoneId,
      },
      create: {
        driverId: driverUser.id,
        name: d.vehicleName,
        capacity: d.capacity,
        seatsAvailable: d.capacity,
        isOnline: d.isOnline,
        currentZoneId: d.currentZoneId,
      },
    });
  }
  console.log(`Seeded ${DRIVERS.length} drivers and vehicles successfully.`);

  console.log(`Seeding ${PASSENGERS.length} passengers...`);
  for (const p of PASSENGERS) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: {
        fullName: p.fullName,
        phone: p.phone,
        role: UserRole.PASSENGER,
        passwordHash: defaultPasswordHash,
      },
      create: {
        email: p.email,
        fullName: p.fullName,
        phone: p.phone,
        role: UserRole.PASSENGER,
        passwordHash: defaultPasswordHash,
      },
    });
  }
  console.log(`Seeded ${PASSENGERS.length} passengers successfully.`);

  console.log(`Database seeding completed: ${DHAKA_ZONES.length} zones, ${DRIVERS.length} drivers, ${PASSENGERS.length} passengers (Total users: ${DRIVERS.length + PASSENGERS.length}).`);
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
