import { test, expect } from '@playwright/test';
import { eventSubscribersService } from '../services/eventSubscribersService';
import { domainEventService } from '../services/domainEventService';

test.describe('EventSubscribersService', () => {
  test.beforeEach(() => {
    domainEventService.clearAll();
  });

  test.afterEach(() => {
    eventSubscribersService.unregisterCoreSubscribers();
    domainEventService.clearAll();
  });

  test('should register and unregister core subscribers', () => {
    // Register subscribers
    eventSubscribersService.registerCoreSubscribers();

    // Mock console.log to verify handlers are called
    const originalConsoleLog = console.log;
    const logs: string[] = [];
    console.log = (...args: any[]) => {
      logs.push(args[0]);
    };

    try {
      // Publish events
      domainEventService.publish('repair-order:created', { id: 'ro-1' });
      domainEventService.publish('repair-order:authorized', { id: 'ro-1' });
      domainEventService.publish('repair-order:status-updated', { id: 'ro-1' });
      domainEventService.publish('repair-order:completed', { id: 'ro-1' });
      domainEventService.publish('inventory:adjusted', { partId: 'part-1' });
      domainEventService.publish('inventory:low-stock', { partId: 'part-1' });
      domainEventService.publish('technician:labor-started', { techId: 'tech-1' });
      domainEventService.publish('technician:labor-ended', { techId: 'tech-1' });

      // Verify logs
      expect(logs).toContain('[EventSubscribersService] Observed repair-order:created');
      expect(logs).toContain('[EventSubscribersService] Observed repair-order:authorized');
      expect(logs).toContain('[EventSubscribersService] Observed repair-order:status-updated');
      expect(logs).toContain('[EventSubscribersService] Observed repair-order:completed');
      expect(logs).toContain('[EventSubscribersService] Observed inventory:adjusted');
      expect(logs).toContain('[EventSubscribersService] Observed inventory:low-stock');
      expect(logs).toContain('[EventSubscribersService] Observed technician:labor-started');
      expect(logs).toContain('[EventSubscribersService] Observed technician:labor-ended');

      // Unregister subscribers
      eventSubscribersService.unregisterCoreSubscribers();
      logs.length = 0; // Clear logs

      // Publish events again
      domainEventService.publish('repair-order:created', { id: 'ro-2' });
      
      // Verify no new logs
      expect(logs.length).toBe(0);
    } finally {
      // Restore console.log
      console.log = originalConsoleLog;
    }
  });
});
