import { cache } from "react";
import { clerkClient } from "@clerk/nextjs/server";
import { colorFor } from "./colors";

export type UserLite = {
  id: string;
  name: string;
  handle: string | null;
  email: string;
  avatarUrl: string | null;
  color: string;
};

function toLite(u: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  emailAddresses: { id: string; emailAddress: string }[];
  primaryEmailAddressId: string | null;
}): UserLite {
  const primary =
    u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0];
  const email = primary?.emailAddress ?? "";
  const name =
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
    u.username ||
    email.split("@")[0] ||
    u.id.slice(0, 6);
  return {
    id: u.id,
    name,
    handle: u.username,
    email,
    avatarUrl: u.imageUrl ?? null,
    color: colorFor(u.id),
  };
}

/** Batch-fetch Clerk users by id. Cached per-request via React.cache. */
export const getUsers = cache(async (userIds: string[]): Promise<Map<string, UserLite>> => {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return new Map();

  const client = await clerkClient();
  const { data } = await client.users.getUserList({ userId: ids, limit: ids.length });
  return new Map(data.map((u) => [u.id, toLite(u)]));
});

export const getUser = cache(async (userId: string): Promise<UserLite | null> => {
  const map = await getUsers([userId]);
  return map.get(userId) ?? null;
});
