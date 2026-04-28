export interface Quote {
  text: string;
  author?: string;
}

export const FAILURE_QUOTES: readonly Quote[] = [
  { text: "You miss 100% of the shots you don't take.", author: 'Wayne Gretzky' },
  { text: 'Winners fail more often than losers — they just refuse to stop trying.' },
  { text: 'Fall down seven times, stand up eight.', author: 'Japanese Proverb' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'The master has failed more times than the beginner has even tried.' },
  { text: 'Our greatest glory is not in never falling, but in rising every time we fall.', author: 'Confucius' },
  { text: 'Mistakes are proof that you are trying.' },
  { text: "What doesn't kill you makes you stronger." },
  { text: "If you've never failed, you've never tried anything new." },
  { text: "You can't succeed if you don't try." },
];

export function pickRandomQuote(): Quote {
  return FAILURE_QUOTES[Math.floor(Math.random() * FAILURE_QUOTES.length)];
}
