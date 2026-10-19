import dotenv from "dotenv";

// Must be the first import of the server entry: other modules read process.env at import time.
// In development the .env file wins over stale variables exported in the terminal.
dotenv.config({ override: process.env.NODE_ENV === "development", quiet: true });
