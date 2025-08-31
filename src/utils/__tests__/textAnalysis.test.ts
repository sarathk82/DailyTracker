import {
  detectExpense,
  detectActionItem,
  extractExpenseInfo,
  extractActionItem,
  formatCurrency,
} from "../textAnalysis";

// Mock react-native-uuid
jest.mock("react-native-uuid", () => ({
  v4: jest.fn(() => "mocked-uuid-1234"),
}));

describe("Text Analysis Functions", () => {
  describe("detectExpense", () => {
    it("should detect currency symbols", () => {
      expect(detectExpense("Bought coffee for $5.50")).toBe(true);
      expect(detectExpense("Paid ₹100 for lunch")).toBe(true);
      expect(detectExpense("Cost €25.99")).toBe(true);
      expect(detectExpense("Spent £15.00")).toBe(true);
    });

    it("should detect currency symbols with spaces", () => {
      expect(detectExpense("Paid $ 50 for gas")).toBe(true);
      expect(detectExpense("Cost € 25")).toBe(true);
    });

    it("should detect text-based currency amounts", () => {
      expect(detectExpense("Spent 50 dollars on groceries")).toBe(true);
      expect(detectExpense("Cost 25 rupees")).toBe(true);
      expect(detectExpense("Paid 100 euros")).toBe(true);
      expect(detectExpense("15 bucks for parking")).toBe(true);
    });

    it("should detect expense keywords", () => {
      expect(detectExpense("Bought groceries today")).toBe(true);
      expect(detectExpense("Paid the bill")).toBe(true);
      expect(detectExpense("Shopping at the store")).toBe(true);
      expect(detectExpense("Ordered food from restaurant")).toBe(true);
      expect(detectExpense("Gas station visit")).toBe(true);
      expect(detectExpense("Coffee break")).toBe(true);
      expect(detectExpense("Uber ride home")).toBe(true);
    });

    it("should not detect non-expense text", () => {
      expect(detectExpense("Had a great day")).toBe(false);
      expect(detectExpense("Meeting with team")).toBe(false);
      expect(detectExpense("Walking in the park")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(detectExpense("BOUGHT COFFEE")).toBe(true);
      expect(detectExpense("Paid The Bill")).toBe(true);
    });
  });

  describe("detectActionItem", () => {
    it("should detect markdown checklist format", () => {
      expect(detectActionItem("- [ ] Buy groceries")).toBe(true);
      expect(detectActionItem("* [ ] Call doctor")).toBe(true);
      expect(detectActionItem("- [ ] Finish project")).toBe(true);
    });

    it("should detect TODO format", () => {
      expect(detectActionItem("TODO: Buy milk")).toBe(true);
      expect(detectActionItem("TODO call mom")).toBe(true);
      expect(detectActionItem("todo: finish homework")).toBe(true);
    });

    it("should detect REMINDER format", () => {
      expect(detectActionItem("REMINDER: Doctor appointment")).toBe(true);
      expect(detectActionItem("Reminder call bank")).toBe(true);
      expect(detectActionItem("reminder: pay bills")).toBe(true);
    });

    it("should detect action keywords", () => {
      expect(detectActionItem("Need to buy groceries")).toBe(true);
      expect(detectActionItem("Must finish project")).toBe(true);
      expect(detectActionItem("Should call doctor")).toBe(true);
      expect(detectActionItem("Have to pick up kids")).toBe(true);
      expect(detectActionItem("Remember to pay bills")).toBe(true);
      expect(detectActionItem("Don't forget to call mom")).toBe(true);
    });

    it("should detect direct action verbs", () => {
      expect(detectActionItem("Buy milk on the way home")).toBe(true);
      expect(detectActionItem("Get flowers for anniversary")).toBe(true);
      expect(detectActionItem("Pick up dry cleaning")).toBe(true);
      expect(detectActionItem("Contact customer service")).toBe(true);
    });

    it("should not detect non-action text", () => {
      expect(detectActionItem("Had lunch today")).toBe(false);
      expect(detectActionItem("Beautiful sunset")).toBe(false);
      expect(detectActionItem("Enjoyed the movie")).toBe(false);
    });

    it("should detect action patterns with regex", () => {
      expect(detectActionItem("need to call the doctor tomorrow")).toBe(true);
      expect(detectActionItem("must complete this task")).toBe(true);
    });
  });

  describe("extractExpenseInfo", () => {
    const entryId = "test-entry-id";

    it("should extract dollar amounts", () => {
      const result = extractExpenseInfo("Bought coffee for $5.50", entryId);

      expect(result).toBeTruthy();
      expect(result?.amount).toBe(5.5);
      expect(result?.currency).toBe("USD");
      expect(result?.description).toBe("Bought coffee for $5.50");
      expect(result?.entryId).toBe(entryId);
    });

    it("should extract amounts with spaces", () => {
      const result = extractExpenseInfo("Paid $ 25.99 for lunch", entryId);

      expect(result?.amount).toBe(25.99);
      expect(result?.currency).toBe("USD");
    });

    it("should extract different currencies", () => {
      expect(extractExpenseInfo("Cost ₹100", entryId)?.currency).toBe("INR");
      expect(extractExpenseInfo("Paid €50.75", entryId)?.currency).toBe("EUR");
      expect(extractExpenseInfo("Spent £30.00", entryId)?.currency).toBe("GBP");
    });

    it("should extract text-based amounts", () => {
      const result = extractExpenseInfo(
        "Spent 75 dollars on groceries",
        entryId
      );

      expect(result?.amount).toBe(75);
      expect(result?.currency).toBe("USD");
    });

    it("should extract amounts from expense context without currency", () => {
      const result = extractExpenseInfo("Bought lunch for 12.50", entryId);

      expect(result?.amount).toBe(12.5);
      expect(result?.currency).toBe("USD");
    });

    it("should handle slang currency terms", () => {
      const result = extractExpenseInfo("Cost 20 bucks", entryId);

      expect(result?.amount).toBe(20);
      expect(result?.currency).toBe("USD");
    });

    it("should return null for invalid amounts", () => {
      expect(extractExpenseInfo("Had a great day", entryId)).toBeNull();
      expect(
        extractExpenseInfo("Bought something expensive", entryId)
      ).toBeNull();
    });

    it("should validate reasonable amount ranges", () => {
      expect(
        extractExpenseInfo("Paid 0.005 for something", entryId)
      ).toBeNull();
      expect(extractExpenseInfo("Cost 999999 for house", entryId)).toBeNull();
      expect(
        extractExpenseInfo("Bought coffee for 5.99", entryId)?.amount
      ).toBe(5.99);
    });

    it("should include created date and unique id", () => {
      const result = extractExpenseInfo("$10.00 lunch", entryId);

      expect(result?.id).toBe("mocked-uuid-1234");
      expect(result?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("extractActionItem", () => {
    const entryId = "test-entry-id";

    it("should extract from checklist format", () => {
      const result = extractActionItem(
        "- [ ] Buy groceries for dinner",
        entryId
      );

      expect(result?.title).toBe("Buy groceries for dinner");
      expect(result?.description).toBe("- [ ] Buy groceries for dinner");
      expect(result?.completed).toBe(false);
    });

    it("should extract from TODO format", () => {
      const result = extractActionItem("TODO: Call the dentist", entryId);

      expect(result?.title).toBe("Call the dentist");
    });

    it("should extract from REMINDER format", () => {
      const result = extractActionItem(
        "REMINDER: Pick up dry cleaning",
        entryId
      );

      expect(result?.title).toBe("Pick up dry cleaning");
    });

    it("should extract from action phrases", () => {
      const result = extractActionItem(
        "Need to finish the project report",
        entryId
      );

      expect(result?.title).toBe("finish the project report");
    });

    it("should handle various action phrase formats", () => {
      expect(extractActionItem("Must complete homework", entryId)?.title).toBe(
        "complete homework"
      );
      expect(extractActionItem("Should call mom today", entryId)?.title).toBe(
        "call mom today"
      );
      expect(extractActionItem("Have to pick up kids", entryId)?.title).toBe(
        "pick up kids"
      );
      expect(extractActionItem("Remember to pay bills", entryId)?.title).toBe(
        "pay bills"
      );
      expect(
        extractActionItem("Don't forget to water plants", entryId)?.title
      ).toBe("water plants");
    });

    it("should use full text as title when no pattern matches", () => {
      const result = extractActionItem("Buy milk", entryId);

      expect(result?.title).toBe("Buy milk");
      expect(result?.description).toBe("Buy milk");
    });

    it("should include metadata", () => {
      const result = extractActionItem("- [ ] Test task", entryId);

      expect(result?.id).toBe("mocked-uuid-1234");
      expect(result?.entryId).toBe(entryId);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.completed).toBe(false);
    });

    it("should handle different checklist formats", () => {
      expect(
        extractActionItem("* [ ] Task with asterisk", entryId)?.title
      ).toBe("Task with asterisk");
      expect(extractActionItem("- [ ] Task with dash", entryId)?.title).toBe(
        "Task with dash"
      );
      expect(
        extractActionItem("- [] Task without spaces", entryId)?.title
      ).toBe("Task without spaces");
    });
  });

  describe("formatCurrency", () => {
    it("should format USD currency", () => {
      expect(formatCurrency(25.5, "USD")).toBe("$25.50");
      expect(formatCurrency(100, "USD")).toBe("$100.00");
    });

    it("should format different currencies", () => {
      expect(formatCurrency(50.75, "EUR")).toBe("€50.75");
      expect(formatCurrency(1000, "INR")).toBe("₹1000.00");
      expect(formatCurrency(25.99, "GBP")).toBe("£25.99");
    });

    it("should handle unknown currencies", () => {
      expect(formatCurrency(100, "CAD")).toBe("CAD100.00");
      expect(formatCurrency(50, "JPY")).toBe("JPY50.00");
    });

    it("should format to 2 decimal places", () => {
      expect(formatCurrency(10, "USD")).toBe("$10.00");
      expect(formatCurrency(5.5, "USD")).toBe("$5.50");
      expect(formatCurrency(99.999, "USD")).toBe("$100.00");
    });
  });
});
