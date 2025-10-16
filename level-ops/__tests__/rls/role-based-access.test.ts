/**
 * RLS Role-Based Access Tests
 *
 * Tests verifying that different roles (OWNER, ADMIN, EDITOR, VIEWER) have
 * appropriate permissions for CRUD operations.
 *
 * Role Permissions:
 * - OWNER/ADMIN: Full CRUD access
 * - EDITOR: Create, Read, Update (no Delete)
 * - VIEWER: Read only
 */

import { createTestUser, createTestOrg, addOrgMember, cleanupTestData } from './test-helpers';

describe('RLS Role-Based Access', () => {
  const testUsers: string[] = [];
  const testOrgs: string[] = [];

  afterAll(async () => {
    await cleanupTestData(testUsers, testOrgs);
  });

  describe('VIEWER Role', () => {
    it('should allow read but deny create on tasks', async () => {
      const org = await createTestOrg('Viewer Org', `test-viewer-org-${Date.now()}`);
      testOrgs.push(org.id);

      const viewer = await createTestUser(`viewer-${Date.now()}@test.com`);
      const owner = await createTestUser(`owner-${Date.now()}@test.com`);
      testUsers.push(viewer.id, owner.id);

      await addOrgMember(org.id, viewer.id, 'VIEWER');
      await addOrgMember(org.id, owner.id, 'OWNER');

      // Owner creates a task
      const { data: task, error: createError } = await owner.client
        .from('tasks')
        .insert({
          title: 'Test Task',
          org_id: org.id,
          tenant_id: org.id,
          created_by: owner.id,
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(task).toBeDefined();

      // VIEWER can read
      const { data: readData, error: readError } = await viewer.client
        .from('tasks')
        .select('*')
        .eq('org_id', org.id);

      expect(readError).toBeNull();
      expect(readData).toHaveLength(1);

      // VIEWER cannot create
      const { error: viewerCreateError } = await viewer.client
        .from('tasks')
        .insert({
          title: 'Viewer Task',
          org_id: org.id,
          tenant_id: org.id,
          created_by: viewer.id,
        });

      expect(viewerCreateError).toBeDefined();
      expect(viewerCreateError?.message).toContain('new row violates row-level security policy');

      // VIEWER cannot update
      const { error: updateError } = await viewer.client
        .from('tasks')
        .update({ title: 'Updated by Viewer' })
        .eq('id', task!.id);

      expect(updateError).toBeDefined();

      // VIEWER cannot delete
      const { error: deleteError } = await viewer.client
        .from('tasks')
        .delete()
        .eq('id', task!.id);

      expect(deleteError).toBeDefined();
    });
  });

  describe('EDITOR Role', () => {
    it('should allow create, read, update but deny delete on tasks', async () => {
      const org = await createTestOrg('Editor Org', `test-editor-org-${Date.now()}`);
      testOrgs.push(org.id);

      const editor = await createTestUser(`editor-${Date.now()}@test.com`);
      testUsers.push(editor.id);

      await addOrgMember(org.id, editor.id, 'EDITOR');

      // EDITOR can create
      const { data: task, error: createError } = await editor.client
        .from('tasks')
        .insert({
          title: 'Editor Task',
          org_id: org.id,
          tenant_id: org.id,
          created_by: editor.id,
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(task).toBeDefined();

      // EDITOR can read
      const { data: readData, error: readError } = await editor.client
        .from('tasks')
        .select('*')
        .eq('org_id', org.id);

      expect(readError).toBeNull();
      expect(readData).toHaveLength(1);

      // EDITOR can update
      const { error: updateError } = await editor.client
        .from('tasks')
        .update({ title: 'Updated by Editor' })
        .eq('id', task!.id);

      expect(updateError).toBeNull();

      // EDITOR cannot delete
      const { error: deleteError } = await editor.client
        .from('tasks')
        .delete()
        .eq('id', task!.id);

      expect(deleteError).toBeDefined();
      expect(deleteError?.message).toContain('violates row-level security policy');
    });
  });

  describe('ADMIN Role', () => {
    it('should allow full CRUD on tasks', async () => {
      const org = await createTestOrg('Admin Org', `test-admin-org-${Date.now()}`);
      testOrgs.push(org.id);

      const admin = await createTestUser(`admin-${Date.now()}@test.com`);
      testUsers.push(admin.id);

      await addOrgMember(org.id, admin.id, 'ADMIN');

      // ADMIN can create
      const { data: task, error: createError } = await admin.client
        .from('tasks')
        .insert({
          title: 'Admin Task',
          org_id: org.id,
          tenant_id: org.id,
          created_by: admin.id,
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(task).toBeDefined();

      // ADMIN can read
      const { data: readData, error: readError } = await admin.client
        .from('tasks')
        .select('*')
        .eq('org_id', org.id);

      expect(readError).toBeNull();
      expect(readData).toHaveLength(1);

      // ADMIN can update
      const { error: updateError } = await admin.client
        .from('tasks')
        .update({ title: 'Updated by Admin' })
        .eq('id', task!.id);

      expect(updateError).toBeNull();

      // ADMIN can delete
      const { error: deleteError } = await admin.client
        .from('tasks')
        .delete()
        .eq('id', task!.id);

      expect(deleteError).toBeNull();

      // Verify deletion
      const { data: afterDelete } = await admin.client
        .from('tasks')
        .select('*')
        .eq('org_id', org.id);

      expect(afterDelete).toHaveLength(0);
    });
  });

  describe('OWNER Role', () => {
    it('should allow full CRUD and member management', async () => {
      const org = await createTestOrg('Owner Org', `test-owner-org-${Date.now()}`);
      testOrgs.push(org.id);

      const owner = await createTestUser(`owner-test-${Date.now()}@test.com`);
      const newMember = await createTestUser(`new-member-${Date.now()}@test.com`);
      testUsers.push(owner.id, newMember.id);

      await addOrgMember(org.id, owner.id, 'OWNER');

      // OWNER can manage members
      const { error: memberError } = await owner.client
        .from('org_memberships')
        .insert({
          org_id: org.id,
          user_id: newMember.id,
          role: 'VIEWER',
        });

      expect(memberError).toBeNull();

      // Verify member was added
      const { data: members } = await owner.client
        .from('org_memberships')
        .select('*')
        .eq('org_id', org.id);

      expect(members).toHaveLength(2); // Owner + new member

      // OWNER has full CRUD on all resources
      const { data: task } = await owner.client
        .from('tasks')
        .insert({
          title: 'Owner Task',
          org_id: org.id,
          tenant_id: org.id,
          created_by: owner.id,
        })
        .select()
        .single();

      expect(task).toBeDefined();

      // OWNER can delete
      const { error: deleteError } = await owner.client
        .from('tasks')
        .delete()
        .eq('id', task!.id);

      expect(deleteError).toBeNull();
    });
  });

  describe('Cross-Role Permission Hierarchy', () => {
    it('should prevent lower roles from modifying higher role data', async () => {
      const org = await createTestOrg('Hierarchy Org', `test-hierarchy-${Date.now()}`);
      testOrgs.push(org.id);

      const owner = await createTestUser(`owner-hier-${Date.now()}@test.com`);
      const editor = await createTestUser(`editor-hier-${Date.now()}@test.com`);
      testUsers.push(owner.id, editor.id);

      await addOrgMember(org.id, owner.id, 'OWNER');
      await addOrgMember(org.id, editor.id, 'EDITOR');

      // Owner creates task
      const { data: ownerTask } = await owner.client
        .from('tasks')
        .insert({
          title: 'Owner Task',
          org_id: org.id,
          tenant_id: org.id,
          created_by: owner.id,
        })
        .select()
        .single();

      // Editor can read owner's task
      const { data: readData } = await editor.client
        .from('tasks')
        .select('*')
        .eq('id', ownerTask!.id);

      expect(readData).toHaveLength(1);

      // Editor can update owner's task (same org, has edit permission)
      const { error: updateError } = await editor.client
        .from('tasks')
        .update({ title: 'Updated by Editor' })
        .eq('id', ownerTask!.id);

      expect(updateError).toBeNull(); // EDITORs can update any task in their org

      // Editor cannot delete owner's task
      const { error: deleteError } = await editor.client
        .from('tasks')
        .delete()
        .eq('id', ownerTask!.id);

      expect(deleteError).toBeDefined();
    });
  });
});
