import '@fastify/cookie';
import type { FastifyReply } from 'fastify';
import { REFRESH_COOKIE, REFRESH_TTL_SECONDS } from './auth.constants.js';

export function refreshCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    path: '/auth',
    sameSite: 'lax' as const,
    secure,
    maxAge: REFRESH_TTL_SECONDS,
  };
}

export function setRefreshCookie(
  reply: FastifyReply,
  token: string,
  secure: boolean,
) {
  reply.setCookie(REFRESH_COOKIE, token, refreshCookieOptions(secure));
}

export function clearRefreshCookie(reply: FastifyReply, secure: boolean) {
  reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions(secure));
}
