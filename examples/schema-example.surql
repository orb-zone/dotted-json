-- Example SurrealDB Schema for Type Generation
-- This demonstrates DEFINE FUNCTION statements that will be auto-discovered

-- ============================================================================
-- User Management Functions
-- ============================================================================

-- Get user profile by ID
DEFINE FUNCTION fn::getProfile($userId: string) {
  LET $user = SELECT id, name, email, avatar, role
    FROM type::thing('user', string::split($userId, ':')[1])
    LIMIT 1;
  RETURN $user[0];
};

-- Update user profile
DEFINE FUNCTION fn::updateProfile($userId: string, $name: string, $email: option<string>) {
  LET $updated = UPDATE type::thing('user', string::split($userId, ':')[1])
    SET name = $name,
        email = $email OR email;
  RETURN $updated[0];
};

-- Get user by email
DEFINE FUNCTION fn::getUserByEmail($email: string) {
  LET $user = SELECT * FROM user WHERE email = $email LIMIT 1;
  RETURN $user[0];
};

-- ============================================================================
-- Order Management Functions
-- ============================================================================

-- Get active orders for a user
DEFINE FUNCTION fn::getActiveOrders($userId: string, $limit: option<int>) {
  RETURN SELECT * FROM order
    WHERE user_id = $userId
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT $limit OR 10;
};

-- Cancel an order
DEFINE FUNCTION fn::cancelOrder($orderId: string, $reason: option<string>) {
  LET $order = UPDATE type::thing('order', string::split($orderId, ':')[1])
    SET status = 'cancelled',
        cancelled_at = time::now(),
        cancel_reason = $reason OR 'User requested';

  RETURN { success: true, order: $order[0] };
};

-- Calculate order total
DEFINE FUNCTION fn::calculateOrderTotal($items: array<object>) {
  LET $total = 0;
  FOR $item IN $items {
    LET $total = $total + ($item.price * $item.quantity);
  };
  RETURN { total: $total, currency: 'USD' };
};

-- ============================================================================
-- Analytics Functions
-- ============================================================================

-- Get user statistics
DEFINE FUNCTION fn::getUserStats($userId: string) {
  LET $totalOrders = (
    SELECT count() as total FROM order WHERE user_id = $userId
  )[0].total OR 0;

  LET $totalSpent = (
    SELECT math::sum(total) as sum FROM order WHERE user_id = $userId
  )[0].sum OR 0;

  RETURN {
    totalOrders: $totalOrders,
    totalSpent: $totalSpent,
    memberSince: (SELECT created_at FROM $userId)[0].created_at
  };
};

-- Get top products
DEFINE FUNCTION fn::getTopProducts($limit: int) {
  RETURN SELECT
    product_id,
    count() as order_count,
    math::sum(quantity) as total_sold
  FROM order_items
  GROUP BY product_id
  ORDER BY order_count DESC
  LIMIT $limit;
};

-- ============================================================================
-- Search Functions
-- ============================================================================

-- Search products by query
DEFINE FUNCTION fn::searchProducts($query: string, $limit: option<int>) {
  RETURN SELECT * FROM product
    WHERE name ~ $query OR description ~ $query
    ORDER BY relevance DESC
    LIMIT $limit OR 20;
};

-- ============================================================================
-- Notification Functions
-- ============================================================================

-- Send notification to user
DEFINE FUNCTION fn::sendNotification($userId: string, $title: string, $message: string, $type: option<string>) {
  CREATE notification CONTENT {
    user_id: $userId,
    title: $title,
    message: $message,
    type: $type OR 'info',
    read: false,
    created_at: time::now()
  };

  RETURN { success: true };
};

-- Get unread notifications
DEFINE FUNCTION fn::getUnreadNotifications($userId: string) {
  RETURN SELECT * FROM notification
    WHERE user_id = $userId
      AND read = false
    ORDER BY created_at DESC;
};

-- ============================================================================
-- Complex Example: Namespaced Functions
-- ============================================================================

-- These would be grouped under 'admin' namespace
DEFINE FUNCTION fn::admin.listUsers($page: int, $pageSize: int) {
  LET $offset = ($page - 1) * $pageSize;
  RETURN SELECT * FROM user
    ORDER BY created_at DESC
    LIMIT $pageSize
    START $offset;
};

DEFINE FUNCTION fn::admin.deleteUser($userId: string) {
  DELETE type::thing('user', string::split($userId, ':')[1]);
  RETURN { success: true };
};
