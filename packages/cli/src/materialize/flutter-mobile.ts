// Materializer: apps/mobile templates (Flutter) for the polyglot shapes.
//
// Flutter is the mobile peer for Go shapes (decision 4): a peer app
// that shares ONLY the contract (packages/contract/clients/dart — the
// codegen'd Dart client, decision 19), never TS packages. The mobile
// client authenticates per decision 23: tokens in flutter_secure_storage,
// Bearer header for the access token, and body-refresh on 401 (the
// refresh token travels in the JSON body of POST /auth/refresh — never
// a cookie, which doesn't exist on a Flutter device).
//
// The monolith shape points both the auth and items clients at
// apps/api; the microservices shape points the auth client at
// apps/api-auth (the sole minter, port 3001) and the items client at
// apps/api (port 3000).

import { join } from 'node:path';
import { type Composition } from '../composition.js';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeFlutterMobile(ctx: ProjectContext, composition: Composition): Promise<void> {
  const { targetDir } = ctx;
  const isMicroservices = composition.topology === 'microservices';

  await writeFileRecursive(join(targetDir, 'apps/mobile/pubspec.yaml'), mobilePubspec());
  await writeFileRecursive(join(targetDir, 'apps/mobile/analysis_options.yaml'), mobileAnalysisOptions());
  await writeFileRecursive(join(targetDir, 'apps/mobile/README.md'), mobileReadme());
  await writeFileRecursive(join(targetDir, 'apps/mobile/lib/main.dart'), mobileMainDart());
  await writeFileRecursive(join(targetDir, 'apps/mobile/lib/src/app.dart'), mobileAppDart());
  await writeFileRecursive(join(targetDir, 'apps/mobile/lib/src/config.dart'), mobileConfigDart(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/mobile/lib/src/auth.dart'), mobileAuthDart());
  await writeFileRecursive(join(targetDir, 'apps/mobile/lib/src/api.dart'), mobileApiDart());
  await writeFileRecursive(join(targetDir, 'apps/mobile/lib/src/token_storage.dart'), mobileTokenStorageDart());
  await writeFileRecursive(join(targetDir, 'apps/mobile/lib/src/screens/login_screen.dart'), mobileLoginScreenDart());
  await writeFileRecursive(join(targetDir, 'apps/mobile/lib/src/screens/items_screen.dart'), mobileItemsScreenDart());
  await writeFileRecursive(join(targetDir, 'apps/mobile/test/auth_flow_test.dart'), mobileAuthFlowTestDart());
}

function mobilePubspec(): string {
  return `name: starter_mobile
description: >-
  Flutter peer app for the scaffolded Go api (decisions 2/4/23): shares
  only the contract (the codegen'd Dart client in packages/contract),
  stores auth tokens in flutter_secure_storage, and refreshes with the
  refresh token in the request body.
publish_to: none
version: 0.1.0

environment:
  sdk: ^3.4.0

dependencies:
  flutter:
    sdk: flutter
  flutter_secure_storage: ^9.2.4
  starter_contract:
    path: ../../packages/contract/clients/dart

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0

flutter:
  uses-material-design: true
`;
}

function mobileAnalysisOptions(): string {
  return `# flutter_lints (decision 29's one-tool discipline applied to Dart):
# the community-default lint set, zero config.
include: package:flutter_lints/flutter.yaml
`;
}

function mobileReadme(): string {
  return `# apps/mobile — Flutter peer app (decision 2/4)

The mobile peer for the **polyglot** shapes. It shares **only** the
contract: \`packages/contract/clients/dart\` (the codegen'd Dart client
over the committed \`openapi.yaml\`, decision 19) — never a TS package.

## Run it

\`\`\`sh
cd apps/mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:3000
\`\`\`

\`--dart-define\` is the Flutter equivalent of env vars (baked in at
compile time). \`API_URL\` defaults to \`http://localhost:3000\`; the
Android emulator reaches the host via \`http://10.0.2.2:3000\`, and a
physical device needs the development machine's LAN IP. In the
microservices shape, \`AUTH_URL\` defaults to \`http://localhost:3001\`
(the auth service / sole minter).

## Auth (decision 23)

Login/register return **both** tokens in the response body. The app
stores them in \`flutter_secure_storage\`, attaches the access token as
a \`Bearer\` header, and on a 401 calls \`POST /auth/refresh\` with the
refresh token in the **body**, swaps the pair, and retries once. There
is no cookie anywhere on this path.
`;
}

function mobileMainDart(): string {
  return `// Entrypoint: boots the Flutter peer app (decision 2/4).
import 'package:flutter/material.dart';

import 'src/app.dart';

void main() {
  runApp(const StarterMobileApp());
}
`;
}

function mobileAppDart(): string {
  return `// Root widget: restores the secure-storage session on launch and
// swaps between the login and items screens (decision 23). The api
// seam is built once from compile-time config (decision 28's env
// surface — --dart-define, the Flutter equivalent of env vars).
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api.dart';
import 'auth.dart';
import 'config.dart';
import 'screens/items_screen.dart';
import 'screens/login_screen.dart';
import 'token_storage.dart';

class StarterMobileApp extends StatefulWidget {
  const StarterMobileApp({super.key});

  @override
  State<StarterMobileApp> createState() => _StarterMobileAppState();
}

class _StarterMobileAppState extends State<StarterMobileApp> {
  _StarterMobileAppState();

  late final MobileApi _api = MobileApi(
    config: MobileConfig.fromEnv,
    storage: const TokenStorage(FlutterSecureStorage()),
  );
  late final MobileAuth _auth = MobileAuth(api: _api, storage: _api.storage);

  String? _accessToken;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final token = await _auth.restoreSession();
    if (!mounted) return;
    setState(() {
      _accessToken = token;
      _ready = true;
    });
  }

  Future<void> _handleSignedIn(String accessToken) async {
    setState(() => _accessToken = accessToken);
  }

  Future<void> _handleSignedOut() async {
    await _auth.signOut();
    if (!mounted) return;
    setState(() => _accessToken = null);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Starter Mobile',
      theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
      home: !_ready
          ? const _LoadingScreen()
          : _accessToken == null
              ? LoginScreen(api: _api, onSignedIn: _handleSignedIn)
              : ItemsScreen(api: _api, onSignedOut: _handleSignedOut),
    );
  }
}

class _LoadingScreen extends StatelessWidget {
  const _LoadingScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
`;
}

function mobileConfigDart(isMicroservices: boolean): string {
  const authDefault = isMicroservices ? 'http://localhost:3001' : 'http://localhost:3000';
  return `// Compile-time config (decision 28's env surface, Flutter flavor).
// Dart has no process.env at runtime; --dart-define values are baked
// in at compile time (flutter run/test --dart-define=API_URL=...).
// Defaults are the local-dev values; the Android emulator needs
// http://10.0.2.2:3000, a physical device needs the host's LAN IP.
class MobileConfig {
  const MobileConfig({required this.apiUrl, required this.authUrl});

  /// Base URL of the items API (apps/api, :3000).
  final String apiUrl;

  /// Base URL of the auth endpoints. In the microservices shape this
  /// is apps/api-auth (the sole minter, :3001); in the monolith the
  /// api owns /auth/*, so it defaults to the same URL as [apiUrl].
  final String authUrl;

  static const MobileConfig fromEnv = MobileConfig(
    apiUrl: String.fromEnvironment('API_URL', defaultValue: 'http://localhost:3000'),
    authUrl: String.fromEnvironment('AUTH_URL', defaultValue: '${isMicroservices ? 'http://localhost:3001' : 'http://localhost:3000'}'),
  );
}
`;
}

function mobileTokenStorageDart(): string {
  return `// The OS-managed secure-storage seam (decision 23): access + refresh
// tokens live in flutter_secure_storage, never in a cookie. The app
// reads/writes through this one surface so the platform channel can be
// swapped for a fake in tests.
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  const TokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const _accessKey = 'starter_access_token';
  static const _refreshKey = 'starter_refresh_token';

  Future<String?> readAccessToken() => _storage.read(key: _accessKey);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  Future<void> writeTokens(String access, String refresh) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
`;
}

function mobileApiDart(): string {
  return `// The mobile client seam (decision 23): secure storage + Bearer +
// body-refresh over the codegen'd Dart client. Two OpenApiClient
// instances share the app's token state: the auth endpoints hit
// config.authUrl (api-auth in microservices, the api in the monolith)
// and the items API hits config.apiUrl. No hand-written HTTP anywhere
// — every call goes through packages/contract's generated client
// (decision 19).
import 'package:starter_contract/openapi_client.dart';

import 'config.dart';
import 'token_storage.dart';

class MobileApi {
  MobileApi({required this.config, required this.storage})
      : _auth = OpenApiClient(baseUrl: config.authUrl),
        _api = OpenApiClient(baseUrl: config.apiUrl);

  final MobileConfig config;
  final TokenStorage storage;

  final OpenApiClient _auth;
  final OpenApiClient _api;

  /// One in-flight refresh; concurrent 401s share it so rotation never
  /// races (decision 23: the rotated pair replaces both entries).
  Future<void>? _refreshing;

  Future<AuthTokens> register(String email, String password) async {
    final result = await _auth
        .register(AuthRegisterInputBody(email: email, password: password));
    await storage.writeTokens(result.access, result.refresh);
    return AuthTokens(access: result.access, refresh: result.refresh);
  }

  Future<AuthTokens> login(String email, String password) async {
    final tokens =
        await _auth.login(AuthCredentialsInputBody(email: email, password: password));
    await storage.writeTokens(tokens.access, tokens.refresh);
    return tokens;
  }

  Future<void> logout() async {
    final refresh = await storage.readRefreshToken();
    await storage.clearTokens();
    if (refresh == null) return;
    try {
      await _auth.logout(AuthRefreshInputBody(refresh: refresh));
    } on OpenApiException {
      // The local pair is already gone; server-side revocation is
      // best-effort offline.
    }
  }

  Future<List<Item>> listItems() => _authed((client) => client.listItems());

  Future<Item> createItem(String name) =>
      _authed((client) => client.createItem(ItemCreateInputBody(name: name)));

  /// Runs [call] with a fresh Bearer token; on 401 rotates the pair
  /// through /auth/refresh (refresh token in the body) and retries
  /// once.
  Future<T> _authed<T>(Future<T> Function(OpenApiClient client) call) async {
    _api.accessToken = await storage.readAccessToken();
    try {
      return await call(_api);
    } on OpenApiException catch (err) {
      if (err.statusCode != 401) rethrow;
      await _refresh();
      _api.accessToken = await storage.readAccessToken();
      return call(_api);
    }
  }

  Future<void> _refresh() async {
    final refresh = await storage.readRefreshToken();
    if (refresh == null) return;
    final running = _refreshing ??= _doRefresh(refresh);
    try {
      await running;
    } finally {
      _refreshing = null;
    }
  }

  Future<void> _doRefresh(String refresh) async {
    final tokens = await _auth.refresh(AuthRefreshInputBody(refresh: refresh));
    await storage.writeTokens(tokens.access, tokens.refresh);
  }
}
`;
}

function mobileAuthDart(): string {
  return `// Session helpers the screens use (decision 23). restoreSession
// requires BOTH halves of the pair in secure storage — a half-written
// pair is treated as signed out and cleared.
import 'api.dart';
import 'token_storage.dart';

class MobileAuth {
  const MobileAuth({required this.api, required this.storage});

  final MobileApi api;
  final TokenStorage storage;

  Future<String?> restoreSession() async {
    final access = await storage.readAccessToken();
    final refresh = await storage.readRefreshToken();
    if (access != null && refresh != null) return access;
    await storage.clearTokens();
    return null;
  }

  Future<void> signOut() => api.logout();
}
`;
}

function mobileLoginScreenDart(): string {
  return `// Login screen: email + password, wired to MobileApi.login
// (decision 23 — the pair lands in flutter_secure_storage).
import 'package:flutter/material.dart';
import 'package:starter_contract/openapi_client.dart';

import '../api.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.api, required this.onSignedIn});

  final MobileApi api;
  final ValueChanged<String> onSignedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _submitting = true;
    });
    try {
      final tokens = await widget.api.login(_email.text.trim(), _password.text);
      widget.onSignedIn(tokens.access);
    } catch (err) {
      setState(() {
        _error = err is OpenApiException ? err.message : 'Sign in failed';
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Sign in', style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 16),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: true,
                autocorrect: false,
                decoration: const InputDecoration(labelText: 'Password'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _submitting ? null : () => _submit(),
                child: Text(_submitting ? 'Signing in...' : 'Sign in'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`;
}

function mobileItemsScreenDart(): string {
  return `// Items screen: lists + creates the demo-domain rows through the
// codegen'd client (Bearer attached, body-refresh on 401 — decision 23).
import 'package:flutter/material.dart';
import 'package:starter_contract/openapi_client.dart';

import '../api.dart';

class ItemsScreen extends StatefulWidget {
  const ItemsScreen({super.key, required this.api, required this.onSignedOut});

  final MobileApi api;
  final VoidCallback onSignedOut;

  @override
  State<ItemsScreen> createState() => _ItemsScreenState();
}

class _ItemsScreenState extends State<ItemsScreen> {
  final _name = TextEditingController();
  List<Item>? _items;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await widget.api.listItems();
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _error = err is OpenApiException ? err.message : 'Failed to load items';
        _loading = false;
      });
    }
  }

  Future<void> _create() async {
    final name = _name.text.trim();
    if (name.isEmpty) return;
    setState(() => _error = null);
    try {
      await widget.api.createItem(name);
      _name.clear();
      await _load();
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _error = err is OpenApiException ? err.message : 'Failed to create item';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Items'),
        actions: [
          TextButton(onPressed: widget.onSignedOut, child: const Text('Sign out')),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _name,
                      decoration: const InputDecoration(labelText: 'Item name'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(onPressed: _create, child: const Text('Create')),
                ],
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    _error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              const SizedBox(height: 12),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          itemCount: _items?.length ?? 0,
                          itemBuilder: (context, index) {
                            final item = _items![index];
                            return ListTile(
                              title: Text(item.name),
                              subtitle: Text(item.createdAt.toIso8601String()),
                            );
                          },
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`;
}

function mobileAuthFlowTestDart(): string {
  return `// test/auth_flow_test.dart — the mobile auth smoke test (decision
// 23/29): the typed Dart client + secure storage + Bearer + body-refresh
// run against a LIVE api. This is the "boots, and the mobile auth flow
// runs against the api" leg of the blessed matrix (decision 29's
// documented minimum: no emulator in CI — the flow is exercised in the
// Dart VM against the real services).
//
// Run with a live api:
//   flutter test \\
//     --dart-define=MOBILE_SMOKE_API_URL=http://localhost:3000 \\
//     --dart-define=MOBILE_SMOKE_AUTH_URL=http://localhost:3001 \\
//     --dart-define=ACCESS_TOKEN_TTL=1
//
// Without MOBILE_SMOKE_API_URL the live legs skip cleanly (the
// app/widget code is exercised by the build, not by these tests).
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:starter_contract/openapi_client.dart';

import 'package:starter_mobile/src/api.dart';
import 'package:starter_mobile/src/config.dart';
import 'package:starter_mobile/src/token_storage.dart';

const _liveApi = String.fromEnvironment('MOBILE_SMOKE_API_URL');
const _liveAuthSet = bool.hasEnvironment('MOBILE_SMOKE_AUTH_URL');
const _liveAuth = String.fromEnvironment('MOBILE_SMOKE_AUTH_URL');
const _accessTtl = int.fromEnvironment('ACCESS_TOKEN_TTL');

/// flutter_test's binding swaps dart:io's HttpClient for a mock that
/// answers every request with 400 (tests must not depend on network).
/// The smoke test is explicitly the opposite — it exercises the real
/// auth flow against a booted api — so restore real HTTP.
MobileConfig _configFor(String apiUrl) => MobileConfig(
      apiUrl: apiUrl,
      // Mirrors the app config: the monolith serves /auth on the api
      // itself (auth URL == api URL); CI passes MOBILE_SMOKE_AUTH_URL
      // explicitly for the microservices shape (apps/api-auth, :3001).
      authUrl: _liveAuthSet ? _liveAuth : apiUrl,
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('mobile auth against a running api (decision 23)', () {
    setUp(() {
      // Undo the binding's 400-returning HttpClient mock.
      HttpOverrides.global = null;
      // flutter_secure_storage's built-in mock: real platform channels
      // don't exist in the test VM, so the seam is faked exactly like
      // the unit tests fake any platform channel.
      FlutterSecureStorage.setMockInitialValues({});
    });

    test('stores both login tokens and lists items with Bearer', () async {
      final storage = TokenStorage(const FlutterSecureStorage());
      final api = MobileApi(config: _configFor(_liveApi), storage: storage);
      final email = 'mobile-\${DateTime.now().millisecondsSinceEpoch}@example.com';

      // Register is best-effort (a rerun hits 409); login is the flow
      // under test.
      try {
        await api.register(email, 'password1234');
      } on OpenApiException {
        // Duplicate email from a previous run — login still proves the flow.
      }

      final tokens = await api.login(email, 'password1234');
      expect(await storage.readAccessToken(), tokens.access);
      expect(await storage.readRefreshToken(), tokens.refresh);

      // The protected call carries the Bearer token (a 401 here would
      // mean the token never reached the api).
      final items = await api.listItems();
      expect(items, isA<List<Item>>());
    }, skip: _liveApi.isEmpty ? 'MOBILE_SMOKE_API_URL not set — live leg skipped' : false);

    test('on 401 the refresh token goes in the body, rotates, and retries', () async {
      final storage = TokenStorage(const FlutterSecureStorage());
      final api = MobileApi(config: _configFor(_liveApi), storage: storage);
      final email = 'mobile-refresh-\${DateTime.now().millisecondsSinceEpoch}@example.com';

      try {
        await api.register(email, 'password1234');
      } on OpenApiException {
        // Duplicate email from a previous run.
      }

      final tokens = await api.login(email, 'password1234');
      final oldRefresh = await storage.readRefreshToken();
      expect(oldRefresh, isNotNull);

      // Let the short-lived access token expire, then hit a protected
      // endpoint: the client must 401 -> POST /auth/refresh {refresh}
      // -> swap -> retry.
      await Future<void>.delayed(Duration(seconds: _accessTtl + 1));
      final items = await api.listItems();
      expect(items, isA<List<Item>>());
      expect(tokens.access, isNotEmpty);

      final newRefresh = await storage.readRefreshToken();
      expect(newRefresh, isNotNull);
      expect(newRefresh, isNot(oldRefresh));
    }, skip: (_liveApi.isEmpty || _accessTtl <= 0 || _accessTtl > 5)
        ? 'MOBILE_SMOKE_API_URL + ACCESS_TOKEN_TTL (1-5s) required — refresh leg skipped'
        : false);
  });
}
`;
}
