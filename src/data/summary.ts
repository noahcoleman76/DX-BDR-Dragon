import { ownerKey } from './model.ts';
import type { WorkspaceData } from './model.ts';

export function getWorkspaceSummary(data: WorkspaceData) {
  const activeTasks = { total: 0, daily: 0, weekly: 0, adhoc: 0 };
  for (const task of data.tasks) {
    if (!task.isCompleted) { activeTasks.total++; activeTasks[task.category]++; }
  }
  const executives = new Map<string, { key: string; name: string; count: number }>();
  for (const account of data.accounts) {
    const key = ownerKey(account.owner);
    const group = executives.get(key) ?? { key, name: account.owner.trim() || 'Unassigned', count: 0 };
    group.count++;
    executives.set(key, group);
  }
  const accountsByExecutive = [...executives.values()].sort((a, b) => Number(!a.key) - Number(!b.key) || a.name.localeCompare(b.name));
  return { activeTasks, totalAccounts: data.accounts.length, accountsByExecutive };
}
