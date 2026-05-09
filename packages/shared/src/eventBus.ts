import { EventEmitter } from "events";

export const eventBus = new EventEmitter();

export interface PhotoCreatedPayload {
  mediaId: string;
  userId: string;
  url: string;
  originalName: string;
  size: number;
  uploadedAt: string;
}

export interface PhotoDeletedPayload {
  mediaId: string;
  userId: string;
}
export interface CommentCreatedPayload {
  photoOwnerId: string;
  photoId: string;
  commenterId: string;
}

export interface RatingCreatedPayload {
  photoOwnerId: string;
  photoId: string;
  raterId: string;
}

export const Events = {
  PHOTO_CREATED: "photo.created",
  PHOTO_DELETED: "photo.deleted",
  COMMENT_CREATED: "comment.created",
  RATING_CREATED: "rating.created",
} as const;
