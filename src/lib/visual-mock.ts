/**
 * Dev visual mock — only when VITE_VISUAL_MOCK=1
 */
import type { AppUser } from '@/types';

export const VISUAL_MOCK_USER: AppUser | null =
  import.meta.env.VITE_VISUAL_MOCK === '1'
    ? {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'visual@example.com',
        display_name: 'Visual Review',
        auth_provider: 'email',
      }
    : null;
