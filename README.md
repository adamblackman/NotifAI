# bolt-hackathon

A comprehensive goal-tracking and habit-building mobile app built with React Native, Expo, and Supabase.

## About

Did mostly everything in bolt front-end skeleton then database setup, edge functions, notifications, AI implementation and prompts. Brought into Cursor for a few more minor things like formatting and branding.

## Features

- **Goal Management**: Create and track goals across multiple categories (habits, projects, learning, saving)
- **AI-Powered Goal Generation**: Intelligent goal suggestions using Supabase Edge Functions
- **Progress Tracking**: Visual progress indicators and XP system with gamification elements
- **Smart Notifications**: Personalized push notifications with customizable scheduling
- **User Profiles**: Level progression, achievement medals, and user preferences
- **Multi-Category Support**:
  - **Habits**: Daily habit tracking with streak counters
  - **Projects**: Task-based project management with completion tracking
  - **Learning**: Educational goals with progress milestones
  - **Saving**: Financial goal tracking with target amounts

## Tech Stack

- **Frontend**: React Native with Expo
- **Styling**: NativeWind (Tailwind for React Native)
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Notifications**: Expo Notifications
- **AI Integration**: OpenAI API via Supabase Edge Functions

## Project Structure

```
├── app/                    # Expo Router pages
├── components/            # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── forms/            # Goal creation forms
│   ├── goals/            # Goal-related components
│   ├── tracking/         # Progress tracking components
│   └── ui/               # Base UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries and configurations
├── supabase/            # Supabase configuration and functions
│   ├── functions/       # Edge Functions
│   └── migrations/      # Database migrations
└── types/               # TypeScript type definitions
```

## Supabase Integration

This project uses Supabase for backend services including:
- User authentication and profiles
- Goal and preference data storage
- AI-powered goal generation via Edge Functions
- Push notification scheduling and delivery

**Organization Slug**: `lvdmjsshlrxpzjsjdnji` (integrated for Bolt Hackathon challenge)

## Database Schema

- **profiles**: User profiles with XP, levels, and achievements
- **goals**: Goal storage with category-specific data and progress tracking
- **preferences**: User notification preferences and personality settings

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase project and configure environment variables
4. Run the development server: `npx expo start`
5. Choose your platform (iOS/Android/Web)

## Edge Functions

The app includes several Supabase Edge Functions:
- `generate-goal`: AI-powered goal creation
- `generate-notifications`: Smart notification generation
- `send-notifications`: Push notification delivery

---

*Built for the Bolt Hackathon - demonstrating the power of rapid development with modern tools and AI assistance.*
