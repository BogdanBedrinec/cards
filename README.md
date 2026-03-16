# Flashcards — Spaced Repetition Vocabulary App

Full-stack flashcards web app for vocabulary learning with interval-based spaced repetition (`nextReview`).

## Links
- 🚀 App: https://cards-6rxm.onrender.com  
- 🛠️ API: https://cards-api-a10o.onrender.com  
- ▶️ Video (watch): https://github.com/BogdanBedrinec/cards/releases/tag/v1.0.0  
- ⬇️ Video (mp4): https://github.com/BogdanBedrinec/cards/releases/download/v1.0.0/Cards.video.mp4  

**Demo account:** `demo@demo.com` / `demo12345`

## Features
- Review mode: flip → mark known/unknown
- Library: search, sorting, edit & delete
- Import / Export (JSON / CSV)
- Stats + due scheduling
- Dark/Light mode + DE/EN/UK UI
- JWT auth + REST API

## Run locally

Open **two terminals**.

### 1) Backend
bash
cd server
npm install
node index

Create server/.env:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret
PORT=5000

Backend runs on: http://localhost:5000

2) Frontend
cd client
npm install
npm run dev

Frontend runs on: http://localhost:5173

(Optional) client/.env:

VITE_API_URL=http://localhost:5000

Tech: React (Vite) • Node/Express • MongoDB • JWT

Author

Bohdan — https://github.com/BogdanBedrinec