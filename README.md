🎓 Edyfra

An advanced educational social ecosystem and institutional study platform built to deliver a seamless, high-performance learning experience.

Edyfra is engineered as a unified learning support platform, focusing on peer-to-peer resource sharing, institutional study, and smart matching between students, tutors, and schools. This repository contains the core application architecture, designed with a focus on modern full-stack development, clean UI patterns, and efficient state and data management.

✨ Core Features

Real-Time Study Rooms: Collaborative, low-latency environments for peer-to-peer learning.

Institutional Library System: Secure, fast data handling for educational resources.

Gamified Knowledge Economy: A point-based system rewarding high-quality contributions and active participation.

Smart Matching: Connecting students with the right tutors and study groups based on academic needs.

🛠️ Tech Stack & Architecture

This project is built using a modern, robust, and scalable stack:

Framework: Next.js (App Router)

Language: TypeScript for strict type safety

Database & ORM: Supabase (PostgreSQL) paired with Prisma ORM

Styling: Tailwind CSS for fluid, utility-first layouts

Typography: Optimized utilizing next/font with Geist Sans & Mono

🛑 Code Access & Copyright Notice

Exclusive Copyright (c) 2026 Edyfra. All rights reserved.

This repository is public strictly for code review, portfolio reference, and educational evaluation.

✅ What is permitted: You are welcome to explore the code, analyze the architecture, clone the repository to run it locally for evaluation, or fork the repository within GitHub for individual viewing.

❌ What is strictly prohibited: No permission is granted to copy, modify, redistribute, sublicense, or use any section of this source code in other personal, open-source, or commercial applications.

🚀 Getting Started (Local Development)

To spin up the development server locally and explore the platform, follow these steps:

1. Install Dependencies

npm install
# or
yarn install
# or
pnpm install


2. Configure Environment Variables

Create a .env file in the root directory based on the provided .env.example (if applicable) and configure your database and framework keys. Do not commit your actual .env file to version control.

# Example environment variables needed
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_prisma_database_url


3. Run the Development Server

npm run dev
# or
yarn dev
# or
pnpm dev


Open http://localhost:3000 in your browser to see the live local interface. You can begin exploring the layout logic starting from app/page.tsx.

📦 Deployment

The platform architecture is optimized for seamless, edge-ready deployment on the Vercel Platform. For detailed production deployment guidelines, refer to the official Next.js deployment documentation.
