// Zod schema for signal creation validation
import { z } from 'zod';

export const signalCreateSchema = z.object({
  title: z.string().min(1, 'title 필요').max(120, 'title 길이 초과(120)'),
  description: z.string().max(5000, 'description 길이 초과(5000)').optional().or(z.literal('').transform(() => '')),
  category: z.string().max(64, 'category 길이 초과(64)').optional().or(z.literal('').transform(() => '')),
  lat: z.number().min(-90, 'lat 범위 오류').max(90, 'lat 범위 오류'),
  lng: z.number().min(-180, 'lng 범위 오류').max(180, 'lng 범위 오류'),
  address: z.string().max(256, 'address 길이 초과(256)').optional().or(z.literal('').transform(() => '')),
  zone: z.any().optional(), // zone 구조( key/sub )는 현재 자유롭게 허용
  level: z.number().min(1).max(5).optional(),
});

export function parseSignalCreate(body) {
  // 숫자 필드 문자열 → 숫자 변환 시도
  const coerce = { ...body };
  if (coerce.lat != null) coerce.lat = Number(coerce.lat);
  if (coerce.lng != null) coerce.lng = Number(coerce.lng);
  if (coerce.level != null && coerce.level !== '') coerce.level = Number(coerce.level);
  const r = signalCreateSchema.safeParse(coerce);
  if (!r.success) {
    return { ok: false, errors: r.error.errors.map(e => e.message) };
  }
  return { ok: true, data: r.data };
}