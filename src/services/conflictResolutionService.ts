/**
 * Conflict Resolution Service - CRDT Vector Clocks
 * 
 * Manages conflict resolution using:
 * - Vector clocks for causality tracking
 * - Last-write-wins (LWW) strategy
 * - Timestamp-based tiebreaker
 */

interface VectorClock {
  [userId: string]: number;
}

interface Operation {
  id: string;
  userId: string;
  albumId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  vectorClock: VectorClock;
  timestamp: number;
}

interface ConflictResolution {
  conflicting: boolean;
  winner: Operation | null;
  loser: Operation | null;
  reason: string;
}

class ConflictResolutionService {
  private vectorClocks: Map<string, VectorClock> = new Map();
  private operations: Operation[] = [];
  private conflicts: Array<{ op1: Operation; op2: Operation; resolution: ConflictResolution }> = [];

  /**
   * Assign vector clock to operation
   */
  assignVectorClock(userId: string, albumId: string): VectorClock {
    const key = `${userId}:${albumId}`;

    if (!this.vectorClocks.has(key)) {
      this.vectorClocks.set(key, {});
    }

    const vc = this.vectorClocks.get(key)!;
    vc[userId] = (vc[userId] || 0) + 1;

    return { ...vc };
  }

  /**
   * Merge vector clocks (for future use in advanced resolution)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mergeVectorClocks(_vc1: VectorClock, _vc2: VectorClock): VectorClock {
    // Reserved for operational transformation fallback
    return {};
  }

  /**
   * Check if one vector clock happened before another
   */
  private happensBefore(vc1: VectorClock, vc2: VectorClock): boolean {
    let atLeastOneLess = false;

    const allUsers = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);

    for (const user of allUsers) {
      const v1 = vc1[user] || 0;
      const v2 = vc2[user] || 0;

      if (v1 > v2) {
        return false; // vc1 is not before vc2
      }

      if (v1 < v2) {
        atLeastOneLess = true;
      }
    }

    return atLeastOneLess;
  }

  /**
   * Check if vector clocks are concurrent (conflicting) - used in operational transform
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private areConcurrent(_vc1: VectorClock, _vc2: VectorClock): boolean {
    // Reserved for future OT implementation
    return false;
  }

  /**
   * Detect conflict between operations
   */
  detectConflict(op1: Operation, op2: Operation): ConflictResolution {
    // Check if operations are on same album
    if (op1.albumId !== op2.albumId) {
      return {
        conflicting: false,
        winner: null,
        loser: null,
        reason: 'Different albums',
      };
    }

    // Check causality using vector clocks
    if (this.happensBefore(op1.vectorClock, op2.vectorClock)) {
      return {
        conflicting: false,
        winner: op2,
        loser: op1,
        reason: 'op1 causally before op2',
      };
    }

    if (this.happensBefore(op2.vectorClock, op1.vectorClock)) {
      return {
        conflicting: false,
        winner: op1,
        loser: op2,
        reason: 'op2 causally before op1',
      };
    }

    // Operations are concurrent - conflict!
    return {
      conflicting: true,
      winner: null,
      loser: null,
      reason: 'Concurrent operations - conflict detected',
    };
  }

  /**
   * Resolve conflict using LWW strategy
   */
  resolveConflict(op1: Operation, op2: Operation): Operation {
    // Last-write-wins: use timestamp as tiebreaker
    if (op1.timestamp === op2.timestamp) {
      // Use userId as final tiebreaker (deterministic)
      return op1.userId.localeCompare(op2.userId) > 0 ? op1 : op2;
    }

    return op1.timestamp > op2.timestamp ? op1 : op2;
  }

  /**
   * Add operation and check for conflicts
   */
  addOperation(operation: Operation): { resolved: Operation; conflicts: number } {
    let conflictCount = 0;
    let resolved = operation;

    // Check against all previous operations
    for (const existing of this.operations) {
      const detection = this.detectConflict(operation, existing);

      if (detection.conflicting) {
        conflictCount++;

        // Resolve and merge if necessary
        const winner = this.resolveConflict(operation, existing);
        if (winner.id === operation.id) {
          resolved = winner;
        }

        this.conflicts.push({
          op1: operation,
          op2: existing,
          resolution: {
            conflicting: true,
            winner,
            loser: winner.id === operation.id ? existing : operation,
            reason: 'Resolved via LWW (Last-Write-Wins)',
          },
        });
      }
    }

    this.operations.push(operation);
    return { resolved, conflicts: conflictCount };
  }

  /**
   * Get all conflicts
   */
  getConflicts(): Array<{ op1: Operation; op2: Operation; resolution: ConflictResolution }> {
    return [...this.conflicts];
  }

  /**
   * Get conflicts for a specific album
   */
  getConflictsForAlbum(albumId: string): Array<{
    op1: Operation;
    op2: Operation;
    resolution: ConflictResolution;
  }> {
    return this.conflicts.filter((c) => c.op1.albumId === albumId || c.op2.albumId === albumId);
  }

  /**
   * Get operation history
   */
  getOperationHistory(albumId: string): Operation[] {
    return this.operations.filter((op) => op.albumId === albumId);
  }

  /**
   * Get causal order of operations
   */
  getCausalOrder(albumId: string): Operation[] {
    const albumOps = this.operations.filter((op) => op.albumId === albumId);

    // Sort operations by vector clock (topological sort)
    const sorted: Operation[] = [];
    const visited = new Set<string>();

    const dfs = (op: Operation) => {
      if (visited.has(op.id)) {
        return;
      }

      visited.add(op.id);

      // Visit operations that this one depends on
      albumOps.forEach((other) => {
        if (
          other.id !== op.id &&
          !visited.has(other.id) &&
          this.happensBefore(other.vectorClock, op.vectorClock)
        ) {
          dfs(other);
        }
      });

      sorted.push(op);
    };

    albumOps.forEach((op) => dfs(op));

    return sorted;
  }

  /**
   * Get conflict statistics
   */
  getStats(): {
    totalOperations: number;
    totalConflicts: number;
    conflictRate: number;
    maxVectorClockSize: number;
  } {
    const vcSizes: number[] = [];
    this.vectorClocks.forEach((vc) => {
      vcSizes.push(Object.keys(vc).length);
    });

    const maxVCSize = vcSizes.length > 0 ? Math.max(...vcSizes) : 0;

    return {
      totalOperations: this.operations.length,
      totalConflicts: this.conflicts.length,
      conflictRate: this.operations.length > 0 ? this.conflicts.length / this.operations.length : 0,
      maxVectorClockSize: maxVCSize,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.vectorClocks.clear();
    this.operations = [];
    this.conflicts = [];
  }
}

export default new ConflictResolutionService();
