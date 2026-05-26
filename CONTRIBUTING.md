# How to Contribute to Edyfra

## Before You Start
- Read TEAM.md to understand your scope
- Read SCOPE.md for your specific role
- Make sure you have the correct .env variables 
  for your area — get them from Mash directly
- Never use your own API keys in this project

## Setting Up Locally
1. Clone the repo
2. Run npm install
3. Add your .env.local file (get from Mash)
4. Run npm run dev
5. Your local app should run on localhost:3000

## Workflow for Every Change
1. Pull latest from dev: git pull origin dev
2. Create your feature branch from dev: 
   git checkout -b feat/your-feature-name
3. Make your changes — stay in your scope
4. Test it locally before committing
5. Commit with a clear message:
   git commit -m "feat: describe what you changed"
6. Push your branch: git push origin feat/your-feature-name
7. Open a Pull Request to dev on GitHub
8. Write a clear PR description (see template below)
9. Wait for Mash to review and approve
10. Never merge your own PR

## Pull Request Template
Every PR must include:
- What did you change?
- Why did you change it?
- What pages or features does it affect?
- Did you test it locally? Yes/No
- Any environment variables added or changed?
- Screenshots if it is a UI change

## What NOT to Do
- Do not push to main
- Do not modify files outside your scope
- Do not install new npm packages without 
  telling Mash first (package size matters)
- Do not hardcode any API keys
- Do not remove or modify database migrations 
  without Mash approval
- Do not change middleware.ts or next.config.js

## AI Coding Tools
If you are using Antigravity, Cursor, or any 
AI coding tool, always start your session with:
"I am working on the Edyfra platform. My scope 
is [your scope from SCOPE.md]. Do not suggest 
changes outside this scope."
This prevents the AI from modifying files 
that belong to other developers.
