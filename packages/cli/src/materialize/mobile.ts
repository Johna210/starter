// Materializer: apps/mobile templates (Expo + React Native).
//
// Expo is the mobile peer for TypeScript shapes (decision 4). The mobile
// client deliberately consumes @starter/api-client rather than a second
// types package: Hono RPC remains the contract spine for both web and
// mobile. Auth tokens live in expo-secure-store and refresh sends the
// refresh token in the request body (decision 23).

import { join } from 'node:path';
import { type Composition } from '../composition.js';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeMobile(ctx: ProjectContext, composition: Composition): Promise<void> {
  const { targetDir } = ctx;
  const isMicroservices = composition.topology === 'microservices';

  await writeFileRecursive(join(targetDir, 'apps/mobile/package.json'), mobilePackageJson());
  await writeFileRecursive(join(targetDir, 'apps/mobile/tsconfig.json'), mobileTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/mobile/app.json'), mobileAppJson());
  await writeFileRecursive(join(targetDir, 'apps/mobile/.env.example'), mobileEnvExample(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/mobile/index.ts'), mobileIndexTs());
  await writeFileRecursive(join(targetDir, 'apps/mobile/src/App.tsx'), mobileAppTsx());
  await writeFileRecursive(join(targetDir, 'apps/mobile/src/auth.ts'), mobileAuthTs(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/mobile/src/config.ts'), mobileConfigTs(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/mobile/src/lib/token-storage.ts'), mobileTokenStorageTs());
  await writeFileRecursive(join(targetDir, 'apps/mobile/src/lib/api.ts'), mobileApiTs(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/mobile/src/lib/auth-flow.test.ts'), mobileAuthFlowTestTs(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/mobile/src/screens/LoginScreen.tsx'), mobileLoginScreenTs());
  await writeFileRecursive(join(targetDir, 'apps/mobile/src/screens/ItemsScreen.tsx'), mobileItemsScreenTs());
}

function mobilePackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/mobile',
      version: '0.1.0',
      private: true,
      main: 'index.ts',
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        typecheck: 'tsc --noEmit',
        test: 'vitest run',
      },
      dependencies: {
        '@starter/api-client': 'workspace:*',
        '@starter/shared': 'workspace:*',
        expo: '~57.0.0',
        'expo-secure-store': '~57.0.1',
        react: '^19.2.3',
        'react-native': '0.86.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/react': '^19.2.0',
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function mobileTsconfigJson(): string {
  return JSON.stringify(
    {
      extends: 'expo/tsconfig.base',
      compilerOptions: {
        strict: true,
        noEmit: true,
      },
      include: ['index.ts', 'src/**/*'],
    },
    null,
    2,
  ) + '\n';
}

function mobileAppJson(): string {
  return JSON.stringify(
    {
      expo: {
        name: 'Starter Mobile',
        slug: 'starter-mobile',
        version: '0.1.0',
        orientation: 'portrait',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        ios: { supportsTablet: true },
        android: { package: 'com.starter.mobile' },
      },
    },
    null,
    2,
  ) + '\n';
}

function mobileEnvExample(isMicroservices: boolean): string {
  return `# @starter/mobile - local Expo env (git-ignored; copy to .env).
#
# Expo inlines EXPO_PUBLIC_* variables into the app bundle. The native app
# calls the services directly, so use a host address reachable by the device:
# - iOS simulator: http://localhost:3000
# - Android emulator: http://10.0.2.2:3000
# - physical device / Expo Go: your computer's LAN IP
EXPO_PUBLIC_API_URL=http://localhost:3000
${isMicroservices ? '# Auth service (the sole token minter):\nEXPO_PUBLIC_AUTH_URL=http://localhost:3001\n' : ''}`;
}

function mobileIndexTs(): string {
  return `import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
`;
}

function mobileAppTsx(): string {
  return `import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { restoreSession, signOut } from './auth';
import { ItemsScreen } from './screens/ItemsScreen';
import { LoginScreen } from './screens/LoginScreen';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void restoreSession().then((token) => {
      setAccessToken(token);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!accessToken) {
    return <LoginScreen onSignedIn={setAccessToken} />;
  }

  const handleSignOut = async () => {
    await signOut();
    setAccessToken(null);
  };

  return <ItemsScreen onSignedOut={handleSignOut} />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
`;
}

function mobileAuthTs(isMicroservices: boolean): string {
  const authClient = isMicroservices ? 'apiAuthClient' : 'apiClient';
  return `import { ${authClient} } from './lib/api';
import {
  tokenStorage,
} from './lib/token-storage';

type TokenPair = {
  access?: string;
  refresh?: string;
};

export async function restoreSession(): Promise<string | null> {
  const [access, refresh] = await Promise.all([
    tokenStorage.getAccessToken(),
    tokenStorage.getRefreshToken(),
  ]);
  if (access && refresh) return access;
  await tokenStorage.clearTokens();
  return null;
}

export async function signIn(input: { email: string; password: string }): Promise<string> {
  const response = await ${authClient}.auth.login.$post({ json: input });
  if (!response.ok) {
    throw new Error('Invalid email or password');
  }

  const data = (await response.json()) as TokenPair;
  if (!data.access || !data.refresh) {
    throw new Error('Login response did not include both tokens');
  }
  await tokenStorage.setTokens(data.access, data.refresh);
  return data.access;
}

export async function signOut(): Promise<void> {
  const refresh = await tokenStorage.getRefreshToken();
  await tokenStorage.clearTokens();
  if (!refresh) return;

  try {
    await ${authClient}.auth.logout.$post({ json: { refresh } });
  } catch {
    // The local tokens are already gone; logout is best effort offline.
  }
}
`;
}

function mobileConfigTs(isMicroservices: boolean): string {
  const fields = isMicroservices
    ? `
  apiUrl: z.string().url().default('http://localhost:3000'),
  authUrl: z.string().url().default('http://localhost:3001'),`
    : `
  apiUrl: z.string().url().default('http://localhost:3000'),`;
  const values = isMicroservices
    ? `
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      authUrl: process.env.EXPO_PUBLIC_AUTH_URL,`
    : `
      apiUrl: process.env.EXPO_PUBLIC_API_URL,`;

  return `import { z } from 'zod';

const configSchema = z.object({${fields}
});

export type MobileConfig = z.infer<typeof configSchema>;

let cached: MobileConfig | undefined;

export function loadConfig(): MobileConfig {
  if (!cached) {
    cached = configSchema.parse({${values}
    });
  }
  return cached;
}
`;
}

function mobileTokenStorageTs(): string {
  return `import * as SecureStore from 'expo-secure-store';

export const ACCESS_TOKEN_KEY = 'starter_access_token';
export const REFRESH_TOKEN_KEY = 'starter_refresh_token';

export const tokenStorage = {
  getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async setTokens(access: string, refresh: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
`;
}

function mobileApiTs(isMicroservices: boolean): string {
  const clientDeclarations = isMicroservices
    ? `
export const apiClient = createApiClient(config.apiUrl, { fetch: authedFetch });
export const apiAuthClient = createApiAuthClient(config.authUrl, { fetch: authedFetch });
const refreshClient = apiAuthClient;`
    : `
export const apiClient = createApiClient(config.apiUrl, { fetch: authedFetch });
const refreshClient = apiClient;`;

  return `import { ${isMicroservices ? 'createApiAuthClient, ' : ''}createApiClient } from '@starter/api-client';
import { loadConfig } from '../config';
import { tokenStorage } from './token-storage';

const config = loadConfig();
const AUTH_PATH = '/auth/';

function isAuthEndpoint(url: string): boolean {
  return url.includes(AUTH_PATH);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await tokenStorage.getRefreshToken();
  if (!refresh) return null;

  const response = await refreshClient.auth.refresh.$post({ json: { refresh } });
  if (!response.ok) return null;

  const data = (await response.json()) as { access?: string; refresh?: string };
  if (!data.access || !data.refresh) return null;
  await tokenStorage.setTokens(data.access, data.refresh);
  return data.access;
}

const authedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const skipAuth = isAuthEndpoint(url);
  const headers = new Headers(init?.headers);
  const access = await tokenStorage.getAccessToken();

  if (access && !skipAuth && !headers.has('Authorization')) {
    headers.set('Authorization', \`Bearer \${access}\`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status !== 401 || skipAuth || !access) return response;

  const refreshedAccess = await refreshAccessToken();
  if (!refreshedAccess) {
    await tokenStorage.clearTokens();
    return response;
  }

  const retryHeaders = new Headers(init?.headers);
  retryHeaders.set('Authorization', \`Bearer \${refreshedAccess}\`);
  return fetch(input, { ...init, headers: retryHeaders });
};${clientDeclarations}
`;
}

function mobileLoginScreenTs(): string {
  return `import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { signIn } from '../auth';

export function LoginScreen({ onSignedIn }: { onSignedIn: (accessToken: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const access = await signIn({ email, password });
      onSignedIn(access);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        value={email}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete="password"
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button disabled={submitting} onPress={() => void handleSubmit()} title={submitting ? 'Signing in...' : 'Sign in'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    justifyContent: 'center',
    flex: 1,
    padding: 24,
  },
  error: {
    color: '#b42318',
  },
  input: {
    borderColor: '#b8b8b8',
    borderRadius: 6,
    borderWidth: 1,
    padding: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});
`;
}

function mobileItemsScreenTs(): string {
  return `import { useCallback, useEffect, useState } from 'react';
import { Button, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { signOut } from '../auth';
import { apiClient } from '../lib/api';

async function fetchItems() {
  const response = await apiClient.items.$get();
  if (!response.ok) {
    throw new Error(\`Failed to load items: \${response.status}\`);
  }
  return response.json();
}

type Item = Awaited<ReturnType<typeof fetchItems>>[number];

export function ItemsScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const createItem = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    const response = await apiClient.items.$post({ json: { name: trimmed } });
    if (!response.ok) {
      setError(\`Failed to create item: \${response.status}\`);
      return;
    }
    setName('');
    await loadItems();
  };

  const handleSignOut = async () => {
    await signOut();
    onSignedOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Items</Text>
        <Button onPress={() => void handleSignOut()} title="Sign out" />
      </View>
      <View style={styles.form}>
        <TextInput
          accessibilityLabel="Item name"
          onChangeText={setName}
          placeholder="Item name"
          style={styles.input}
          value={name}
        />
        <Button onPress={() => void createItem()} title="Create" />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <Text>Loading...</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void loadItems();
            }}
            refreshing={refreshing}
          />
        }
        renderItem={({ item }) => <Text style={styles.item}>{item.name}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  error: {
    color: '#b42318',
    marginBottom: 12,
  },
  form: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  input: {
    borderColor: '#b8b8b8',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  item: {
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
`;
}

function mobileAuthFlowTestTs(isMicroservices: boolean): string {
  const authClientName = isMicroservices ? 'apiAuthClient' : 'apiClient';
  return `import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});

vi.mock('expo-secure-store', () => secureStore);

const liveApi = process.env.MOBILE_SMOKE_API_URL;
const accessTtl = Number(process.env.ACCESS_TOKEN_TTL ?? 0);
const describeLive = liveApi ? describe : describe.skip;
const describeRefresh = liveApi && accessTtl > 0 && accessTtl <= 5 ? describe : describe.skip;

async function loadMobile() {
  process.env.EXPO_PUBLIC_API_URL ??= liveApi;
  ${isMicroservices ? "process.env.EXPO_PUBLIC_AUTH_URL ??= process.env.MOBILE_SMOKE_AUTH_URL;" : ''}
  const mobile = await import('./api.js');
  const auth = await import('../auth.js');
  const storage = await import('./token-storage.js');
  return { auth, mobile, storage };
}

describeLive('mobile auth against a running api', () => {
  beforeEach(() => {
    secureStore.values.clear();
    vi.clearAllMocks();
  });

  it('stores both login tokens and calls protected items with Bearer auth', async () => {
    const { auth, mobile, storage } = await loadMobile();
    const email = \`mobile-\${Date.now()}@example.com\`;
    const registerResponse = await mobile.${authClientName}.auth.register.$post({
      json: { email, password: 'password1234' },
    });
    expect([201, 409]).toContain(registerResponse.status);

    const access = await auth.signIn({ email, password: 'password1234' });
    expect(access).toBe(secureStore.values.get(storage.ACCESS_TOKEN_KEY));
    expect(secureStore.values.get(storage.REFRESH_TOKEN_KEY)).toBeTruthy();
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(2);

    const response = await mobile.apiClient.items.$get();
    expect(response.ok).toBe(true);
  });
});

describeRefresh('mobile body-refresh on 401', () => {
  beforeEach(() => {
    secureStore.values.clear();
    vi.clearAllMocks();
  });

  it('rotates secure-storage tokens and retries the protected request', async () => {
    const { auth, mobile, storage } = await loadMobile();
    const email = \`mobile-refresh-\${Date.now()}@example.com\`;
    const registerResponse = await mobile.${authClientName}.auth.register.$post({
      json: { email, password: 'password1234' },
    });
    expect([201, 409]).toContain(registerResponse.status);
    await auth.signIn({ email, password: 'password1234' });
    const oldRefresh = secureStore.values.get(storage.REFRESH_TOKEN_KEY);

    await new Promise((resolve) => setTimeout(resolve, (accessTtl + 1) * 1000));
    const response = await mobile.apiClient.items.$get();

    expect(response.ok).toBe(true);
    expect(secureStore.values.get(storage.REFRESH_TOKEN_KEY)).toBeTruthy();
    expect(secureStore.values.get(storage.REFRESH_TOKEN_KEY)).not.toBe(oldRefresh);
  });
});
`;
}
