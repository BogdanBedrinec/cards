# Flashcards App (Full-Stack)
A clean full-stack flashcards web app for language learning with spaced repetition, topics (decks), statistics, and import/export.

This project is built as a portfolio-ready demo to showcase real full-stack skills:
React frontend + Express API + MongoDB + JWT authentication.

### Authentication
- Register / Login
- JWT token authentication
- Protected `/flashcards` route
- Auto logout + redirect to login on `401 Unauthorized`

### Flashcards
- Create flashcards (word, translation, example, deck)
- Review mode (spaced repetition via `nextReview`)
- “I know / I don’t know” review actions
- Topics / Decks support (deck filtering + deck list)

### Statistics
- Total cards
- Due now
- Reviewed today
- Accuracy
- Learned / Remaining (based on a learned threshold)

### Import / Export
- Export cards as JSON or CSV
- Import cards from JSON or CSV
- Duplicate protection

### UI / UX
- Clean responsive design
- Dark / Light theme
- UI language switch (EN / DE / UK)

### Frontend
- React + Vite
- React Router

### Backend
- Node.js + Express
- JWT authentication
- CORS configuration

### Database
- MongoDB
- Mongoose ODM

