import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

const contractName = "tresaury-stack";

describe("TreasuryStack Contract Tests", () => {
  
  describe("Contract Initialization", () => {
    it("should initialize with correct default values", () => {
      const { result: threshold } = simnet.callReadOnlyFn(
        contractName,
        "get-signature-threshold",
        [],
        deployer
      );
      expect(threshold).toBeUint(1); // Updated initial threshold

      const { result: balance } = simnet.callReadOnlyFn(
        contractName,
        "get-treasury-balance", 
        [],
        deployer
      );
      expect(balance).toBeUint(0);

      const { result: stats } = simnet.callReadOnlyFn(
        contractName,
        "get-vault-stats",
        [],
        deployer
      );
      expect(stats).toBeOk(Cl.tuple({
        "total-members": Cl.uint(1), // Deployer is automatically added as admin
        "signature-threshold": Cl.uint(1), // Updated initial threshold
        "treasury-balance": Cl.uint(0),
        "total-proposals": Cl.uint(0),
        "vault-paused": Cl.bool(false)
      }));
    });
  });

  describe("Member Management", () => {
    beforeEach(() => {
      // Reset to clean state if needed
      simnet.mineEmptyBlocks(1);
    });

    it("should allow contract owner to add new member with admin role", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(3)], // ROLE-ADMIN = 3
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify member was added
      const { result: memberInfo } = simnet.callReadOnlyFn(
        contractName,
        "get-member-info",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(memberInfo).toBeSome(Cl.tuple({
        role: Cl.uint(3),
        "added-at": Cl.uint(4),
        "last-activity": Cl.uint(4),
        active: Cl.bool(true)
      }));
    });

    it("should allow contract owner to add new member with signer role", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet2), Cl.uint(2)], // ROLE-SIGNER = 2
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const { result: memberInfo } = simnet.callReadOnlyFn(
        contractName,
        "get-member-info",
        [Cl.principal(wallet2)],
        deployer
      );
      expect(memberInfo).toBeSome(Cl.tuple({
        role: Cl.uint(2),
        "added-at": Cl.uint(4),
        "last-activity": Cl.uint(4),
        active: Cl.bool(true)
      }));
    });

    it("should allow contract owner to add new member with viewer role", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet3), Cl.uint(1)], // ROLE-VIEWER = 1
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const { result: memberInfo } = simnet.callReadOnlyFn(
        contractName,
        "get-member-info",
        [Cl.principal(wallet3)],
        deployer
      );
      expect(memberInfo).toBeSome(Cl.tuple({
        role: Cl.uint(1),
        "added-at": Cl.uint(4),
        "last-activity": Cl.uint(4),
        active: Cl.bool(true)
      }));
    });

    it("should reject adding member with invalid role", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(0)], // Invalid role
        deployer
      );
      expect(result).toBeErr(Cl.uint(101)); // err-invalid-threshold
    });

    it("should reject adding member with too high role", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(4)], // Role too high (max is 3)
        deployer
      );
      expect(result).toBeErr(Cl.uint(101)); // err-invalid-threshold
    });

    it("should reject adding duplicate member", () => {
      // Add member first
      simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(3)], // ROLE-ADMIN = 3
        deployer
      );

      // Try to add same member again
      const { result } = simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(2)], // ROLE-SIGNER = 2
        deployer
      );
      expect(result).toBeErr(Cl.uint(102)); // err-member-exists
    });

    it("should reject non-admin adding members", () => {
      // First add wallet1 as signer (not admin)
      simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(2)], // ROLE-SIGNER = 2
        deployer
      );

      // wallet1 tries to add another member
      const { result } = simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet2), Cl.uint(2)], // ROLE-SIGNER = 2
        wallet1
      );
      expect(result).toBeErr(Cl.uint(100)); // err-unauthorized
    });

    it("should allow admin to remove member", () => {
      // Add member first
      simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(2)], // ROLE-SIGNER = 2
        deployer
      );

      // Remove member
      const { result } = simnet.callPublicFn(
        contractName,
        "remove-member",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      // Verify member is inactive
      const { result: memberInfo } = simnet.callReadOnlyFn(
        contractName,
        "get-member-info",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(memberInfo).toBeSome(Cl.tuple({
        role: Cl.uint(2),
        "added-at": Cl.uint(4),
        "last-activity": Cl.uint(4),
        active: Cl.bool(false)
      }));
      // Member should exist but be inactive
    });

    it("should reject removing non-existent member", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "remove-member",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeErr(Cl.uint(103)); // err-member-not-found
    });

    it("should allow admin to update member role", () => {
      // Add member with signer role
      simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(2)], // ROLE-SIGNER = 2
        deployer
      );

      // Update to admin role
      const { result } = simnet.callPublicFn(
        contractName,
        "update-member-role",
        [Cl.principal(wallet1), Cl.uint(3)], // ROLE-ADMIN = 3
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject updating non-existent member role", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "update-member-role",
        [Cl.principal(wallet1), Cl.uint(3)], // ROLE-ADMIN = 3
        deployer
      );
      expect(result).toBeErr(Cl.uint(103)); // err-member-not-found
    });

    it("should check authorization correctly", () => {
      // Add member with signer role
      simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet1), Cl.uint(2)], // ROLE-SIGNER = 2
        deployer
      );

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-authorized-member",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeBool(true);

      // Check unauthorized address
      const { result: unauthorized } = simnet.callReadOnlyFn(
        contractName,
        "is-authorized-member",
        [Cl.principal(wallet4)],
        deployer
      );
      expect(unauthorized).toBeBool(false);
    });
  });

  describe("Access Control", () => {
    it("should allow admin to update signature threshold", () => {
      // Set up member with admin role for this test
      simnet.callPublicFn(contractName, "add-member", [Cl.principal(wallet1), Cl.uint(3)], deployer); // ROLE-ADMIN = 3
      
      const { result } = simnet.callPublicFn(
        contractName,
        "update-signature-threshold",
        [Cl.uint(2)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const { result: newThreshold } = simnet.callReadOnlyFn(
        contractName,
        "get-signature-threshold",
        [],
        deployer
      );
      expect(newThreshold).toBeUint(2);
    });

    it("should reject invalid signature threshold", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "update-signature-threshold",
        [Cl.uint(0)], // Invalid threshold
        deployer
      );
      expect(result).toBeErr(Cl.uint(101)); // err-invalid-threshold
    });

    it("should allow admin to toggle vault pause", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "toggle-vault-pause",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      // Check vault stats to see if paused
      const { result: stats } = simnet.callReadOnlyFn(
        contractName,
        "get-vault-stats",
        [],
        deployer
      );
      expect(stats).toBeOk(Cl.tuple({
        "total-members": Cl.uint(1),
        "signature-threshold": Cl.uint(1),
        "treasury-balance": Cl.uint(0),
        "total-proposals": Cl.uint(0),
        "vault-paused": Cl.bool(true)
      }));
    });

    it("should reject non-admin trying to pause vault", () => {
      // Set up wallet2 as signer (not admin)
      simnet.callPublicFn(contractName, "add-member", [Cl.principal(wallet2), Cl.uint(2)], deployer); // ROLE-SIGNER = 2
      
      const { result } = simnet.callPublicFn(
        contractName,
        "toggle-vault-pause",
        [],
        wallet2 // Signer role, not admin
      );
      expect(result).toBeErr(Cl.uint(100)); // err-unauthorized
    });

    it("should reject operations when vault is paused", () => {
      // Pause vault first
      simnet.callPublicFn(contractName, "toggle-vault-pause", [], deployer);

      // Try to add member when paused
      const { result } = simnet.callPublicFn(
        contractName,
        "add-member",
        [Cl.principal(wallet4), Cl.uint(2)], // ROLE-SIGNER = 2
        deployer
      );
      expect(result).toBeErr(Cl.uint(100)); // err-unauthorized
    });
  });

  describe("Treasury Balance Management", () => {
    it("should allow users to deposit funds", () => {
      // Deposit funds
      const { result } = simnet.callPublicFn(
        contractName,
        "deposit-funds",
        [],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(100000000000000)); // The function returns the deposited amount

      // Check treasury balance increased
      const { result: balance } = simnet.callReadOnlyFn(
        contractName,
        "get-treasury-balance",
        [],
        deployer
      );
      expect(balance).toBeUint(100000000000000); // Should match the deposited amount
    });

    it("should reject deposits when vault is paused", () => {
      // Pause vault
      simnet.callPublicFn(contractName, "toggle-vault-pause", [], deployer);

      // Try to deposit
      const { result } = simnet.callPublicFn(
        contractName,
        "deposit-funds",
        [],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(100)); // err-unauthorized
    });
  });

});