# Deelish API Documentation

Base URL: `http://localhost:30000` (Kubernetes) or `http://localhost:3000` (local dev)

All protected routes require:

```
Authorization: Bearer <accessToken>
```

---

## Auth Service

### Register

```
POST /auth/register
```

**Body:**

```json
{
  "username": "string (3-30 chars, alphanumeric + underscore)",
  "password": "string (min 8 chars)",
  "role": "creator | consumer"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "user": {
      "id": "uuid",
      "username": "string",
      "role": "creator | consumer",
      "createdAt": "ISO date"
    }
  }
}
```

---

### Login

```
POST /auth/login
```

**Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "user": {
      "id": "uuid",
      "username": "string",
      "role": "creator | consumer",
      "createdAt": "ISO date"
    }
  }
}
```

---

### Logout

```
POST /auth/logout
```

🔒 Protected

**Response 200:**

```json
{
  "success": true,
  "data": { "message": "Logged out" }
}
```

---

### Get Public Key

```
GET /auth/.well-known/public-key
```

Public. Used internally by other services to verify JWTs.

**Response 200:**

```json
{
  "success": true,
  "data": { "publicKey": "string" }
}
```

---

## Media Service

### Upload Photo

```
POST /media/upload
```

🔒 Protected — creator only

**Body:** `multipart/form-data`

| Field | Type | Description               |
| ----- | ---- | ------------------------- |
| image | File | jpg, png, webp — max 10MB |

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "filename": "string",
    "original_name": "string",
    "mimetype": "string",
    "size": 12345,
    "url": "http://localhost:30000/media/file/uuid.jpg",
    "uploaded_at": "ISO date"
  }
}
```

---

### Serve Image File

```
GET /media/file/:filename
```

Public — no auth required. Use the `url` from the upload response directly in `<img src="...">`.

---

### Get Photo Metadata

```
GET /media/:id
```

🔒 Protected

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "filename": "string",
    "original_name": "string",
    "mimetype": "string",
    "size": 12345,
    "url": "string",
    "uploaded_at": "ISO date"
  }
}
```

---

### Get My Uploads

```
GET /media/my/uploads
```

🔒 Protected — creator only

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "filename": "string",
      "original_name": "string",
      "mimetype": "string",
      "size": 12345,
      "url": "string",
      "uploaded_at": "ISO date"
    }
  ]
}
```

---

### Rename File

```
PATCH /media/:id
```

🔒 Protected — creator only, must own photo

Updates the display filename only. To update title, caption, tags, location,
or people — use `PATCH /social/photos/:id` instead, as that metadata lives
in the Social service.

**Body:**

```json
{
  "originalName": "string"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "original_name": "string"
  }
}
```

---

### Delete Photo

```
DELETE /media/:id
```

🔒 Protected — creator only, must own photo

**Response 200:**

```json
{
  "success": true,
  "message": "Photo deleted"
}
```

---

## Social Service

### Create Post

```
POST /social/photos
```

🔒 Protected — creator only

Called after `POST /media/upload` succeeds. Links the uploaded file to a
social record with metadata.

**Body:**

```json
{
  "mediaId": "uuid (id from media upload response)",
  "url": "string (url from media upload response)",
  "title": "string (required, max 200)",
  "caption": "string (optional, max 1000)",
  "tags": ["string"],
  "location": "string (optional)",
  "people": ["string"]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "media_id": "uuid",
    "user_id": "uuid",
    "username": "string",
    "url": "string",
    "title": "string",
    "caption": "string | null",
    "tags": ["string"],
    "location": "string | null",
    "people": ["string"],
    "created_at": "ISO date"
  }
}
```

---

### Get Feed

```
GET /social/photos?page=1&limit=20
```

🔒 Protected

**Query params:**

| Param | Type   | Default | Description               |
| ----- | ------ | ------- | ------------------------- |
| page  | number | 1       | Page number               |
| limit | number | 20      | Results per page (max 50) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "uuid",
        "media_id": "uuid",
        "user_id": "uuid",
        "username": "string",
        "url": "string",
        "title": "string",
        "caption": "string | null",
        "tags": ["string"],
        "location": "string | null",
        "people": ["string"],
        "created_at": "ISO date",
        "avg_rating": 0.0,
        "rating_count": 0,
        "comment_count": 0
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### Search Photos

```
GET /social/photos/search?q=sunset&page=1&limit=20
```

🔒 Protected

**Query params:**

| Param | Type   | Required | Description        |
| ----- | ------ | -------- | ------------------ |
| q     | string | yes      | Search term        |
| page  | number | no       | Default 1          |
| limit | number | no       | Default 20, max 50 |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "photos": [],
    "query": "sunset",
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

---

### Get Single Photo

```
GET /social/photos/:id
```

Public — auth optional. If a valid token is provided, `userRating` reflects
the authenticated user's rating for this photo.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "media_id": "uuid",
    "user_id": "uuid",
    "username": "string",
    "url": "string",
    "title": "string",
    "caption": "string | null",
    "tags": ["string"],
    "location": "string | null",
    "people": ["string"],
    "created_at": "ISO date",
    "comments": [
      {
        "id": "uuid",
        "photo_id": "uuid",
        "user_id": "uuid",
        "username": "string",
        "body": "string",
        "created_at": "ISO date"
      }
    ],
    "avgRating": 4.5,
    "ratingCount": 12,
    "userRating": 5
  }
}
```

---

### Update Post Metadata

```
PATCH /social/photos/:id
```

🔒 Protected — creator only, must own post

Updates social metadata. All fields are optional — omitted fields are left
unchanged. To rename the underlying file, use `PATCH /media/:id` instead.

**Body:**

```json
{
  "title": "string (optional, max 200)",
  "caption": "string (optional, max 1000)",
  "tags": ["string (optional)"],
  "location": "string (optional)",
  "people": ["string (optional)"]
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "media_id": "uuid",
    "user_id": "uuid",
    "username": "string",
    "url": "string",
    "title": "string",
    "caption": "string | null",
    "tags": ["string"],
    "location": "string | null",
    "people": ["string"],
    "created_at": "ISO date"
  }
}
```

---

### Add Comment

```
POST /social/photos/:id/comment
```

🔒 Protected — any authenticated user

**Body:**

```json
{
  "body": "string (min 1, max 500)"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "photo_id": "uuid",
    "user_id": "uuid",
    "username": "string",
    "body": "string",
    "created_at": "ISO date"
  }
}
```

---

### Rate Photo

```
POST /social/photos/:id/rate
```

🔒 Protected — any authenticated user

Value must be integer 1–5. Calling again updates the existing rating (upsert).

**Body:**

```json
{
  "value": 5
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "photo_id": "uuid",
    "user_id": "uuid",
    "value": 5,
    "created_at": "ISO date"
  }
}
```

---

### Delete Post

```
DELETE /social/photos/:id
```

🔒 Protected — creator only, must own post

**Response 200:**

```json
{
  "success": true,
  "message": "Photo deleted"
}
```

---

## AI Service

### Analyse Image

```
POST /ai/analyse
```

Public — no auth required. Rate limited to 20 requests/minute.

Called by the frontend before upload submission to get caption and tag
suggestions. If this call fails the upload form should still function —
AI suggestions are an enhancement, not a blocker.

**Body:** `multipart/form-data`

| Field | Type | Description               |
| ----- | ---- | ------------------------- |
| image | File | jpg, png, webp — max 10MB |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "caption": "A photo featuring outdoor and people",
    "tags": ["outdoor", "people", "nature", "travel"]
  }
}
```

---

## Search Service

### Search

```
GET /search?q=outdoor&page=1&limit=20
```

🔒 Protected

Uses SQLite FTS5 with porter stemming locally (Elasticsearch on Azure).
Searches across title, caption, tags, location, people, and username.

**Query params:**

| Param | Type   | Required | Description                    |
| ----- | ------ | -------- | ------------------------------ |
| q     | string | yes      | Search term (stemming enabled) |
| page  | number | no       | Default 1                      |
| limit | number | no       | Default 20, max 50             |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "photo_id": "uuid",
        "title": "string",
        "caption": "string",
        "tags": ["string"],
        "location": "string",
        "people": ["string"],
        "username": "string",
        "url": "string",
        "created_at": "ISO date",
        "rank": -1.5
      }
    ],
    "query": "outdoor",
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## Analytics Service

### Get Creator Stats

```
GET /analytics/stats/:userId
```

🔒 Protected

Returns aggregated stats for a creator profile. Returns zeroed counts if
the creator has no activity yet.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "photo_count": 12,
    "total_ratings": 48,
    "comment_count": 23,
    "updated_at": "ISO date"
  }
}
```

---

## Error Responses

All errors follow this shape:

```json
{
  "success": false,
  "error": "Human readable message",
  "code": "ERROR_CODE"
}
```

| Code             | HTTP Status | Meaning                             |
| ---------------- | ----------- | ----------------------------------- |
| UNAUTHORIZED     | 401         | Missing or invalid token            |
| FORBIDDEN        | 403         | Valid token but wrong role          |
| NOT_FOUND        | 404         | Resource does not exist             |
| CONFLICT         | 409         | Username already taken              |
| VALIDATION_ERROR | 400         | Invalid request body                |
| UPLOAD_ERROR     | 400         | File too large or wrong type        |
| GATEWAY_ERROR    | 502         | A downstream service is unavailable |
| INTERNAL_ERROR   | 500         | Unexpected server error             |
