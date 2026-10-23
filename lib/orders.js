// Mock order database + the get_order_details tool implementation.
export const ORDERS = {
  "ORD-101": {
    order_id: "ORD-101", customer: "Priya Sharma", product: "Vitamin C Serum (30ml)",
    value_inr: 699, status: "Out for Delivery", tracking: "BlueDart - BD-982103",
    notes: "Expected by 6 PM today",
  },
  "ORD-102": {
    order_id: "ORD-102", customer: "Rahul Verma", product: "Hydrating Sunscreen SPF 50",
    value_inr: 499, status: "Delivered", tracking: "Delhivery - DL-441029",
    delivered_days_ago: 14, notes: "Delivered 14 days ago",
  },
  "ORD-103": {
    order_id: "ORD-103", customer: "Ananya Patel", product: "Green Tea Face Wash + Toner",
    value_inr: 850, status: "Processing", tracking: null,
    notes: "Ordered 3 hours ago. Eligible for cancellation",
  },
};

// Speech-to-text may produce "order 101", "ORD 101", etc. - pull out the digits.
export function normalizeOrderId(raw) {
  const m = String(raw || "").match(/\d{3,}/);
  return m ? `ORD-${m[0]}` : null;
}

export function getOrderDetails(raw) {
  const id = normalizeOrderId(raw);
  if (!id) {
    return { error: "MISSING_OR_INVALID_FORMAT", message: "No valid order ID was given. Ask the customer to share it (format ORD-###)." };
  }
  const o = ORDERS[id];
  if (!o) {
    return { error: "NOT_FOUND", order_id: id, message: "No order with this ID exists. Ask the customer to repeat or verify the ID. Do not guess." };
  }
  const delivered = o.status === "Delivered";
  return {
    ...o,
    eligibility: {
      can_cancel: o.status === "Processing",
      cancel_note: o.status === "Processing"
        ? "Cancellable now."
        : "Not cancellable (only Processing orders can be cancelled). If Shipped/Out for Delivery, customer may refuse delivery at the doorstep.",
      return_window: delivered
        ? (o.delivered_days_ago <= 7 ? "WITHIN_7_DAYS (only if unopened, unused, original packaging)" : "EXPIRED (delivered more than 7 days ago)")
        : "NOT_DELIVERED_YET",
    },
  };
}
