# Sales App

A React Native application built with Expo.

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the app:
   ```
   npm start
   ```

3. Run on platform:
   - `npm run android` - Run on Android
   - `npm run ios` - Run on iOS
   - `npm run web` - Run on web

## Project Structure

- `/screens` - Application screens
- `/components` - Reusable components
- `/assets` - Images and other static assets

# German Steel mobile app

This app is a separate German Steel mobile copy of the Gajkesari field-sales app.
The default API in `config/api.js` is the same German Steel backend used by
the web dashboard. Set `EXPO_PUBLIC_API_URL` to override it for staging or a
local backend. Both apps can therefore affect the same records; use test data
for workflows that create, update, or delete information.

```powershell
$env:EXPO_PUBLIC_API_URL = 'https://your-german-steel-api.example.com'
npx expo start
```

The app identity is `German Steel` and the Android application ID is
`com.germansteel.sales`.

## Running alongside the web dashboard

This mobile project is separate from the sibling `German Steel` web project.
Keep the dashboard running on port 3000. In this project's directory, run:

```powershell
npm install
npm run web -- --port 8081
```

Open the dashboard at `http://localhost:3000` and the mobile web preview at
`http://localhost:8081` in separate tabs. Use a narrow browser viewport for
mobile layout checks. Camera, background location, permissions, and other
native behavior still need testing on Android/iOS, not just the web preview.
