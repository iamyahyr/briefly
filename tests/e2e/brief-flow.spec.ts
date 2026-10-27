import { devices, expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

/**
 * The "done" criterion from the project spec: a freelancer creates a brief and
 * shares a link; the client completes five steps from a phone, uploads a logo
 * and submits; drafts survive a reload; the freelancer sees everything sorted.
 */

async function signUp(page: Page) {
  const email = `ana-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@briefly.test`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Ana Freelance");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("freelancer → client on mobile → freelancer review", async ({ page, browser }) => {
  await signUp(page);

  // 1. Create the brief for a new client, in Spanish.
  await page.getByRole("link", { name: "New brief" }).first().click();
  await page.getByLabel("New client name").fill("Cafetería Nube");
  await page.getByRole("combobox", { name: "Questionnaire language" }).click();
  await page.getByRole("option", { name: "Español" }).click();
  await page.getByRole("button", { name: "Create brief" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cafetería Nube");

  // 2. Generate the private link.
  await page.getByRole("button", { name: "Generate link" }).click();
  const linkInput = page.getByRole("textbox", { name: "Client link" });
  await expect(linkInput).toHaveValue(/\/b\/[A-Za-z0-9_-]{43}$/);
  const link = await linkInput.inputValue();

  // 3. The client opens it on a phone, without any account.
  const phone = await browser.newContext({ ...devices["Pixel 7"], locale: "es-ES" });
  const client = await phone.newPage();
  await client.goto(link);
  await expect(client.getByRole("heading", { name: /Hola, Cafetería Nube/ })).toBeVisible();
  await client.getByRole("button", { name: "Empezar" }).click();

  // Step 1 — validation blocks empty required fields.
  await client.getByRole("button", { name: "Siguiente" }).click();
  await expect(client.getByText("Este campo es obligatorio.").first()).toBeVisible();
  await client.getByLabel("Nombre comercial").fill("Cafetería Nube");
  await client.getByLabel("¿A qué se dedica tu negocio?").fill("Café de especialidad y repostería casera.");
  await client.getByLabel("Email de contacto público").fill("hola@cafeterianube.test");
  await client.getByRole("button", { name: "Siguiente" }).click();

  // Step 2
  await expect(client.getByRole("heading", { name: "Objetivos y contenido" })).toBeVisible();
  await client.getByRole("checkbox", { name: "Recibir llamadas o mensajes" }).click();
  await client.getByLabel("¿Quiénes son tus clientes?").fill("Vecinos del barrio y oficinistas.");
  await client.getByLabel("Servicio o producto 1").fill("Desayunos");
  await client.getByRole("button", { name: "Siguiente" }).click();

  // Step 3 — upload the logo.
  await expect(client.getByRole("heading", { name: "Diseño" })).toBeVisible();
  const logo = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#7c3aed" } })
    .png()
    .toBuffer();
  await client
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: "logo-nube.png", mimeType: "image/png", buffer: logo });
  await expect(client.getByText("logo-nube.png")).toBeVisible();
  await client.getByRole("button", { name: "Siguiente" }).click();
  await expect(client.getByRole("heading", { name: "Materiales" })).toBeVisible();
  await expect(client.getByText("Guardado")).toBeVisible();

  // Reloading keeps everything: the client continues where they left off.
  await client.reload();
  await client.getByRole("button", { name: "Continuar donde lo dejé" }).click();
  await expect(client.getByRole("heading", { name: "Materiales" })).toBeVisible();
  await client.getByRole("button", { name: "Siguiente" }).click();

  // Step 5
  await expect(client.getByRole("heading", { name: "Aspectos prácticos" })).toBeVisible();
  await expect(client.getByText("Nunca escribas contraseñas")).toBeVisible();
  await client.getByRole("checkbox", { name: "Español" }).click();
  await client.getByRole("button", { name: "Revisar y enviar" }).click();

  // Review and submit.
  await expect(client.getByRole("heading", { name: "¡Ya casi está!" })).toBeVisible();
  await expect(client.getByText("Café de especialidad y repostería casera.")).toBeVisible();
  await client.getByRole("button", { name: "Enviar brief" }).click();
  await expect(client.getByRole("heading", { name: "¡Gracias!" })).toBeVisible();

  // Opening the link again shows it is closed.
  await client.reload();
  await expect(client.getByRole("heading", { name: "Este brief ya se ha enviado" })).toBeVisible();
  await phone.close();

  // 4. The freelancer gets a notification and sees the answers.
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: /Notifications \(1\)/ })).toBeVisible();
  await expect(page.getByText("Received").first()).toBeVisible();
  await page
    .getByRole("link", { name: /Cafetería Nube/ })
    .first()
    .click();
  await expect(page.getByText("Café de especialidad y repostería casera.")).toBeVisible();
  await expect(page.getByText("Get calls or messages")).toBeVisible();
  await expect(page.getByRole("img", { name: "logo-nube.png" })).toBeVisible();

  // 5. Exports.
  const briefUrl = page.url();
  const md = await page.request.get(`${briefUrl.replace("/briefs/", "/api/briefs/")}/export?format=md`);
  expect(md.ok()).toBe(true);
  expect(await md.text()).toContain("Café de especialidad y repostería casera.");
  const zip = await page.request.get(`${briefUrl.replace("/briefs/", "/api/briefs/")}/export?format=zip`);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");

  // 6. The owner can mark it as completed.
  await page.getByRole("button", { name: "Mark as completed" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Mark as completed" }).click();
  await expect(page.getByText("Completed").first()).toBeVisible();
});

test("an invalid link reveals nothing", async ({ page }) => {
  const response = await page.goto("/b/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This link is not valid" })).toBeVisible();
});

test("private pages and files require a session", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  const file = await page.request.get("/api/files/00000000-0000-0000-0000-000000000000");
  expect(file.status()).toBe(404);
});
