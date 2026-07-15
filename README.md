# DevConnect

DevConnect is a full-stack social platform for developers. Members can create a developer profile, upload a profile picture and cover photo, publish posts with images, connect with other developers, collaborate on projects, and chat in real time.

## Included features

- Email/OTP and Google authentication with access-token refresh
- Editable profiles: bio, skills, location, social links, profile image, and cover image
- Public developer profiles and global search
- Public or connections-only posts, image posts, likes, comments, and sharing
- Connection requests, suggestions, accept/reject flows, and notifications
- Direct Socket.IO messaging and project group chat
- Public/private project collaboration, join requests, and member management
- Responsive React interface for desktop and mobile

## Tech stack

- Client: React, Vite, Tailwind CSS, React Query, Socket.IO Client
- Server: Express, MongoDB/Mongoose, Socket.IO, JWT, Cloudinary, Nodemailer

## Run locally

Requirements: Node.js 20+, MongoDB (local or Atlas), and Cloudinary credentials for image uploads.

1. Create configuration files from the templates:

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

2. Fill in `server/.env`. At minimum configure `MONGO_URI`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and all three Cloudinary values. Configure the Google/email values only when using Google sign-in or email OTP delivery.

3. Start the API in one terminal:

   ```bash
   cd server
   npm install
   npm run dev
   ```

4. Start the client in a second terminal:

   ```bash
   cd client
   npm install
   npm run dev
   ```

Open `http://localhost:3000`.

## Quality checks

```bash
cd client && npm run lint && npm run build
cd ../server && npm run check
```

## Image uploads

The profile editor uploads avatar and cover images immediately. Post images use the same Cloudinary integration. The backend accepts image files up to 5 MB and safely removes temporary uploads after processing.

## Environment notes

- `VITE_API_URL` defaults to `/api` for Vite development and can be set to a deployed API URL.
- `VITE_SOCKET_URL` should point to the Socket.IO server.
- `CLIENT_URL` can contain comma-separated allowed browser origins.
- When email OAuth credentials are omitted in development, verification OTPs are printed in the API terminal. Production requires configured email delivery.
- Never commit `.env` files; templates are included for safe setup.
