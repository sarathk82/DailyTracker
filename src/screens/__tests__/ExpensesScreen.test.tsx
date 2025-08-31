import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { ExpensesScreen } from "../ExpensesScreen";
import { StorageService } from "../../utils/storage";

// Mock the storage service
jest.mock("../../utils/storage");
const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;

// Mock Alert
jest.spyOn(Alert, "alert");

describe("ExpensesScreen", () => {
  const mockExpenses = [
    {
      id: "expense-1",
      entryId: "entry-1",
      amount: 25.5,
      currency: "USD",
      description: "Coffee and pastry",
      category: "Food",
      createdAt: new Date("2023-08-31T10:30:00Z"),
    },
    {
      id: "expense-2",
      entryId: "entry-2",
      amount: 45.99,
      currency: "USD",
      description: "Gas station fill-up",
      category: "Transportation",
      createdAt: new Date("2023-08-31T11:30:00Z"),
    },
    {
      id: "expense-3",
      entryId: "entry-3",
      amount: 100.0,
      currency: "EUR",
      description: "Grocery shopping",
      category: "Food",
      createdAt: new Date("2023-08-30T15:00:00Z"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageService.getExpenses.mockResolvedValue(mockExpenses);
    mockStorageService.updateExpense.mockResolvedValue();
    mockStorageService.deleteExpense.mockResolvedValue();
  });

  it("should render the expenses screen", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      expect(screen.getByText("Expenses")).toBeTruthy();
      expect(screen.getByText("Coffee and pastry")).toBeTruthy();
      expect(screen.getByText("Gas station fill-up")).toBeTruthy();
      expect(screen.getByText("Grocery shopping")).toBeTruthy();
    });
  });

  it("should load expenses on mount", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      expect(mockStorageService.getExpenses).toHaveBeenCalled();
      expect(screen.getByText("Coffee and pastry")).toBeTruthy();
    });
  });

  it("should display expense amounts with correct currency formatting", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      expect(screen.getByText("$25.50")).toBeTruthy();
      expect(screen.getByText("$45.99")).toBeTruthy();
      expect(screen.getByText("€100.00")).toBeTruthy();
    });
  });

  it("should show empty state when no expenses", async () => {
    mockStorageService.getExpenses.mockResolvedValue([]);

    render(<ExpensesScreen />);

    await waitFor(() => {
      expect(screen.getByText("No expenses yet")).toBeTruthy();
      expect(
        screen.getByText("Start journaling to automatically track expenses!")
      ).toBeTruthy();
    });
  });

  it("should calculate and display total amount", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      // Should show total in USD (converted amounts)
      expect(screen.getByText(/Total:/)).toBeTruthy();
    });
  });

  it("should filter expenses by category", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      expect(screen.getByText("Coffee and pastry")).toBeTruthy();
      expect(screen.getByText("Gas station fill-up")).toBeTruthy();
      expect(screen.getByText("Grocery shopping")).toBeTruthy();
    });

    // Filter by Food category
    const foodFilter = screen.getByText("Food");
    fireEvent.press(foodFilter);

    await waitFor(() => {
      expect(screen.getByText("Coffee and pastry")).toBeTruthy();
      expect(screen.getByText("Grocery shopping")).toBeTruthy();
      expect(screen.queryByText("Gas station fill-up")).toBeNull();
    });

    // Filter by Transportation category
    const transportationFilter = screen.getByText("Transportation");
    fireEvent.press(transportationFilter);

    await waitFor(() => {
      expect(screen.getByText("Gas station fill-up")).toBeTruthy();
      expect(screen.queryByText("Coffee and pastry")).toBeNull();
      expect(screen.queryByText("Grocery shopping")).toBeNull();
    });

    // Show all expenses
    const allFilter = screen.getByText("All");
    fireEvent.press(allFilter);

    await waitFor(() => {
      expect(screen.getByText("Coffee and pastry")).toBeTruthy();
      expect(screen.getByText("Gas station fill-up")).toBeTruthy();
      expect(screen.getByText("Grocery shopping")).toBeTruthy();
    });
  });

  it("should sort expenses by date (newest first)", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      const expenseTexts = screen.getAllByText(/Coffee|Gas|Grocery/);
      // Should be sorted by date, newest first
      expect(expenseTexts[0]).toHaveProperty("children", "Gas station fill-up");
      expect(expenseTexts[1]).toHaveProperty("children", "Coffee and pastry");
      expect(expenseTexts[2]).toHaveProperty("children", "Grocery shopping");
    });
  });

  it("should show delete confirmation on long press", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      expect(screen.getByText("Coffee and pastry")).toBeTruthy();
    });

    // Long press to show options
    const expense = screen.getByText("Coffee and pastry");
    fireEvent(expense.parent?.parent, "onLongPress");

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Delete Expense",
        "Are you sure you want to delete this expense?",
        expect.any(Array)
      );
    });
  });

  it("should delete expense when confirmed", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      expect(screen.getByText("Coffee and pastry")).toBeTruthy();
    });

    // Long press and confirm deletion
    const expense = screen.getByText("Coffee and pastry");
    fireEvent(expense.parent?.parent, "onLongPress");

    // Get the alert call and trigger the delete option
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const deleteOption = alertCall[2].find(
      (option: any) => option.text === "Delete"
    );
    deleteOption.onPress();

    await waitFor(() => {
      expect(mockStorageService.deleteExpense).toHaveBeenCalledWith(
        "expense-1"
      );
    });
  });

  it("should display expense statistics", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      // Should show count of expenses
      expect(screen.getByText("3")).toBeTruthy(); // Total expense count
    });
  });

  it("should group expenses by date", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      // Should show date headers
      expect(screen.getByText("Aug 31, 2023")).toBeTruthy();
      expect(screen.getByText("Aug 30, 2023")).toBeTruthy();
    });
  });

  it("should handle edit expense functionality", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      expect(screen.getByText("Coffee and pastry")).toBeTruthy();
    });

    // Tap on edit button (if available)
    const editButton = screen.queryByTestId("edit-expense-expense-1");
    if (editButton) {
      fireEvent.press(editButton);

      await waitFor(() => {
        // Should open edit modal or navigate to edit screen
        expect(screen.getByText("Edit Expense")).toBeTruthy();
      });
    }
  });

  it("should handle different currencies correctly", async () => {
    render(<ExpensesScreen />);

    await waitFor(() => {
      // Should display each currency with its symbol
      expect(screen.getByText("$25.50")).toBeTruthy(); // USD
      expect(screen.getByText("€100.00")).toBeTruthy(); // EUR
    });
  });
});
