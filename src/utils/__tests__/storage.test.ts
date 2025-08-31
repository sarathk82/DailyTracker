import { StorageService } from "../storage";
import { mockAsyncStorage } from "../../setupTests";
import { Entry, ActionItem, Expense } from "../../types";

describe("StorageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Entries", () => {
    const mockEntry: Entry = {
      id: "entry-1",
      text: "Test entry",
      timestamp: new Date("2023-08-31T10:30:00Z"),
      type: "log",
      isMarkdown: false,
    };

    describe("getEntries", () => {
      it("should return empty array when no entries exist", async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const entries = await StorageService.getEntries();

        expect(entries).toEqual([]);
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
          "@daily_tracker_entries"
        );
      });

      it("should return parsed entries with Date objects", async () => {
        const storedEntries = [
          {
            ...mockEntry,
            timestamp: "2023-08-31T10:30:00.000Z",
          },
        ];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(storedEntries)
        );

        const entries = await StorageService.getEntries();

        expect(entries).toHaveLength(1);
        expect(entries[0].timestamp).toBeInstanceOf(Date);
        expect(entries[0].text).toBe("Test entry");
      });

      it("should handle JSON parse errors gracefully", async () => {
        mockAsyncStorage.getItem.mockResolvedValue("invalid-json");
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        const entries = await StorageService.getEntries();

        expect(entries).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error getting entries:",
          expect.any(Error)
        );
        consoleSpy.mockRestore();
      });
    });

    describe("saveEntries", () => {
      it("should save entries as JSON string", async () => {
        const entries = [mockEntry];

        await StorageService.saveEntries(entries);

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_entries",
          JSON.stringify(entries)
        );
      });

      it("should handle storage errors gracefully", async () => {
        mockAsyncStorage.setItem.mockRejectedValue(new Error("Storage error"));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        await StorageService.saveEntries([mockEntry]);

        expect(consoleSpy).toHaveBeenCalledWith(
          "Error saving entries:",
          expect.any(Error)
        );
        consoleSpy.mockRestore();
      });
    });

    describe("addEntry", () => {
      it("should add new entry to existing entries", async () => {
        const existingEntries = [mockEntry];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(existingEntries)
        );

        const newEntry: Entry = {
          ...mockEntry,
          id: "entry-2",
          text: "New entry",
        };

        await StorageService.addEntry(newEntry);

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_entries",
          JSON.stringify([mockEntry, newEntry])
        );
      });
    });
  });

  describe("Action Items", () => {
    const mockActionItem: ActionItem = {
      id: "action-1",
      entryId: "entry-1",
      title: "Test action",
      description: "Test description",
      completed: false,
      createdAt: new Date("2023-08-31T10:30:00Z"),
    };

    describe("getActionItems", () => {
      it("should return empty array when no action items exist", async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const actionItems = await StorageService.getActionItems();

        expect(actionItems).toEqual([]);
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
          "@daily_tracker_action_items"
        );
      });

      it("should return parsed action items with Date objects", async () => {
        const storedItems = [
          {
            ...mockActionItem,
            createdAt: "2023-08-31T10:30:00.000Z",
            dueDate: "2023-09-01T10:30:00.000Z",
          },
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedItems));

        const actionItems = await StorageService.getActionItems();

        expect(actionItems).toHaveLength(1);
        expect(actionItems[0].createdAt).toBeInstanceOf(Date);
        expect(actionItems[0].dueDate).toBeInstanceOf(Date);
      });
    });

    describe("addActionItem", () => {
      it("should add new action item", async () => {
        mockAsyncStorage.getItem.mockResolvedValue("[]");

        await StorageService.addActionItem(mockActionItem);

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_action_items",
          JSON.stringify([mockActionItem])
        );
      });
    });

    describe("updateActionItem", () => {
      it("should update existing action item", async () => {
        const existingItems = [mockActionItem];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(existingItems)
        );

        await StorageService.updateActionItem("action-1", { completed: true });

        const expectedUpdatedItem = { ...mockActionItem, completed: true };
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_action_items",
          JSON.stringify([expectedUpdatedItem])
        );
      });

      it("should not update if action item not found", async () => {
        mockAsyncStorage.getItem.mockResolvedValue("[]");

        await StorageService.updateActionItem("nonexistent", {
          completed: true,
        });

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_action_items",
          "[]"
        );
      });
    });

    describe("deleteActionItem", () => {
      it("should delete action item by id", async () => {
        const items = [mockActionItem, { ...mockActionItem, id: "action-2" }];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

        await StorageService.deleteActionItem("action-1");

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_action_items",
          JSON.stringify([{ ...mockActionItem, id: "action-2" }])
        );
      });
    });
  });

  describe("Expenses", () => {
    const mockExpense: Expense = {
      id: "expense-1",
      entryId: "entry-1",
      amount: 50.99,
      currency: "USD",
      description: "Coffee purchase",
      createdAt: new Date("2023-08-31T10:30:00Z"),
    };

    describe("getExpenses", () => {
      it("should return empty array when no expenses exist", async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const expenses = await StorageService.getExpenses();

        expect(expenses).toEqual([]);
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
          "@daily_tracker_expenses"
        );
      });

      it("should return parsed expenses with Date objects", async () => {
        const storedExpenses = [
          {
            ...mockExpense,
            createdAt: "2023-08-31T10:30:00.000Z",
          },
        ];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(storedExpenses)
        );

        const expenses = await StorageService.getExpenses();

        expect(expenses).toHaveLength(1);
        expect(expenses[0].createdAt).toBeInstanceOf(Date);
        expect(expenses[0].amount).toBe(50.99);
      });
    });

    describe("addExpense", () => {
      it("should add new expense", async () => {
        mockAsyncStorage.getItem.mockResolvedValue("[]");

        await StorageService.addExpense(mockExpense);

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_expenses",
          JSON.stringify([mockExpense])
        );
      });
    });

    describe("updateExpense", () => {
      it("should update existing expense", async () => {
        const existingExpenses = [mockExpense];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(existingExpenses)
        );

        await StorageService.updateExpense("expense-1", { amount: 75.5 });

        const expectedUpdatedExpense = { ...mockExpense, amount: 75.5 };
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_expenses",
          JSON.stringify([expectedUpdatedExpense])
        );
      });
    });

    describe("deleteExpense", () => {
      it("should delete expense by id", async () => {
        const expenses = [mockExpense, { ...mockExpense, id: "expense-2" }];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expenses));

        await StorageService.deleteExpense("expense-1");

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          "@daily_tracker_expenses",
          JSON.stringify([{ ...mockExpense, id: "expense-2" }])
        );
      });
    });
  });
});
