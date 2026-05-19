/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AudioTrack {
  id: string;
  title: string;
  category: 'speeches' | 'lessons' | 'naats';
  categoryLabel: string;
  artist: string;
  url: string;
  filename?: string;
  duration?: string;
  thumbnail?: string;
}

export const CATEGORIES = [
  { id: 'all', label: 'ټولې ۵۰ برخې' },
  { id: 'lessons', label: 'شرعي جوابونه' },
] as const;

export const INITIAL_TRACKS: AudioTrack[] = [];
