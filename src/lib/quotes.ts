import { dayOfYear } from './date';

/** Short headline mantras for the Today screen (the user can replace it with their own). */
export const MANTRAS = [
  'LOCK IN',
  'NO ZERO DAYS',
  'SILENCE. FOCUS. EXECUTE',
  'COMFORT IS THE ENEMY',
  'WIN THE MORNING',
  'THE WORK IS THE REWARD',
  'BUILT, NOT BORN',
  'OUTWORK YESTERDAY',
  'DO IT TIRED',
  'EARN YOUR SLEEP',
  'STACK THE DAYS',
  'QUIET GRIND. LOUD RESULTS',
  'SYSTEMS OVER MOOD',
  'ONE MORE REP',
  'BE UNREASONABLE',
  'NOBODY IS COMING',
];

export function mantraOfTheDay(d = new Date()): string {
  return MANTRAS[dayOfYear(d) % MANTRAS.length];
}

export interface Quote {
  text: string;
  by?: string;
}

/** Shown one at a time when you finish something. Lines without an author are our own. */
export const QUOTES: Quote[] = [
  // Stoics
  { text: 'We suffer more often in imagination than in reality.', by: 'Seneca' },
  { text: 'It is not that we have a short time to live, but that we waste a lot of it.', by: 'Seneca' },
  { text: 'Luck is what happens when preparation meets opportunity.', by: 'Seneca' },
  { text: 'Difficulties strengthen the mind, as labor does the body.', by: 'Seneca' },
  { text: 'Begin at once to live, and count each separate day as a separate life.', by: 'Seneca' },
  { text: 'If a man knows not to which port he sails, no wind is favorable.', by: 'Seneca' },
  { text: 'Waste no more time arguing what a good man should be. Be one.', by: 'Marcus Aurelius' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', by: 'Marcus Aurelius' },
  { text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', by: 'Marcus Aurelius' },
  { text: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.', by: 'Marcus Aurelius' },
  { text: 'No man is free who is not master of himself.', by: 'Epictetus' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', by: 'Epictetus' },
  { text: 'Don’t explain your philosophy. Embody it.', by: 'Epictetus' },

  // Builders, athletes, thinkers
  { text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
  { text: 'Energy and persistence conquer all things.', by: 'Benjamin Franklin' },
  { text: 'It always seems impossible until it’s done.', by: 'Nelson Mandela' },
  { text: 'The secret of getting ahead is getting started.', by: 'Mark Twain' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', by: 'Will Durant' },
  { text: 'Discipline is the bridge between goals and accomplishment.', by: 'Jim Rohn' },
  { text: 'Success is nothing more than a few simple disciplines, practiced every day.', by: 'Jim Rohn' },
  { text: 'Motivation is what gets you started. Habit is what keeps you going.', by: 'Jim Rohn' },
  { text: 'The only way to do great work is to love what you do.', by: 'Steve Jobs' },
  { text: 'Whether you think you can or you think you can’t, you’re right.', by: 'Henry Ford' },
  { text: 'Do what you can, with what you have, where you are.', by: 'Theodore Roosevelt' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', by: 'Confucius' },
  { text: 'The man who moves a mountain begins by carrying away small stones.', by: 'Confucius' },
  { text: 'Hard work beats talent when talent doesn’t work hard.', by: 'Tim Notke' },
  { text: 'Don’t count the days, make the days count.', by: 'Muhammad Ali' },
  { text: 'Suffer now and live the rest of your life as a champion.', by: 'Muhammad Ali' },
  { text: 'Amateurs sit and wait for inspiration, the rest of us just get up and go to work.', by: 'Stephen King' },
  { text: 'You miss 100% of the shots you don’t take.', by: 'Wayne Gretzky' },
  { text: 'Action is the foundational key to all success.', by: 'Pablo Picasso' },
  { text: 'The harder the conflict, the more glorious the triumph.', by: 'Thomas Paine' },
  { text: 'The only place where success comes before work is in the dictionary.', by: 'Vidal Sassoon' },
  { text: 'Opportunities don’t happen. You create them.', by: 'Chris Grosser' },
  { text: 'Don’t watch the clock; do what it does. Keep going.', by: 'Sam Levenson' },
  { text: 'Small deeds done are better than great deeds planned.', by: 'Peter Marshall' },
  { text: 'Great things are done by a series of small things brought together.', by: 'Vincent van Gogh' },
  { text: 'Only the disciplined ones in life are free.', by: 'Eliud Kipchoge' },
  { text: 'No human is limited.', by: 'Eliud Kipchoge' },
  { text: 'Champions keep playing until they get it right.', by: 'Billie Jean King' },
  { text: 'A journey of a thousand miles begins with a single step.', by: 'Lao Tzu' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', by: 'Proverb' },
  { text: 'Fall seven times, stand up eight.', by: 'Japanese proverb' },

  // Our own
  { text: 'One down. Keep stacking.' },
  { text: 'That’s a rep for the mind.' },
  { text: 'Momentum is built one finished task at a time.' },
  { text: 'You said you would. You did. That’s the whole game.' },
  { text: 'Discipline today, freedom tomorrow.' },
  { text: 'Small wins compound into big lives.' },
  { text: 'You’re becoming the guy who finishes things.' },
  { text: 'Done beats perfect. Every time.' },
  { text: 'The work doesn’t care how you feel. You did it anyway.' },
  { text: 'Proof beats promises. You just made proof.' },
  { text: 'Every task finished is a vote for who you’re becoming.' },
  { text: 'Keep the promise you made to yourself.' },
  { text: 'Quiet progress. Loud results.' },
  { text: 'Nobody saw it. It still counts.' },
  { text: 'Consistency is the real talent.' },
  { text: 'The grind is the gift.' },
  { text: 'Another brick in the wall you’re building.' },
  { text: 'Hard choices, easy life. Easy choices, hard life.' },
  { text: 'You don’t rise to your goals. You fall to your systems.' },
  { text: 'Focus is a superpower. You just used it.' },
  { text: 'Results are the shadow of daily habits.' },
  { text: 'Starting is hard. Finishing is power.' },
  { text: 'Every rep counts, even the boring ones.' },
  { text: 'Talk less. Finish more.' },
  { text: 'Win the hour. The day takes care of itself.' },
  { text: 'You’re not lucky. You’re consistent.' },
  { text: 'Pressure makes diamonds. Keep going.' },
  { text: 'One task closer to the man you want to be.' },
  { text: 'Execution is the difference.' },
  { text: 'Your future self just said thanks.' },
  { text: 'Dreams are free. Discipline is paid daily.' },
  { text: 'Ordinary actions, repeated, make extraordinary results.' },
  { text: 'Clear the list, clear the mind.' },
  { text: 'You showed up. That’s where it starts.' },
  { text: 'Excuses don’t ship. You did.' },
  { text: 'Build the habit, and the habit builds you.' },
  { text: 'Motivation came and went. You stayed.' },
  { text: 'Be so consistent they call it luck.' },
  { text: 'The bar is wherever you set it. Raise it.' },
  { text: 'Earned, not given.' },
  { text: 'A finished task is a quiet kind of confidence.' },
  { text: 'Less scrolling, more doing. Nice.' },
  { text: 'Stack enough days like this and you won’t recognize yourself.' },
  { text: 'Your word to yourself is worth keeping.' },
  { text: 'Progress over perfection.' },
  { text: 'Keep your head down and your standards up.' },
  { text: 'Champions are built in the boring hours.' },
  { text: 'This is how the gap gets closed.' },
  { text: 'Strong mind, clear list.' },
  { text: 'One more thing off your back.' },
  { text: 'The plan works when you work the plan.' },
  { text: 'Doing it when you don’t feel like it — that’s the edge.' },
  { text: 'Small hinges swing big doors.' },
  { text: 'Effort is never wasted. It’s stored.' },
  { text: 'You’re ahead of who you were this morning.' },
  { text: 'The comeback is built task by task.' },
  { text: 'Every finished thing is evidence.' },
  { text: 'Calm, focused, relentless.' },
  { text: 'Respect the process. It respects you back.' },
  { text: 'Good. Now the next one.' },
  { text: 'You keep your promises. That’s rare.' },
  { text: 'The days add up. Make them count.' },
  { text: 'Grind in silence. Let the results talk.' },
  { text: 'Nothing changes if nothing changes. You changed something.' },
  { text: 'Hard now, easy later.' },
  { text: 'Not motivated? Doesn’t matter. Done.' },
  { text: 'Character is what you do on the days nobody claps.' },
  { text: 'Clarity comes from action.' },
  { text: 'The man who finishes wins more than the man who starts.' },
  { text: 'You don’t need more time. You need more focus. You found it.' },
  { text: 'Brick by brick. Day by day.' },
  { text: 'Fortune favors the consistent.' },
  { text: 'You’re building something. Keep building.' },
  { text: 'Stay patient. Stay hungry.' },
  { text: 'Sweat now, shine later.' },
  { text: 'Mastery is just repetition with attention.' },
  { text: 'You just made today a little better than yesterday.' },
  { text: 'Do the hard thing first. You did.' },
  { text: 'Every “done” is a step out of average.' },
  { text: 'Keep the streak alive.' },
  { text: 'Locked in. Stay there.' },
];

let bag: number[] = [];
let last = -1;

/** A random quote; walks a shuffled deck so you don't see repeats until all have been shown. */
export function nextQuote(): Quote {
  if (!bag.length) {
    bag = QUOTES.map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (bag[bag.length - 1] === last) bag.reverse();
  }
  last = bag.pop()!;
  return QUOTES[last];
}
