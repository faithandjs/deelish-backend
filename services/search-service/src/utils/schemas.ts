import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z.string().min(1, "Query cannot be empty"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
