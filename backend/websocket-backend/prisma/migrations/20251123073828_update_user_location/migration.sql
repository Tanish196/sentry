-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "adhaarNumber" TEXT,
    "contactName" TEXT NOT NULL,
    "contactemail" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "destination" TEXT,
    "time" TEXT NOT NULL,
    "safe" INTEGER NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailAddress_key" ON "User"("emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Location_uid_key" ON "Location"("uid");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
