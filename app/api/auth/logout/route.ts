import { NextResponse } from 'next/server';
import { createLogoutCookie } from '@/lib/jwt';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada' });
  response.headers.set('Set-Cookie', createLogoutCookie());
  return response;
}