export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  createdAt: string;
  read: boolean;
  data?: any;
}

class NotificationService {
  private notifications: AppNotification[] = [];

  createNotification(type: AppNotification['type'], message: string, data?: any): AppNotification {
    const notification: AppNotification = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      type,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      data,
    };
    this.notifications.push(notification);
    return notification;
  }

  getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  clearNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  clearAllNotifications(): void {
    this.notifications = [];
  }
}

export const notificationService = new NotificationService();
