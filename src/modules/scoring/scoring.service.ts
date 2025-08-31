import { Injectable } from '@nestjs/common';

export type PlayerPosition = 'GK' | 'DF' | 'MD' | 'FW';

export interface MatchEvent {
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  goalsConceded: number;
  saves?: number;
  penSaved?: number;
  penMissed?: number;
  yellow: number;
  red: number;
  ownGoals: number;
  bonus: number;
  dropout: boolean;
}

@Injectable()
export class ScoringService {
  getBaseValue(position: PlayerPosition) {
    switch (position) {
      case 'GK':
        return 4.0;
      case 'DF':
        return 4.5;
      case 'MD':
        return 5.0;
      case 'FW':
        return 5.5;
    }
  }

  calcPoints(event: MatchEvent, position: PlayerPosition): number {
    let pts = 0;
    if (event.dropout) return -2;
    if (event.minutes > 0) pts += 2;
    if (event.minutes >= 60) pts += 1;
    pts +=
      event.goals *
      (position === 'FW'
        ? 4
        : position === 'MD'
          ? 5
          : position === 'DF'
            ? 6
            : 6);
    pts += event.assists * 3;
    if (position === 'GK' || position === 'DF') {
      if (event.cleanSheet && event.minutes >= 60) pts += 4;
      if (position === 'GK' && event.saves) pts += Math.floor(event.saves / 3);
      if (position === 'GK' && event.penSaved) pts += event.penSaved * 5;
    }
    if (position === 'GK' || position === 'DF') {
      if (event.goalsConceded >= 2) pts -= Math.floor(event.goalsConceded / 2);
    }
    if (event.penMissed) pts -= event.penMissed * 2;
    pts -= event.yellow;
    pts -= event.red * 3;
    pts -= event.ownGoals * 2;
    pts += event.bonus;
    return pts;
  }

  calcFantasyValue(
    position: PlayerPosition,
    totalPoints: number,
    age: number,
  ): number {
    let value = this.getBaseValue(position);
    value += 0.1 * Math.floor(totalPoints / 10);
    if (age < 26) value += Math.min(0.2, 0.1 * Math.floor((26 - age) / 2));
    return Math.round(value * 10) / 10;
  }
}
