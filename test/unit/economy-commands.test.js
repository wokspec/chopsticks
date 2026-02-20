// test/unit/economy-commands.test.js
import assert from 'node:assert/strict';

// ── Imports ───────────────────────────────────────────────────────────────────
import {
  canCreateAuction,
  isBidValid,
  getActiveAuctions,
} from '../../src/commands/auction.js';

import { validateTradeRequest } from '../../src/commands/trade.js';

import {
  calcHeistOutcome,
  canStartHeist,
  canJoinHeist,
} from '../../src/commands/heist.js';

import {
  calcSlotsPayout,
  validateBet,
  isValidCoinSide,
  SLOT_SYMBOLS,
} from '../../src/commands/casino.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function futureIso(offsetMs = 60 * 60 * 1000) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function makeAuction(id, overrides = {}) {
  return {
    id,
    item:           'Test Item',
    starting_bid:   100,
    current_bid:    99,
    current_bidder: null,
    end_time_iso:   futureIso(),
    created_by:     'user1',
    active:         true,
    ...overrides,
  };
}

// ── 1. Auction ────────────────────────────────────────────────────────────────

describe('auction — max active limit', function () {
  it('allows creating when fewer than 3 active', function () {
    const auctions = [makeAuction('a1'), makeAuction('a2')];
    assert.ok(canCreateAuction(auctions));
  });

  it('rejects 4th auction when 3 already active', function () {
    const auctions = [makeAuction('a1'), makeAuction('a2'), makeAuction('a3')];
    assert.equal(canCreateAuction(auctions), false);
  });

  it('does not count expired auctions toward the limit', function () {
    const pastIso = new Date(Date.now() - 1000).toISOString();
    const auctions = [
      makeAuction('a1'),
      makeAuction('a2'),
      makeAuction('a3', { end_time_iso: pastIso }), // expired — should not count
    ];
    assert.ok(canCreateAuction(auctions));
  });

  it('does not count inactive auctions toward the limit', function () {
    const auctions = [
      makeAuction('a1'),
      makeAuction('a2'),
      makeAuction('a3', { active: false }),
    ];
    assert.ok(canCreateAuction(auctions));
  });
});

describe('auction — bid validation', function () {
  it('accepts a bid strictly greater than current_bid', function () {
    const auction = makeAuction('a1', { current_bid: 100 });
    assert.ok(isBidValid(auction, 101));
  });

  it('rejects a bid equal to current_bid', function () {
    const auction = makeAuction('a1', { current_bid: 100 });
    assert.equal(isBidValid(auction, 100), false);
  });

  it('rejects a bid below current_bid', function () {
    const auction = makeAuction('a1', { current_bid: 100 });
    assert.equal(isBidValid(auction, 50), false);
  });

  it('rejects non-integer bids', function () {
    const auction = makeAuction('a1', { current_bid: 100 });
    assert.equal(isBidValid(auction, 101.5), false);
  });
});

// ── 2. Trade ──────────────────────────────────────────────────────────────────

describe('trade — self-trade guard', function () {
  it('rejects trading with yourself', function () {
    const v = validateTradeRequest('user1', 'user1', 100);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'self');
  });

  it('allows trading with a different user', function () {
    const v = validateTradeRequest('user1', 'user2', 100);
    assert.ok(v.ok);
  });
});

describe('trade — bot guard', function () {
  it('rejects trading with a bot', function () {
    const v = validateTradeRequest('user1', 'botUser', 100, true);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'bot');
  });
});

describe('trade — amount validation', function () {
  it('rejects negative amounts', function () {
    const v = validateTradeRequest('user1', 'user2', -10);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'amount');
  });

  it('rejects zero amount', function () {
    const v = validateTradeRequest('user1', 'user2', 0);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'amount');
  });

  it('rejects non-integer amounts', function () {
    const v = validateTradeRequest('user1', 'user2', 9.9);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'amount');
  });

  it('accepts positive integer amount', function () {
    const v = validateTradeRequest('user1', 'user2', 1);
    assert.ok(v.ok);
  });
});

// ── 3. Heist ──────────────────────────────────────────────────────────────────

describe('heist — max 1 active at a time', function () {
  it('allows starting when no active heist', function () {
    assert.ok(canStartHeist(null));
  });

  it('allows starting when previous heist is done', function () {
    assert.ok(canStartHeist({ status: 'done' }));
  });

  it('rejects starting when a heist is recruiting', function () {
    assert.equal(canStartHeist({ status: 'recruiting' }), false);
  });
});

describe('heist — join validation', function () {
  function makeHeist(overrides = {}) {
    return {
      id:                  'h1',
      leader:              'leader1',
      participants:        ['leader1'],
      start_time:          new Date().toISOString(),
      join_window_seconds: 60,
      status:              'recruiting',
      ...overrides,
    };
  }

  it('allows joining an active heist', function () {
    const heist = makeHeist();
    const r = canJoinHeist(heist, 'user2');
    assert.ok(r.ok);
  });

  it('rejects joining if already a participant', function () {
    const heist = makeHeist({ participants: ['leader1', 'user2'] });
    const r = canJoinHeist(heist, 'user2');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'already_joined');
  });

  it('rejects joining after window closes', function () {
    const pastStartTime = new Date(Date.now() - 90 * 1000).toISOString(); // 90s ago
    const heist = makeHeist({ start_time: pastStartTime });
    const r = canJoinHeist(heist, 'user2');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'window_closed');
  });

  it('rejects joining when heist is full (10 participants)', function () {
    const participants = Array.from({ length: 10 }, (_, i) => `user${i}`);
    const heist = makeHeist({ participants });
    const r = canJoinHeist(heist, 'user99');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'full');
  });

  it('rejects joining when no active heist', function () {
    const r = canJoinHeist(null, 'user2');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'no_active');
  });
});

describe('heist — outcome calculation', function () {
  it('solo heist has 40% base chance', function () {
    const { chance } = calcHeistOutcome(1, 0);
    assert.equal(chance, 40);
  });

  it('succeeds when roll is below chance', function () {
    const { success } = calcHeistOutcome(1, 39);
    assert.ok(success);
  });

  it('fails when roll equals chance', function () {
    const { success } = calcHeistOutcome(1, 40);
    assert.equal(success, false);
  });

  it('caps chance at 80%', function () {
    const { chance } = calcHeistOutcome(20, 0); // would be 40+5*19 = 135 without cap
    assert.equal(chance, 80);
  });

  it('winner prize scales with participant count', function () {
    const { prizeEach } = calcHeistOutcome(3, 0);
    assert.equal(prizeEach, 200 * 3);
  });

  it('loser loses 50 credits', function () {
    const { lossEach } = calcHeistOutcome(1, 99); // always fail
    assert.equal(lossEach, 50);
  });
});

// ── 4. Casino slots ───────────────────────────────────────────────────────────

describe('casino slots — payout math', function () {
  it('3× 💎 pays 50× bet', function () {
    assert.equal(calcSlotsPayout(['💎', '💎', '💎'], 100), 5000);
  });

  it('3× ⭐ pays 20× bet', function () {
    assert.equal(calcSlotsPayout(['⭐', '⭐', '⭐'], 100), 2000);
  });

  it('3× other symbol pays 5× bet', function () {
    assert.equal(calcSlotsPayout(['🍒', '🍒', '🍒'], 100), 500);
  });

  it('2 matching symbols pay 1.5× bet (floored)', function () {
    assert.equal(calcSlotsPayout(['🍒', '🍒', '🍋'], 100), 150);
  });

  it('no match pays 0', function () {
    assert.equal(calcSlotsPayout(['🍒', '🍋', '🍊'], 100), 0);
  });

  it('returns 0 for wrong number of symbols', function () {
    assert.equal(calcSlotsPayout(['🍒', '🍒'], 100), 0);
  });
});

describe('casino slots — bet validation', function () {
  it('rejects bet below minimum (< 10)', function () {
    assert.equal(validateBet(9, 10, 1000), false);
  });

  it('accepts minimum bet (10)', function () {
    assert.ok(validateBet(10, 10, 1000));
  });

  it('accepts maximum bet (1000)', function () {
    assert.ok(validateBet(1000, 10, 1000));
  });

  it('rejects bet above maximum (> 1000)', function () {
    assert.equal(validateBet(1001, 10, 1000), false);
  });

  it('rejects non-integer bets', function () {
    assert.equal(validateBet(10.5, 10, 1000), false);
  });
});

// ── 5. Casino coinflip ────────────────────────────────────────────────────────

describe('casino coinflip — side validation', function () {
  it('accepts "heads"', function () {
    assert.ok(isValidCoinSide('heads'));
  });

  it('accepts "tails"', function () {
    assert.ok(isValidCoinSide('tails'));
  });

  it('rejects invalid side "edge"', function () {
    assert.equal(isValidCoinSide('edge'), false);
  });

  it('rejects empty string', function () {
    assert.equal(isValidCoinSide(''), false);
  });

  it('rejects null', function () {
    assert.equal(isValidCoinSide(null), false);
  });

  it('is case-sensitive (rejects "Heads")', function () {
    assert.equal(isValidCoinSide('Heads'), false);
  });
});
