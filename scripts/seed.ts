/**
 * Demo data: a freelancer with three clients, one of them (a restaurant) with a
 * complete, submitted brief including logo and photos.
 *
 *   pnpm db:seed
 *
 * Safe to run repeatedly: the demo account is recreated from scratch.
 * Never run it against a production database you care about.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/server/db";
import { account, briefs, notifications, uploads, user } from "@/server/db/schema";
import { createAccessLink, resolveToken } from "@/server/dal/access";
import { createBrief } from "@/server/dal/briefs";
import { createClient } from "@/server/dal/clients";
import { saveDraft, uploadFile } from "@/server/dal/questionnaire";
import { updateBranding } from "@/server/dal/workspace";
import { env } from "@/server/env";
import { deleteObjects } from "@/server/storage";

export const DEMO_EMAIL = "demo@briefly.test";
export const DEMO_PASSWORD = "briefly-demo";

async function image(text: string, background: string, size = 900) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 0.66)}">
    <rect width="100%" height="100%" fill="${background}"/>
    <text x="50%" y="52%" font-family="sans-serif" font-size="${size / 12}" fill="#fff" text-anchor="middle">${text}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

async function logo() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect width="512" height="512" rx="96" fill="#2f5d3a"/>
    <circle cx="256" cy="220" r="110" fill="#e9c46a"/>
    <text x="256" y="430" font-family="serif" font-size="64" fill="#fff" text-anchor="middle">La Huerta</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function resetDemoUser() {
  const existing = await db.query.user.findFirst({ where: eq(user.email, DEMO_EMAIL) });
  if (!existing) return;
  const files = await db.select().from(uploads).where(eq(uploads.ownerId, existing.id));
  await deleteObjects(files.flatMap((f) => [f.storageKey, f.thumbnailKey]));
  await db.delete(user).where(eq(user.id, existing.id));
}

async function main() {
  await resetDemoUser();

  const id = randomUUID();
  await db.insert(user).values({ id, name: "Ana García", email: DEMO_EMAIL, emailVerified: true });
  await db.insert(account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(DEMO_PASSWORD),
  });
  await updateBranding(id, { displayName: "Estudio Ana García", accentColor: "#2f5d3a" });

  // 1. Restaurant — complete and submitted.
  const restaurant = await createClient(id, {
    name: "Restaurante La Huerta",
    email: "hola@lahuerta.test",
    phone: "+34 600 123 456",
    notes: "Quieren la web antes de la temporada de verano.",
  });
  const restaurantBrief = await createBrief(id, {
    clientId: restaurant.id,
    title: "Web para Restaurante La Huerta",
    templateKey: "local-business",
    locale: "es",
    dueDate: "2026-12-15",
  });
  const restaurantToken = await createAccessLink(id, restaurantBrief.id, null);
  const publicRestaurant = (await resolveToken(restaurantToken))!;
  const lunchAndDinner = {
    closed: false,
    ranges: [
      { open: "13:00", close: "16:00" },
      { open: "20:00", close: "23:30" },
    ],
  };
  await saveDraft(
    publicRestaurant,
    {
      business_name: "Restaurante La Huerta",
      description:
        "Cocina mediterránea de temporada con verduras de nuestra propia huerta. Menú del día entre semana y carta los fines de semana.",
      address: "Calle del Olivo 12, 46001 Valencia",
      phone: "+34 960 000 000",
      contact_email: "reservas@lahuerta.test",
      opening_hours: {
        mon: { closed: true, ranges: [] },
        tue: lunchAndDinner,
        wed: lunchAndDinner,
        thu: lunchAndDinner,
        fri: lunchAndDinner,
        sat: lunchAndDinner,
        sun: { closed: false, ranges: [{ open: "13:00", close: "16:30" }] },
      },
      hours_notes: "Cerrado la segunda quincena de agosto.",
      social_links: { instagram: "@lahuerta.valencia", google: "maps.app.goo.gl/lahuerta" },
      website_goals: ["bookings", "menu", "google"],
      target_audience: "Familias y grupos de amigos del barrio, y turistas que buscan comida local.",
      services: [
        { title: "Menú del día", description: "Primero, segundo, postre y bebida. De martes a viernes." },
        {
          title: "Arroces por encargo",
          description: "Paella valenciana y arroz de verduras para 2 o más personas.",
        },
        { title: "Eventos privados", description: "Salón para hasta 40 personas." },
      ],
      primary_cta: "book",
      differentiators: "Producto de nuestra huerta a 10 km y recetas de la abuela.",
      references: [
        { url: "https://www.example.com/restaurante-uno", note: "Fotos grandes de los platos" },
        { url: "https://www.example.com/bistro", note: "Botón de reservar siempre visible" },
        { url: "https://www.example.com/trattoria", note: "Colores cálidos y tipografía clásica" },
      ],
      colors: ["#2f5d3a", "#e9c46a", "#f4f1de"],
      style: ["warm", "rustic"],
      dislikes: "Webs muy oscuras o con demasiadas animaciones.",
      prices_notes: "Menú del día: 14,50 €. Arroces desde 16 € por persona.",
      faq: [
        {
          title: "¿Tenéis opciones veganas?",
          description: "Sí, siempre hay al menos un primero y un segundo veganos.",
        },
        { title: "¿Se puede reservar online?", description: "Queremos que sí, desde la nueva web." },
      ],
      has_domain: "yes",
      domain_name: "lahuerta.test",
      existing_services: ["google_business", "domain_email"],
      languages: ["es", "en"],
      desired_launch_date: "2027-03-01",
      additional_notes: "Nos gustaría poder actualizar el menú del día nosotros mismos.",
    },
    4,
  );
  await uploadFile(publicRestaurant, "logo", { name: "logo-la-huerta.png", buffer: await logo() });
  for (const [name, color] of [
    ["Comedor", "#8a5a44"],
    ["Terraza", "#3d7a5a"],
    ["Paella", "#c9822b"],
  ] as const) {
    await uploadFile(publicRestaurant, "photos", {
      name: `${name.toLowerCase()}.jpg`,
      buffer: await image(name, color),
    });
  }
  const submittedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await db.update(briefs).set({ status: "received", submittedAt }).where(eq(briefs.id, restaurantBrief.id));
  await db
    .insert(notifications)
    .values({ ownerId: id, briefId: restaurantBrief.id, type: "brief_submitted" });

  // 2. Café — waiting, half filled.
  const cafe = await createClient(id, { name: "Cafetería Nube", email: "hola@cafeterianube.test" });
  const cafeBrief = await createBrief(id, {
    clientId: cafe.id,
    title: "Web para Cafetería Nube",
    templateKey: "local-business",
    locale: "es",
  });
  const cafeToken = await createAccessLink(id, cafeBrief.id, new Date(Date.now() + 30 * 86_400_000));
  await saveDraft(
    (await resolveToken(cafeToken))!,
    {
      business_name: "Cafetería Nube",
      description: "Café de especialidad y repostería casera.",
      website_goals: ["menu", "brand"],
    },
    1,
  );

  // 3. Hair salon — draft, link not shared yet (English questionnaire).
  const salon = await createClient(id, { name: "Curls Hair Studio", email: "hello@curls.test" });
  await createBrief(id, {
    clientId: salon.id,
    title: "Website for Curls",
    templateKey: "local-business",
    locale: "en",
  });

  const base = env().APP_URL.replace(/\/$/, "");
  console.log(`
✔ Demo data ready

  Sign in:   ${base}/login
  Email:     ${DEMO_EMAIL}
  Password:  ${DEMO_PASSWORD}

  Client link (café, in progress): ${base}/b/${cafeToken}
`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
