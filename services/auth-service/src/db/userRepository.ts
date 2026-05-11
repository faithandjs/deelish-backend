import { CosmosClient } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";
import type { UserRole } from "@deelish-be/shared";

export interface DbUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ── Cosmos client ─────────────────────────────────────────────────────────────
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING!);
const container = client.database("auth-db").container("users");

export const userRepository = {
  async findById(id: string): Promise<DbUser | undefined> {
    try {
      const { resource } = await container.item(id, id).read<DbUser>();
      return resource;
    } catch {
      return undefined;
    }
  },

  async findByUsername(username: string): Promise<DbUser | undefined> {
    const { resources } = await container.items
      .query<DbUser>({
        query: "SELECT * FROM c WHERE c.username = @username",
        parameters: [{ name: "@username", value: username }],
      })
      .fetchAll();
    return resources[0];
  },

  async create(data: {
    username: string;
    password: string;
    role: UserRole;
  }): Promise<DbUser> {
    const now = new Date().toISOString();
    const user: DbUser = {
      id: uuidv4(),
      username: data.username,
      password: data.password,
      role: data.role,
      created_at: now,
      updated_at: now,
    };
    const { resource } = await container.items.create<DbUser>(user);
    return resource!;
  },
};
