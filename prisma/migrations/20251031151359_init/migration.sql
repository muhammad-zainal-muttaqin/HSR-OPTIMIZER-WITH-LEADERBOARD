-- CreateTable
CREATE TABLE "User" (
    "uid" TEXT PRIMARY KEY,
    "region" TEXT
);

-- CreateTable
CREATE TABLE "Character" (
    "id" SERIAL PRIMARY KEY,
    "uid" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "eidolon" INTEGER NOT NULL,
    "lightConeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Character_uid_fkey" FOREIGN KEY ("uid") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Build" (
    "id" SERIAL PRIMARY KEY,
    "characterId" INTEGER NOT NULL,
    "atk" DECIMAL,
    "spd" DECIMAL,
    "critRate" DECIMAL,
    "critDmg" DECIMAL,
    "cv" DECIMAL NOT NULL,
    "buildHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Build_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Character_uid_characterId_idx" ON "Character"("uid", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_uid_characterId_key" ON "Character"("uid", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Build_buildHash_key" ON "Build"("buildHash");

-- CreateIndex
CREATE UNIQUE INDEX "Build_characterId_key" ON "Build"("characterId");

-- CreateIndex
CREATE INDEX "Build_cv_idx" ON "Build"("cv" DESC);

-- CreateIndex
CREATE INDEX "Build_characterId_cv_idx" ON "Build"("characterId", "cv" DESC);
