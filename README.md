# NotifAI

Your AI-powered buddy to remind you anything you need right when you need it.

## About

NotifAI is your AI-powered reminder buddy—designed to make habits stick, projects finish, and progress feel fun.

Turn your ideas into actionable plans through a single thought-dump prompt, or create goals manually across four key areas: habits, projects, learning, and saving. NotifAI helps you stay on track with smart, recurring reminders inside your preferred daily time window.

Each completion earns XP, builds streaks, and unlocks category-specific achievements—so even small wins feel like progress. Whether it’s drinking more water, finishing a side project, or saving for something big, NotifAI nudges you kindly in the right direction.

Start building better habits and accomplishing your goals with NotifAI—your AI reminder buddy that makes progress feel good.

## Features

- Thought-dump or manual goal creation  
- Habit, Project, Learning, and Saving trackers  
- Personalized reminder window  
- XP-based level-up system and achievement medals  
- Friendly, minimal interface with smooth motion  
- Personality settings to choose your reminder tone (e.g., Serious, Funny, Motivating)

## Tech Stack

- **Frontend**: React Native with Expo (Expo SDK 52.0.30, Expo Router 4.0.17)  
- **Styling**: `StyleSheet.create`  
- **Backend**: Supabase (Database, Authentication, Edge Functions)  
- **Notifications**: Expo Notifications  
- **AI Integration**: OpenAI API via Supabase Edge Functions  
- **Animations**: `react-native-reanimated`  
- **Gestures**: `react-native-gesture-handler`  
- **Date/Time Pickers**: `@react-native-community/datetimepicker`  
- **Sliders**: `@react-native-community/slider`  
- **Async Storage**: `@react-native-async-storage/async-storage`  
- **Icons**: `lucide-react-native`  
- **Navigation**: `expo-router`  
- **Development Tooling**: Built primarily using [**Bolt**](https://bolt.build/) for integrations and core feature development, then refined in **Cursor** for style and precision.

## Project Structure

```
<code block omitted for brevity>
```

## Supabase Integration

This project uses Supabase for backend services including:

- User authentication and profiles  
- Goal and preference data storage  
- AI-powered goal generation via Edge Functions  
- Push notification scheduling and delivery  
- Organization Slug: `lvdmjsshlrxpzjsjdnji` (Bolt Hackathon entry)

## Database Schema

### `profiles`
<schema table omitted for brevity>

### `goals`
<schema table omitted for brevity>

### `preferences`
<schema table omitted for brevity>

### `device_tokens`
<schema table omitted for brevity>

### `scheduled_notifications`
<schema table omitted for brevity>

## Edge Functions

- `generate-goal`: Uses OpenAI to generate goals from user input  
- `generate-notifications`: Creates smart notifications based on preferences  
- `send-notifications`: Dispatches scheduled push notifications  
- `complete-goal-action`: Updates goals when completed from push notification  
- `delete-user`: Safely deletes user data across Supabase services  

## Getting Started

```bash
git clone <repository-url>
cd notifai
npm install
```

1. Create a Supabase project  
2. Apply database migrations from `supabase/migrations`  
3. Set up environment variables like `OPENAI_API_KEY`  
4. Start the dev server:

```bash
npx expo start
```

## Important Constraints & Best Practices

### Platform

- Web is the default platform  
- Avoid native-only APIs unless Platform.select() is used  
- `useFrameworkReady` in `app/_layout.tsx` is mandatory and must not be modified

### Styling

- Use `StyleSheet.create` exclusively  
- Do NOT use NativeWind or other style libraries

### Navigation

- Tabs powered by `expo-router` using `app/(tabs)/` layout  
- Root layout: `app/_layout.tsx`  
- Tab layout: `app/(tabs)/_layout.tsx`

### Fonts

- Use `@expo-google-fonts` only  
- Load fonts using `useFonts` and `SplashScreen.preventAutoHideAsync()`

### Environment Variables

- Use Expo’s `.env` system  
- Type definitions in `types/env.d.ts`

### Error Handling

- Prefer inline UI error messages  
- Avoid `Alert` API

### Payments

- Use **RevenueCat** for subscriptions  
- Stripe is NOT supported for mobile platforms  
- RevenueCat SDK must be installed locally for full testing

---

_Built for the Bolt Hackathon — showcasing fast development using modern frameworks, Bolt integrations, and OpenAI. Most major features and integrations were built with Bolt, with refinement and style enhancements done inside Cursor._
