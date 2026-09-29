# Dhaka Tesla Pool

Share a seat. Split the fare. Survive Dhaka traffic.

**Live Application**: [https://dhaka-tesla-pool-delta.vercel.app](https://dhaka-tesla-pool-delta.vercel.app) | **API Base**: [https://dhaka-tesla-pool-mahin.onrender.com](https://dhaka-tesla-pool-mahin.onrender.com)

---

## 1. Summary

Dhaka Tesla Pool is an enterprise-grade ride-sharing and dynamic seat-pooling platform engineered specifically for the dense urban geography of Dhaka, Bangladesh. The system coordinates electric vehicle fleets (Tesla Model 3) operating along high-volume transit corridors such as the Gulshan Axis and Airport Highway. 

The platform provides passengers with instant upfront pricing, atomic seat reservations, and real-time in-flight matching, culminating in transparent cash settlement receipts with two-way qualitative ratings. For drivers, it provides a dedicated tactical cockpit with staging hub selection, radar scanning for candidate requests within proximity bounds, and an active pool manifest manager.

---

## 2. Problem Statement

Dhaka is one of the most densely populated megacities in the world, characterized by severe traffic gridlock, prolonged commute times, and heavy vehicular emissions. Key structural transit challenges in Dhaka include:

1. **Severe Road Inefficiencies & Single-Occupancy Vehicles**: Private cars and ride-hailing vehicles often carry a single commuter along congested arterial corridors (such as Uttara to Motijheel), multiplying congestion and tailpipe pollution.
2. **Topographical Bottlenecks & Winding Routes**: Urban geography is intersected by physical barriers like Banani Lake and Gulshan Lake. Straight-line Euclidean distance calculations drastically underestimate real travel distances and transit times, leading to inaccurate fares and inefficient dispatch.
3. **High-Concurrency Seat Claim Races**: In high-demand ride-pooling platforms, multiple commuters frequently compete for the last open seat in a passing vehicle. Naive application checks suffer from Time-of-Check to Time-of-Use (TOCTOU) race conditions, leading to overbooking and vehicle capacity violations.
4. **Counter-Productive Backtracking in Detours**: Conventional ride pooling frequently matches riders with divergent or opposing trajectories, forcing drivers into impossible U-turns across crowded Dhaka medians and adding frustrating detours.

Dhaka Tesla Pool addresses these challenges through a deterministic corridor-based matching engine, a 1.6x Dhaka street winding factor, atomic conditional SQL concurrency defenses, and dynamic in-flight pooling.

---

## 3. Features Implemented

### Passenger Experience
- **Interactive Booking Sheet**: Commuters choose pickup and dropoff points across major Dhaka macro-zones (Uttara, Airport, Bashundhara, Banani, Mohakhali, Gulshan 1, Gulshan 2, Dhanmondi, Farmgate, Motijheel).
- **Upfront Deterministic Fare Calculation**: 0ms calculation providing upfront quotes in integer poysha before booking confirmation, with automatic 20% pooling discounts.
- **Real-Time 5-Stage Stepper Tracker**: Live status updates tracking ride stages: `REQUESTED` -> `MATCHED` -> `DRIVER_ARRIVED` -> `STARTED` -> `COMPLETED`.
- **Driver Visibility with Rating**: Displays driver identity, vehicle details (Tesla Model 3 "Bullet"), and historical driver rating (e.g., 4.9 / 5.0).
- **Safe Pre-Departure Cancellation**: Passengers can cancel booking while in `REQUESTED` or `MATCHED` status; cancellation is strictly forbidden once transit has `STARTED`.
- **Itemized Trip Receipt**: Displays breakdown of base fare, distance charge, pooled discount savings, and cash collection status.
- **5-Star Rating Modal**: Passengers can rate completed trips (1 to 5 stars) with quick-select feedback tags (Clean Car, Polite Driver, Smooth Driving, AC Comfort) and optional comments.

### Driver Cockpit & Fleet Operations
- **Staging Area Hub Dispatch**: Drivers select their depot hub (e.g., Banani) when staging; location changes are locked while an active trip is in progress.
- **Online/Offline Radar Switch**: Toggle availability to begin scanning for passenger ride requests.
- **Proximity-Bounded Dispatch Radar**: Candidates are filtered by physical distance to driver staging location (within 2.5 km threshold).
- **Corridor Compatibility Badges**: Displays pickup distance, dropoff distance, and detour overhead ratio for prospective riders.
- **Atomic One-Click Seat Claim**: Claims seats with PostgreSQL transaction isolation, preventing overbooking races.
- **Pool Lifecycle Controls**: Step-by-step progression through `Arrived at Pickup`, `Start Trip`, and `Complete Trip`.
- **Dynamic En-Route In-Flight Matching**: Radar remains active during transit (`STARTED` status), enabling drivers to onboard downstream passengers along the corridor with retroactive overlap fare discounts.
- **Cash Settlement Summary**: On trip completion, drivers receive an itemized manifest of cash to collect from each onboard passenger.

### Security, Concurrency & Data Integrity
- **Zero-Overbooking Guarantee**: Atomic conditional SQL updates (`WHERE seats_available >= requested`) prevent concurrency races.
- **Integer Financial Precision**: All monetary values are handled and stored in integer poysha (1 BDT = 100 poysha) to eliminate floating-point drift.
- **Directional Monotonicity Vectoring**: Ensures pooled passengers travel in the same corridor direction (`dirA * dirB > 0`), avoiding U-turns.
- **BOLA / IDOR Protection**: `RideOwnershipGuard` ensures users can only access or modify their own rides.
- **Sanitized Global Error Envelope**: RFC-7807 compliant error format preventing internal stack leakage.

---

## 4. Screenshots & Interface Previews

### Authentication Portal
Secure login and role-based registration supporting passengers and drivers:
![Authentication Portal](docs/screenshots/login-page.png)

### Passenger Booking Sheet
Real-time Dhaka macro-zone selector with instant upfront integer fare quotes:
![Passenger Booking Sheet](docs/screenshots/passenger-booking.png)

### Real-Time Passenger Trip Tracker
5-stage live status stepper tracking driver assignment, vehicle specs, driver rating, and trip progress:
![Passenger Trip Tracker](docs/screenshots/passenger-tracker.png)

### Driver Staging Depot & Candidate Radar
Staging hub selection with 2.5 km proximity filter and candidate match compatibility cards:
![Driver Staging and Radar](docs/screenshots/driver-radar.png)

### Driver Active Trip Cockpit
Active transit manifest with dynamic en-route downstream candidate matching and trip lifecycle controls:
![Driver Active Trip Cockpit](docs/screenshots/driver-cockpit.png)

### Trip Completion Receipt & Rating Modal
Itemized cash collection breakdown with interactive 1 to 5 star rating submission and feedback chips:
![Trip Completion Receipt and Rating Modal](docs/screenshots/trip-rating-modal.png)

---

## 5. System Architecture

```mermaid
graph TB
    subgraph ClientLayer ["Frontend Client (React 19 + Vite + Tailwind CSS)"]
        PassengerView["Passenger Terminal (/passenger)<br/>Upfront Fare Estimate & 5-Step Stepper Tracker"]
        DriverView["Driver Cockpit (/driver)<br/>Staging Hub Dispatch, Candidate Radar & Lifecycle"]
        AuthView["Auth Portal (/login)<br/>Role-Based JWT Session Hydration"]
    end

    subgraph APILayer ["Backend Core API (NestJS 11 on Node.js 20)"]
        AuthGuards["JwtAuthGuard & RolesGuard"]
        IDORGuard["RideOwnershipGuard (BOLA Defense)"]
        
        subgraph CoreEngines ["Domain Engines"]
            FareEngine["FaresService (Integer Poysha Math)"]
            MatchEngine["MatchingService (Corridors & Dual Detour Cap)"]
            PoolEngine["PoolsService (State Machine & Concurrency)"]
        end
        
        ExceptionFilter["HttpExceptionFilter (Sanitized RFC-7807 Error Envelope)"]
    end

    subgraph StorageLayer ["Database Layer (PostgreSQL 16 Alpine via Prisma)"]
        PostgresDB[("PostgreSQL 16<br/>Atomic Row Locks & Capacity Constraints")]
    end

    PassengerView -->|REST / HTTPS| AuthGuards
    DriverView -->|REST / HTTPS| AuthGuards
    AuthView -->|POST /auth/login| APILayer
    AuthGuards --> IDORGuard
    IDORGuard --> CoreEngines
    CoreEngines --> ExceptionFilter
    CoreEngines -->|Prisma TCP Connection| PostgresDB
```

---

## 6. Entity Relationship Diagram (ERD)

![Database Entity Relationship Diagram](./docs/ERD/erd.svg)

---

## 7. Tech Stack, Project Structure & Prerequisites

### Tech Stack
- **Backend**: NestJS 11, Node.js 20, TypeScript, Prisma ORM 5.
- **Frontend**: React 19, Vite, Tailwind CSS 3, React Router 7, TanStack Query (React Query).
- **Database**: PostgreSQL 16 Alpine.
- **Testing**: Jest, Supertest, ts-jest.
- **DevOps & Containers**: Docker, Docker Compose, Nginx Alpine.

### Project Structure
```text
Dhaka_Tesla_Pool/
|-- Client/                         # React 19 + Vite Frontend Application
|   |-- src/
|   |   |-- api/                    # Centralized API client & HTTP interceptors
|   |   |-- components/
|   |   |   |-- driver/             # Driver radar, staging & cockpit components
|   |   |   +-- passenger/          # Booking form, tracker & rating modal
|   |   |-- context/                # Authentication & Session state
|   |   |-- pages/                  # Route views (LoginPage, PassengerPage, DriverPage)
|   |   +-- types/                  # Shared TypeScript interfaces & DTOs
|   |-- Dockerfile                  # Multi-stage production build (Node build -> Nginx)
|   +-- nginx.conf                  # Nginx reverse proxy & SPA history fallback
|-- Server/                         # NestJS 11 Backend Application
|   |-- prisma/
|   |   |-- schema.prisma           # Relational schema with CHECK constraints
|   |   +-- seed.ts                 # Pre-populated Dhaka zones & story cast
|   |-- src/
|   |   |-- auth/                   # JWT auth, bcrypt hashing & role guards
|   |   |-- common/                 # Ownership guards & RFC-7807 exception filter
|   |   |-- fares/                  # Pure integer poysha fare calculation engine
|   |   |-- matching/               # Corridor vectors, Haversine 1.6x & detour math
|   |   |-- pools/                  # Atomic seat claims, concurrency & lifecycle
|   |   |-- ride-requests/          # Passenger booking & rating submission
|   |   |-- teslas/                 # Vehicle registration & online toggle
|   |   +-- zones/                  # Zone geospatial lookup
|   |-- test/                       # E2E integration test suite (Supertest)
|   +-- Dockerfile                  # Production Node.js 20 image
|-- docker-compose.yml              # Multi-container orchestration (DB, API, Client)
|-- .env.example                    # Template environment variables
+-- README.md                       # System documentation
```

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker**: Docker Engine 24.x+ and Docker Compose v2.x+
- **PostgreSQL**: v16.x (only if running without Docker)

---

## 8. Environment Variables

All sensitive values are parameterized through environment files. Never commit production secrets.

### Root `.env.example`
```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=dhaka_tesla_pool
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5434/dhaka_tesla_pool?schema=public

# JWT Secrets and Expirations
JWT_ACCESS_SECRET=your_jwt_access_secret_key_minimum_32_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_minimum_32_characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server and Client Ports
PORT=4000
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
VITE_API_URL=http://localhost:4000
```

---

## 9. Local Setup & Docker Instructions

### Method A: Docker Compose

Run the entire platform (PostgreSQL, NestJS API, and React Client) in isolated containers:

```bash
# Clone the repository
git clone https://github.com/mahin273/Dhaka_Tesla_Pool.git
cd Dhaka_Tesla_Pool

# Build and start all services
docker compose up -d --build
```

Container endpoints:
- **Frontend Client**: `http://localhost:5174`
- **Backend API**: `http://localhost:4000`
- **PostgreSQL Database**: `localhost:5434`

To tail backend server logs:
```bash
docker compose logs -f server
```

To stop all services:
```bash
docker compose down
```

---

### Method B: Manual Local Setup

#### 1. Database Setup
Start a local PostgreSQL instance on port `5434` (or configure port `5432` in `Server/.env`):
```bash
createdb -U postgres -h localhost -p 5434 dhaka_tesla_pool
```

#### 2. Backend Server Setup
```bash
cd Server
npm install

# Push Prisma schema and seed initial zones & test users
npx prisma db push
npx prisma db seed

# Start development server
npm run start:dev
```
The backend API starts at `http://localhost:4000`.

#### 3. Frontend Client Setup
```bash
cd ../Client
npm install

# Start development server
npm run dev
```
The web client starts at `http://localhost:5173` (or `http://localhost:5174`).

---

## 10. Automated Tests & Demo Credentials

### Running Tests

#### Unit Test Suite
Covers pure fare calculation algorithms, Haversine geospatial calculations, ownership authorization guards, and exception filters:
```bash
cd Server
npm test
```
*Result: 5 test suites passed, 42 tests passed.*

#### End-to-End (E2E) Integration Suite
Executes integration tests against a live PostgreSQL database, validating real concurrency races, state machine enforcement, in-flight matching, and ratings:
```bash
cd Server
npm run test:e2e
```
*Result: 1 test suite passed, 13 integration scenarios passed.*

### Seeded Story Cast & Demo Credentials

The database seed script (`Server/prisma/seed.ts`) pre-populates all Dhaka transit zones and four test personas:

| Role | Persona | Email | Password | Details |
|---|---|---|---|---|
| **Driver** | Captain Jashim Uddin | `jashim@tesla.dhaka` | `Password123!` | Tesla Model 3 "Bullet" (3 Seats, Staged in Banani) |
| **Passenger 1** | Nusrat Jahan | `nusrat@tesla.dhaka` | `password123` | Banani to Mohakhali commuter |
| **Passenger 2** | Rafiq Ahmed | `rafiq@tesla.dhaka` | `password123` | Banani to Gulshan 1 downstream rider |
| **Passenger 3** | Shirin Akter | `shirin@tesla.dhaka` | `password123` | Dhanmondi to Farmgate cross-town commuter |

---

## 11. Deployment URLs & API Overview

### Deployment URLs
- **Web Application (Vercel)**: [https://dhaka-tesla-pool-delta.vercel.app](https://dhaka-tesla-pool-delta.vercel.app)
- **Backend API (Render)**: [https://dhaka-tesla-pool-mahin.onrender.com](https://dhaka-tesla-pool-mahin.onrender.com)
- **Local Development / Docker Staging**: `http://localhost:5174` (Client), `http://localhost:4000` (API)

### API Endpoint Overview

#### Authentication (`/auth`)
- `POST /auth/signup`: Register passenger or driver with auto-provisioned vehicle.
- `POST /auth/login`: Authenticate and obtain JWT access token.
- `POST /auth/refresh`: Refresh expired JWT access token.

#### Driver Operations (`/drivers/me`)
- `GET /drivers/me/tesla`: Retrieve vehicle state, capacity, and current staging zone.
- `PATCH /drivers/me/online-status`: Toggle driver availability on/off.
- `PATCH /drivers/me/location`: Set staging depot (locked while active trip is in progress).

#### Ride Requests (`/ride-requests`)
- `POST /ride-requests`: Book ride with upfront integer fare quote.
- `GET /ride-requests/me`: Fetch passenger ride history and active tracker status.
- `GET /ride-requests/:id`: Fetch specific ride details (Ownership guarded).
- `POST /ride-requests/:id/rate`: Submit 1 to 5 star rating with tag chips (Idempotent).
- `POST /ride-requests/:id/cancel`: Cancel ride prior to departure.

#### Pool Operations (`/pools`)
- `GET /pools/candidates`: Scan corridor candidate radar for empty-car and in-flight pickups.
- `POST /pools/claim`: Atomically reserve vehicle seats and bind riders to a pool.
- `POST /pools/:id/arrive`: Transition pool status from `MATCHED` to `DRIVER_ARRIVED`.
- `POST /pools/:id/start`: Transition pool status from `DRIVER_ARRIVED` to `STARTED`.
- `POST /pools/:id/complete`: Complete journey, restore vehicle seats, and log cash payments.
- `GET /pools/:id`: Retrieve active pool manifest.

---

## 12. Key Decisions, Architectural Trade-offs & Engineering Assumptions

### Distance Calculation Formula: Haversine with 1.6x Dhaka Winding Factor

The matching and pricing engines calculate travel distances using two complementary mathematical models:

1. **Great-Circle Haversine Formula**:
   $$\text{distance} = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)}\right)$$
   *(where R = 6371 km, Earth's mean radius)*

2. **Dhaka Urban Winding Road Multiplier**:
   $$\text{roadDistanceKm} = \text{round}(\text{haversineDistanceKm} \times 1.6 \times 10) / 10$$

#### Why This Mathematical Approach?

- **Why NOT Simple Euclidean Distance ($\sqrt{\Delta x^2 + \Delta y^2}$)?**
  - Latitude and longitude are spherical angles on an oblate spheroid, not flat Cartesian coordinates.
  - At Dhaka's latitude (~23.8 degrees North), degrees of longitude are significantly shorter than degrees of latitude due to meridian convergence. Planar Euclidean calculations distort distances and introduce unacceptable routing errors.
- **Why NOT Google Maps Distance Matrix API?**
  - **Sub-Microsecond Latency (0ms vs. 250ms - 800ms)**: Instant upfront fare estimation without blocking network round-trips. When drivers evaluate 10-20 candidate pairings on radar every 2.5 seconds, local math executes in memory with zero UI lag.
  - **Zero Cost & No Rate Limits**: Commercial distance APIs charge per matrix element. Continuous high-frequency candidate polling across hundreds of active users would generate thousands of dollars in monthly API costs and risk quota throttling.
  - **Offline & Autonomous Operation**: The matching engine runs completely self-contained within Docker containers, independent of third-party network connectivity or API key validity.
- **Why the 1.6x Multiplier Specifically for Dhaka?**
  - Straight-line distance is physically impossible to traverse in Dhaka due to natural water barriers (Banani Lake, Gulshan Lake, Hatirjheel) and transportation infrastructure (railway corridors, one-way elevated flyover ramps).
  - For instance, Banani to Mohakhali is approximately 1.4 km straight-line, but the real-world driving distance is approximately 2.3 km ($1.4 \times 1.6 \approx 2.24\text{ km}$). The calibrated 1.6x factor bridges pure geometry and urban topography accurately.

---

### Core Architectural Trade-offs

1. **PostgreSQL Row-Level Locks vs. Distributed Redis Redlock**:
   - *Decision*: Solved seat-claim concurrency using atomic conditional SQL statements (`UPDATE teslas SET seats_available = seats_available - $requested WHERE id = $id AND seats_available >= $requested`) backed by a database-level `CHECK (seats_available >= 0)` constraint.
   - *Trade-off*: Leverages ACID transaction guarantees in PostgreSQL without introducing the operational complexity and failure modes of maintaining a separate Redis cluster for MVP scale.
2. **Integer Poysha vs. Floating-Point Numbers**:
   - *Decision*: Stored and computed all fares in integer poysha (1 BDT = 100 poysha).
   - *Trade-off*: Eliminates floating-point rounding errors (such as 0.1 + 0.2 !== 0.3) across discount calculations and repeated additions, guaranteeing exact poysha-level settlement without rounding discrepancies.
3. **Short-Polling vs. WebSocket Infrastructure**:
   - *Decision*: Client utilizes TanStack Query polling intervals (2 to 3 seconds) for the ride tracker and candidate radar.
   - *Trade-off*: Highly resilient against intermittent mobile network disconnects and server restarts, simplifying deployment behind standard HTTP load balancers for MVP.

---

### Key Engineering Assumptions

Throughout the project design and implementation, the following deliberate domain assumptions were made:

1. **Geographic & Topographical Assumptions**:
   - **Macro-Zone Centroids**: Trips are booked and priced based on representative center coordinates of predefined Dhaka zones rather than fine-grained doorstep GPS pins or narrow alleys.
   - **Corridor Directional Monotonicity**: Transit follows linear ordered axis vectors (e.g. `GULSHAN_AXIS`). Matching requires both riders to travel in the same directional vector (`dirA * dirB > 0`), forbidding U-turns across divided medians.
   - **Proximity & Detour Bounds**: Empty-car dispatch is restricted to candidates within 2.5 km of the driver's staging hub, and pooled rider pickup clustering is capped at 1.5 km to prevent excessive passenger waiting times.
2. **Vehicle Fleet & Capacity Assumptions**:
   - **Uniform Electric Fleet**: All fleet vehicles are Tesla Model 3s with a uniform passenger capacity of 3 available pooling seats (excluding the driver).
   - **1-to-1 Driver-to-Vehicle Binding**: Each driver exclusively operates their own registered vehicle (`Tesla.driverId` is unique).
   - **Locked Staging Areas**: Drivers stage at designated hubs when going online; location updates are locked during an active trip and automatically restage to the final dropoff zone upon trip completion.
   - **Full Battery Range**: Vehicles maintain sufficient state-of-charge for the duration of pooled trips, without simulating mid-route Supercharging stops.
3. **Pricing & Settlement Assumptions**:
   - **Deterministic Upfront Pricing**: Base fare is 5,000 poysha (50 BDT), distance charge is 2,500 poysha / km (25 BDT / km), with a flat 20% pooling discount applied to distance charges.
   - **Per-Seat Proportional Scaling**: Fares scale linearly with seats requested (`fare * seatsRequested`), and overlap discounts are retroactively recalculated when downstream passengers onboard.
   - **Cash-First Settlement**: Fares are collected in physical cash upon trip completion (marked by the driver), while maintaining structured payment records for future digital wallet integration (bKash/Nagad).
4. **State Machine & Dispatch Assumptions**:
   - **Strict Forward-Only Lifecycle**: Ride and pool lifecycles strictly follow sequential non-reversible milestones (`MATCHED` -> `DRIVER_ARRIVED` -> `STARTED` -> `COMPLETED`). In-flight onboarded riders transition directly to `STARTED`.
   - **Single Active Pool / Trip**: A passenger may have at most one active ride request at a time, and a driver can manage only one active pool simultaneously.
   - **Driver-Initiated Seat Claims (Pull Model)**: Drivers evaluate candidate compatibility cards on radar and manually claim seats, rather than relying on an automated push dispatch daemon.
5. **Rating & Idempotency Assumptions**:
   - **Single Submission Guarantee**: Passenger rating of the driver (1 to 5 stars, tags, comment) is enforced as strictly idempotent by a database-level unique constraint (`Rating.rideRequestId` is unique).

---

## 13. Known Limitations & Next Improvements

### Current Limitations
- **Single Active Corridor Axis**: Seeding focuses on the primary North-Central corridor (Airport Highway and Gulshan Axis). Additional arterial routes (e.g., Mirpur to Motijheel) require corridor graph configuration.
- **In-Memory Transit Simulation**: Driver position progression along corridors is simulated via state milestones rather than live vehicle hardware GPS telematics.
- **Polling Latency**: Tracker updates experience up to 2 seconds of latency compared to persistent push connections.

### Planned Improvements
- **PostGIS Geospatial Engine**: Migrate distance math to native PostGIS columns (`ST_DWithin`, `ST_Distance`) with `GIST` spatial indexes for sub-millisecond proximity queries.
- **WebSocket & Push Notifications**: Integrate Socket.io and Redis Pub/Sub for push notifications and driver location streaming.
- **Mobile Financial Services Integration**: Add digital wallet payments (bKash, Nagad) alongside existing cash settlement.
- **Multi-Corridor Graph Routing**: Implement Dijkstra / A* route graph search to enable dynamic vehicle transfers across intersecting transit corridors.

---

## 14. AI Usage

AI assistance and pair programming were utilized during the design and development of Dhaka Tesla Pool:

- **Algorithmic Modeling**: AI was used to explore and refine core mathematical invariants, including corridor directional monotonicity (`dirA * dirB > 0`), Haversine 1.6x winding factor heuristics, and overlap-based fare split math.
- **Concurrency & State Machine Design**: AI aided in architecting atomic conditional SQL queries to eliminate TOCTOU overbooking race conditions, designing explicit forward-only state machine transitions, and establishing comprehensive test cases (unit and integration) covering edge cases and IDOR protection.
- **Code Structuring & Refactoring**: Assisted in scaffolding clean architecture patterns across the NestJS backend and React frontend, ensuring strict separation of concerns, DTO validation, and typed contracts.

---

## 15. Demo Video

A full end-to-end walkthrough demonstrating passenger ride booking, driver staging, candidate radar scanning, atomic seat claiming, dynamic in-flight matching, and trip rating is available here:

- **YouTube Walkthrough**: [Watch on YouTube](https://youtu.be/TVZmOGXhV_4)
- **Google Drive Materials**: [View on Google Drive](https://drive.google.com/drive/folders/1KxMAQziZtbNJZiXu-Z6LHAdwXS0rgfvG?usp=sharing)

---

## 16. License

This project is licensed under the MIT License.
