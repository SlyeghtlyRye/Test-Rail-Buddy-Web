export const DEMO_CREDENTIALS = {
  url: "https://demo.testrail.io",
  email: "demo@example.com",
  password: "demo",
  demo: true,
};

// ── Projects ─────────────────────────────────
export const DEMO_PROJECTS = [
  { id: 1, name: "E-Commerce Platform" },
  { id: 2, name: "Mobile Banking App" },
];

// ── Suites (per project) ──────────────────────
export const DEMO_SUITES = {
  1: [
    { id: 101, name: "Regression Suite" },
    { id: 102, name: "Smoke Tests" },
  ],
  2: [
    { id: 201, name: "Core Banking Tests" },
    { id: 202, name: "Security & Auth" },
  ],
};

// ── Sections (per project+suite) ─────────────
// Key format: `${projectId}_${suiteId}`
export const DEMO_SECTIONS = {
  "1_101": [
    { id: 1001, name: "Authentication",    parent_id: null, suite_id: 101 },
    { id: 1002, name: "Product Catalogue", parent_id: null, suite_id: 101 },
    { id: 1003, name: "Shopping Cart",     parent_id: null, suite_id: 101 },
    { id: 1004, name: "Checkout Flow",     parent_id: null, suite_id: 101 },
    { id: 1005, name: "Order Management",  parent_id: null, suite_id: 101 },
  ],
  "1_102": [
    { id: 1010, name: "Critical Path",     parent_id: null, suite_id: 102 },
    { id: 1011, name: "Payment Smoke",     parent_id: null, suite_id: 102 },
  ],
  "2_201": [
    { id: 2001, name: "Account Overview",  parent_id: null, suite_id: 201 },
    { id: 2002, name: "Fund Transfers",    parent_id: null, suite_id: 201 },
    { id: 2003, name: "Bill Payments",     parent_id: null, suite_id: 201 },
  ],
  "2_202": [
    { id: 2010, name: "Login & MFA",       parent_id: null, suite_id: 202 },
    { id: 2011, name: "Session Management",parent_id: null, suite_id: 202 },
  ],
};

// ── Cases (per section) ───────────────────────
export const DEMO_CASES = {
  // Authentication
  1001: [
    { id: 10001, title: "Valid login with correct credentials",        section_id: 1001, custom_tc_test_case_id: "AUTH-001" },
    { id: 10002, title: "Login fails with incorrect password",         section_id: 1001, custom_tc_test_case_id: "AUTH-002" },
    { id: 10003, title: "Account locks after 5 failed attempts",       section_id: 1001, custom_tc_test_case_id: "AUTH-003" },
    { id: 10004, title: "Password reset email is sent",                section_id: 1001, custom_tc_test_case_id: "AUTH-004" },
    { id: 10005, title: "Remember me persists session across restart", section_id: 1001, custom_tc_test_case_id: "AUTH-005" },
  ],
  // Product Catalogue
  1002: [
    { id: 10010, title: "Product list loads with correct items",       section_id: 1002, custom_tc_test_case_id: "CAT-001" },
    { id: 10011, title: "Search returns relevant results",             section_id: 1002, custom_tc_test_case_id: "CAT-002" },
    { id: 10012, title: "Filter by category narrows results",          section_id: 1002, custom_tc_test_case_id: "CAT-003" },
    { id: 10013, title: "Product detail page shows correct price",     section_id: 1002, custom_tc_test_case_id: "CAT-004" },
    { id: 10014, title: "Out-of-stock badge displays correctly",       section_id: 1002, custom_tc_test_case_id: "CAT-005" },
    { id: 10015, title: "Sort by price low-to-high works correctly",   section_id: 1002, custom_tc_test_case_id: "CAT-006" },
  ],
  // Shopping Cart
  1003: [
    { id: 10020, title: "Add item to cart updates badge count",        section_id: 1003, custom_tc_test_case_id: "CART-001" },
    { id: 10021, title: "Remove item from cart recalculates total",    section_id: 1003, custom_tc_test_case_id: "CART-002" },
    { id: 10022, title: "Quantity update reflects correct subtotal",   section_id: 1003, custom_tc_test_case_id: "CART-003" },
    { id: 10023, title: "Cart persists after browser refresh",         section_id: 1003, custom_tc_test_case_id: "CART-004" },
    { id: 10024, title: "Promo code applies correct discount",         section_id: 1003, custom_tc_test_case_id: "CART-005" },
  ],
  // Checkout Flow
  1004: [
    { id: 10030, title: "Guest checkout completes without account",    section_id: 1004, custom_tc_test_case_id: "CHK-001" },
    { id: 10031, title: "Saved address populates shipping form",       section_id: 1004, custom_tc_test_case_id: "CHK-002" },
    { id: 10032, title: "Credit card payment processes successfully",  section_id: 1004, custom_tc_test_case_id: "CHK-003" },
    { id: 10033, title: "Order confirmation email is received",        section_id: 1004, custom_tc_test_case_id: "CHK-004" },
    { id: 10034, title: "PayPal redirect returns to order summary",    section_id: 1004, custom_tc_test_case_id: "CHK-005" },
    { id: 10035, title: "Invalid card number shows inline error",      section_id: 1004, custom_tc_test_case_id: "CHK-006" },
  ],
  // Order Management
  1005: [
    { id: 10040, title: "Order history lists all past orders",         section_id: 1005, custom_tc_test_case_id: "ORD-001" },
    { id: 10041, title: "Order status updates from processing→shipped",section_id: 1005, custom_tc_test_case_id: "ORD-002" },
    { id: 10042, title: "Cancel order within 30 min window succeeds",  section_id: 1005, custom_tc_test_case_id: "ORD-003" },
    { id: 10043, title: "Return request form submits correctly",       section_id: 1005, custom_tc_test_case_id: "ORD-004" },
  ],
  // Critical Path (smoke)
  1010: [
    { id: 10050, title: "Homepage loads under 3 seconds",             section_id: 1010, custom_tc_test_case_id: "SMK-001" },
    { id: 10051, title: "User can log in and reach dashboard",        section_id: 1010, custom_tc_test_case_id: "SMK-002" },
    { id: 10052, title: "Add-to-cart and checkout flow completes",    section_id: 1010, custom_tc_test_case_id: "SMK-003" },
  ],
  // Payment Smoke
  1011: [
    { id: 10060, title: "Stripe payment intent is created",           section_id: 1011, custom_tc_test_case_id: "SMK-PAY-001" },
    { id: 10061, title: "Webhook fires on successful charge",         section_id: 1011, custom_tc_test_case_id: "SMK-PAY-002" },
  ],
  // Account Overview
  2001: [
    { id: 20001, title: "Dashboard shows correct account balance",    section_id: 2001, custom_tc_test_case_id: "BANK-001" },
    { id: 20002, title: "Transaction history loads last 90 days",     section_id: 2001, custom_tc_test_case_id: "BANK-002" },
    { id: 20003, title: "Pending transactions display with badge",    section_id: 2001, custom_tc_test_case_id: "BANK-003" },
  ],
  // Fund Transfers
  2002: [
    { id: 20010, title: "Internal transfer between own accounts",     section_id: 2002, custom_tc_test_case_id: "TRF-001" },
    { id: 20011, title: "External transfer to saved payee",           section_id: 2002, custom_tc_test_case_id: "TRF-002" },
    { id: 20012, title: "Transfer fails when balance insufficient",   section_id: 2002, custom_tc_test_case_id: "TRF-003" },
    { id: 20013, title: "Transfer confirmation SMS is sent",          section_id: 2002, custom_tc_test_case_id: "TRF-004" },
  ],
  // Bill Payments
  2003: [
    { id: 20020, title: "One-off bill payment processes correctly",   section_id: 2003, custom_tc_test_case_id: "BILL-001" },
    { id: 20021, title: "Recurring payment is scheduled correctly",   section_id: 2003, custom_tc_test_case_id: "BILL-002" },
    { id: 20022, title: "Payment reference appears on statement",     section_id: 2003, custom_tc_test_case_id: "BILL-003" },
  ],
  // Login & MFA
  2010: [
    { id: 20030, title: "Login with username and password succeeds",  section_id: 2010, custom_tc_test_case_id: "SEC-001" },
    { id: 20031, title: "MFA OTP SMS is delivered within 60s",        section_id: 2010, custom_tc_test_case_id: "SEC-002" },
    { id: 20032, title: "Invalid OTP shows correct error message",    section_id: 2010, custom_tc_test_case_id: "SEC-003" },
    { id: 20033, title: "Biometric login succeeds on enrolled device",section_id: 2010, custom_tc_test_case_id: "SEC-004" },
  ],
  // Session Management
  2011: [
    { id: 20040, title: "Session expires after 15 min inactivity",   section_id: 2011, custom_tc_test_case_id: "SES-001" },
    { id: 20041, title: "Logout invalidates all active tokens",       section_id: 2011, custom_tc_test_case_id: "SES-002" },
    { id: 20042, title: "Concurrent sessions limited to 2 devices",  section_id: 2011, custom_tc_test_case_id: "SES-003" },
  ],
};

// ── Full case detail (fetched individually) ───
export const DEMO_CASE_DETAIL = {
  10001: {
    id: 10001,
    title: "Valid login with correct credentials",
    custom_tc_test_case_id: "AUTH-001",
    custom_tc_name: "TC_Login_ValidCredentials",
    custom_tc_category: "Functional",
    custom_preconds: "User account exists with email test@example.com\nUser is on the login page\nNo active session exists",
    custom_tc_use_case: "A registered user enters their correct email and password and expects to be redirected to the dashboard.",
    custom_steps: "1. Navigate to https://shop.example.com/login\n2. Enter email: test@example.com\n3. Enter password: Password123!\n4. Click the 'Sign In' button",
    custom_expected: "User is redirected to /dashboard\nWelcome banner displays: 'Welcome back, Test User'\nSession cookie is set with httpOnly flag",
    custom_tc_test_data: "email: test@example.com\npassword: Password123!\nexpected_redirect: /dashboard",
    custom_tc_figma_spec: "https://figma.com/file/demo/auth-flow",
  },
  10002: {
    id: 10002,
    title: "Login fails with incorrect password",
    custom_tc_test_case_id: "AUTH-002",
    custom_tc_name: "TC_Login_WrongPassword",
    custom_tc_category: "Negative",
    custom_preconds: "User account exists with email test@example.com\nUser is on the login page",
    custom_tc_use_case: "A registered user enters the correct email but wrong password and should receive an error.",
    custom_steps: "1. Navigate to /login\n2. Enter email: test@example.com\n3. Enter password: WrongPassword!\n4. Click 'Sign In'",
    custom_expected: "User remains on /login\nInline error shown: 'Invalid email or password'\nNo session cookie is set\nFailed attempt counter increments",
    custom_tc_test_data: "email: test@example.com\npassword: WrongPassword!\nexpected_error: Invalid email or password",
    custom_tc_figma_spec: "",
  },
  10003: {
    id: 10003,
    title: "Account locks after 5 failed attempts",
    custom_tc_test_case_id: "AUTH-003",
    custom_tc_name: "TC_Login_AccountLockout",
    custom_tc_category: "Security",
    custom_preconds: "User account exists and is currently active\nFailed attempt count is 0",
    custom_tc_use_case: "To prevent brute-force attacks the system must lock the account after 5 consecutive failed login attempts.",
    custom_steps: "1. Navigate to /login\n2. Enter correct email and wrong password\n3. Click 'Sign In'\n4. Repeat steps 2–3 five times\n5. Observe the response on the 5th attempt",
    custom_expected: "After the 5th failed attempt the account is locked\nError message: 'Your account has been locked. Please check your email to unlock it.'\nLock notification email is sent to registered email",
    custom_tc_test_data: "email: locktest@example.com\npassword_attempts: [wrong1, wrong2, wrong3, wrong4, wrong5]",
    custom_tc_figma_spec: "",
  },
  10020: {
    id: 10020,
    title: "Add item to cart updates badge count",
    custom_tc_test_case_id: "CART-001",
    custom_tc_name: "TC_Cart_AddItem_BadgeUpdates",
    custom_tc_category: "Functional",
    custom_preconds: "User is logged in\nCart is empty (badge shows 0 or is hidden)\nAt least one in-stock product exists",
    custom_tc_use_case: "When a user adds a product to their cart the cart icon badge should immediately reflect the new item count.",
    custom_steps: "1. Navigate to any product listing page\n2. Click 'Add to Cart' on an in-stock product\n3. Observe the cart icon in the navigation header",
    custom_expected: "Cart badge increments from 0 to 1\nToast notification: 'Item added to your cart'\nMini-cart drawer slides open showing the added product",
    custom_tc_test_data: "product_id: SKU-9821\nproduct_name: Wireless Headphones Pro\nquantity: 1",
    custom_tc_figma_spec: "https://figma.com/file/demo/cart-interactions",
  },
  10030: {
    id: 10030,
    title: "Guest checkout completes without account",
    custom_tc_test_case_id: "CHK-001",
    custom_tc_name: "TC_Checkout_GuestFlow",
    custom_tc_category: "Functional",
    custom_preconds: "User is NOT logged in\nCart contains at least 1 item\nTest credit card is configured in Stripe sandbox",
    custom_tc_use_case: "A new visitor should be able to complete a purchase as a guest without being forced to create an account.",
    custom_steps: "1. Add a product to cart\n2. Click 'Checkout'\n3. Select 'Continue as Guest'\n4. Enter shipping details\n5. Enter test card: 4242 4242 4242 4242, exp 12/26, CVV 123\n6. Click 'Place Order'",
    custom_expected: "Order is created successfully\nOrder confirmation page shown with order number\nConfirmation email sent to entered email address\nNo account is created in the user database",
    custom_tc_test_data: "card: 4242424242424242\nexpiry: 12/26\ncvv: 123\nguest_email: guesttest@example.com",
    custom_tc_figma_spec: "https://figma.com/file/demo/checkout-flow",
  },
  10032: {
    id: 10032,
    title: "Credit card payment processes successfully",
    custom_tc_test_case_id: "CHK-003",
    custom_tc_name: "TC_Checkout_CreditCardSuccess",
    custom_tc_category: "Functional",
    custom_preconds: "User is logged in\nCart has items totalling $49.99\nStripe test mode is active",
    custom_tc_use_case: "Verify that a valid credit card completes the payment and triggers the order fulfilment pipeline.",
    custom_steps: "1. Proceed through checkout to payment step\n2. Select 'Credit / Debit Card'\n3. Enter card: 4242 4242 4242 4242\n4. Enter expiry and CVV\n5. Click 'Pay $49.99'",
    custom_expected: "Stripe payment intent status: succeeded\nOrder record created with status: 'paid'\nInventory decremented for purchased SKUs\nOrder confirmation email dispatched within 30 seconds",
    custom_tc_test_data: "card: 4242424242424242\nexpiry: 12/26\ncvv: 123\norder_total: 49.99",
    custom_tc_figma_spec: "",
  },
  20030: {
    id: 20030,
    title: "Login with username and password succeeds",
    custom_tc_test_case_id: "SEC-001",
    custom_tc_name: "TC_BankLogin_Success",
    custom_tc_category: "Functional",
    custom_preconds: "User has an active banking account\nUser is on the login screen of the mobile app\nNetwork connectivity is available",
    custom_tc_use_case: "A bank customer enters valid credentials and should be authenticated and redirected to their account dashboard.",
    custom_steps: "1. Open the banking app\n2. Tap the username field and enter: john.doe@bank.com\n3. Tap the password field and enter: SecurePass#1\n4. Tap 'Log In'\n5. Complete MFA if prompted",
    custom_expected: "Authentication succeeds\nUser is navigated to the Account Overview screen\nLast login timestamp is updated\nLogin event is logged in audit trail",
    custom_tc_test_data: "username: john.doe@bank.com\npassword: SecurePass#1\nexpected_screen: AccountOverview",
    custom_tc_figma_spec: "https://figma.com/file/demo/banking-auth",
  },
  20031: {
    id: 20031,
    title: "MFA OTP SMS is delivered within 60s",
    custom_tc_test_case_id: "SEC-002",
    custom_tc_name: "TC_BankLogin_MFA_OTP",
    custom_tc_category: "Security",
    custom_preconds: "User has MFA enabled with a verified phone number\nUser has successfully entered username and password",
    custom_tc_use_case: "After entering credentials the user receives a one-time passcode via SMS to complete multi-factor authentication.",
    custom_steps: "1. Complete step 1-4 of TC_BankLogin_Success\n2. Observe the MFA screen requesting OTP\n3. Wait for SMS on registered phone number\n4. Enter the received OTP code\n5. Tap 'Verify'",
    custom_expected: "SMS is received within 60 seconds\nOTP is 6 digits\nEntering correct OTP navigates user to dashboard\nOTP expires after 5 minutes",
    custom_tc_test_data: "phone: +1-555-0100\notp_length: 6\notp_expiry_minutes: 5\ndelivery_sla_seconds: 60",
    custom_tc_figma_spec: "",
  },
  20010: {
    id: 20010,
    title: "Internal transfer between own accounts",
    custom_tc_test_case_id: "TRF-001",
    custom_tc_name: "TC_Transfer_Internal",
    custom_tc_category: "Functional",
    custom_preconds: "User has at least 2 active accounts (e.g. Chequing + Savings)\nChequing account balance ≥ $100\nUser is on the Transfers screen",
    custom_tc_use_case: "A customer moves money from their chequing account to their savings account using the in-app transfer feature.",
    custom_steps: "1. Tap 'New Transfer'\n2. Select 'From': Chequing (...4521)\n3. Select 'To': Savings (...8834)\n4. Enter amount: $100.00\n5. Add memo: 'Monthly savings'\n6. Tap 'Review Transfer'\n7. Confirm details and tap 'Submit'",
    custom_expected: "Chequing balance decreases by $100.00\nSavings balance increases by $100.00\nTransaction appears in both account histories\nTransfer confirmation screen shown with reference number",
    custom_tc_test_data: "from_account: 4521\nto_account: 8834\namount: 100.00\ncurrency: CAD",
    custom_tc_figma_spec: "https://figma.com/file/demo/transfers",
  },
};

// ── Helper: get detail for any case (fallback for ones without a full record) ──
export function getDemoCaseDetail(caseId) {
  if (DEMO_CASE_DETAIL[caseId]) return DEMO_CASE_DETAIL[caseId];

  // Find the stub from DEMO_CASES and inflate it with placeholder content
  for (const sectionCases of Object.values(DEMO_CASES)) {
    const stub = sectionCases.find(c => c.id === caseId);
    if (stub) {
      return {
        ...stub,
        custom_tc_name: `TC_${stub.custom_tc_test_case_id?.replace(/-/g, "_") || stub.id}`,
        custom_tc_category: "Functional",
        custom_preconds: "Preconditions for this test case.",
        custom_tc_use_case: "Describe the user scenario this test case covers.",
        custom_steps: "1. Step one\n2. Step two\n3. Step three",
        custom_expected: "The expected result after completing all steps.",
        custom_tc_test_data: "",
        custom_tc_figma_spec: "",
      };
    }
  }
  return null;
}