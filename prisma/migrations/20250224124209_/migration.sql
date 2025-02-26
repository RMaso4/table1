/*
  Warnings:

  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLANNER', 'BEHEERDER', 'SALES', 'SCANNER', 'GENERAL_ACCESS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'GENERAL_ACCESS';

-- DropTable
DROP TABLE "orders";

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "aanmaak_datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verkoop_order" TEXT NOT NULL,
    "project" TEXT,
    "pos" INTEGER NOT NULL,
    "type_artikel" TEXT NOT NULL,
    "debiteur_klant" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "kantenband" TEXT NOT NULL,
    "kleur" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "db_waarde" DOUBLE PRECISION NOT NULL,
    "opmerking" TEXT,
    "productie_datum" TIMESTAMP(3),
    "lever_datum" TIMESTAMP(3),
    "startdatum_assemblage" TIMESTAMP(3),
    "start_datum_machinale" TIMESTAMP(3),
    "bruto_zagen" TIMESTAMP(3),
    "pers" TIMESTAMP(3),
    "netto_zagen" TIMESTAMP(3),
    "verkantlijmen" TIMESTAMP(3),
    "cnc_start_datum" TIMESTAMP(3),
    "pmt_start_datum" TIMESTAMP(3),
    "lakkerij_datum" TIMESTAMP(3),
    "coaten_m1" TIMESTAMP(3),
    "verkantlijmen_order_gereed" TIMESTAMP(3),
    "inpak_rail" BOOLEAN NOT NULL DEFAULT false,
    "boards" BOOLEAN NOT NULL DEFAULT false,
    "frames" BOOLEAN NOT NULL DEFAULT false,
    "ap_tws" BOOLEAN NOT NULL DEFAULT false,
    "wp_frame" BOOLEAN NOT NULL DEFAULT false,
    "wp_dwp_pc" BOOLEAN NOT NULL DEFAULT false,
    "boards_component" BOOLEAN NOT NULL DEFAULT false,
    "profielen" BOOLEAN NOT NULL DEFAULT false,
    "kokers" BOOLEAN NOT NULL DEFAULT false,
    "lakken" BOOLEAN NOT NULL DEFAULT false,
    "mon" INTEGER NOT NULL DEFAULT 0,
    "pho" INTEGER NOT NULL DEFAULT 0,
    "pro" INTEGER NOT NULL DEFAULT 0,
    "ap" INTEGER NOT NULL DEFAULT 0,
    "sp" INTEGER NOT NULL DEFAULT 0,
    "cp" INTEGER NOT NULL DEFAULT 0,
    "wp" INTEGER NOT NULL DEFAULT 0,
    "dwp" INTEGER NOT NULL DEFAULT 0,
    "pc" INTEGER NOT NULL DEFAULT 0,
    "pcp" INTEGER NOT NULL DEFAULT 0,
    "totaal_boards" INTEGER NOT NULL DEFAULT 0,
    "tot" INTEGER NOT NULL DEFAULT 0,
    "controle_order" BOOLEAN NOT NULL DEFAULT false,
    "pop_up_zaag" BOOLEAN NOT NULL DEFAULT false,
    "pop_up_assemblage" BOOLEAN NOT NULL DEFAULT false,
    "pop_up_cnc" BOOLEAN NOT NULL DEFAULT false,
    "pop_up_cnc2" BOOLEAN NOT NULL DEFAULT false,
    "pop_up_verkantlijmer" BOOLEAN NOT NULL DEFAULT false,
    "pop_up_inpak" BOOLEAN NOT NULL DEFAULT false,
    "pop_up_rail" BOOLEAN NOT NULL DEFAULT false,
    "pop_up_grote_zaag" BOOLEAN NOT NULL DEFAULT false,
    "pop_zaag_2" BOOLEAN NOT NULL DEFAULT false,
    "pop_heftruk" BOOLEAN NOT NULL DEFAULT false,
    "inkoopordernummer" TEXT,
    "gez_planning" BOOLEAN NOT NULL DEFAULT false,
    "slotje" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnPermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "column" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canView" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ColumnPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_verkoop_order_key" ON "Order"("verkoop_order");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
