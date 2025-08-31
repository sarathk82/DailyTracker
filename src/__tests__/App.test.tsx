import React from "react";
import { render, screen } from "@testing-library/react-native";
import App from "../../App";

// Mock navigation
jest.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({
      children,
      component: Component,
    }: {
      children: React.ReactNode;
      component: React.ComponentType;
    }) => <Component />,
  }),
}));

// Mock screens
jest.mock("../../../src/screens", () => ({
  JournalScreen: () => "JournalScreen",
  ActionItemsScreen: () => "ActionItemsScreen",
  ExpensesScreen: () => "ExpensesScreen",
}));

describe("App", () => {
  it("should render without crashing", () => {
    render(<App />);

    // The app should render the navigation structure
    expect(screen.getByText("JournalScreen")).toBeTruthy();
  });

  it("should have proper navigation structure", () => {
    const result = render(<App />);

    // Should not throw any errors and render successfully
    expect(result).toBeTruthy();
  });
});
