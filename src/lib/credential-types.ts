import {
  KeyRound,
  Server,
  Key,
  Database,
  UserCircle,
  Shield,
  Cloud,
  type LucideIcon,
} from 'lucide-react';

export interface CredentialTypeConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
  key: string;
}

interface TagTypeEntry {
  keywords: string[];
  config: CredentialTypeConfig;
}

export const DEFAULT_TYPE: CredentialTypeConfig = {
  icon: KeyRound,
  color: 'text-muted-foreground',
  bg: 'bg-muted',
  label: '凭证',
  key: 'default',
};

const TAG_TYPE_MAP: TagTypeEntry[] = [
  {
    keywords: ['服务器', 'ssh', 'rdp', 'vps'],
    config: {
      icon: Server,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: '服务器',
      key: 'server',
    },
  },
  {
    keywords: ['api', 'apikey', 'api key', 'token', '令牌', '密钥'],
    config: {
      icon: Key,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: 'API Key',
      key: 'api',
    },
  },
  {
    keywords: ['数据库', 'db', 'mysql', 'pgsql', 'mongo', 'redis'],
    config: {
      icon: Database,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: '数据库',
      key: 'database',
    },
  },
  {
    keywords: ['账号', '账户', '帐号', '用户'],
    config: {
      icon: UserCircle,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: '账号',
      key: 'account',
    },
  },
  {
    keywords: ['安全', 'ssl', 'tls', '证书', 'https'],
    config: {
      icon: Shield,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: '安全',
      key: 'security',
    },
  },
  {
    keywords: ['云服务', 'aws', '云', 'cloud', '阿里云', '腾讯云', '华为云'],
    config: {
      icon: Cloud,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: '云服务',
      key: 'cloud',
    },
  },
];

/**
 * Resolve the visual type config for a credential based on its tag names.
 * Uses first-match-wins: the first entry in TAG_TYPE_MAP whose keyword
 * appears in any tag name determines the type.
 */
export function resolveCredentialType(tagNames: string[]): CredentialTypeConfig {
  const lowerNames = tagNames.map((n) => n.toLowerCase());
  for (const entry of TAG_TYPE_MAP) {
    for (const kw of entry.keywords) {
      if (lowerNames.some((name) => name.includes(kw.toLowerCase()))) {
        return entry.config;
      }
    }
  }
  return DEFAULT_TYPE;
}

/**
 * Resolve the visual type config for a single tag name.
 * Returns null if the tag doesn't match any known type.
 */
export function resolveTagType(tagName: string): CredentialTypeConfig | null {
  const lower = tagName.toLowerCase();
  for (const entry of TAG_TYPE_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return entry.config;
      }
    }
  }
  return null;
}

/**
 * Get all defined type configs (for rendering stat cards / filter tabs).
 */
export function getAllTypeConfigs(): CredentialTypeConfig[] {
  return TAG_TYPE_MAP.map((e) => e.config);
}
