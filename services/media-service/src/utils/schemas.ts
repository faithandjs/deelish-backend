import { z } from "zod";

export const UpdateFilenameSchema = z.object({
  originalName: z.string().min(1).max(255),
});
