#!/bin/sh

echo "Waiting for PostgreSQL to be ready..."
until nc -z -v -w30 postgres 5432
do
  echo "Waiting for PostgreSQL connection..."
  sleep 1
done

echo "Running Prisma Migrate..."
npx prisma migrate dev --name init

echo "Generating Prisma Client..."
npx prisma generate


npm run dev