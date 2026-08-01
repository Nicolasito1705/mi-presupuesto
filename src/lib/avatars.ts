/**
 * Fotos de perfil abstractas, pintadas con degradados.
 *
 * No hay archivos: ni subida, ni Supabase Storage, ni imágenes que moderar o
 * que pesen en la carga. En la base solo se guarda la clave ('aurora'), y el
 * degradado vive aquí. Cambiar la paleta o añadir una opción es editar este
 * archivo.
 *
 * Todos los colores salen de la rampa de Nocturne, así que cualquier avatar
 * combina con la app en tema claro y oscuro.
 */

export type AvatarKey = keyof typeof AVATARS;

export const AVATARS = {
  aurora: 'conic-gradient(from 210deg, #b5abfc, #e4e7f5, #796cbf, #b5abfc)',
  eclipse: 'radial-gradient(circle at 32% 28%, #f5f4ff 0%, #b5abfc 42%, #423a6a 100%)',
  duna: 'linear-gradient(140deg, #d2cefd 0%, #968ae0 45%, #5d5294 100%)',
  orbita: 'radial-gradient(circle at 50% 50%, #2b2741 0 22%, #b5abfc 22% 42%, #2b2741 42% 62%, #e4e7f5 62% 100%)',
  prisma: 'conic-gradient(#f5f4ff 0 25%, #b5abfc 25% 55%, #5d5294 55% 78%, #d2cefd 78% 100%)',
  marea: 'radial-gradient(circle at 25% 75%, #b5abfc 0 35%, transparent 36%), radial-gradient(circle at 72% 30%, #e4e7f5 0 30%, transparent 31%), linear-gradient(160deg, #423a6a, #796cbf)',
  cuarzo: 'linear-gradient(115deg, #e4e7f5 0 33%, #9397ab 33% 66%, #595d6c 66% 100%)',
  nebula: 'radial-gradient(circle at 70% 25%, #d2cefd 0 28%, transparent 29%), radial-gradient(circle at 30% 65%, #796cbf 0 38%, transparent 39%), linear-gradient(200deg, #2b2741, #5d5294)',
  vertice: 'conic-gradient(from 45deg, #5d5294 0 25%, #b5abfc 25% 50%, #e4e7f5 50% 75%, #796cbf 75% 100%)',
} as const;

export const AVATAR_KEYS = Object.keys(AVATARS) as AvatarKey[];

export const DEFAULT_AVATAR: AvatarKey = 'aurora';

/** Tolera una clave desconocida — un avatar retirado no debe romper la pantalla. */
export function avatarBackground(key: string | null | undefined): string {
  return AVATARS[(key ?? '') as AvatarKey] ?? AVATARS[DEFAULT_AVATAR];
}

/**
 * Sin apodo, la parte del correo antes de la arroba es mejor que mostrar el
 * correo entero: identifica igual y no expone la dirección en pantalla.
 */
export function displayName(nickname: string | null | undefined, email: string): string {
  const trimmed = (nickname ?? '').trim();
  if (trimmed) return trimmed;
  const local = email.split('@')[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Mi cuenta';
}
