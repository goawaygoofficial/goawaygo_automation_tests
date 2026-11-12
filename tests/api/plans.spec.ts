import { expect, test } from '@playwright/test';

import { bearer, signIn } from '../../lib/accounts';
import { daysFromNow } from '../../lib/dates';
import { fakesToken } from '../../lib/env';

test.skip(!fakesToken, 'needs TEST_FAKES_TOKEN (the AI writes plans)');

test.describe('trip plans', () => {
  test('make a plan, change a day, share it, then delete it', async ({ request }) => {
    const session = await signIn(request, 'api');
    const auth = bearer(session);

    const created = await request.post('/api/plans', {
      headers: auth,
      data: {
        place: {
          placeId: 'test-place-1',
          name: 'Test City 1',
          area: 'Test State',
          country: 'Testland',
          lat: 38.72,
          lon: -9.14,
        },
        startDate: daysFromNow(45),
        days: 3,
        travellers: 'couple',
        pace: 'balanced',
        budget: 'mid',
        interests: [],
        currency: 'INR',
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const plan = await created.json();
    try {
      expect(plan.days).toBe(3);
      expect(plan.dayPlans).toHaveLength(3);
      expect(plan.mine).toBe(true);

      const mine = await (await request.get('/api/plans', { headers: auth })).json();
      expect(mine.map((p: { id: string }) => p.id)).toContain(plan.id);

      const changed = await request.post(`/api/plans/${plan.id}/days/1`, { headers: auth, data: { wish: 'museums' } });
      expect(changed.status(), await changed.text()).toBe(200);

      const shared = await request.put(`/api/plans/${plan.id}/share`, { headers: auth, data: { shared: true } });
      expect((await shared.json()).shared).toBe(true);
      // Anyone with the link can read a shared plan.
      const open = await request.get(`/api/plans/shared/${plan.id}`);
      expect(open.status()).toBe(200);
      expect((await open.json()).mine).toBe(false);
    } finally {
      const deleted = await request.delete(`/api/plans/${plan.id}`, { headers: auth });
      expect(deleted.status()).toBeLessThan(300);
    }
    const gone = await request.get(`/api/plans/${plan.id}`, { headers: auth });
    expect(gone.status()).toBe(404);
  });

  test('plans are private without the share link', async ({ request }) => {
    const response = await request.get('/api/plans');
    expect(response.status()).toBe(401);
  });
});
