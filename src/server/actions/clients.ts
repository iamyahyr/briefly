"use server";

import { revalidatePath } from "next/cache";
import { createClient, deleteClient, updateClient, type ClientInput } from "@/server/dal/clients";
import { requireUser } from "@/server/session";
import { runAction } from "./result";

export async function createClientAction(input: ClientInput) {
  const user = await requireUser();
  return runAction(async () => {
    const client = await createClient(user.id, input);
    revalidatePath("/clients");
    return { id: client.id, name: client.name };
  });
}

export async function updateClientAction(id: string, input: ClientInput) {
  const user = await requireUser();
  return runAction(async () => {
    await updateClient(user.id, id, input);
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
  });
}

export async function deleteClientAction(id: string) {
  const user = await requireUser();
  return runAction(async () => {
    await deleteClient(user.id, id);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
  });
}
