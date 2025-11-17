/**
 * Personalization Service
 * Implements user profiling, behavior analysis, and content personalization
 * Features: Profile building, behavior patterns, content ranking, multi-armed bandit
 */

export interface UserPersonalization {
  userId: string;
  profileVector: number[];
  preferenceClusters: string[];
  behaviorPatterns: BehaviorPattern[];
  contentAffinities: Map<string, number>;
  engagementHistory: EngagementRecord[];
}

export interface BehaviorPattern {
  type: 'viewing' | 'sharing' | 'organizing' | 'collaborating';
  frequency: number;
  timePattern: TimePattern;
  contextFactors: string[];
  intensity: number;
}

export interface TimePattern {
  dayOfWeek: number;
  hourOfDay: number;
  seasonality: 'peak' | 'normal' | 'low';
}

export interface EngagementRecord {
  contentId: string;
  type: 'view' | 'share' | 'like' | 'bookmark' | 'comment';
  timestamp: number;
  duration?: number;
  context: Record<string, any>;
}

export interface Content {
  id: string;
  title: string;
  tags: string[];
  category: string;
  photographer?: string;
  createdAt: number;
  engagementMetrics?: {
    views: number;
    shares: number;
    likes: number;
  };
}

export interface SimilarUser {
  userId: string;
  similarity: number;
  sharedInterests: string[];
}

export interface ActionPrediction {
  action: string;
  probability: number;
  timeToAction: number;
  confidence: number;
}

export interface LoyaltyMetrics {
  engagementScore: number;
  retentionRisk: 'low' | 'medium' | 'high';
  predictedLifetimeValue: number;
  churnProbability: number;
}

export interface PersonalizedContent {
  contentId: string;
  personalizedScore: number;
  reasoning: string;
  explorationBonus: number;
  expectedEngagement: number;
}

export interface BanditArm {
  contentId: string;
  rewards: number[];
  pulls: number;
  successCount: number;
}

/**
 * Personalization Service
 */
export class PersonalizationService {
  private userProfiles: Map<string, UserPersonalization> = new Map();
  private banditArms: Map<string, BanditArm[]> = new Map();
  private contentCache: Map<string, Content> = new Map();
  private similarityThreshold = 0.3;
  private explorationRate = 0.15;

  /**
   * Build user profile from interactions
   */
  buildUserProfile(userId: string, interactions: EngagementRecord[] = []): UserPersonalization {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        profileVector: this.initializeProfileVector(),
        preferenceClusters: [],
        behaviorPatterns: [],
        contentAffinities: new Map(),
        engagementHistory: [],
      };
    }

    // Add new interactions
    profile.engagementHistory = [...profile.engagementHistory, ...interactions].slice(-100);

    // Extract profile vector from interactions
    profile.profileVector = this.extractProfileVector(profile);

    // Detect behavior patterns
    profile.behaviorPatterns = this.detectBehaviorPatterns(profile);

    // Determine preference clusters
    profile.preferenceClusters = this.getProfileClusters(profile);

    // Calculate content affinities
    profile.contentAffinities = this.calculateContentAffinities(profile);

    this.userProfiles.set(userId, profile);
    return profile;
  }

  /**
   * Initialize profile vector
   */
  private initializeProfileVector(): number[] {
    // 50-dimensional feature vector
    return Array(50)
      .fill(0)
      .map(() => Math.random() * 0.1);
  }

  /**
   * Extract profile vector from user interactions
   */
  extractProfileVector(profile: UserPersonalization): number[] {
    const vector = Array(50).fill(0);

    // Feature engineering from engagement history
    for (const record of profile.engagementHistory) {
      const typeIndex = this.getEngagementTypeIndex(record.type);
      vector[typeIndex] += 0.1;

      const timeIndex = new Date(record.timestamp).getHours();
      vector[10 + (timeIndex % 10)] += 0.05;
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return magnitude > 0 ? vector.map((v) => v / magnitude) : vector;
  }

  /**
   * Get engagement type index
   */
  private getEngagementTypeIndex(type: string): number {
    const typeMap: Record<string, number> = {
      view: 0,
      share: 1,
      like: 2,
      bookmark: 3,
      comment: 4,
    };
    return typeMap[type] || 0;
  }

  /**
   * Detect behavior patterns
   */
  detectBehaviorPatterns(profile: UserPersonalization): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    // Analyze engagement history for patterns
    const typeCounts: Record<string, number> = {
      viewing: 0,
      sharing: 0,
      organizing: 0,
      collaborating: 0,
    };

    for (const record of profile.engagementHistory) {
      if (record.type === 'view') typeCounts.viewing++;
      if (record.type === 'share') typeCounts.sharing++;
      if (record.type === 'bookmark') typeCounts.organizing++;
      if (record.type === 'comment') typeCounts.collaborating++;
    }

    const totalEngagements = profile.engagementHistory.length || 1;

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > 0) {
        const frequency = count / totalEngagements;
        const pattern: BehaviorPattern = {
          type: type as BehaviorPattern['type'],
          frequency,
          timePattern: this.analyzeTimePattern(profile.engagementHistory),
          contextFactors: this.extractContextFactors(profile.engagementHistory),
          intensity: Math.min(1, frequency * 2),
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Analyze time pattern of engagements
   */
  private analyzeTimePattern(records: EngagementRecord[]): TimePattern {
    if (records.length === 0) {
      return {
        dayOfWeek: 3,
        hourOfDay: 12,
        seasonality: 'normal',
      };
    }

    const lastRecord = records[records.length - 1];
    const date = new Date(lastRecord.timestamp);

    const engagementCount = records.length;
    let seasonality: 'peak' | 'normal' | 'low' = 'normal';
    if (engagementCount > 20) seasonality = 'peak';
    if (engagementCount < 5) seasonality = 'low';

    return {
      dayOfWeek: date.getDay(),
      hourOfDay: date.getHours(),
      seasonality,
    };
  }

  /**
   * Extract context factors
   */
  private extractContextFactors(records: EngagementRecord[]): string[] {
    const factors = new Set<string>();
    for (const record of records.slice(-20)) {
      if (record.context) {
        Object.keys(record.context).forEach((key) => {
          factors.add(`${key}:${record.context[key]}`);
        });
      }
    }
    return Array.from(factors);
  }

  /**
   * Get profile clusters
   */
  getProfileClusters(profile: UserPersonalization): string[] {
    const clusters: string[] = [];

    const patterns = profile.behaviorPatterns;
    if (patterns.some((p) => p.frequency > 0.3)) {
      clusters.push('power_user');
    }
    if (patterns.some((p) => p.type === 'sharing' && p.frequency > 0.2)) {
      clusters.push('social_sharer');
    }
    if (patterns.some((p) => p.type === 'collaborating' && p.frequency > 0.15)) {
      clusters.push('collaborator');
    }
    if (patterns.some((p) => p.type === 'organizing' && p.frequency > 0.2)) {
      clusters.push('organizer');
    }
    if (profile.engagementHistory.length < 5) {
      clusters.push('new_user');
    }

    return clusters;
  }

  /**
   * Calculate content affinities
   */
  private calculateContentAffinities(profile: UserPersonalization): Map<string, number> {
    const affinities = new Map<string, number>();

    // Analyze tags and categories from engagement history
    for (const record of profile.engagementHistory) {
      const content = this.contentCache.get(record.contentId);
      if (content) {
        for (const tag of content.tags) {
          const current = affinities.get(tag) || 0;
          const weight = record.type === 'view' ? 0.5 : 1.0;
          affinities.set(tag, current + weight);
        }
      }
    }

    return affinities;
  }

  /**
   * Rank content for user
   */
  rankContentPersonalized(userId: string, contentList: Content[]): Content[] {
    const profile = this.userProfiles.get(userId) || this.buildUserProfile(userId);

    // Score each content
    const scored = contentList.map((content) => {
      let score = 0.5;

      // Tag affinity score
      for (const tag of content.tags) {
        const affinity = profile.contentAffinities.get(tag) || 0;
        score += affinity * 0.1;
      }

      // Engagement metrics score
      if (content.engagementMetrics) {
        score += (content.engagementMetrics.views / 1000) * 0.1;
        score += (content.engagementMetrics.shares / 100) * 0.15;
      }

      // Freshness score
      const ageInDays = (Date.now() - content.createdAt) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 0.2 - ageInDays * 0.01);

      return { content, score: Math.min(1, score) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.content);
  }

  /**
   * Predict next user action
   */
  predictNextAction(userId: string): ActionPrediction {
    const profile = this.userProfiles.get(userId);
    if (!profile || profile.behaviorPatterns.length === 0) {
      return {
        action: 'browse',
        probability: 0.6,
        timeToAction: 300,
        confidence: 0.3,
      };
    }

    const topPattern = profile.behaviorPatterns.sort((a, b) => b.frequency - a.frequency)[0];

    return {
      action: topPattern.type,
      probability: topPattern.frequency,
      timeToAction: 60 + Math.random() * 300,
      confidence: Math.min(1, topPattern.frequency * 1.5),
    };
  }

  /**
   * Find similar users (based on profile vectors)
   */
  findSimilarUsers(userId: string, k: number = 5): SimilarUser[] {
    const profile = this.userProfiles.get(userId);
    if (!profile) return [];

    const similarities: SimilarUser[] = [];

    for (const [otherUserId, otherProfile] of this.userProfiles) {
      if (otherUserId === userId) continue;

      const similarity = this.calculateCosineSimilarity(
        profile.profileVector,
        otherProfile.profileVector
      );

      if (similarity > this.similarityThreshold) {
        similarities.push({
          userId: otherUserId,
          similarity,
          sharedInterests: this.findSharedInterests(profile, otherProfile),
        });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, k);
  }

  /**
   * Calculate cosine similarity
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < Math.min(vec1.length, vec2.length); i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Find shared interests
   */
  private findSharedInterests(profile1: UserPersonalization, profile2: UserPersonalization): string[] {
    const tags1 = new Set(Array.from(profile1.contentAffinities.keys()));
    const tags2 = new Set(Array.from(profile2.contentAffinities.keys()));

    return Array.from(tags1).filter((tag) => tags2.has(tag));
  }

  /**
   * Calculate engagement score
   */
  calculateEngagementScore(userId: string): number {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 0;

    const historyLength = profile.engagementHistory.length;
    const patternCount = profile.behaviorPatterns.length;
    const clusterCount = profile.preferenceClusters.length;

    return Math.min(1, (historyLength * 0.01 + patternCount * 0.15 + clusterCount * 0.1) / 3);
  }

  /**
   * Get loyalty metrics
   */
  getLoyaltyMetrics(userId: string): LoyaltyMetrics {
    const engagementScore = this.calculateEngagementScore(userId);
    const churnProbability = Math.max(0, 1 - engagementScore);

    return {
      engagementScore,
      retentionRisk:
        churnProbability > 0.6
          ? 'high'
          : churnProbability > 0.3
            ? 'medium'
            : 'low',
      predictedLifetimeValue: engagementScore * 1000,
      churnProbability,
    };
  }

  /**
   * Select bandit arm (exploration vs exploitation)
   */
  selectBanditArm(userId: string, options: Content[]): Content {
    if (Math.random() < this.explorationRate) {
      // Exploration: random selection
      return options[Math.floor(Math.random() * options.length)];
    }

    // Exploitation: select best arm based on rewards
    let maxContent = options[0];
    let maxValue = -Infinity;

    for (const content of options) {
      const armId = `${userId}:${content.id}`;
      const arms = this.banditArms.get(armId) || [];
      const ucbValue = this.calculateUCB(arms, Math.log(1 + Date.now() / 1000));

      if (ucbValue > maxValue) {
        maxValue = ucbValue;
        maxContent = content;
      }
    }

    return maxContent;
  }

  /**
   * Calculate UCB (Upper Confidence Bound)
   */
  private calculateUCB(arms: BanditArm[], t: number): number {
    if (arms.length === 0) return Math.random();

    const totalPulls = arms.reduce((sum, arm) => sum + arm.pulls, 0);
    const totalSuccess = arms.reduce((sum, arm) => sum + arm.successCount, 0);

    const exploitation = totalSuccess / Math.max(1, totalPulls);
    const exploration = Math.sqrt((2 * Math.log(t)) / Math.max(1, totalPulls));

    return exploitation + exploration;
  }

  /**
   * Update bandit rewards
   */
  updateBanditRewards(userId: string, contentId: string, reward: number): void {
    const armId = `${userId}:${contentId}`;
    let arms = this.banditArms.get(armId) || [];

    if (arms.length === 0) {
      arms = [
        {
          contentId,
          rewards: [],
          pulls: 0,
          successCount: 0,
        },
      ];
    }

    const arm = arms[0];
    arm.rewards.push(reward);
    arm.pulls++;
    if (reward > 0.5) arm.successCount++;

    this.banditArms.set(armId, arms);
  }

  /**
   * Get exploration rate
   */
  getExplorationRate(userId: string): number {
    const profile = this.userProfiles.get(userId);
    if (!profile) return this.explorationRate;

    // Decrease exploration for power users
    if (profile.preferenceClusters.includes('power_user')) {
      return this.explorationRate * 0.5;
    }

    return this.explorationRate;
  }

  /**
   * Register content
   */
  registerContent(content: Content): void {
    this.contentCache.set(content.id, content);
  }

  /**
   * Get personalization metrics
   */
  getMetrics(): {
    totalUsers: number;
    totalContent: number;
    avgEngagementScore: number;
    totalBanditArms: number;
  } {
    let totalEngagement = 0;
    for (const profile of this.userProfiles.values()) {
      totalEngagement += this.calculateEngagementScore(profile.userId);
    }

    return {
      totalUsers: this.userProfiles.size,
      totalContent: this.contentCache.size,
      avgEngagementScore: this.userProfiles.size > 0 ? totalEngagement / this.userProfiles.size : 0,
      totalBanditArms: this.banditArms.size,
    };
  }
}

export const personalizationService = new PersonalizationService();
