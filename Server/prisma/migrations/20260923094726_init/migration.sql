-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PASSENGER', 'DRIVER');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TESLAPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teslas" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "seats_available" INTEGER NOT NULL,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teslas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "center_lat" DOUBLE PRECISION NOT NULL,
    "center_lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" TEXT NOT NULL,
    "tesla_id" TEXT NOT NULL,
    "status" "PoolStatus" NOT NULL DEFAULT 'MATCHED',
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driver_arrived_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_requests" (
    "id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "pool_id" TEXT,
    "pickup_zone_id" TEXT NOT NULL,
    "pickup_lat" DOUBLE PRECISION NOT NULL,
    "pickup_lng" DOUBLE PRECISION NOT NULL,
    "dropoff_zone_id" TEXT NOT NULL,
    "dropoff_lat" DOUBLE PRECISION NOT NULL,
    "dropoff_lng" DOUBLE PRECISION NOT NULL,
    "seats_requested" INTEGER NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "distance_km" DECIMAL(6,2) NOT NULL,
    "base_fare_poysha" INTEGER NOT NULL,
    "distance_charge_poysha" INTEGER NOT NULL,
    "pool_discount_poysha" INTEGER NOT NULL DEFAULT 0,
    "total_fare_poysha" INTEGER NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "ride_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_status_history" (
    "id" TEXT NOT NULL,
    "ride_request_id" TEXT NOT NULL,
    "from_status" "RideStatus",
    "to_status" "RideStatus" NOT NULL,
    "changed_by_id" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ride_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "ride_request_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount_poysha" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "teslas_driver_id_key" ON "teslas"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE INDEX "pools_tesla_id_idx" ON "pools"("tesla_id");

-- CreateIndex
CREATE INDEX "pools_status_idx" ON "pools"("status");

-- CreateIndex
CREATE INDEX "ride_requests_passenger_id_idx" ON "ride_requests"("passenger_id");

-- CreateIndex
CREATE INDEX "ride_requests_pool_id_idx" ON "ride_requests"("pool_id");

-- CreateIndex
CREATE INDEX "ride_requests_status_idx" ON "ride_requests"("status");

-- CreateIndex
CREATE INDEX "ride_status_history_ride_request_id_idx" ON "ride_status_history"("ride_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_ride_request_id_key" ON "payments"("ride_request_id");

-- AddForeignKey
ALTER TABLE "teslas" ADD CONSTRAINT "teslas_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_tesla_id_fkey" FOREIGN KEY ("tesla_id") REFERENCES "teslas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_pickup_zone_id_fkey" FOREIGN KEY ("pickup_zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_dropoff_zone_id_fkey" FOREIGN KEY ("dropoff_zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_status_history" ADD CONSTRAINT "ride_status_history_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_status_history" ADD CONSTRAINT "ride_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "teslas" ADD CONSTRAINT "seats_in_range" 
    CHECK ("seats_available" >= 0 AND "seats_available" <= "capacity");

