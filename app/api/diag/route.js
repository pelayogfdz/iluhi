import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const isP = process.env.DATABASE_URL ? "SET" : "UNSET";
  const pStr = process.env.DATABASE_URL || "null";
  const DUrl = process.env.DIRECT_URL ? "SET" : "UNSET";
  const facturapi = process.env.FACTURAPI_KEY ? "SET" : "UNSET";
  
  let pStatus = "testing...";
  let pErr = null;
  
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    pStatus = "connected_ok";
  } catch (e) {
    pStatus = "error";
    pErr = e.message;
  }
  
  return NextResponse.json({
    dbSet: isP,
    directSet: DUrl,
    facturaSet: facturapi,
    pStatus,
    pErr,
    envCount: Object.keys(process.env).length,
    nodeEnv: process.env.NODE_ENV
  });
}
