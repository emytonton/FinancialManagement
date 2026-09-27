import { api } from "@/server/http";
import { updateSettings } from "@/server/repo";
import { settingsPatch } from "@/server/schemas";

export const PATCH = api(async req => {
  const patch = settingsPatch.parse(await req.json());
  await updateSettings(patch);
});
