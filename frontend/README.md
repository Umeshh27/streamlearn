# 💻 Streamify — Frontend Client

> This directory contains the modern **React 19 + Vite** single-page application (SPA) client for **Streamify**.

For complete end-to-end documentation, architecture diagrams, backend specifications, and setup instructions, please refer to the [Root README.md](../README.md).

---

## 🎨 Tech Stack Summary
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v3 + DaisyUI v4 (multi-theme support with 20+ themes)
- **Routing**: React Router v7/v8
- **Server State**: TanStack React Query v5
- **Client State**: Zustand
- **Video & Audio Calling**: `@stream-io/video-react-sdk` (WebRTC + tab audio screen share)
- **Real-Time Chat**: `stream-chat-react` & `stream-chat`
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start development server with LAN host exposure
npm run dev:host

# Production build
npm run build

# Preview production build locally
npm run preview
```

## ⚙️ Environment Variables

Create `.env` in this directory:
```env
VITE_STREAM_API_KEY=your_stream_api_key
```
