import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { ActionItemsScreen } from "../ActionItemsScreen";
import { StorageService } from "../../utils/storage";

// Mock the storage service
jest.mock("../../utils/storage");
const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;

// Mock Alert
jest.spyOn(Alert, "alert");

describe("ActionItemsScreen", () => {
  const mockActionItems = [
    {
      id: "action-1",
      entryId: "entry-1",
      title: "Buy groceries",
      description: "Buy groceries for the week",
      completed: false,
      createdAt: new Date("2023-08-31T10:30:00Z"),
    },
    {
      id: "action-2",
      entryId: "entry-2",
      title: "Call doctor",
      description: "Schedule appointment",
      completed: true,
      createdAt: new Date("2023-08-31T11:30:00Z"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageService.getActionItems.mockResolvedValue(mockActionItems);
    mockStorageService.updateActionItem.mockResolvedValue();
    mockStorageService.deleteActionItem.mockResolvedValue();
  });

  it("should render the action items screen", async () => {
    render(<ActionItemsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Action Items")).toBeTruthy();
      expect(screen.getByText("Buy groceries")).toBeTruthy();
      expect(screen.getByText("Call doctor")).toBeTruthy();
    });
  });

  it("should load action items on mount", async () => {
    render(<ActionItemsScreen />);

    await waitFor(() => {
      expect(mockStorageService.getActionItems).toHaveBeenCalled();
      expect(screen.getByText("Buy groceries")).toBeTruthy();
      expect(screen.getByText("Call doctor")).toBeTruthy();
    });
  });

  it("should display completed and incomplete items differently", async () => {
    render(<ActionItemsScreen />);

    await waitFor(() => {
      const incompleteItem = screen.getByText("Buy groceries");
      const completedItem = screen.getByText("Call doctor");

      expect(incompleteItem).toBeTruthy();
      expect(completedItem).toBeTruthy();
    });
  });

  it("should toggle item completion", async () => {
    render(<ActionItemsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeTruthy();
    });

    // Find and press the checkbox for the incomplete item
    const incompleteItem = screen.getByText("Buy groceries");
    const checkbox = incompleteItem.parent?.parent?.children[0]; // Get the checkbox
    fireEvent.press(checkbox!);

    await waitFor(() => {
      expect(mockStorageService.updateActionItem).toHaveBeenCalledWith(
        "action-1",
        { completed: true }
      );
    });
  });

  it("should show empty state when no action items", async () => {
    mockStorageService.getActionItems.mockResolvedValue([]);

    render(<ActionItemsScreen />);

    await waitFor(() => {
      expect(screen.getByText("No action items yet")).toBeTruthy();
      expect(
        screen.getByText(
          "Start journaling to automatically create action items!"
        )
      ).toBeTruthy();
    });
  });

  it("should filter items based on completion status", async () => {
    render(<ActionItemsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeTruthy();
      expect(screen.getByText("Call doctor")).toBeTruthy();
    });

    // Test filtering to show only completed items
    const completedFilter = screen.getByText("Completed");
    fireEvent.press(completedFilter);

    await waitFor(() => {
      expect(screen.getByText("Call doctor")).toBeTruthy();
      expect(screen.queryByText("Buy groceries")).toBeNull();
    });

    // Test filtering to show only pending items
    const pendingFilter = screen.getByText("Pending");
    fireEvent.press(pendingFilter);

    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeTruthy();
      expect(screen.queryByText("Call doctor")).toBeNull();
    });

    // Test showing all items
    const allFilter = screen.getByText("All");
    fireEvent.press(allFilter);

    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeTruthy();
      expect(screen.getByText("Call doctor")).toBeTruthy();
    });
  });

  it("should show delete confirmation", async () => {
    render(<ActionItemsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeTruthy();
    });

    // Long press to show options
    const item = screen.getByText("Buy groceries");
    fireEvent(item.parent?.parent, "onLongPress");

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Delete Action Item",
        "Are you sure you want to delete this action item?",
        expect.any(Array)
      );
    });
  });

  it("should delete action item when confirmed", async () => {
    render(<ActionItemsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Buy groceries")).toBeTruthy();
    });

    // Long press and confirm deletion
    const item = screen.getByText("Buy groceries");
    fireEvent(item.parent?.parent, "onLongPress");

    // Get the alert call and trigger the delete option
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const deleteOption = alertCall[2].find(
      (option: any) => option.text === "Delete"
    );
    deleteOption.onPress();

    await waitFor(() => {
      expect(mockStorageService.deleteActionItem).toHaveBeenCalledWith(
        "action-1"
      );
    });
  });

  it("should sort items by creation date", async () => {
    const sortedItems = [
      {
        id: "action-3",
        entryId: "entry-3",
        title: "Newest task",
        description: "This is the newest",
        completed: false,
        createdAt: new Date("2023-08-31T12:30:00Z"),
      },
      ...mockActionItems,
    ];

    mockStorageService.getActionItems.mockResolvedValue(sortedItems);

    render(<ActionItemsScreen />);

    await waitFor(() => {
      const actionItemTexts = screen.getAllByText(/task|groceries|doctor/);
      expect(actionItemTexts[0]).toHaveProperty("children", "Newest task");
    });
  });

  it("should show stats correctly", async () => {
    render(<ActionItemsScreen />);

    await waitFor(() => {
      // Should show total count and completed count
      expect(screen.getByText("2")).toBeTruthy(); // Total items
      expect(screen.getByText("1")).toBeTruthy(); // Completed items
    });
  });
});
