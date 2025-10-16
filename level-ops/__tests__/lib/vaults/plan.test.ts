/**
 * @jest-environment node
 */

import { seatsForPlan, willExceedSeats, seatsRemaining } from '@/lib/vaults/plan';
import type { VaultPlanTier } from '@/lib/config/plans';

describe('Vault Plan Helpers', () => {
  describe('seatsForPlan', () => {
    it('should return correct seat limits for each tier', () => {
      expect(seatsForPlan('Small')).toBe(10);
      expect(seatsForPlan('Medium')).toBe(25);
      expect(seatsForPlan('Enterprise')).toBe(75);
    });
  });

  describe('willExceedSeats', () => {
    it('should return true when at capacity', () => {
      expect(willExceedSeats(10, 'Small')).toBe(true);
      expect(willExceedSeats(25, 'Medium')).toBe(true);
      expect(willExceedSeats(75, 'Enterprise')).toBe(true);
    });

    it('should return true when over capacity', () => {
      expect(willExceedSeats(11, 'Small')).toBe(true);
      expect(willExceedSeats(30, 'Medium')).toBe(true);
      expect(willExceedSeats(100, 'Enterprise')).toBe(true);
    });

    it('should return false when below capacity', () => {
      expect(willExceedSeats(9, 'Small')).toBe(false);
      expect(willExceedSeats(24, 'Medium')).toBe(false);
      expect(willExceedSeats(74, 'Enterprise')).toBe(false);
    });

    it('should return false when at zero', () => {
      expect(willExceedSeats(0, 'Small')).toBe(false);
      expect(willExceedSeats(0, 'Medium')).toBe(false);
      expect(willExceedSeats(0, 'Enterprise')).toBe(false);
    });
  });

  describe('seatsRemaining', () => {
    it('should calculate remaining seats correctly', () => {
      expect(seatsRemaining(5, 'Small')).toBe(5);
      expect(seatsRemaining(10, 'Medium')).toBe(15);
      expect(seatsRemaining(50, 'Enterprise')).toBe(25);
    });

    it('should return 0 when at capacity', () => {
      expect(seatsRemaining(10, 'Small')).toBe(0);
      expect(seatsRemaining(25, 'Medium')).toBe(0);
      expect(seatsRemaining(75, 'Enterprise')).toBe(0);
    });

    it('should return 0 (not negative) when over capacity', () => {
      expect(seatsRemaining(15, 'Small')).toBe(0);
      expect(seatsRemaining(30, 'Medium')).toBe(0);
      expect(seatsRemaining(100, 'Enterprise')).toBe(0);
    });

    it('should return full capacity when empty', () => {
      expect(seatsRemaining(0, 'Small')).toBe(10);
      expect(seatsRemaining(0, 'Medium')).toBe(25);
      expect(seatsRemaining(0, 'Enterprise')).toBe(75);
    });
  });
});
