import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from './prisma';

// Expo 推送发送层。Handoff §4 前提:已登录 + 系统授权(客户端拿到 token 才会注册)
// + Settings 对应开关开启(这里按 kind 查 users 上的偏好列)。
//
// 无 token / 开关关闭 → 静默跳过。发送失败不抛给调用方(推送是尽力而为,
// 不该让 Story 生成流程失败);DeviceNotRegistered 的 token 直接清理。

export type PushKind = 'story_ready' | 'upload_reminder';

let _expo: Expo | null = null;
function getExpo(): Expo {
  if (!_expo) _expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  return _expo;
}

const PREF_COLUMN: Record<PushKind, 'storyNotificationsEnabled' | 'uploadRemindersEnabled'> = {
  story_ready:     'storyNotificationsEnabled',
  upload_reminder: 'uploadRemindersEnabled',
};

export interface PushPayload {
  title: string;
  body:  string;
  data?: Record<string, unknown>;
}

/** 给单个用户发一条推送。返回实际投递的设备数(0 = 跳过)。 */
export async function sendPushToUser(
  userId: string,
  kind: PushKind,
  payload: PushPayload,
  log: (msg: string) => void = () => {},
): Promise<number> {
  try {
    const user = await prisma.user.findFirst({
      where:  { id: userId, deletedAt: null },
      select: { storyNotificationsEnabled: true, uploadRemindersEnabled: true,
                pushTokens: { select: { id: true, token: true } } },
    });
    if (!user) return 0;
    if (!user[PREF_COLUMN[kind]]) return 0;          // 用户关了这类通知
    const valid = user.pushTokens.filter(t => Expo.isExpoPushToken(t.token));
    if (valid.length === 0) return 0;

    const messages: ExpoPushMessage[] = valid.map(t => ({
      to:    t.token,
      title: payload.title,
      body:  payload.body,
      sound: 'default',
      ...(payload.data ? { data: payload.data } : {}),
    }));

    const expo = getExpo();
    const tickets = [];
    for (const chunk of expo.chunkPushNotifications(messages)) {
      tickets.push(...await expo.sendPushNotificationsAsync(chunk));
    }

    // 设备已卸载/token 失效 → 删掉,避免长期无效重试
    const stale: string[] = [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        const t = valid[i];
        if (t) stale.push(t.id);
      }
    });
    if (stale.length > 0) {
      await prisma.pushToken.deleteMany({ where: { id: { in: stale } } });
      log(`[push] pruned ${stale.length} unregistered token(s) for user=${userId}`);
    }

    return valid.length - stale.length;
  } catch (err) {
    log(`[push] send failed for user=${userId}: ${(err as Error).message}`);
    return 0;
  }
}

/** Story 生成完成(审核通过后)通知 */
export async function sendStoryReadyPush(
  userId: string,
  args: { childName: string; storyId: string; monthKey: string },
  log?: (msg: string) => void,
): Promise<number> {
  return sendPushToUser(userId, 'story_ready', {
    title: 'Your Story is ready',
    body:  `${args.childName}'s monthly Story is ready. Tap to read.`,
    data:  { type: 'story_ready', storyId: args.storyId, monthKey: args.monthKey },
  }, log);
}
