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
  { id: 'all', label: 'ټولې ۵ برخې' },
  { id: 'lessons', label: 'شرعي جوابونه' },
] as const;

export const INITIAL_TRACKS: AudioTrack[] = [
  {
    id: 'track-1',
    title: '۱- برخه خير الدين بربروسا',
    filename: '1.mp3',
    artist: 'الحاج داکتر فريدون احرار',
    category: 'lessons',
    categoryLabel: 'غږيز جوابونه',
    url: 'audio/1.mp3',
    duration: '05:00'
  },
  {
    id: 'track-2',
    title: '۲- برخه خير الدين بربروسا',
    filename: '2.mp3',
    artist: 'الحاج داکتر فريدون احرار',
    category: 'lessons',
    categoryLabel: 'غږيز جوابونه',
    url: 'audio/2.mp3',
    duration: '05:00'
  },
  {
    id: 'track-3',
    title: '۳- برخه خير الدين بربروسا',
    filename: '3.mp3',
    artist: 'الحاج داکتر فريدون احرار',
    category: 'lessons',
    categoryLabel: 'غږيز جوابونه',
    url: 'audio/3.mp3',
    duration: '05:00'
  },
  {
    id: 'track-4',
    title: '۴- برخه خير الدين بربروسا',
    filename: '4.mp3',
    artist: 'الحاج داکتر فريدون احرار',
    category: 'lessons',
    categoryLabel: 'غږيز جوابونه',
    url: 'audio/4.mp3',
    duration: '05:00'
  },
  {
    id: 'track-5',
    title: '۵- برخه خير الدين بربروسا',
    filename: '5.mp3',
    artist: 'الحاج داکتر فريدون احرار',
    category: 'lessons',
    categoryLabel: 'غږيز جوابونه',
    url: 'audio/5.mp3',
    duration: '05:00'
  }
];
