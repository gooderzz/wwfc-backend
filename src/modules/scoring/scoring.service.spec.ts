import { ScoringService, MatchEvent } from './scoring.service';

describe('ScoringService', () => {
  let scoring: ScoringService;
  beforeEach(() => {
    scoring = new ScoringService();
  });

  it('calculates points for a forward goal', () => {
    const event: MatchEvent = {
      minutes: 90,
      goals: 1,
      assists: 0,
      cleanSheet: false,
      goalsConceded: 0,
      yellow: 0,
      red: 0,
      ownGoals: 0,
      bonus: 0,
      dropout: false,
    };
    expect(scoring.calcPoints(event, 'FW')).toBe(7); // 2+1+4
  });

  it('calculates points for a defender clean sheet', () => {
    const event: MatchEvent = {
      minutes: 90,
      goals: 0,
      assists: 0,
      cleanSheet: true,
      goalsConceded: 0,
      yellow: 0,
      red: 0,
      ownGoals: 0,
      bonus: 0,
      dropout: false,
    };
    expect(scoring.calcPoints(event, 'DF')).toBe(7); // 2+1+4
  });

  it('calculates points for a goalkeeper with saves and pen save', () => {
    const event: MatchEvent = {
      minutes: 90,
      goals: 0,
      assists: 0,
      cleanSheet: true,
      goalsConceded: 0,
      saves: 7,
      penSaved: 1,
      yellow: 0,
      red: 0,
      ownGoals: 0,
      bonus: 0,
      dropout: false,
    };
    expect(scoring.calcPoints(event, 'GK')).toBe(2 + 1 + 4 + 2 + 5); // 2+1+4(clean)+2(saves)+5(pen)
  });

  it('applies negative points for cards and own goals', () => {
    const event: MatchEvent = {
      minutes: 90,
      goals: 0,
      assists: 0,
      cleanSheet: false,
      goalsConceded: 0,
      yellow: 1,
      red: 1,
      ownGoals: 1,
      bonus: 0,
      dropout: false,
    };
    expect(scoring.calcPoints(event, 'MD')).toBe(2 + 1 - 1 - 3 - 2); // 2+1-1(yellow)-3(red)-2(own)
  });

  it('returns -2 for dropout', () => {
    const event: MatchEvent = {
      minutes: 0,
      goals: 0,
      assists: 0,
      cleanSheet: false,
      goalsConceded: 0,
      yellow: 0,
      red: 0,
      ownGoals: 0,
      bonus: 0,
      dropout: true,
    };
    expect(scoring.calcPoints(event, 'FW')).toBe(-2);
  });

  it('calculates fantasy value with points and age', () => {
    expect(scoring.calcFantasyValue('FW', 25, 25)).toBe(5.7); // 5.5+0.2
    expect(scoring.calcFantasyValue('DF', 40, 22)).toBe(4.9); // 4.5+0.4
    expect(scoring.calcFantasyValue('GK', 0, 30)).toBe(4.0);
  });
});
