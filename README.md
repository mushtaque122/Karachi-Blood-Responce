# Karachi Blood Response

A comprehensive blood donation management system designed to connect blood donors with those in need. This application streamlines the process of requesting, donating, and tracking blood donations, ensuring timely and efficient blood supply in emergency situations.

## Features

- **User Authentication**: Secure signup and login for donors and requesters.
- **Donor Management**: Donors can register, update their availability, and view their donation history.
- **Request Management**: Users can create blood requests specifying blood type, location, and urgency.
- **Matching System**: Intelligent matching of donors to requests based on blood type, location, and availability.
- **Notifications**: Real-time notifications for new requests, donor matches, and donation updates.
- **Admin Dashboard**: Comprehensive overview of blood inventory, donation statistics, and user management.

## Tech Stack

### Frontend
- **React Native**: Cross-platform mobile application framework.
- **Expo**: Framework for building universal React applications.

### Backend
- **FastAPI**: High-performance Python web framework.
- **Uvicorn**: ASGI server for FastAPI.
- **SQLAlchemy**: ORM for database interaction.
- **Alembic**: Database migration tool.
- **WebSocket**: Real-time communication for instant notifications.

### Database
- **PostgreSQL**: Primary relational database.
- **Redis**: In-memory data store for caching and real-time features.

## Prerequisites

- **Node.js** (18+)
- **npm** or **yarn**
- **Python** (3.11+)
- **PostgreSQL**
- **Redis**
- **Expo Go** app (on mobile devices)

## Installation

### Backend Setup

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd karachi-blood-response-final
    ```

2.  Create a virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r backend/requirements.txt
    ```

4.  Configure environment variables:
    Create a `.env` file in the `backend/` directory with the following:
    ```env
    DATABASE_URL=postgresql://user:password@localhost:5432/kbr
    REDIS_URL=redis://localhost:6379/0
    ```

5.  Initialize the database:
    ```bash
    alembic upgrade head
    ```

6.  Run the development server:
    ```bash
    uvicorn backend.app.main:app --reload --host [IP_ADDRESS] --port 8000
    ```

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the application:
    ```bash
    npm start
    ```
    - To run on Android: Press `a`
    - To run on iOS: Press `i`
    - To run in web browser: Press `w`

## Usage

### Registering a New User
1.  Launch the app on your device.
2.  Click "Don't have an account? Register".
3.  Fill in your details (Name, Email, Phone, Password).
4.  Select your role: "Donor" or "Recipient".
5.  Click "Sign Up".

### Donating Blood
1.  Log in as a donor.
2.  Navigate to the "Donation" tab.
3.  Tap "Mark as Available" to set your status to available.
4.  You will receive notifications when there are nearby blood requests.

### Requesting Blood
1.  Log in as a recipient.
2.  Navigate to the "Requests" tab.
3.  Tap "New Request".
4.  Fill in the required details (Blood Type, Location, Additional Information).
5.  Submit the request.

### Admin Dashboard
1.  Log in with admin credentials.
2.  Access the admin panel from the main menu.
3.  View statistics, manage users, and monitor donations.

## Project Structure

```
karachi-blood-response-final/
├── frontend/             # React Native application
│   ├── src/
│   │   ├── screens/      # Screen components
│   │   ├── components/   # Reusable components
│   │   ├── services/     # API services
│   │   ├── navigation/   # Navigation configuration
│   │   └── store/        # Redux store
│   └── package.json
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── donations.py
│   │   │   │   │   ├── requests.py
│   │   │   │   │   └── users.py
│   │   │   │   ├── deps.py
│   │   │   │   └── routes.py
│   │   │   └── endpoints/   # Legacy endpoints
│   │   ├── core/         # Core modules
│   │   │   ├── config.py    # Configuration
│   │   │   ├── security.py  # Security utilities
│   │   │   ├── email.py     # Email services
│   │   │   └── websocket.py # WebSocket manager
│   │   ├── db/           # Database
│   │   │   ├── base.py      # Base
│   │   │   ├── models/      # SQLAlchemy models
│   │   │   ├── session.py   # Session management
│   │   │   └── utils.py     # DB utilities
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── main.py       # FastAPI app entry point
│   │   └── main_fastapi.py # Alternative entry point
│   ├── migrations/       # Alembic migrations
│   ├── requirements.txt  # Python dependencies
│   ├── alembic.ini       # Alembic configuration
│   └── README.md
├── .gitignore            # Git ignore rules
├── requirements.txt      # Root requirements
└── README.md             # Project documentation
```

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

## License

This project is licensed under the MIT License.
