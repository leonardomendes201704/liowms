import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInventoryTransactionsUrl,
  isInventoryBalancesList,
  isInventoryTransactionsList,
  tenantLedgerAppPath,
} from "./tenant-ledger.js";

describe("tenant-ledger contract", () => {
  it("buildInventoryTransactionsUrl encodes filters", () => {
    const url = buildInventoryTransactionsUrl({
      lotCode: "L-001",
      documentRef: "DOC-9",
      page: 2,
    });
    assert.ok(url.includes("lot_code=L-001"));
    assert.ok(url.includes("document_ref=DOC-9"));
    assert.ok(url.includes("page=2"));
  });

  it("tenantLedgerAppPath", () => {
    assert.equal(tenantLedgerAppPath("tid"), "/app/t/tid/ledger");
  });

  it("type guards", () => {
    assert.ok(
      isInventoryTransactionsList({ transactions: [], page: 1, limit: 25, total: 0 }),
    );
    assert.ok(isInventoryBalancesList({ balances: [] }));
    assert.equal(isInventoryTransactionsList(null), false);
  });
});
