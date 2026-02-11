import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '../playwright/.auth');
const API_URL = 'http://localhost:3001/api/v1';

async function loginViaAPI(
  request: any,
  email: string,
  password: string
): Promise<{ user: any; accessToken: string; cookies: any[] }> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const cookies = await response.headersArray();
  const setCookieHeaders = cookies
    .filter((h: any) => h.name.toLowerCase() === 'set-cookie')
    .map((h: any) => h.value);

  return {
    user: body.data.user,
    accessToken: body.data.accessToken,
    cookies: setCookieHeaders,
  };
}

function parseSetCookie(setCookieStr: string, domain: string) {
  const parts = setCookieStr.split(';').map((p: string) => p.trim());
  const [nameValue, ...attrs] = parts;
  const eqIdx = nameValue.indexOf('=');
  const name = nameValue.substring(0, eqIdx);
  const value = nameValue.substring(eqIdx + 1);

  const cookie: any = {
    name,
    value,
    domain,
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
    expires: -1,
  };

  for (const attr of attrs) {
    const lower = attr.toLowerCase();
    if (lower === 'httponly') cookie.httpOnly = true;
    else if (lower === 'secure') cookie.secure = true;
    else if (lower.startsWith('path=')) cookie.path = attr.split('=')[1];
    else if (lower.startsWith('samesite=')) cookie.sameSite = attr.split('=')[1];
    else if (lower.startsWith('expires=')) {
      cookie.expires = new Date(attr.split('=').slice(1).join('=')).getTime() / 1000;
    }
    else if (lower.startsWith('max-age=')) {
      cookie.expires = Date.now() / 1000 + parseInt(attr.split('=')[1]);
    }
  }

  return cookie;
}

function buildStorageState(user: any, accessToken: string, setCookieHeaders: string[]) {
  const domain = 'localhost';
  const cookies = setCookieHeaders.map((sc: string) => parseSetCookie(sc, domain));

  const authStorage = JSON.stringify({
    state: {
      user,
      token: accessToken,
      isAuthenticated: true,
    },
    version: 0,
  });

  return {
    cookies,
    origins: [
      {
        origin: 'http://localhost:5173',
        localStorage: [
          {
            name: 'auth-storage',
            value: authStorage,
          },
        ],
      },
    ],
  };
}

setup('authenticate as buyer', async ({ request }) => {
  const { user, accessToken, cookies } = await loginViaAPI(
    request,
    TEST_USERS.buyer.email,
    TEST_USERS.buyer.password
  );
  const state = buildStorageState(user, accessToken, cookies);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUTH_DIR, 'buyer.json'), JSON.stringify(state, null, 2));
});

setup('authenticate as seller', async ({ request }) => {
  const { user, accessToken, cookies } = await loginViaAPI(
    request,
    TEST_USERS.seller.email,
    TEST_USERS.seller.password
  );
  const state = buildStorageState(user, accessToken, cookies);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUTH_DIR, 'seller.json'), JSON.stringify(state, null, 2));
});

setup('authenticate as admin', async ({ request }) => {
  const { user, accessToken, cookies } = await loginViaAPI(
    request,
    TEST_USERS.admin.email,
    TEST_USERS.admin.password
  );
  const state = buildStorageState(user, accessToken, cookies);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUTH_DIR, 'admin.json'), JSON.stringify(state, null, 2));
});
