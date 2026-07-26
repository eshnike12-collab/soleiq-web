import "server-only";

import { z } from "zod";
import { requireAuth } from "./auth";

export const AcceptInvitationSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function acceptInvitation(
  input: z.input<typeof AcceptInvitationSchema>
) {
  const { supabase } = await requireAuth();
  const body = AcceptInvitationSchema.parse(input);
  const { data, error } = await supabase.rpc("accept_membership_invitation", {
    raw_token: body.token,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

