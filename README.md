# University Social Platform

A modern social platform built with React, TypeScript, and Vite, designed for university students to connect and interact.

## Prerequisites

Before running this application, make sure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A Supabase account (free tier available at [supabase.com](https://supabase.com))

## Installation

1. Unzip the project folder to your desired location
2. Open a terminal/command prompt
3. Navigate to the 'project' directory:
   ```bash
   cd project
   ```
4. Install the dependencies:
   ```bash
   npm install
   ```

## Running the Application

1. To start the development server:
   ```bash
   npm run dev
   ```
2. Open your web browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Build for Production

If you want to build the application for production:

1. Run the build command:
   ```bash
   npm run build
   ```
2. To preview the production build:
   ```bash
   npm run preview
   ```

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- React Router DOM
- Zustand (State Management)
- Other utilities: date-fns, clsx, react-hot-toast

## Database Setup (Important)

This application uses Supabase as its backend database. To set up the database:

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new Supabase project
3. Set up the following tables in your Supabase database:
   - Users
   - Messages
   - Groups
   - Posts
   - Comments
   - Likes
   - Group_members

4. After creating your project, get your project credentials from:
   - Project Settings -> API
   - Copy the `Project URL` and `anon public` key

5. Create a `.env` file in the project root and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Note: For security reasons, never commit the `.env` file to version control.

## Environment Setup

The application requires a `.env` file in the project root with the following variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Contact the project administrator for the correct environment variables.

## Troubleshooting

If you encounter any issues:

1. Make sure all prerequisites are installed correctly
2. Verify that you're using the correct Node.js version
3. Try deleting the `node_modules` folder and `package-lock.json`, then run `npm install` again
4. Check if all environment variables are set correctly

## Support

For any additional questions or support, please contact the project maintainers.
