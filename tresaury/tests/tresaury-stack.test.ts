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

});