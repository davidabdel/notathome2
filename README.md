# Not At Home

A mobile-first web application designed to help missionaries track "Not At Home" locations during door-to-door outreach.

## Features

- **Session Management**
  - Group Overseers can start and manage sessions
  - 6-digit codes for instant map sharing
  - Real-time collaboration between volunteers

- **Location Tracking**
  - Geolocation support for automatic address capture
  - Manual address entry option
  - Real-time map updates

- **Congregation Management**
  - PIN-protected congregation access
  - Admin approval system for new congregations
  - Territory map management

- **Security**
  - Row-Level Security (RLS) for data isolation
  - Secure PIN hashing with pgcrypto
  - Protected congregation data

## Tech Stack

- **Frontend**: React (TypeScript) + Material-UI
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Deployment**: Vercel + GitHub Actions

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/davidabdel/notathome2.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## User Roles

- **Group Overseer**: Manages sessions and shares access codes
- **Volunteer**: Records "Not At Home" addresses in real-time
- **Congregation Admin**: Manages congregation maps and PINs
- **Super Admin**: Approves/rejects congregation requests

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and confidential. All rights reserved.

---
Built with ❤️ for making missionary work more efficient 