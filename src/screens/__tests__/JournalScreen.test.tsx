import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { JournalScreen } from "../JournalScreen";
import { StorageService } from "../../utils/storage";
import * as textAnalysis from "../../utils/textAnalysis";

// Mock the storage service
jest.mock("../../utils/storage");
const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;

// Mock text analysis
jest.mock("../../utils/textAnalysis");
const mockTextAnalysis = textAnalysis as jest.Mocked<typeof textAnalysis>;

// Mock Alert
jest.spyOn(Alert, "alert");

describe("JournalScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageService.getEntries.mockResolvedValue([]);
    mockStorageService.addEntry.mockResolvedValue();
    mockStorageService.addExpense.mockResolvedValue();
    mockStorageService.addActionItem.mockResolvedValue();
    mockStorageService.saveEntries.mockResolvedValue();
  });

  it("should render the journal screen", async () => {
    render(<JournalScreen />);

    await waitFor(() => {
      expect(screen.getByText("Daily Journal")).toBeTruthy();
      expect(screen.getByPlaceholderText("Type a message...")).toBeTruthy();
    });
  });

  it("should load existing entries on mount", async () => {
    const mockEntries = [
      {
        id: "entry-1",
        text: "Test entry",
        timestamp: new Date("2023-08-31T10:30:00Z"),
        type: "log" as const,
        isMarkdown: false,
      },
    ];
    mockStorageService.getEntries.mockResolvedValue(mockEntries);

    render(<JournalScreen />);

    await waitFor(() => {
      expect(mockStorageService.getEntries).toHaveBeenCalled();
      expect(screen.getByText("Test entry")).toBeTruthy();
    });
  });

  it("should toggle markdown mode", async () => {
    render(<JournalScreen />);

    const markdownToggle = screen.getByText("MD");
    fireEvent.press(markdownToggle);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type a message (Markdown supported)...")
      ).toBeTruthy();
    });
  });

  describe("Message sending", () => {
    it("should send a regular message", async () => {
      mockTextAnalysis.detectExpense.mockReturnValue(false);
      mockTextAnalysis.detectActionItem.mockReturnValue(false);

      render(<JournalScreen />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendButton = screen.getByRole("button");

      fireEvent.changeText(input, "Hello world");
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockStorageService.addEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Hello world",
            type: "log",
            isMarkdown: false,
          })
        );
      });

      expect(input.props.value).toBe("");
    });

    it("should not send empty messages", async () => {
      render(<JournalScreen />);

      const sendButton = screen.getByRole("button");
      fireEvent.press(sendButton);

      expect(mockStorageService.addEntry).not.toHaveBeenCalled();
    });

    it("should categorize and save expense", async () => {
      mockTextAnalysis.detectExpense.mockReturnValue(true);
      mockTextAnalysis.detectActionItem.mockReturnValue(false);
      mockTextAnalysis.extractExpenseInfo.mockReturnValue({
        id: "expense-1",
        entryId: "entry-1",
        amount: 25.5,
        currency: "USD",
        description: "Coffee for $25.50",
        createdAt: new Date(),
      });

      render(<JournalScreen />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendButton = screen.getByRole("button");

      fireEvent.changeText(input, "Coffee for $25.50");
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockTextAnalysis.detectExpense).toHaveBeenCalledWith(
          "Coffee for $25.50"
        );
        expect(mockTextAnalysis.extractExpenseInfo).toHaveBeenCalled();
        expect(mockStorageService.addExpense).toHaveBeenCalled();
        expect(mockStorageService.addEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Coffee for $25.50",
            type: "expense",
          })
        );
      });
    });

    it("should categorize and save action item", async () => {
      mockTextAnalysis.detectExpense.mockReturnValue(false);
      mockTextAnalysis.detectActionItem.mockReturnValue(true);
      mockTextAnalysis.extractActionItem.mockReturnValue({
        id: "action-1",
        entryId: "entry-1",
        title: "Buy groceries",
        description: "Need to buy groceries",
        completed: false,
        createdAt: new Date(),
      });

      render(<JournalScreen />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendButton = screen.getByRole("button");

      fireEvent.changeText(input, "Need to buy groceries");
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockTextAnalysis.detectActionItem).toHaveBeenCalledWith(
          "Need to buy groceries"
        );
        expect(mockTextAnalysis.extractActionItem).toHaveBeenCalled();
        expect(mockStorageService.addActionItem).toHaveBeenCalled();
        expect(mockStorageService.addEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Need to buy groceries",
            type: "action",
          })
        );
      });
    });

    it("should show toast for successful expense categorization", async () => {
      mockTextAnalysis.detectExpense.mockReturnValue(true);
      mockTextAnalysis.detectActionItem.mockReturnValue(false);
      mockTextAnalysis.extractExpenseInfo.mockReturnValue({
        id: "expense-1",
        entryId: "entry-1",
        amount: 25.5,
        currency: "USD",
        description: "Coffee for $25.50",
        createdAt: new Date(),
      });

      render(<JournalScreen />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendButton = screen.getByRole("button");

      fireEvent.changeText(input, "Coffee for $25.50");
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "",
          "💰 Added expense: 25.5 USD",
          [{ text: "OK" }]
        );
      });
    });

    it("should show toast for successful action item categorization", async () => {
      mockTextAnalysis.detectExpense.mockReturnValue(false);
      mockTextAnalysis.detectActionItem.mockReturnValue(true);
      mockTextAnalysis.extractActionItem.mockReturnValue({
        id: "action-1",
        entryId: "entry-1",
        title: "Buy groceries",
        description: "Need to buy groceries",
        completed: false,
        createdAt: new Date(),
      });

      render(<JournalScreen />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendButton = screen.getByRole("button");

      fireEvent.changeText(input, "Need to buy groceries");
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "",
          "✅ Added action item: Buy groceries",
          [{ text: "OK" }]
        );
      });
    });

    it("should handle failed expense extraction", async () => {
      mockTextAnalysis.detectExpense.mockReturnValue(true);
      mockTextAnalysis.detectActionItem.mockReturnValue(false);
      mockTextAnalysis.extractExpenseInfo.mockReturnValue(null);

      render(<JournalScreen />);

      const input = screen.getByPlaceholderText("Type a message...");
      const sendButton = screen.getByRole("button");

      fireEvent.changeText(input, "Expensive purchase");
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "",
          "💰 Detected as expense but couldn't extract amount",
          [{ text: "OK" }]
        );
        expect(mockStorageService.addExpense).not.toHaveBeenCalled();
      });
    });
  });

  describe("Message interactions", () => {
    const mockEntry = {
      id: "entry-1",
      text: "Test entry",
      timestamp: new Date("2023-08-31T10:30:00Z"),
      type: "log" as const,
      isMarkdown: false,
    };

    beforeEach(() => {
      mockStorageService.getEntries.mockResolvedValue([mockEntry]);
    });

    it("should show options on long press", async () => {
      render(<JournalScreen />);

      await waitFor(() => {
        expect(screen.getByText("Test entry")).toBeTruthy();
      });

      const messageElement = screen.getByText("Test entry");
      fireEvent(messageElement.parent?.parent, "onLongPress");

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Entry Options",
          "What would you like to do with this entry?",
          expect.any(Array)
        );
      });
    });

    it("should manually categorize as expense", async () => {
      mockTextAnalysis.extractExpenseInfo.mockReturnValue({
        id: "expense-1",
        entryId: "entry-1",
        amount: 10.0,
        currency: "USD",
        description: "Test entry",
        createdAt: new Date(),
      });

      render(<JournalScreen />);

      await waitFor(() => {
        expect(screen.getByText("Test entry")).toBeTruthy();
      });

      const messageElement = screen.getByText("Test entry");
      fireEvent(messageElement.parent?.parent, "onLongPress");

      // Get the alert call and trigger the expense option
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const expenseOption = alertCall[2].find(
        (option: any) => option.text === "Mark as Expense"
      );
      expenseOption.onPress();

      await waitFor(() => {
        expect(mockStorageService.addExpense).toHaveBeenCalled();
        expect(mockStorageService.saveEntries).toHaveBeenCalled();
      });
    });

    it("should handle failed manual expense categorization", async () => {
      mockTextAnalysis.extractExpenseInfo.mockReturnValue(null);

      render(<JournalScreen />);

      await waitFor(() => {
        expect(screen.getByText("Test entry")).toBeTruthy();
      });

      const messageElement = screen.getByText("Test entry");
      fireEvent(messageElement.parent?.parent, "onLongPress");

      // Trigger the expense option
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const expenseOption = alertCall[2].find(
        (option: any) => option.text === "Mark as Expense"
      );
      expenseOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Cannot Extract Expense",
          "Could not find amount information in this entry. Please ensure it contains a monetary value."
        );
      });
    });

    it("should manually categorize as action item", async () => {
      mockTextAnalysis.extractActionItem.mockReturnValue({
        id: "action-1",
        entryId: "entry-1",
        title: "Test task",
        description: "Test entry",
        completed: false,
        createdAt: new Date(),
      });

      render(<JournalScreen />);

      await waitFor(() => {
        expect(screen.getByText("Test entry")).toBeTruthy();
      });

      const messageElement = screen.getByText("Test entry");
      fireEvent(messageElement.parent?.parent, "onLongPress");

      // Trigger the action item option
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const actionOption = alertCall[2].find(
        (option: any) => option.text === "Mark as Action Item"
      );
      actionOption.onPress();

      await waitFor(() => {
        expect(mockStorageService.addActionItem).toHaveBeenCalled();
        expect(mockStorageService.saveEntries).toHaveBeenCalled();
      });
    });
  });

  describe("Message display", () => {
    it("should display entries sorted by timestamp", async () => {
      const entries = [
        {
          id: "entry-2",
          text: "Second entry",
          timestamp: new Date("2023-08-31T11:00:00Z"),
          type: "log" as const,
          isMarkdown: false,
        },
        {
          id: "entry-1",
          text: "First entry",
          timestamp: new Date("2023-08-31T10:00:00Z"),
          type: "log" as const,
          isMarkdown: false,
        },
      ];
      mockStorageService.getEntries.mockResolvedValue(entries);

      render(<JournalScreen />);

      await waitFor(() => {
        expect(screen.getByText("First entry")).toBeTruthy();
        expect(screen.getByText("Second entry")).toBeTruthy();
      });
    });

    it("should display category labels for categorized entries", async () => {
      const entries = [
        {
          id: "entry-1",
          text: "Expense entry",
          timestamp: new Date(),
          type: "expense" as const,
          isMarkdown: false,
        },
        {
          id: "entry-2",
          text: "Action entry",
          timestamp: new Date(),
          type: "action" as const,
          isMarkdown: false,
        },
      ];
      mockStorageService.getEntries.mockResolvedValue(entries);

      render(<JournalScreen />);

      await waitFor(() => {
        expect(screen.getByText("Auto-categorized as Expense")).toBeTruthy();
        expect(
          screen.getByText("Auto-categorized as Action Item")
        ).toBeTruthy();
      });
    });
  });
});
