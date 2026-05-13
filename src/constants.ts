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
  duration?: string;
  thumbnail?: string;
}

export const CATEGORIES = [
  { id: 'all', label: 'ټول' },
  { id: 'speeches', label: 'اسلامي ویناوې' },
  { id: 'lessons', label: 'درسونه' },
  { id: 'naats', label: 'نعتونه' },
] as const;

export const INITIAL_TRACKS: AudioTrack[] = [];
