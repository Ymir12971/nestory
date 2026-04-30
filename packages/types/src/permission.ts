export type PermissionRule =
  | 'R-01' // Story 生成配额
  | 'R-02' // Memory 上传
  | 'R-03' // Asset 删除
  | 'R-04' // Highlight 上限
  | 'R-05' // Profile 切换
  | 'R-06' // Story 重新生成
  | 'R-07' // Story 分享
  | 'R-08' // Watermark
  | 'R-09' // Birthday Celebration
  | 'R-10' // 降级常驻 Notify
  | 'R-11'; // Trial 资格

export interface PermissionContext {
  userId: string;
  subscriptionStatus: import('./subscription').SubscriptionStatus;
  storyQuota: number;
}
