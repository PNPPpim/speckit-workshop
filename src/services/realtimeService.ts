/**
 * Realtime Service - WebSocket Connection Management
 * 
 * Manages real-time synchronization with:
 * - WebSocket connection lifecycle
 * - Message queuing during disconnects
 * - Exponential backoff reconnection
 * - Event emission system
 */

interface Message {
  type: string;
  data: any;
  timestamp: number;
}

interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: number;
}

type EventListener = (event: RealtimeEvent) => void;

const BACKOFF_MULTIPLIER = 2;
const INITIAL_BACKOFF = 1000; // 1 second
const MAX_BACKOFF = 30000; // 30 seconds
const MAX_QUEUE_SIZE = 100;

class RealtimeService {
  private websocket: WebSocket | null = null;
  private messageQueue: Message[] = [];
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private backoffTime: number = INITIAL_BACKOFF;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private url: string = '';

  /**
   * Connect to WebSocket server
   */
  async connect(url: string): Promise<void> {
    this.url = url;

    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(url);

        this.websocket.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.backoffTime = INITIAL_BACKOFF;

          console.log('[RealtimeService] Connected to WebSocket');
          this.emit('connection:established', {});

          // Flush queued messages
          this.flushMessageQueue();

          // Start heartbeat
          this.startHeartbeat();

          resolve();
        };

        this.websocket.onmessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data) as RealtimeEvent;
            this.emit(message.type, message.data);
          } catch (error) {
            console.error('[RealtimeService] Failed to parse message:', error);
          }
        };

        this.websocket.onerror = (error: Event) => {
          console.error('[RealtimeService] WebSocket error:', error);
          this.emit('connection:error', { error });
          reject(error);
        };

        this.websocket.onclose = () => {
          this.connected = false;
          this.stopHeartbeat();

          console.log('[RealtimeService] Disconnected from WebSocket');
          this.emit('connection:closed', {});

          // Attempt reconnection
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('[RealtimeService] Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.connected = false;
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeService] Max reconnection attempts reached');
      this.emit('connection:failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[RealtimeService] Reconnecting in ${this.backoffTime}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.url).catch((error) => {
        console.error('[RealtimeService] Reconnection failed:', error);
      });
    }, this.backoffTime);

    // Increase backoff time
    this.backoffTime = Math.min(this.backoffTime * BACKOFF_MULTIPLIER, MAX_BACKOFF);
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.send('heartbeat', {});
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  send(type: string, data: any): void {
    const message: Message = {
      type,
      data,
      timestamp: Date.now(),
    };

    if (this.connected && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      // Queue message for later delivery
      this.queueMessage(message);
    }
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(message: Message): void {
    if (this.messageQueue.length < MAX_QUEUE_SIZE) {
      this.messageQueue.push(message);
      console.log(`[RealtimeService] Message queued (${this.messageQueue.length}/${MAX_QUEUE_SIZE})`);
    } else {
      console.warn('[RealtimeService] Message queue full, discarding oldest message');
      this.messageQueue.shift();
      this.messageQueue.push(message);
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log(`[RealtimeService] Flushing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(type: string, listener: EventListener): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }

    this.eventListeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(type);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(type: string, data: any): void {
    const event: RealtimeEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`[RealtimeService] Error in listener for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.messageQueue.length;
  }

  /**
   * Get connection stats
   */
  getStats(): {
    connected: boolean;
    queueSize: number;
    reconnectAttempts: number;
    listenersCount: number;
  } {
    return {
      connected: this.connected,
      queueSize: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      listenersCount: Array.from(this.eventListeners.values()).reduce((sum, set) => sum + set.size, 0),
    };
  }
}

export default new RealtimeService();
