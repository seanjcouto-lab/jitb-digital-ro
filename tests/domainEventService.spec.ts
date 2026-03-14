import { test, expect } from '@playwright/test';
import { domainEventService } from '../services/domainEventService';

test.describe('DomainEventService', () => {
  test.beforeEach(() => {
    domainEventService.clearAll();
  });

  test('should allow subscribing and publishing events', () => {
    let receivedPayload: any = null;
    let callCount = 0;

    const handler = (payload: any) => {
      receivedPayload = payload;
      callCount++;
    };

    domainEventService.subscribe('test-event', handler);
    domainEventService.publish('test-event', { id: 1, message: 'hello' });

    expect(callCount).toBe(1);
    expect(receivedPayload).toEqual({ id: 1, message: 'hello' });
  });

  test('should allow unsubscribing from events', () => {
    let callCount = 0;

    const handler = () => {
      callCount++;
    };

    domainEventService.subscribe('test-event', handler);
    domainEventService.unsubscribe('test-event', handler);
    domainEventService.publish('test-event', { id: 1 });

    expect(callCount).toBe(0);
  });

  test('should handle multiple subscribers independently', () => {
    let callCount1 = 0;
    let callCount2 = 0;

    const handler1 = () => callCount1++;
    const handler2 = () => callCount2++;

    domainEventService.subscribe('test-event', handler1);
    domainEventService.subscribe('test-event', handler2);

    domainEventService.publish('test-event', null);

    expect(callCount1).toBe(1);
    expect(callCount2).toBe(1);

    domainEventService.unsubscribe('test-event', handler1);
    domainEventService.publish('test-event', null);

    expect(callCount1).toBe(1); // Should not increase
    expect(callCount2).toBe(2); // Should increase
  });

  test('should handle errors in handlers without crashing', () => {
    let callCount = 0;

    const errorHandler = () => {
      throw new Error('Test error');
    };
    const normalHandler = () => {
      callCount++;
    };

    domainEventService.subscribe('test-event', errorHandler);
    domainEventService.subscribe('test-event', normalHandler);

    // Should not throw an error that stops execution
    expect(() => domainEventService.publish('test-event', null)).not.toThrow();
    
    // The normal handler should still run even if the first one threw
    expect(callCount).toBe(1);
  });
});
