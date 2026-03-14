export type EventHandler<T = any> = (payload: T) => void;

class DomainEventService {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribes a handler to a specific domain event.
   * @param eventName The name of the event to listen for.
   * @param handler The function to execute when the event is published.
   */
  subscribe<T = any>(eventName: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler as EventHandler);
  }

  /**
   * Unsubscribes a handler from a specific domain event.
   * @param eventName The name of the event to stop listening for.
   * @param handler The function to remove from the listeners.
   */
  unsubscribe<T = any>(eventName: string, handler: EventHandler<T>): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(handler as EventHandler);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * Publishes a domain event, triggering all subscribed handlers.
   * @param eventName The name of the event to publish.
   * @param payload The data to pass to the event handlers.
   */
  publish<T = any>(eventName: string, payload: T): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error executing handler for event '${eventName}':`, error);
        }
      });
    }
  }

  /**
   * Clears all listeners for all events. Useful for testing.
   */
  clearAll(): void {
    this.listeners.clear();
  }
}

export const domainEventService = new DomainEventService();
