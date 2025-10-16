/**
 * RLS Org Isolation Tests
 *
 * Critical security tests verifying that users can ONLY access data from
 * organizations they are members of. These tests prevent cross-org data leakage.
 *
 * Test Pattern:
 * 1. Create two orgs (OrgA, OrgB)
 * 2. Create two users (UserA in OrgA, UserB in OrgB)
 * 3. Insert test data in both orgs
 * 4. Verify UserA can ONLY see OrgA data
 * 5. Verify UserB can ONLY see OrgB data
 */

import { createTestUser, createTestOrg, addOrgMember, cleanupTestData, expectNoAccess, expectAccess } from './test-helpers';

describe('RLS Org Isolation', () => {
  const testUsers: string[] = [];
  const testOrgs: string[] = [];

  afterAll(async () => {
    await cleanupTestData(testUsers, testOrgs);
  });

  describe('Tasks Table', () => {
    it('should prevent cross-org access to tasks', async () => {
      // Setup: Create two orgs and two users
      const orgA = await createTestOrg('Org A', `test-org-a-${Date.now()}`);
      const orgB = await createTestOrg('Org B', `test-org-b-${Date.now()}`);
      testOrgs.push(orgA.id, orgB.id);

      const userA = await createTestUser(`user-a-${Date.now()}@test.com`);
      const userB = await createTestUser(`user-b-${Date.now()}@test.com`);
      testUsers.push(userA.id, userB.id);

      await addOrgMember(orgA.id, userA.id, 'EDITOR');
      await addOrgMember(orgB.id, userB.id, 'EDITOR');

      // Create tasks in both orgs
      const { error: taskAError } = await userA.client
        .from('tasks')
        .insert({
          title: 'Task in Org A',
          org_id: orgA.id,
          tenant_id: orgA.id,
          created_by: userA.id,
        });
      expect(taskAError).toBeNull();

      const { error: taskBError } = await userB.client
        .from('tasks')
        .insert({
          title: 'Task in Org B',
          org_id: orgB.id,
          tenant_id: orgB.id,
          created_by: userB.id,
        });
      expect(taskBError).toBeNull();

      // Test: UserA should ONLY see OrgA tasks
      await expectAccess(userA.client, 'tasks', orgA.id, 1);
      await expectNoAccess(userA.client, 'tasks', orgB.id);

      // Test: UserB should ONLY see OrgB tasks
      await expectAccess(userB.client, 'tasks', orgB.id, 1);
      await expectNoAccess(userB.client, 'tasks', orgA.id);
    });
  });

  describe('Decisions Table', () => {
    it('should prevent cross-org access to decisions', async () => {
      const orgA = await createTestOrg('Org A Decisions', `test-org-a-dec-${Date.now()}`);
      const orgB = await createTestOrg('Org B Decisions', `test-org-b-dec-${Date.now()}`);
      testOrgs.push(orgA.id, orgB.id);

      const userA = await createTestUser(`user-a-dec-${Date.now()}@test.com`);
      const userB = await createTestUser(`user-b-dec-${Date.now()}@test.com`);
      testUsers.push(userA.id, userB.id);

      await addOrgMember(orgA.id, userA.id, 'EDITOR');
      await addOrgMember(orgB.id, userB.id, 'EDITOR');

      // Create decisions in both orgs
      await userA.client.from('decisions').insert({
        title: 'Decision A',
        context: 'Context A',
        decision: 'Decision A',
        tenant_id: orgA.id,
        created_by: userA.id,
        decided_by: userA.id,
        decided_at: new Date().toISOString(),
      });

      await userB.client.from('decisions').insert({
        title: 'Decision B',
        context: 'Context B',
        decision: 'Decision B',
        tenant_id: orgB.id,
        created_by: userB.id,
        decided_by: userB.id,
        decided_at: new Date().toISOString(),
      });

      // Test isolation
      await expectAccess(userA.client, 'decisions', orgA.id, 1);
      await expectNoAccess(userA.client, 'decisions', orgB.id);
      await expectAccess(userB.client, 'decisions', orgB.id, 1);
      await expectNoAccess(userB.client, 'decisions', orgA.id);
    });
  });

  describe('Documents Table', () => {
    it('should prevent cross-org access to documents', async () => {
      const orgA = await createTestOrg('Org A Docs', `test-org-a-docs-${Date.now()}`);
      const orgB = await createTestOrg('Org B Docs', `test-org-b-docs-${Date.now()}`);
      testOrgs.push(orgA.id, orgB.id);

      const userA = await createTestUser(`user-a-docs-${Date.now()}@test.com`);
      const userB = await createTestUser(`user-b-docs-${Date.now()}@test.com`);
      testUsers.push(userA.id, userB.id);

      await addOrgMember(orgA.id, userA.id, 'EDITOR');
      await addOrgMember(orgB.id, userB.id, 'EDITOR');

      // Create documents in both orgs
      await userA.client.from('documents').insert({
        name: 'Doc A',
        file_path: '/path/a',
        file_size: 1000,
        mime_type: 'application/pdf',
        org_id: orgA.id,
        uploaded_by: userA.id,
      });

      await userB.client.from('documents').insert({
        name: 'Doc B',
        file_path: '/path/b',
        file_size: 2000,
        mime_type: 'application/pdf',
        org_id: orgB.id,
        uploaded_by: userB.id,
      });

      // Test isolation
      await expectAccess(userA.client, 'documents', orgA.id, 1);
      await expectNoAccess(userA.client, 'documents', orgB.id);
      await expectAccess(userB.client, 'documents', orgB.id, 1);
      await expectNoAccess(userB.client, 'documents', orgA.id);
    });
  });

  describe('Risks Table', () => {
    it('should prevent cross-org access to risks', async () => {
      const orgA = await createTestOrg('Org A Risks', `test-org-a-risks-${Date.now()}`);
      const orgB = await createTestOrg('Org B Risks', `test-org-b-risks-${Date.now()}`);
      testOrgs.push(orgA.id, orgB.id);

      const userA = await createTestUser(`user-a-risks-${Date.now()}@test.com`);
      const userB = await createTestUser(`user-b-risks-${Date.now()}@test.com`);
      testUsers.push(userA.id, userB.id);

      await addOrgMember(orgA.id, userA.id, 'EDITOR');
      await addOrgMember(orgB.id, userB.id, 'EDITOR');

      // Create risks in both orgs
      await userA.client.from('risks').insert({
        title: 'Risk A',
        impact: 'high',
        probability: 'medium',
        org_id: orgA.id,
        tenant_id: orgA.id,
        created_by: userA.id,
      });

      await userB.client.from('risks').insert({
        title: 'Risk B',
        impact: 'low',
        probability: 'low',
        org_id: orgB.id,
        tenant_id: orgB.id,
        created_by: userB.id,
      });

      // Test isolation
      await expectAccess(userA.client, 'risks', orgA.id, 1);
      await expectNoAccess(userA.client, 'risks', orgB.id);
      await expectAccess(userB.client, 'risks', orgB.id, 1);
      await expectNoAccess(userB.client, 'risks', orgA.id);
    });
  });

  describe('Milestones Table', () => {
    it('should prevent cross-org access to milestones', async () => {
      const orgA = await createTestOrg('Org A Milestones', `test-org-a-miles-${Date.now()}`);
      const orgB = await createTestOrg('Org B Milestones', `test-org-b-miles-${Date.now()}`);
      testOrgs.push(orgA.id, orgB.id);

      const userA = await createTestUser(`user-a-miles-${Date.now()}@test.com`);
      const userB = await createTestUser(`user-b-miles-${Date.now()}@test.com`);
      testUsers.push(userA.id, userB.id);

      await addOrgMember(orgA.id, userA.id, 'EDITOR');
      await addOrgMember(orgB.id, userB.id, 'EDITOR');

      // Create milestones in both orgs
      await userA.client.from('milestones').insert({
        name: 'Milestone A',
        org_id: orgA.id,
        tenant_id: orgA.id,
        created_by: userA.id,
      });

      await userB.client.from('milestones').insert({
        name: 'Milestone B',
        org_id: orgB.id,
        tenant_id: orgB.id,
        created_by: userB.id,
      });

      // Test isolation
      await expectAccess(userA.client, 'milestones', orgA.id, 1);
      await expectNoAccess(userA.client, 'milestones', orgB.id);
      await expectAccess(userB.client, 'milestones', orgB.id, 1);
      await expectNoAccess(userB.client, 'milestones', orgA.id);
    });
  });
});
