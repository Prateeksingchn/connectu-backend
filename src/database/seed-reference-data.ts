/**
 * Seeds the static reference-data tables that registration depends on:
 * roles, genders, hobby, interest, tech_stack. RegisterDto validates
 * genderId/interests/hobbies/techStack against these tables and
 * AuthService looks up the "USER" role by name, so on a fresh database
 * (synchronize: true creates empty tables, nothing seeds them) every
 * registration fails until this has been run once.
 *
 * Idempotent: each table is seeded by unique `name`, checked with
 * findOne-before-insert, so re-running this never creates duplicates.
 *
 * Run with: npm run seed:reference-data
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Role } from '../profile-config/roles/role.entity';
import { RoleName } from '../profile-config/roles/role.enum';
import { Gender } from '../profile-config/genders/gender.entity';
import { Hobby } from '../profile-config/hobbies/hobbies.entity';
import { Interest } from '../profile-config/interests/interest.entity';
import { TechStack } from '../profile-config/tech-stack/tech-stack.entity';
import { User } from '../users/user.entity';

const ROLES: RoleName[] = [RoleName.USER, RoleName.ADMIN];
const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

// Broad, varied pool so the registration multi-select actually has enough
// breadth to feel personal. Grouped by theme below for readability only —
// the table itself is a flat, unordered `name` list.
const HOBBIES = [
  // Active / outdoors
  'Hiking',
  'Running',
  'Cycling',
  'Swimming',
  'Yoga',
  'Rock Climbing',
  'Camping',
  'Fishing',
  'Skateboarding',
  'Bird Watching',
  // Creative
  'Photography',
  'Painting',
  'Drawing',
  'Creative Writing',
  'Playing Guitar',
  'Singing',
  'Dancing',
  'Woodworking',
  'Knitting',
  // Food & home
  'Cooking',
  'Baking',
  'Gardening',
  // Games & mind
  'Gaming',
  'Chess',
  'Board Games',
  'Podcasting',
  // Chill / social
  'Reading',
  'Traveling',
  'Meditation',
  'Volunteering',
];

const INTERESTS = [
  // Culture & entertainment
  'Music',
  'Movies',
  'Books & Literature',
  'Comedy',
  'Anime & Manga',
  'Pop Culture',
  'True Crime',
  'Podcasts',
  'Theatre & Performing Arts',
  // Lifestyle
  'Travel',
  'Food & Dining',
  'Fashion',
  'Fitness & Wellness',
  'Nature & Outdoors',
  'Pets & Animals',
  'Spirituality',
  'Astrology',
  // Sports & games
  'Sports',
  'Gaming & Esports',
  'Cars & Motorsports',
  // Mind & world
  'Art',
  'Science',
  'Technology',
  'History',
  'Politics',
  'Philosophy',
  'Psychology',
  'Entrepreneurship',
  'Personal Finance',
  'Sustainability',
];

const TECH_STACK = [
  // Languages
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  // Frontend
  'React',
  'Next.js',
  'Vue.js',
  'Angular',
  'Svelte',
  // Backend
  'Node.js',
  'Express.js',
  'NestJS',
  'Django',
  'Flask',
  'Spring Boot',
  // Data & infra
  'PostgreSQL',
  'MongoDB',
  'MySQL',
  'Redis',
  'Docker',
  'Kubernetes',
  'AWS',
];

function report(label: string, total: number, created: number) {
  console.log(
    `${label}: ${created} inserted, ${total - created} already existed (${total} total)`,
  );
}

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // User must be registered too: Gender.users is a @OneToMany back-reference
    // to User, and TypeORM fails metadata resolution if the target entity of
    // any relation isn't in this list, even though this script never touches it.
    entities: [Role, Gender, Hobby, Interest, TechStack, User],
  });

  await dataSource.initialize();
  console.log(
    `Connected to ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`,
  );

  const roleRepo = dataSource.getRepository(Role);
  let rolesCreated = 0;
  for (const name of ROLES) {
    if (await roleRepo.findOne({ where: { name } })) continue;
    await roleRepo.save(roleRepo.create({ name }));
    rolesCreated++;
  }
  report('roles', ROLES.length, rolesCreated);

  const genderRepo = dataSource.getRepository(Gender);
  let gendersCreated = 0;
  for (const name of GENDERS) {
    if (await genderRepo.findOne({ where: { name } })) continue;
    await genderRepo.save(genderRepo.create({ name }));
    gendersCreated++;
  }
  report('genders', GENDERS.length, gendersCreated);

  const hobbyRepo = dataSource.getRepository(Hobby);
  let hobbiesCreated = 0;
  for (const name of HOBBIES) {
    if (await hobbyRepo.findOne({ where: { name } })) continue;
    await hobbyRepo.save(hobbyRepo.create({ name }));
    hobbiesCreated++;
  }
  report('hobby', HOBBIES.length, hobbiesCreated);

  const interestRepo = dataSource.getRepository(Interest);
  let interestsCreated = 0;
  for (const name of INTERESTS) {
    if (await interestRepo.findOne({ where: { name } })) continue;
    await interestRepo.save(interestRepo.create({ name }));
    interestsCreated++;
  }
  report('interest', INTERESTS.length, interestsCreated);

  const techStackRepo = dataSource.getRepository(TechStack);
  let techStackCreated = 0;
  for (const name of TECH_STACK) {
    if (await techStackRepo.findOne({ where: { name } })) continue;
    await techStackRepo.save(techStackRepo.create({ name }));
    techStackCreated++;
  }
  report('tech_stack', TECH_STACK.length, techStackCreated);

  await dataSource.destroy();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
});
