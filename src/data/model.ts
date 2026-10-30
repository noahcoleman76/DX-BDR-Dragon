export type Category = 'daily' | 'weekly' | 'adhoc';
export type MessageType = 'email' | 'linkedin' | 'call';
export type MessageStatus = 'current' | 'previous';
export interface RecordBase { id: string; createdAt: string; updatedAt: string }
export interface Account extends RecordBase {
  name: string; websiteUrl: string; crmUrl: string; owner: string;
  lastWorkedDate: string; companyDescription: string; notes: string;
}
export interface Contact extends RecordBase {
  accountId: string; name: string; title: string; crmUrl: string;
  linkedinUrl: string; lastContactedDate: string; notes: string;
}
export interface Message extends RecordBase {
  accountId?: string; contactId?: string; type: MessageType; status: MessageStatus; content: string;
}
export interface Task extends RecordBase {
  accountId: string | null; name: string; notes: string; category: Category; linkUrl?: string;
  isCompleted: boolean; completedAt: string | null; sortOrder: number; completedPeriod: string | null;
}
export interface WorkspaceData {
  version: 1; accounts: Account[]; contacts: Contact[];
  accountMessages: Message[]; contactMessages: Message[]; tasks: Task[];
  ownerColors: Record<string, string>;
  sdrName?: string;
}
export const emptyData = (): WorkspaceData => ({ version: 1, accounts: [], contacts: [], accountMessages: [], contactMessages: [], tasks: [], ownerColors: {} });
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function periodFor(category: Category, date = new Date()): string | null {
  if (category === 'adhoc') return null;
  if (category === 'daily') return localDate(date);
  return localDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7));
}
export const orderedTasks = (tasks: Task[]) => [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
export function orderedMessages(messages: Message[]): Message[] {
  const rank = { email: 0, linkedin: 1, call: 2 };
  return [...messages].sort((a, b) => Number(a.status === 'previous') - Number(b.status === 'previous') || rank[a.type] - rank[b.type] || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
export const ownerKey = (owner: string) => owner.trim().toLocaleLowerCase();
export function safeUrl(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname ? url.href : undefined;
  } catch { return undefined; }
}
