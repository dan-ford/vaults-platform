/**
 * @jest-environment node
 */

import {
  assertPlanChangeAllowed,
  assertCanAddMember,
} from '@/lib/vaults/guards';
import type { VaultPlanTier } from '@/lib/config/plans';

describe('Vault Plan Guards', () => {
  describe('assertPlanChangeAllowed', () => {
    it('should allow upgrade from Small to Medium with 9 members', () => {
      expect(() => assertPlanChangeAllowed(9, 'Medium')).not.toThrow();
      const result = assertPlanChangeAllowed(9, 'Medium');
      expect(result).toBe(25);
    });

    it('should allow upgrade from Small to Enterprise with 9 members', () => {
      expect(() => assertPlanChangeAllowed(9, 'Enterprise')).not.toThrow();
      const result = assertPlanChangeAllowed(9, 'Enterprise');
      expect(result).toBe(75);
    });

    it('should allow staying on same plan', () => {
      expect(() => assertPlanChangeAllowed(10, 'Small')).not.toThrow();
      expect(() => assertPlanChangeAllowed(25, 'Medium')).not.toThrow();
      expect(() => assertPlanChangeAllowed(75, 'Enterprise')).not.toThrow();
    });

    it('should block downgrade from Medium to Small with 18 members', () => {
      expect(() => assertPlanChangeAllowed(18, 'Small')).toThrow(
        'Cannot downgrade: 18 members > 10 seat limit.'
      );
    });

    it('should block downgrade from Enterprise to Medium with 50 members', () => {
      expect(() => assertPlanChangeAllowed(50, 'Medium')).toThrow(
        'Cannot downgrade: 50 members > 25 seat limit.'
      );
    });

    it('should block downgrade from Enterprise to Small with 50 members', () => {
      expect(() => assertPlanChangeAllowed(50, 'Small')).toThrow(
        'Cannot downgrade: 50 members > 10 seat limit.'
      );
    });

    it('should allow downgrade when member count fits', () => {
      expect(() => assertPlanChangeAllowed(10, 'Small')).not.toThrow();
      expect(() => assertPlanChangeAllowed(24, 'Medium')).not.toThrow();
      expect(() => assertPlanChangeAllowed(9, 'Small')).not.toThrow();
    });

    it('should block downgrade at exact boundary', () => {
      expect(() => assertPlanChangeAllowed(11, 'Small')).toThrow();
      expect(() => assertPlanChangeAllowed(26, 'Medium')).toThrow();
    });
  });

  describe('assertCanAddMember', () => {
    it('should allow adding member when below capacity', () => {
      expect(() => assertCanAddMember(5, 'Small')).not.toThrow();
      expect(() => assertCanAddMember(20, 'Medium')).not.toThrow();
      expect(() => assertCanAddMember(70, 'Enterprise')).not.toThrow();
    });

    it('should allow adding member when one seat remains', () => {
      expect(() => assertCanAddMember(9, 'Small')).not.toThrow();
      expect(() => assertCanAddMember(24, 'Medium')).not.toThrow();
      expect(() => assertCanAddMember(74, 'Enterprise')).not.toThrow();
    });

    it('should block adding member when at capacity', () => {
      expect(() => assertCanAddMember(10, 'Small')).toThrow(
        'Seat limit reached. Upgrade plan or remove members. Current: 10/10'
      );
    });

    it('should block adding member when over capacity', () => {
      expect(() => assertCanAddMember(15, 'Small')).toThrow(
        'Seat limit reached. Upgrade plan or remove members. Current: 15/10'
      );
    });

    it('should allow when vault is empty', () => {
      expect(() => assertCanAddMember(0, 'Small')).not.toThrow();
      expect(() => assertCanAddMember(0, 'Medium')).not.toThrow();
      expect(() => assertCanAddMember(0, 'Enterprise')).not.toThrow();
    });

    it('should block correctly for Medium tier at capacity', () => {
      expect(() => assertCanAddMember(25, 'Medium')).toThrow(
        'Seat limit reached. Upgrade plan or remove members. Current: 25/25'
      );
    });

    it('should block correctly for Enterprise tier at capacity', () => {
      expect(() => assertCanAddMember(75, 'Enterprise')).toThrow(
        'Seat limit reached. Upgrade plan or remove members. Current: 75/75'
      );
    });
  });
});
