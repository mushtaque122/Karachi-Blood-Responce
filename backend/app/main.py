from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, ai, auth, blood_banks, blood_requests, donors, hospitals, notifications, users
from app.core.security_headers import SecurityHeadersMiddleware
from app.db.mongodb import ensure_indexes

app = FastAPI(title="Karachi App — Blood Response System API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(donors.router)
app.include_router(blood_requests.router)
app.include_router(hospitals.router)
app.include_router(blood_banks.router)
app.include_router(notifications.router)
app.include_router(ai.router)
app.include_router(admin.router)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()


@app.get("/health")
async def health():
    return {"status": "ok"}
