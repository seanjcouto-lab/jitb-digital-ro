import { describe, it, expect } from 'vitest';
import { repairOrderService } from '../services/repairOrderService';
import { ROStatus } from '../types';

describe('repairOrderService.completeDirective', () => {
  it('completing the first directive sets status to ACTIVE and starts a work session', () => {
    const mockRO = {
      id: 'ro-test-1',
      status: ROStatus.READY_FOR_TECH,
      directives: [
        { id: 'dir-1', isCompleted: false, completionTimestamp: null },
        { id: 'dir-2', isCompleted: false, completionTimestamp: null },
      ],
      workSessions: [],
    } as any;

    const result = repairOrderService.completeDirective(mockRO, mockRO.directives[0]);

    expect(result.status).toBe(ROStatus.ACTIVE);
    expect(result.workSessions.length).toBe(1);
    expect(result.workSessions[0].startTime).toBeDefined();
    expect(result.directives[0].isCompleted).toBe(true);
    expect(result.directives[1].isCompleted).toBe(false);
  });
});
