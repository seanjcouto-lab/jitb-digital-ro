import { test, expect } from '@playwright/test';
import { notificationService } from '../services/notificationService';

test.describe('NotificationService', () => {
  test.beforeEach(() => {
    notificationService.clearAllNotifications();
  });

  test('should create a notification', () => {
    const notification = notificationService.createNotification('info', 'Test message', { key: 'value' });

    expect(notification.id).toBeDefined();
    expect(notification.type).toBe('info');
    expect(notification.message).toBe('Test message');
    expect(notification.data).toEqual({ key: 'value' });
    expect(notification.read).toBe(false);
    expect(notification.createdAt).toBeDefined();
  });

  test('should get all notifications', () => {
    notificationService.createNotification('info', 'Message 1');
    notificationService.createNotification('warning', 'Message 2');

    const notifications = notificationService.getNotifications();
    expect(notifications.length).toBe(2);
    expect(notifications[0].message).toBe('Message 1');
    expect(notifications[1].message).toBe('Message 2');
  });

  test('should clear a specific notification', () => {
    const n1 = notificationService.createNotification('info', 'Message 1');
    const n2 = notificationService.createNotification('warning', 'Message 2');

    notificationService.clearNotification(n1.id);

    const notifications = notificationService.getNotifications();
    expect(notifications.length).toBe(1);
    expect(notifications[0].id).toBe(n2.id);
  });

  test('should clear all notifications', () => {
    notificationService.createNotification('info', 'Message 1');
    notificationService.createNotification('warning', 'Message 2');

    notificationService.clearAllNotifications();

    const notifications = notificationService.getNotifications();
    expect(notifications.length).toBe(0);
  });
});
