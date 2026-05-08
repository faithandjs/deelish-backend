import { z } from "zod";

export const CreatePhotoSchema = z.object({
  title: z.string().min(1).max(200),
  caption: z.string().max(1000).optional(),
  tags: z.array(z.string()).default([]),
  location: z.string().max(200).optional(),
  people: z.array(z.string()).default([]),
});

export const CommentSchema = z.object({
  body: z.string().min(1).max(500),
});

export const RatingSchema = z.object({
  value: z.number().int().min(1).max(5),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const SearchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
